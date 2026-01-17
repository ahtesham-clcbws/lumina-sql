use tauri::State;
use crate::state::AppState;
use mysql_async::prelude::*;
use serde::Serialize;
use chrono::NaiveDateTime;

#[derive(Serialize)]
pub struct Routine {
    pub name: String,
    pub routine_type: String, // PROCEDURE or FUNCTION
    pub data_type: String,    // Return type for functions
    pub created: String,
    pub last_altered: String,
}

#[tauri::command]
pub async fn get_routines(db: String, state: State<'_, AppState>) -> Result<Vec<Routine>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let sql = format!(
        "SELECT ROUTINE_NAME, ROUTINE_TYPE, DATA_TYPE, CREATED, LAST_ALTERED 
         FROM information_schema.ROUTINES 
         WHERE ROUTINE_SCHEMA = '{}'
         ORDER BY ROUTINE_NAME ASC",
        db
    );

    let rows: Vec<(String, String, Option<String>, NaiveDateTime, NaiveDateTime)> = 
        conn.query(sql).await.map_err(|e| e.to_string())?;

    let routines = rows.into_iter().map(|(name, r_type, d_type, created, altered)| {
        Routine {
            name,
            routine_type: r_type,
            data_type: d_type.unwrap_or_default(),
            created: created.format("%Y-%m-%d %H:%M:%S").to_string(),
            last_altered: altered.format("%Y-%m-%d %H:%M:%S").to_string(),
        }
    }).collect();

    Ok(routines)
}

#[tauri::command]
pub async fn get_routine_definition(db: String, name: String, routine_type: String, state: State<'_, AppState>) -> Result<String, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let sql = if routine_type.to_uppercase() == "PROCEDURE" {
        format!("SHOW CREATE PROCEDURE `{}`.`{}`", db, name)
    } else {
        format!("SHOW CREATE FUNCTION `{}`.`{}`", db, name)
    };

    let row: Option<(String, String, String)> = conn.query_first(sql).await.map_err(|e| e.to_string())?;
    
    if let Some((_, _, definition)) = row {
        Ok(definition)
    } else {
        Err("Routine not found".to_string())
    }
}

#[tauri::command]
pub async fn drop_routine(db: String, name: String, routine_type: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let sql = format!("DROP {} `{}`.`{}`", routine_type, db, name);
    conn.query_drop(sql).await.map_err(|e| e.to_string())
}
