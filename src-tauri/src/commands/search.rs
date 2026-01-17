use tauri::State;
use crate::state::AppState;
use mysql_async::prelude::*;
use serde::Serialize;

#[derive(Serialize, Debug)]
pub struct SearchResult {
    pub category: String, // "Table", "Database", "Row", "Command"
    pub label: String,
    pub description: Option<String>,
    pub action_type: String, // "navigate", "execute"
    pub action_value: String,
}

#[tauri::command]
pub async fn global_search(term: String, db: Option<String>, state: State<'_, AppState>) -> Result<Vec<SearchResult>, String> {
    let term = term.trim();
    if term.is_empty() {
        return Ok(vec![]);
    }
    
    let mut results = Vec::new();

    // 1. Command Matches (Static)
    let commands = vec![
        ("Create Database", "open_create_db_modal", "nav"),
        ("Server Settings", "open_server_settings", "nav"),
        ("Manage Users", "open_users_modal", "nav"),
        ("Flush Privileges", "flush_privileges", "cmd"),
        ("Kill Process", "open_process_list", "nav"),
    ];
    
    for (label, val, kind) in commands {
        if label.to_lowercase().contains(&term.to_lowercase()) {
             results.push(SearchResult {
                category: "Command".to_string(),
                label: label.to_string(),
                description: Some("System Command".to_string()),
                action_type: kind.to_string(),
                action_value: val.to_string(),
            });
        }
    }

    let pool_opt = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned()
    };

    // If no DB connection, return commands only
    let pool = match pool_opt {
        Some(p) => p,
        None => return Ok(results),
    };

    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    // 2. Metadata Search (Databases & Tables)
    
    // Search Databases
    let dbs: Vec<String> = conn.query("SHOW DATABASES").await.map_err(|e| e.to_string())?;
    for d in dbs {
        if d.to_lowercase().contains(&term.to_lowercase()) {
            results.push(SearchResult {
                category: "Database".to_string(),
                label: d.clone(),
                description: None,
                action_type: "navigate".to_string(),
                action_value: format!("/server/{}", d),
            });
        }
    }

    // Search Tables (in current DB only if selected, or we could search all if term is specific enough?)
    // For safety/speed, let's search tables in CURRENT DB only for now, or all if feasible.
    // Let's stick to current DB for Deep Search, but maybe metadata for all?
    // Doing "SELECT table_name, table_schema FROM information_schema.tables" is safer.
    
    let tables_sql = format!("
        SELECT TABLE_NAME, TABLE_SCHEMA 
        FROM information_schema.TABLES 
        WHERE TABLE_NAME LIKE '%{}%' 
        LIMIT 20
    ", term);

    let found_tables: Vec<(String, String)> = conn.query(&tables_sql).await.unwrap_or_default();
    
    for (table, schema) in found_tables {
        results.push(SearchResult {
            category: "Table".to_string(),
            label: table.clone(),
            description: Some(format!("in {}", schema)),
            action_type: "navigate".to_string(),
            action_value: format!("/server/{}/{}", schema, table),
        });
    }

    // 3. Data Search (Only if a DB is selected and term > 3 chars)
    if let Some(current_db) = db {
        if term.len() >= 3 {
             // Get all tables in current DB
             let tables: Vec<String> = conn.exec(
                 "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?", 
                 (current_db.clone(),)
             ).await.unwrap_or_default();

             // Limit to first 10 tables to avoid hanging
             let tables_to_scan = tables.into_iter().take(10).collect::<Vec<_>>();
             
             // We need a separate connection for async tasks or just iterate sequentially for safety first
             // Parallelizing requires cloning the pool
             
             for table in tables_to_scan {
                 // Find text columns
                 let cols: Vec<String> = conn.exec(
                     "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND (DATA_TYPE LIKE '%char%' OR DATA_TYPE LIKE '%text%')",
                     (current_db.clone(), table.clone())
                 ).await.unwrap_or_default();
                 
                 if !cols.is_empty() {
                     // Construct query: SELECT * FROM table WHERE col1 LIKE %term% OR col2 LIKE %term% LIMIT 1
                     let where_clause = cols.iter()
                        .map(|c| format!("`{}` LIKE '%{}%'", c, term))
                        .collect::<Vec<_>>()
                        .join(" OR ");
                     
                     let sql = format!("SELECT * FROM `{}`.`{}` WHERE {} LIMIT 1", current_db, table, where_clause);
                     
                     // Run query
                     let row: Option<mysql_async::Row> = conn.query_first(&sql).await.unwrap_or(None);
                     
                     if row.is_some() {
                         results.push(SearchResult {
                             category: "Data Row".to_string(),
                             label: format!("Match in {}", table),
                             description: Some(format!("Found '{}'...", term)),
                             action_type: "navigate".to_string(),
                             action_value: format!("/server/{}/{}", current_db, table),
                         });
                     }
                 }
             }
        }
    }

    Ok(results)
}
