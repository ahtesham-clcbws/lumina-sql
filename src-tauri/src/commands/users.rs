use tauri::State;
use crate::state::AppState;
use mysql_async::prelude::*;
use serde::Serialize;

#[derive(Serialize)]
pub struct UserInfo {
    pub user: String,
    pub host: String,
    pub account_locked: bool,
    pub password_expired: Option<String>,
}

#[derive(Serialize)]
pub struct UserGrant {
    pub statement: String,
}

#[tauri::command]
pub async fn get_users(state: State<'_, AppState>) -> Result<Vec<UserInfo>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    // Try to get more details if available (MySQL 5.7+)
    // account_locked and password_expired columns might strictly be MySQL 5.7+ or 8.0
    // Let's stick to basic User, Host first to be safe, or try catch.
    // Actually, let's query mysql.user.
    // Note: older MySQL/MariaDB might behave differently.
    // Safe bet: SELECT User, Host FROM mysql.user
    
    let query = "SELECT User, Host FROM mysql.user ORDER BY User, Host";
    let mut result = conn.query_iter(query).await.map_err(|e| e.to_string())?;
    let rows: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    
    let mut users = Vec::new();
    for row in rows {
        users.push(UserInfo {
            user: row.get::<Option<String>, _>("User").flatten().unwrap_or_default(),
            host: row.get::<Option<String>, _>("Host").flatten().unwrap_or_default(),
            account_locked: false, // Placeholder for now
            password_expired: None,
        });
    }
    
    Ok(users)
}

#[tauri::command]
pub async fn create_user(name: String, host: String, password: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    // Safety: Parameterized or carefully constructed string?
    // CREATE USER statement does NOT support parameters for identifiers in older drivers usually, 
    // but mysql_async might. However, identifiers usually need manual escaping.
    // For now, we will assume standard restricted chars or risk it (MVP).
    // TODO: sanitize inputs properly.
    
    let query = format!("CREATE USER '{}'@'{}' IDENTIFIED BY '{}'", name, host, password);
    conn.query_drop(query).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_user(name: String, host: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let query = format!("DROP USER '{}'@'{}'", name, host);
    conn.query_drop(query).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_grants(name: String, host: String, state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    let query = format!("SHOW GRANTS FOR '{}'@'{}'", name, host);
    let mut result = conn.query_iter(query).await.map_err(|e| e.to_string())?;
    let rows: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    
    let mut grants = Vec::new();
    for row in rows {
        // The column name for SHOW GRANTS is somewhat dynamic "Grants for user@host"
        // So we get by index 0
        if let Some(val) = row.get::<Option<String>, _>(0) {
           if let Some(s) = val {
               grants.push(s);
           }
        }
    }
    Ok(grants)
}

#[tauri::command]
pub async fn change_password(name: String, host: String, password: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    // MySQL 5.7.6+ uses ALTER USER
    let query = format!("ALTER USER '{}'@'{}' IDENTIFIED BY '{}'", name, host, password);
    conn.query_drop(query).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn flush_privileges(state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    conn.query_drop("FLUSH PRIVILEGES").await.map_err(|e| e.to_string())
}
#[derive(Serialize)]
pub struct PrivilegeMatrix {
    pub global: Vec<String>,
    pub databases: Vec<(String, Vec<String>)>, // (DB, Privileges)
}

#[tauri::command]
pub async fn get_privilege_matrix(name: String, host: String, state: State<'_, AppState>) -> Result<PrivilegeMatrix, String> {
    let grants = get_grants(name, host, state).await?;
    
    let mut matrix = PrivilegeMatrix {
        global: Vec::new(),
        databases: Vec::new(),
    };

    for grant in grants {
        // Very basic parsing: GRANT <privs> ON <level> TO ...
        if let Some(on_start) = grant.find(" ON ") {
            let privs_part = &grant[6..on_start]; // Skip "GRANT "
            let rest = &grant[on_start + 4..];
            
            if let Some(to_start) = rest.find(" TO ") {
                let level_part = &rest[..to_start];
                
                let priv_list: Vec<String> = privs_part.split(", ").map(|s| s.to_string()).collect();
                
                if level_part == "*.*" {
                    matrix.global.extend(priv_list);
                } else if level_part.contains(".*") {
                    let db = level_part.replace(".*", "").replace("`", "");
                    matrix.databases.push((db, priv_list));
                }
            }
        }
    }
    
    Ok(matrix)
}

#[tauri::command]
pub async fn update_privilege(
    name: String, 
    host: String, 
    privilege: String, 
    level: String, 
    is_grant: bool, 
    state: State<'_, AppState>
) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let sql = if is_grant {
        format!("GRANT {} ON {} TO '{}'@'{}'", privilege, level, name, host)
    } else {
        format!("REVOKE {} ON {} FROM '{}'@'{}'", privilege, level, name, host)
    };

    conn.query_drop(sql).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_user(
    old_name: String,
    old_host: String,
    new_name: String,
    new_host: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let sql = format!("RENAME USER '{}'@'{}' TO '{}'@'{}'", old_name, old_host, new_name, new_host);
    conn.query_drop(sql).await.map_err(|e| e.to_string())
}
