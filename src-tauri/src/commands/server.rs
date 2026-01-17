use tauri::{AppHandle, Manager, State};
use crate::state::{AppState, ServerConfig};
use mysql_async::prelude::*;
use serde::Serialize;

const SERVERS_FILE: &str = "servers.json";

#[derive(Serialize)]
pub struct ServerInfo {
    pub version: String,
    pub user: String,
    pub ssl: bool,
}

#[derive(Serialize)]
pub struct ProcessItem {
    pub id: u64,
    pub user: String,
    pub host: String,
    pub db: String,
    pub command: String,
    pub time: i64,
    pub state: String,
    pub info: String,
}

#[derive(Serialize)]
pub struct StatusVar {
    pub variable_name: String,
    pub value: String,
}

#[tauri::command]
pub async fn get_saved_servers(app_handle: AppHandle) -> Result<Vec<ServerConfig>, String> {
    let path = app_handle.path().app_config_dir().unwrap().join(SERVERS_FILE);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = tokio::fs::read_to_string(path).await.map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_server(config: ServerConfig, app_handle: AppHandle) -> Result<(), String> {
    let config_dir = app_handle.path().app_config_dir().unwrap();
    if !config_dir.exists() {
        tokio::fs::create_dir_all(&config_dir).await.map_err(|e| e.to_string())?;
    }
    let path = config_dir.join(SERVERS_FILE);
    
    let mut servers = get_saved_servers(app_handle.clone()).await.unwrap_or_default();
    if let Some(pos) = servers.iter().position(|s| s.id == config.id) {
        servers[pos] = config;
    } else {
        servers.push(config);
    }
    
    let content = serde_json::to_string_pretty(&servers).map_err(|e| e.to_string())?;
    tokio::fs::write(path, content).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_server(id: String, app_handle: AppHandle) -> Result<(), String> {
    let path = app_handle.path().app_config_dir().unwrap().join(SERVERS_FILE);
    if !path.exists() {
        return Ok(());
    }
    let mut servers = get_saved_servers(app_handle.clone()).await.unwrap_or_default();
    servers.retain(|s| s.id != id);
    let content = serde_json::to_string_pretty(&servers).map_err(|e| e.to_string())?;
    tokio::fs::write(path, content).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_server_info(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let pool = {
        let guard = state.pool.lock().unwrap();
        guard.as_ref().cloned().ok_or("Not connected")?
    };
    
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    // Get version
    let version: Option<String> = conn.query_first("SELECT VERSION()").await.map_err(|e| e.to_string())?;
    
    // Get uptime
    let uptime: Option<String> = conn.query_first("SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'UPTIME'").await.map_err(|e| e.to_string())?;
    
    // Get User
    let user: Option<String> = conn.query_first("SELECT CURRENT_USER()").await.map_err(|e| e.to_string())?;
    
    Ok(vec![
        version.unwrap_or_default(),
        uptime.unwrap_or_default(),
        user.unwrap_or_default()
    ])
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct SavedServer {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub pass: Option<String>,
    pub ssl: Option<bool>,
    pub ssh_enabled: Option<bool>,
    pub ssh_host: Option<String>,
    pub ssh_port: Option<u16>,
    pub ssh_user: Option<String>,
    pub ssh_pass: Option<String>,
    pub auto_connect: Option<bool>,
}

#[tauri::command]
pub fn get_saved_servers_local(app_handle: tauri::AppHandle) -> Result<Vec<SavedServer>, String> {
    use std::fs;
    let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    let servers_path = config_dir.join("servers.json");
    
    if !servers_path.exists() {
        return Ok(vec![]);
    }
    
    let content = fs::read_to_string(servers_path).map_err(|e| e.to_string())?;
    let servers: Vec<SavedServer> = serde_json::from_str(&content).unwrap_or_default();
    
    Ok(servers)
}

#[tauri::command]
pub fn save_server_local(app_handle: tauri::AppHandle, server: SavedServer) -> Result<Vec<SavedServer>, String> {
    use std::fs;
    let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    
    let servers_path = config_dir.join("servers.json");
    
    let mut servers: Vec<SavedServer> = if servers_path.exists() {
        let content = fs::read_to_string(&servers_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        vec![]
    };
    
    // Update or Add
    if let Some(idx) = servers.iter().position(|s| s.id == server.id) {
        servers[idx] = server;
    } else {
        servers.push(server);
    }
    
    let json = serde_json::to_string_pretty(&servers).map_err(|e| e.to_string())?;
    fs::write(servers_path, json).map_err(|e| e.to_string())?;
    
    Ok(servers)
}

#[tauri::command]
pub fn delete_server_local(app_handle: tauri::AppHandle, id: String) -> Result<Vec<SavedServer>, String> {
    use std::fs;
    let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    let servers_path = config_dir.join("servers.json");
    
    if !servers_path.exists() {
        return Ok(vec![]);
    }
    
    let content = fs::read_to_string(&servers_path).map_err(|e| e.to_string())?;
    let mut servers: Vec<SavedServer> = serde_json::from_str(&content).unwrap_or_default();
    
    servers.retain(|s| s.id != id);
    
    let json = serde_json::to_string_pretty(&servers).map_err(|e| e.to_string())?;
    fs::write(servers_path, json).map_err(|e| e.to_string())?;
    
    Ok(servers)
}

#[tauri::command]
pub async fn get_process_list(state: State<'_, AppState>) -> Result<Vec<ProcessItem>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let rows: Vec<mysql_async::Row> = conn.query("SHOW FULL PROCESSLIST").await.map_err(|e| e.to_string())?;
    
    let items = rows.into_iter().map(|r| {
        ProcessItem {
            id: r.get("Id").unwrap_or(0),
            user: r.get::<String, _>("User").unwrap_or_default(),
            host: r.get::<String, _>("Host").unwrap_or_default(),
            db: r.get::<String, _>("db").unwrap_or_default(),
            command: r.get::<String, _>("Command").unwrap_or_default(),
            time: r.get("Time").unwrap_or(0),
            state: r.get::<String, _>("State").unwrap_or_default(),
            info: r.get::<String, _>("Info").unwrap_or_default(),
        }
    }).collect();
    
    Ok(items)
}

#[tauri::command]
pub async fn get_status_variables(filter: Option<String>, state: State<'_, AppState>) -> Result<Vec<StatusVar>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let query = if let Some(f) = filter {
        format!("SHOW GLOBAL STATUS LIKE '%{}%'", f.replace("'", ""))
    } else {
        "SHOW GLOBAL STATUS".to_string()
    };
    
    let rows: Vec<mysql_async::Row> = conn.query(query).await.map_err(|e| e.to_string())?;
    
    let vars = rows.into_iter().map(|r| {
        StatusVar {
            variable_name: r.get(0).unwrap_or_default(),
            value: r.get(1).unwrap_or_default(),
        }
    }).collect();
    
    Ok(vars)
}

#[tauri::command]
pub async fn get_server_variables(filter: Option<String>, state: State<'_, AppState>) -> Result<Vec<StatusVar>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let query = if let Some(f) = filter {
        format!("SHOW VARIABLES LIKE '%{}%'", f.replace("'", ""))
    } else {
        "SHOW VARIABLES".to_string()
    };
    
    let rows: Vec<mysql_async::Row> = conn.query(query).await.map_err(|e| e.to_string())?;
    
    let vars = rows.into_iter().map(|r| {
        StatusVar {
            variable_name: r.get(0).unwrap_or_default(),
            value: r.get(1).unwrap_or_default(),
        }
    }).collect();
    
    Ok(vars)
}

#[tauri::command]
pub async fn connect_db(config: crate::state::DbConfig, state: State<'_, AppState>) -> Result<String, String> {
    use mysql_async::{Opts, Pool};
    let opts = Opts::from_url(&format!(
        "mysql://{}:{}@{}:{}/",
        config.user, config.pass, config.host, config.port
    )).map_err(|e| e.to_string())?;

    let pool = Pool::new(opts);
    
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    let _ : Vec<String> = conn.query("SELECT 1").await.map_err(|e| e.to_string())?;

    let mut guard = state.pool.lock().unwrap();
    *guard = Some(pool);

    Ok("Connected successfully".into())
}
