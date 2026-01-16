use tauri::State;
use crate::state::AppState;
use mysql_async::prelude::*;
use serde::Serialize;

#[derive(Serialize)]
pub struct TriggerInfo {
    pub name: String,
    pub event: String,   // INSERT, UPDATE, DELETE
    pub table: String,
    pub timing: String,  // BEFORE, AFTER
    pub created: Option<String>,
}

#[derive(Serialize)]
pub struct EventInfo {
    pub name: String,
    pub schedule: String,
    pub status: String, // ENABLED, DISABLED, SLAVESIDE_DISABLED
    pub starts: Option<String>,
    pub ends: Option<String>,
}

#[tauri::command]
pub async fn get_triggers(db: String, state: State<'_, AppState>) -> Result<Vec<TriggerInfo>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    // Select from information_schema.TRIGGERS
    let query = "SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING, CREATED 
                 FROM information_schema.TRIGGERS 
                 WHERE TRIGGER_SCHEMA = ?";
    
    let rows: Vec<mysql_async::Row> = conn.exec(query, (db,)).await.map_err(|e| e.to_string())?;
    
    let mut triggers = Vec::new();
    for row in rows {
        triggers.push(TriggerInfo {
            name: row.get::<String, _>(0).unwrap_or_default(),
            event: row.get::<String, _>(1).unwrap_or_default(),
            table: row.get::<String, _>(2).unwrap_or_default(),
            timing: row.get::<String, _>(3).unwrap_or_default(),
            created: row.get::<Option<String>, _>(4).flatten(),
        });
    }
    
    Ok(triggers)
}

#[tauri::command]
pub async fn create_trigger(
    db: String, name: String, table: String, 
    time: String, event: String, statement: String, 
    state: State<'_, AppState>
) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    // USE db first
    conn.query_drop(format!("USE `{}`", db)).await.map_err(|e| e.to_string())?;
    
    let sql = format!("CREATE TRIGGER `{}` {} {} ON `{}` FOR EACH ROW {}", 
        name, time, event, table, statement);
        
    conn.query_drop(sql).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_trigger(db: String, name: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    conn.query_drop(format!("DROP TRIGGER `{}`.`{}`", db, name)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_events(db: String, state: State<'_, AppState>) -> Result<Vec<EventInfo>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let query = "SELECT EVENT_NAME, EVENT_TYPE, INTERVAL_VALUE, INTERVAL_FIELD, STATUS, STARTS, ENDS 
                 FROM information_schema.EVENTS 
                 WHERE EVENT_SCHEMA = ?";
    
    // Note: EVENT_TYPE is ONE TIME or RECURRING. 
    // We map manually to a friendly schedule string
    
    let rows: Vec<mysql_async::Row> = conn.exec(query, (db,)).await.map_err(|e| e.to_string())?;
    
    let mut events = Vec::new();
    for row in rows {
        let type_ = row.get::<String, _>(1).unwrap_or_default();
        let interval_val = row.get::<Option<String>, _>(2).flatten();
        let interval_field = row.get::<Option<String>, _>(3).flatten();
        
        let schedule = if type_ == "RECURRING" {
            format!("EVERY {} {}", interval_val.unwrap_or_default(), interval_field.unwrap_or_default())
        } else {
            "ONE TIME".to_string()
        };
        
        events.push(EventInfo {
            name: row.get::<String, _>(0).unwrap_or_default(),
            schedule,
            status: row.get::<String, _>(4).unwrap_or_default(),
            starts: row.get::<Option<String>, _>(5).flatten(),
            ends: row.get::<Option<String>, _>(6).flatten(),
        });
    }
    
    Ok(events)
}

#[tauri::command]
pub async fn drop_event(db: String, name: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    conn.query_drop(format!("DROP EVENT `{}`.`{}`", db, name)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_event(
    db: String, name: String, 
    schedule: String, 
    status: String,
    statement: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    conn.query_drop(format!("USE `{}`", db)).await.map_err(|e| e.to_string())?;

    let sql = format!("CREATE EVENT `{}` ON SCHEDULE {} {} DO {}", 
        name, schedule, status, statement);
    
    conn.query_drop(sql).await.map_err(|e| e.to_string())
}
