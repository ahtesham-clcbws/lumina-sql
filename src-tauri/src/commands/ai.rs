use tauri::command;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIConfig {
    pub provider: String, // "openai" | "ollama"
    pub api_key: Option<String>,
    pub model: String,
    pub endpoint: Option<String>, // For Ollama (default http://localhost:11434)
}

fn get_config_path() -> PathBuf {
    PathBuf::from("app_data/ai_config.json")
}

fn ensure_app_data_dir() {
    let path = PathBuf::from("app_data");
    if !path.exists() {
        let _ = fs::create_dir_all(path);
    }
}

#[command]
pub async fn get_ai_config() -> Result<AIConfig, String> {
    ensure_app_data_dir();
    let path = get_config_path();
    if !path.exists() {
        return Ok(AIConfig {
            provider: "ollama".to_string(),
            api_key: None,
            model: "llama3".to_string(),
            endpoint: Some("http://localhost:11434".to_string()),
        });
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config: AIConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

#[command]
pub async fn save_ai_config(config: AIConfig) -> Result<(), String> {
    ensure_app_data_dir();
    let path = get_config_path();
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
}

#[derive(Deserialize)]
struct OpenAIMessage {
    content: String,
}

#[command]
pub async fn generate_sql(prompt: String, schema_context: String) -> Result<String, String> {
    let config = get_ai_config().await?;
    let client = Client::new();

    let system_prompt = format!(
        "You are an expert SQL assistant. Generate a valid SQL query for the following request. \
        Target Database Schema: \n{}\n \
        Return ONLY the SQL query, no markdown, no explanation. If you cannot generate SQL, return a SQL comment explaining why.",
        schema_context
    );

    if config.provider == "ollama" {
        let endpoint = config.endpoint.unwrap_or("http://localhost:11434".to_string());
        let url = format!("{}/api/generate", endpoint);
        
        let body = serde_json::json!({
            "model": config.model,
            "prompt": format!("{}\n\nUser Request: {}", system_prompt, prompt),
            "stream": false
        });

        let res = client.post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
             return Err(format!("Ollama Error: {}", res.status()));
        }

        let ollama_res: OllamaResponse = res.json().await.map_err(|e| e.to_string())?;
        return Ok(ollama_res.response.trim().to_string());

    } else if config.provider == "openai" {
        let api_key = config.api_key.ok_or("OpenAI API Key not set")?;
        let url = "https://api.openai.com/v1/chat/completions";

        let body = serde_json::json!({
            "model": config.model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": prompt }
            ]
        });

        let res = client.post(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            let err_text = res.text().await.unwrap_or_default();
            return Err(format!("OpenAI Error: {}", err_text));
        }

        let openai_res: OpenAIResponse = res.json().await.map_err(|e| e.to_string())?;
        if let Some(choice) = openai_res.choices.first() {
            return Ok(choice.message.content.trim().to_string());
        } else {
            return Err("No response from OpenAI".to_string());
        }
    }

    Err("Unsupported provider".to_string())
}

#[command]
pub async fn explain_query(sql: String) -> Result<String, String> {
    let config = get_ai_config().await?;
    let client = Client::new();

    let system_prompt = "You are an expert database engineer. Explain the following SQL query in simple, concise terms. Focus on performance implications and logic.";

    if config.provider == "ollama" {
        let endpoint = config.endpoint.unwrap_or("http://localhost:11434".to_string());
        let url = format!("{}/api/generate", endpoint);
        
        let body = serde_json::json!({
            "model": config.model,
            "prompt": format!("{}\n\nSQL: {}", system_prompt, sql),
            "stream": false
        });

        let res = client.post(&url).json(&body).send().await.map_err(|e| e.to_string())?;
        let ollama_res: OllamaResponse = res.json().await.map_err(|e| e.to_string())?;
        return Ok(ollama_res.response.trim().to_string());

    } else if config.provider == "openai" {
        let api_key = config.api_key.ok_or("OpenAI API Key not set")?;
        let url = "https://api.openai.com/v1/chat/completions";

        let body = serde_json::json!({
             "model": config.model,
             "messages": [
                 { "role": "system", "content": system_prompt },
                 { "role": "user", "content": sql }
             ]
         });

         let res = client.post(url).header("Authorization", format!("Bearer {}", api_key)).json(&body).send().await.map_err(|e| e.to_string())?;
         let openai_res: OpenAIResponse = res.json().await.map_err(|e| e.to_string())?;
         if let Some(choice) = openai_res.choices.first() {
             return Ok(choice.message.content.trim().to_string());
         }
    }
    
    Err("Unsupported provider".to_string())
}
