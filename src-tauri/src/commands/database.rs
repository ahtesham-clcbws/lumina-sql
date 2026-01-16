use tauri::State;
use crate::state::AppState;
use mysql_async::prelude::*;
use serde::Serialize;

#[derive(Serialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub size: u64,
    pub tables_count: u64,
}

#[tauri::command]
pub async fn get_databases(state: State<'_, AppState>) -> Result<Vec<DatabaseInfo>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let sql = "
        SELECT 
            s.SCHEMA_NAME AS name,
            SUM(COALESCE(t.data_length + t.index_length, 0)) AS total_size,
            COUNT(t.TABLE_NAME) AS tables_count
        FROM information_schema.SCHEMATA s
        LEFT JOIN information_schema.TABLES t ON s.SCHEMA_NAME = t.TABLE_SCHEMA
        GROUP BY s.SCHEMA_NAME
    ";

    let mut result = conn.query_iter(sql).await.map_err(|e| e.to_string())?;
    let rows: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    
    let mut databases = Vec::new();
    for row in rows {
        databases.push(DatabaseInfo {
            name: row.get::<Option<String>, _>("name").flatten().unwrap_or_default(),
            size: row.get::<Option<u64>, _>("total_size").flatten().unwrap_or(0),
            tables_count: row.get::<Option<u64>, _>("tables_count").flatten().unwrap_or(0),
        });
    }
    
    Ok(databases)
}

#[tauri::command]
pub async fn create_database(name: String, collation: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let collation_sql = if let Some(c) = collation {
        if !c.is_empty() { format!("COLLATE {}", c) } else { String::new() }
    } else { String::new() };
    
    conn.query_drop(format!("CREATE DATABASE `{}` {}", name, collation_sql)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_database(name: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    conn.query_drop(format!("DROP DATABASE `{}`", name)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_collations(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let collations: Vec<String> = conn.query("SELECT COLLATION_NAME FROM information_schema.COLLATIONS ORDER BY COLLATION_NAME")
        .await.map_err(|e| e.to_string())?;
        
    Ok(collations)
}

#[tauri::command]
pub async fn change_collation(db: String, collation: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    conn.query_drop(format!("ALTER DATABASE `{}` COLLATE {}", db, collation)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn alter_database_collation(db: String, collation: String, state: State<'_, AppState>) -> Result<(), String> {
    change_collation(db, collation, state).await
}

#[tauri::command]
pub async fn rename_database(name: String, new_name: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    conn.query_drop(format!("CREATE DATABASE `{}`", new_name)).await.map_err(|e| e.to_string())?;
    
    // Move tables
    let mut result = conn.query_iter(format!("SHOW TABLES FROM `{}`", name)).await.map_err(|e| e.to_string())?;
    let rows: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    
    for row in rows {
        let table: String = row.get(0).unwrap();
        let query = format!("RENAME TABLE `{}`.`{}` TO `{}`.`{}`", name, table, new_name, table);
        if let Err(e) = conn.query_drop(query).await {
             return Err(format!("Failed to move table {}: {}", table, e));
        }
    }
    
    conn.query_drop(format!("DROP DATABASE `{}`", name)).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn copy_database(name: String, new_name: String, with_data: bool, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    conn.query_drop(format!("CREATE DATABASE `{}`", new_name)).await.map_err(|e| e.to_string())?;

    let mut result = conn.query_iter(format!("SHOW TABLES FROM `{}`", name)).await.map_err(|e| e.to_string())?;
    let rows: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    
    for row in rows {
        let table: String = row.get(0).unwrap();
        
        let create_query = format!("CREATE TABLE `{}`.`{}` LIKE `{}`.`{}`", new_name, table, name, table);
        conn.query_drop(create_query).await.map_err(|e| format!("Failed to create table {}: {}", table, e))?;
        
        if with_data {
            let insert_query = format!("INSERT INTO `{}`.`{}` SELECT * FROM `{}`.`{}`", new_name, table, name, table);
            conn.query_drop(insert_query).await.map_err(|e| format!("Failed to copy data for {}: {}", table, e))?;
        }
    }
    Ok(())
}
