use tauri::State;
use crate::state::AppState;
use mysql_async::prelude::*;
use serde::Serialize;

#[derive(Serialize)]
pub struct IndexInfo {
    pub name: String,
    pub column: String,
    pub non_unique: bool,
    pub seq_in_index: u32,
    pub index_type: String,
    pub is_primary: bool,
}

#[tauri::command]
pub async fn get_indexes(db: String, table: String, state: State<'_, AppState>) -> Result<Vec<IndexInfo>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    conn.query_drop(format!("USE `{}`", db)).await.map_err(|e| e.to_string())?;
    
    let query = format!("SHOW INDEX FROM `{}`", table);
    let mut result = conn.query_iter(query).await.map_err(|e| e.to_string())?;
    let rows: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    
    let mut indexes = Vec::new();
    for row in rows {
        let key_name: String = row.get::<Option<String>, _>("Key_name").flatten().unwrap_or_default();
        indexes.push(IndexInfo {
            name: key_name.clone(),
            column: row.get::<Option<String>, _>("Column_name").flatten().unwrap_or_default(),
            non_unique: row.get::<Option<u8>, _>("Non_unique").flatten().unwrap_or(1) != 0,
            seq_in_index: row.get::<Option<u32>, _>("Seq_in_index").flatten().unwrap_or(1),
            index_type: row.get::<Option<String>, _>("Index_type").flatten().unwrap_or_else(|| "BTREE".to_string()),
            is_primary: key_name == "PRIMARY",
        });
    }
    Ok(indexes)
}

#[tauri::command]
pub async fn add_index(db: String, table: String, index_name: String, columns: Vec<String>, index_type: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    // index_type: UNIQUE, FULLTEXT, SPATIAL, or empty for normal (INDEX)
    // Actually MySQL syntax: CREATE [UNIQUE|FULLTEXT|SPATIAL] INDEX index_name ON table_name (col1, col2...)
    // OR ALTER TABLE table_name ADD [UNIQUE|FULLTEXT|SPATIAL] INDEX index_name (col1, col2...)
    
    // Safety check on index_type
    let allowed_types = ["", "UNIQUE", "FULLTEXT", "SPATIAL"];
    let upper_type = index_type.to_uppercase();
    if !allowed_types.contains(&upper_type.as_str()) && upper_type != "INDEX" { // "INDEX" is default
         return Err("Invalid index type".to_string());
    }

    let type_str = if upper_type == "INDEX" || upper_type.is_empty() { "INDEX" } else { &upper_type };
    
    let cols_str = columns.iter().map(|c| format!("`{}`", c)).collect::<Vec<_>>().join(", ");
    
    let query = if type_str == "PRIMARY" {
        format!("ALTER TABLE `{}`.`{}` ADD PRIMARY KEY ({})", db, table, cols_str)
    } else {
        // If it's just INDEX, it's ADD INDEX `name` (...)
        // If it's UNIQUE, it's ADD UNIQUE INDEX `name` (...)
        let type_prefix = if type_str == "INDEX" { "" } else { type_str };
        format!("ALTER TABLE `{}`.`{}` ADD {} INDEX `{}` ({})", db, table, type_prefix, index_name, cols_str)
    };

    conn.query_drop(query).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_index(db: String, table: String, name: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let query = if name == "PRIMARY" {
        format!("ALTER TABLE `{}`.`{}` DROP PRIMARY KEY", db, table)
    } else {
        format!("ALTER TABLE `{}`.`{}` DROP INDEX `{}`", db, table, name)
    };

    conn.query_drop(query).await.map_err(|e| e.to_string())
}
