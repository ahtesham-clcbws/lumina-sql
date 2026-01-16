use tauri::State;
use crate::state::AppState;
use mysql_async::prelude::*;
use serde::Serialize;

#[derive(Serialize)]
pub struct ForeignKeyRel {
    pub name: String,
    pub column: String,
    pub ref_db: String,
    pub ref_table: String,
    pub ref_column: String,
    pub on_delete: String,
    pub on_update: String,
}

#[tauri::command]
pub async fn get_foreign_keys(db: String, table: String, state: State<'_, AppState>) -> Result<Vec<ForeignKeyRel>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    conn.query_drop(format!("USE `{}`", db)).await.map_err(|e| e.to_string())?;

    
    // To get ON DELETE/UPDATE rules, we need another query to REFERENTIAL_CONSTRAINTS
    // For MVP, we can fetch them or do a JOIN. Let's do a JOIN for efficiency.
    
    let sql_full = format!(r#"
        SELECT 
            k.CONSTRAINT_NAME, 
            k.COLUMN_NAME, 
            k.REFERENCED_TABLE_SCHEMA, 
            k.REFERENCED_TABLE_NAME, 
            k.REFERENCED_COLUMN_NAME,
            r.DELETE_RULE,
            r.UPDATE_RULE
        FROM information_schema.KEY_COLUMN_USAGE k
        JOIN information_schema.REFERENTIAL_CONSTRAINTS r 
          ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME 
          AND k.CONSTRAINT_SCHEMA = r.CONSTRAINT_SCHEMA
        WHERE k.TABLE_SCHEMA = '{}' 
          AND k.TABLE_NAME = '{}' 
          AND k.REFERENCED_TABLE_NAME IS NOT NULL
    "#, db, table);

    let rows_full: Vec<mysql_async::Row> = conn.query(sql_full).await.map_err(|e| e.to_string())?;
    
    let mut relations = Vec::new();
    for row in rows_full {
        relations.push(ForeignKeyRel {
            name: row.get(0).unwrap_or_default(),
            column: row.get(1).unwrap_or_default(),
            ref_db: row.get(2).unwrap_or_default(),
            ref_table: row.get(3).unwrap_or_default(),
            ref_column: row.get(4).unwrap_or_default(),
            on_delete: row.get(5).unwrap_or_default(),
            on_update: row.get(6).unwrap_or_default(),
        });
    }

    Ok(relations)
}

#[tauri::command]
pub async fn add_foreign_key(
    db: String, 
    table: String, 
    name: Option<String>,
    column: String, 
    ref_db: String, 
    ref_table: String, 
    ref_column: String, 
    on_delete: String, 
    on_update: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let constraint_name = if let Some(n) = name {
        if !n.is_empty() { format!("CONSTRAINT `{}`", n) } else { String::new() }
    } else {
        String::new()
    };
    
    let sql = format!(
        "ALTER TABLE `{}`.`{}` ADD {} FOREIGN KEY (`{}`) REFERENCES `{}`.`{}` (`{}`) ON DELETE {} ON UPDATE {}",
        db, table, constraint_name, column, ref_db, ref_table, ref_column, on_delete, on_update
    );
    
    conn.query_drop(sql).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_foreign_key(db: String, table: String, name: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let sql = format!("ALTER TABLE `{}`.`{}` DROP FOREIGN KEY `{}`", db, table, name);
    conn.query_drop(sql).await.map_err(|e| e.to_string())
}
