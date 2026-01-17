use tauri::State;
use crate::state::AppState;
use mysql_async::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize)]
pub struct CsvPreview {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[derive(Deserialize)]
pub struct CsvImportOptions {
    pub delimiter: String,
    pub skip_header: bool,
    pub mapping: HashMap<String, String>, // CSV Column -> DB Column
}

#[derive(Deserialize)]
pub struct ExportOptions {
    pub tables: Option<Vec<String>>,
    pub export_structure: bool,
    pub export_data: bool,
    pub add_drop_table: bool,
    pub add_create_table: bool,
    pub add_if_not_exists: bool,
    pub data_insertion_mode: String, // "INSERT", "INSERT IGNORE", "REPLACE"
}

#[tauri::command]
pub async fn export_database(db: String, file_path: String, options: ExportOptions, state: State<'_, AppState>) -> Result<(), String> {
    use tokio::io::AsyncWriteExt;
    
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let mut file = tokio::fs::File::create(&file_path).await.map_err(|e| e.to_string())?;

    // Header
    file.write_all(format!("-- Pure Native SQL Manager Dump\n-- Database: {}\n-- Date: {}\n\n", db, chrono::Local::now().to_rfc2822()).as_bytes()).await.map_err(|e| e.to_string())?;
    
    file.write_all("SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n".as_bytes()).await.map_err(|e| e.to_string())?;
    file.write_all("START TRANSACTION;\n".as_bytes()).await.map_err(|e| e.to_string())?;
    file.write_all("SET time_zone = \"+00:00\";\n\n".as_bytes()).await.map_err(|e| e.to_string())?;
    
    file.write_all("/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n".as_bytes()).await.map_err(|e| e.to_string())?;
    file.write_all("/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n".as_bytes()).await.map_err(|e| e.to_string())?;
    file.write_all("/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n".as_bytes()).await.map_err(|e| e.to_string())?;
    file.write_all("/*!40101 SET NAMES utf8mb4 */;\n\n".as_bytes()).await.map_err(|e| e.to_string())?;

    let all_tables: Vec<String> = conn.query(format!("SHOW TABLES FROM `{}`", db)).await.map_err(|e| e.to_string())?;
    
    // Filter tables
    let tables_to_export: Vec<String> = match &options.tables {
        Some(selected) => all_tables.into_iter().filter(|t| selected.contains(t)).collect(),
        None => all_tables,
    };

    for table in tables_to_export {
        // 1. Structure
        if options.export_structure {
            let create_res: Vec<(String, String)> = conn.query(format!("SHOW CREATE TABLE `{}`.`{}`", db, table))
                .await.map_err(|e| e.to_string())?;
            
            if let Some((_, mut create_sql)) = create_res.into_iter().next() {
                 file.write_all(format!("--\n-- Structure for table `{}`\n--\n\n", table).as_bytes()).await.map_err(|e| e.to_string())?;
                 
                 if options.add_drop_table {
                    file.write_all(format!("DROP TABLE IF EXISTS `{}`;\n", table).as_bytes()).await.map_err(|e| e.to_string())?;
                 }

                 if options.add_if_not_exists {
                     create_sql = create_sql.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS");
                 }
                 
                 file.write_all(format!("{};\n\n", create_sql).as_bytes()).await.map_err(|e| e.to_string())?;
            }
        }

        // 2. Data
        if options.export_data {
            file.write_all(format!("--\n-- Dumping data for table `{}`\n--\n\n", table).as_bytes()).await.map_err(|e| e.to_string())?;
            
            let rows: Vec<mysql_async::Row> = conn.query(format!("SELECT * FROM `{}`.`{}`", db, table)).await.map_err(|e| e.to_string())?;
            
            if !rows.is_empty() {
                 let insert_stmt = match options.data_insertion_mode.as_str() {
                     "INSERT IGNORE" => "INSERT IGNORE INTO",
                     "REPLACE" => "REPLACE INTO",
                     _ => "INSERT INTO",
                 };

                 file.write_all(format!("{} `{}` VALUES \n", insert_stmt, table).as_bytes()).await.map_err(|e| e.to_string())?;
                 
                 for (i, row) in rows.iter().enumerate() {
                     let values: Vec<String> = (0..row.len()).map(|idx| {
                         let val: mysql_async::Value = row.get(idx).unwrap_or(mysql_async::Value::NULL);
                         match val {
                             mysql_async::Value::NULL => "NULL".to_string(),
                             mysql_async::Value::Bytes(b) => {
                                 let s = String::from_utf8_lossy(&b);
                                 format!("'{}'", s
                                    .replace("\\", "\\\\")
                                    .replace("'", "\\'")
                                    .replace("\n", "\\n")
                                    .replace("\r", "\\r")
                                    .replace("\x00", "\\0")
                                    .replace("\x1a", "\\Z")
                                 )
                             },
                             mysql_async::Value::Int(n) => n.to_string(),
                             mysql_async::Value::UInt(n) => n.to_string(),
                             mysql_async::Value::Float(n) => n.to_string(),
                             mysql_async::Value::Double(n) => n.to_string(),
                             mysql_async::Value::Date(y, m, d, h, min, s, us) => {
                                 format!("'{:04}-{:02}-{:02} {:02}:{:02}:{:02}.{:06}'", y, m, d, h, min, s, us)
                             },
                             mysql_async::Value::Time(neg, d, h, m, s, us) => {
                                 let sign = if neg { "-" } else { "" };
                                 format!("'{}{}:{:02}:{:02}.{:06}'", sign, d * 24 + h as u32, m, s, us)
                             },
                             }
                     }).collect();
                     
                     let line = format!("({})", values.join(", "));
                     file.write_all(line.as_bytes()).await.map_err(|e| e.to_string())?;
                     
                     if i < rows.len() - 1 {
                         file.write_all(b",\n").await.map_err(|e| e.to_string())?;
                     } else {
                         file.write_all(b";\n\n").await.map_err(|e| e.to_string())?;
                     }
                 }
            }
        }
    }
    
    file.write_all("COMMIT;\n".as_bytes()).await.map_err(|e| e.to_string())?;
    file.write_all("/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n".as_bytes()).await.map_err(|e| e.to_string())?;
    file.write_all("/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n".as_bytes()).await.map_err(|e| e.to_string())?;
    file.write_all("/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n".as_bytes()).await.map_err(|e| e.to_string())?;
    
    Ok(())
}

fn parse_and_split_sql(sql: &str) -> Vec<String> {
    let mut stmts = Vec::new();
    let mut current = String::new();
    let mut in_quote = None; 
    let mut in_comment = false; 
    let mut in_block_comment = false; 
    
    let mut chars = sql.chars().peekable();
    while let Some(c) = chars.next() {
        if in_comment {
            if c == '\n' {
                in_comment = false;
                current.push(c);
            }
            continue;
        }
        
        if in_block_comment {
            current.push(c);
            if c == '*' {
                if let Some(&next_c) = chars.peek() {
                    if next_c == '/' {
                        chars.next();
                        current.push('/');
                        in_block_comment = false;
                    }
                }
            }
            continue;
        }

        if let Some(q) = in_quote {
            current.push(c);
            if c == '\\' {
                if let Some(next_c) = chars.next() {
                    current.push(next_c);
                }
                continue;
            }
            if c == q {
                if let Some(&next_c) = chars.peek() {
                    if next_c == q {
                        chars.next(); 
                        current.push(next_c);
                        continue;
                    }
                }
                in_quote = None;
            }
        } else {
            if c == '-' {
                if let Some(&next_c) = chars.peek() {
                    if next_c == '-' {
                         chars.next();
                         in_comment = true;
                         continue;
                    }
                }
            }
            if c == '#' {
                in_comment = true;
                continue;
            }
            if c == '/' {
                 if let Some(&next_c) = chars.peek() {
                    if next_c == '*' {
                         chars.next();
                         current.push('/');
                         current.push('*');
                         in_block_comment = true;
                         continue;
                    }
                 }
            }

            if c == '\'' || c == '"' || c == '`' {
                in_quote = Some(c);
                current.push(c);
            } else if c == ';' {
                if !current.trim().is_empty() {
                    stmts.push(current.trim().to_string());
                }
                current.clear();
            } else {
                current.push(c);
            }
        }
    }
    if !current.trim().is_empty() {
        stmts.push(current.trim().to_string());
    }
    stmts
}

#[tauri::command]
pub async fn import_database(db: String, file_path: String, state: State<'_, AppState>) -> Result<usize, String> {
    use tokio::io::AsyncReadExt;
    
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let mut file = tokio::fs::File::open(&file_path).await.map_err(|e| format!("Failed to open file: {}", e))?;
    let mut content = String::new();
    file.read_to_string(&mut content).await.map_err(|e| format!("Failed to read file: {}", e))?;

    let stmts = parse_and_split_sql(&content);
    let total_stmts = stmts.len();

    conn.query_drop(format!("USE `{}`", db)).await.map_err(|e| e.to_string())?;

    for stmt in stmts {
        conn.query_drop(stmt).await.map_err(|e| e.to_string())?;
    }

    Ok(total_stmts)
}

#[tauri::command]
pub async fn import_sql(db: String, sql: String, state: State<'_, AppState>) -> Result<usize, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    if !db.is_empty() {
        conn.query_drop(format!("USE `{}`", db)).await.map_err(|e| e.to_string())?;
    }
    
