use tauri::State;
use crate::state::AppState;
use crate::commands::common::{mysql_to_json, render_table_html};
use mysql_async::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
}

#[derive(Serialize)]
pub struct QueryResultHtml {
    pub head_html: String,
    pub body_html: String,
    pub pagination_html: String,
    pub count: usize,
    pub total_rows: u64,
    pub query_time: f64,
}

#[derive(Deserialize, Default)]
pub struct QueryOptions {
    pub rollback: Option<bool>,
    pub disable_fk_checks: Option<bool>,
}

#[tauri::command]
pub async fn execute_query(sql: String, db: Option<String>, options: Option<QueryOptions>, state: State<'_, AppState>) -> Result<QueryResult, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    if let Some(db_name) = db {
        if !db_name.is_empty() {
            conn.query_drop(format!("USE `{}`", db_name)).await.map_err(|e| e.to_string())?;
        }
    }

    let opts = options.unwrap_or_default();
    
    if opts.disable_fk_checks.unwrap_or(false) {
        conn.query_drop("SET FOREIGN_KEY_CHECKS = 0").await.map_err(|e| e.to_string())?;
    }
    
    if opts.rollback.unwrap_or(false) {
        conn.query_drop("START TRANSACTION").await.map_err(|e| e.to_string())?;
    }

    let mut result = conn.query_iter(&sql).await.map_err(|e| format!("SQL Error: {}", e))?;
    let mut columns = Vec::new();
    if let Some(col_slice) = result.columns() {
        for col in col_slice.iter() {
            columns.push(col.name_str().into_owned());
        }
    }

    let rows_data: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    let mut final_rows = Vec::new();

    for row in rows_data {
        let mut row_values = Vec::new();
        for i in 0..columns.len() {
            let val: mysql_async::Value = row.get(i).unwrap_or(mysql_async::Value::NULL);
            row_values.push(mysql_to_json(val));
        }
        final_rows.push(row_values);
    }
    
    if opts.rollback.unwrap_or(false) {
        conn.query_drop("ROLLBACK").await.map_err(|e| e.to_string())?;
    }
    
    if opts.disable_fk_checks.unwrap_or(false) {
         conn.query_drop("SET FOREIGN_KEY_CHECKS = 1").await.map_err(|e| e.to_string())?;
    }

    Ok(QueryResult {
        columns,
        rows: final_rows,
    })
}

#[tauri::command]
pub async fn execute_query_html(sql: String, db: Option<String>, state: State<'_, AppState>) -> Result<QueryResultHtml, String> {
    let start = std::time::Instant::now();
    // We call the logic directly or reuse the command if allowed, but since we are in same module, we can call the function if we didn't use State wrapper or just inline logic. 
    // Calling execute_query(..., state) works because it is just a function.
    let res = execute_query(sql, db, None, state).await?;
    let duration = start.elapsed().as_secs_f64();
    
    let (head_html, body_html) = render_table_html(&res.columns, &res.rows);
    
    Ok(QueryResultHtml {
        head_html,
        body_html,
        pagination_html: String::new(),
        count: res.rows.len(),
        total_rows: res.rows.len() as u64,
        query_time: duration,
    })
}
