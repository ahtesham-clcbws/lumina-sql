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
    pub ssl: Option<bool>,
    pub ssh_enabled: Option<bool>,
    pub ssh_host: Option<String>,
    pub ssh_port: Option<u16>,
    pub ssh_user: Option<String>,
    pub ssh_pass: Option<String>,
    pub auto_connect: Option<bool>,
}

#[derive(Serialize, Deserialize)]
pub struct DbConfig {
    pub host: String,
    pub user: String,
    pub pass: String,
    pub port: u16,
    pub ssl: Option<bool>,
    pub ssh_enabled: Option<bool>,
    pub ssh_host: Option<String>,
    pub ssh_port: Option<u16>,
    pub ssh_user: Option<String>,
    pub ssh_pass: Option<String>,
}
