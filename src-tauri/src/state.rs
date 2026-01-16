use mysql_async::Pool;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub struct AppState {
    pub pool: Mutex<Option<Pool>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ServerConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub pass: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct DbConfig {
    pub host: String,
    pub user: String,
    pub pass: String,
    pub port: u16,
}