    let stmts = parse_and_split_sql(&sql);
    let total = stmts.len();
    
    for stmt in stmts {
        conn.query_drop(stmt).await.map_err(|e| e.to_string())?;
    }
    
    Ok(total)
}

#[tauri::command]
pub async fn get_csv_preview(file_path: String, delimiter: String) -> Result<CsvPreview, String> {
    let mut reader = csv::ReaderBuilder::new()
        .delimiter(delimiter.as_bytes()[0])
        .from_path(&file_path)
        .map_err(|e| e.to_string())?;

    let headers = reader.headers()
        .map_err(|e| e.to_string())?
        .iter()
        .map(|s| s.to_string())
        .collect();

    let mut rows = Vec::new();
    for result in reader.records().take(5) {
        let record = result.map_err(|e| e.to_string())?;
        rows.push(record.iter().map(|s| s.to_string()).collect());
    }

    Ok(CsvPreview { headers, rows })
}

#[tauri::command]
pub async fn import_csv(
    db: String,
    table: String,
    file_path: String,
    options: CsvImportOptions,
    state: State<'_, AppState>
) -> Result<usize, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let mut reader = csv::ReaderBuilder::new()
        .delimiter(options.delimiter.as_bytes()[0])
        .has_headers(!options.skip_header)
        .from_path(&file_path)
        .map_err(|e| e.to_string())?;

    let headers: Vec<String> = reader.headers()
        .map_err(|e| e.to_string())?
        .iter()
        .map(|s| s.to_string())
        .collect();

    // Prepare mapping: index in CSV -> DB column name
    let mut col_map = Vec::new();
    for (i, h) in headers.iter().enumerate() {
        if let Some(db_col) = options.mapping.get(h) {
            col_map.push((i, db_col.clone()));
        }
    }

    if col_map.is_empty() {
        return Err("No columns mapped for import".to_string());
    }

    let mut count = 0;
    
    // Use an atomic batch if possible, but let's do sequential for simplicity in MVP.
    // For large files, we should use LOAD DATA LOCAL INFILE or a batched INSERT.
    // Let's implement a batched INSERT for better performance.
    
    let db_cols: Vec<String> = col_map.iter().map(|(_, name)| format!("`{}`", name)).collect();
    let col_list = db_cols.join(", ");
    let placeholders = vec!["?"; col_map.len()].join(", ");
    let sql = format!("INSERT INTO `{}`.`{}` ({}) VALUES ({})", db, table, col_list, placeholders);

    for result in reader.records() {
        let record = result.map_err(|e| e.to_string())?;
        let mut params = Vec::new();
        
        for (idx, _) in &col_map {
            let val = record.get(*idx).unwrap_or("");
            params.push(mysql_async::Value::from(val));
        }
        
        conn.exec_drop(&sql, params).await.map_err(|e| e.to_string())?;
        count += 1;
    }

    Ok(count)
}
