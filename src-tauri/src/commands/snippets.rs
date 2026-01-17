use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub sql: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SnippetsConfig {
    snippets: Vec<Snippet>,
}

fn get_snippets_path() -> PathBuf {
    // In a real app, use tauri::api::path::app_config_dir
    // For now, mirroring server.rs pattern (assuming it uses something similar or local)
    // server.rs likely uses a local file or known path. 
    // Let's use "app_data/snippets.json" relative to CWD for simplicity in this prototype, 
    // or better, consistent with known storage.
    PathBuf::from("app_data/snippets.json") 
}

fn ensure_app_data_dir() {
    let path = PathBuf::from("app_data");
    if !path.exists() {
        let _ = fs::create_dir_all(path);
    }
}

#[tauri::command]
pub async fn get_snippets() -> Result<Vec<Snippet>, String> {
    ensure_app_data_dir();
    let path = get_snippets_path();
    
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config: SnippetsConfig = serde_json::from_str(&content).unwrap_or(SnippetsConfig { snippets: vec![] });
    
    Ok(config.snippets)
}

#[tauri::command]
pub async fn save_snippet(snippet: Snippet) -> Result<Vec<Snippet>, String> {
    ensure_app_data_dir();
    let path = get_snippets_path();
    
    let mut snippets = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let config: SnippetsConfig = serde_json::from_str(&content).unwrap_or(SnippetsConfig { snippets: vec![] });
        config.snippets
    } else {
        Vec::new()
    };

    // Update if exists, else add
    if let Some(pos) = snippets.iter().position(|s| s.id == snippet.id) {
        snippets[pos] = snippet;
    } else {
        snippets.push(snippet);
    }

    let config = SnippetsConfig { snippets: snippets.clone() };
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;

    Ok(snippets)
}

#[tauri::command]
pub async fn delete_snippet(id: String) -> Result<Vec<Snippet>, String> {
    ensure_app_data_dir();
    let path = get_snippets_path();
    
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut config: SnippetsConfig = serde_json::from_str(&content).unwrap_or(SnippetsConfig { snippets: vec![] });
    
    config.snippets.retain(|s| s.id != id);
    
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;

    Ok(config.snippets)
}
