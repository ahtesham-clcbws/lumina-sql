use tauri::State;
use crate::state::AppState;
use crate::commands::common::{mysql_to_json, render_table_html, render_pagination_html};
use mysql_async::prelude::*;
use serde::Serialize;

#[derive(Serialize)]
pub struct BrowseResultRaw {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: u64,
    pub primary_key: Option<String>,
}

#[derive(Serialize)]
pub struct TableInfo {
    pub name: String,
    pub rows: u64,
    pub engine: String,
    pub collation: String,
    pub size: u64, 
    pub overhead: u64, 
}

#[derive(Serialize)]
pub struct TablesResultHtml {
    pub body_html: String,
    pub count: usize,
}

#[derive(Serialize)]
pub struct ColumnInfo {
    pub field: String,
    pub data_type: String,
    pub collation: Option<String>,
    pub null: String,
    pub key: String,
    pub default: Option<String>,
    pub extra: String,
}

#[derive(Serialize)]
pub struct IndexInfo {
    pub name: String,
    pub column: String,
    pub non_unique: bool,
    pub seq_in_index: u32,
    pub is_primary: bool,
}

// Re-using QueryResultHtml from query module or redefining? 
// Let's redefine or import if we make it public in query (we did).
use crate::commands::query::QueryResultHtml;

#[tauri::command]
pub async fn get_tables(db: String, state: State<'_, AppState>) -> Result<Vec<TableInfo>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    conn.query_drop(format!("USE `{}`", db)).await.map_err(|e| e.to_string())?;
    
    let mut result = conn.query_iter("SHOW TABLE STATUS").await.map_err(|e| e.to_string())?;
    let rows: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    
    let mut tables = Vec::new();
    for row in rows {
        tables.push(TableInfo {
            name: row.get::<Option<String>, _>("Name").flatten().unwrap_or_default(),
            rows: row.get::<Option<u64>, _>("Rows").flatten().unwrap_or(0),
            engine: row.get::<Option<String>, _>("Engine").flatten().unwrap_or_default(),
            collation: row.get::<Option<String>, _>("Collation").flatten().unwrap_or_default(),
            size: row.get::<Option<u64>, _>("Data_length").flatten().unwrap_or(0) + row.get::<Option<u64>, _>("Index_length").flatten().unwrap_or(0),
            overhead: row.get::<Option<u64>, _>("Data_free").flatten().unwrap_or(0),
        });
    }
    
    Ok(tables)
}

fn render_structure_html(tables: &[TableInfo]) -> String {
    let mut body = String::new();
    
    for table in tables {
        body.push_str("<tr class=\"hover:bg-white/5 transition-colors cursor-pointer\">");
        
        // Checkbox
        body.push_str(&format!(
            "<td class=\"px-4 py-2.5 border-b border-white/5 text-center\" onclick=\"event.stopPropagation()\">\
                <input type=\"checkbox\" class=\"struct-checkbox\" value=\"{}\" onchange=\"toggleStructRow(this, '{}')\">\
            </td>", 
            table.name, table.name
        ));
        
        // Name
        body.push_str(&format!("<td class=\"px-4 py-2.5 border-b border-white/5 font-semibold text-accent\">{}</td>", table.name));
        
        // Actions
        body.push_str(&format!("<td class=\"px-4 py-2.5 border-b border-white/5\">\
            <div class=\"flex gap-2\">\
                <a href=\"#\" class=\"pma-action-icon browse\" title=\"Browse\" onclick=\"openTable('{}', 'browse'); return false;\"><i data-lucide=\"book-open-check\" style=\"width:14px;height:14px;\"></i></a>\
                <a href=\"#\" class=\"pma-action-icon search\" title=\"Search\" onclick=\"openTable('{}', 'search'); return false;\"><i data-lucide=\"search\" style=\"width:14px;height:14px;\"></i></a>\
                <a href=\"#\" class=\"pma-action-icon drop text-red-400\" title=\"Drop\" onclick=\"confirmDropTable('{}'); return false;\"><i data-lucide=\"trash-2\" style=\"width:14px;height:14px;\"></i></a>\
                <a href=\"#\" class=\"pma-action-icon empty text-orange-400\" title=\"Empty\" onclick=\"confirmEmptyTable('{}'); return false;\"><i data-lucide=\"eraser\" style=\"width:14px;height:14px;\"></i></a>\
            </div>\
        </td>", table.name, table.name, table.name, table.name));
        
        // Metrics
        body.push_str(&format!("<td class=\"px-4 py-2.5 border-b border-white/5 text-right font-mono text-xs opacity-80\">{}</td>", 
            table.rows));
            
        body.push_str(&format!("<td class=\"px-4 py-2.5 border-b border-white/5 text-xs opacity-60 uppercase\">{}</td>", 
            table.engine));
            
        body.push_str(&format!("<td class=\"px-4 py-2.5 border-b border-white/5 text-xs opacity-60\">{}</td>", 
            table.collation));
            
        let size_mb = (table.size as f64) / 1024.0 / 1024.0;
        let size_str = if size_mb < 1.0 { format!("{:.2} KB", (table.size as f64) / 1024.0) } else { format!("{:.2} MB", size_mb) };
        body.push_str(&format!("<td class=\"px-4 py-2.5 border-b border-white/5 text-right font-mono text-xs opacity-80\">{}</td>", size_str));
        
        let overhead_mb = (table.overhead as f64) / 1024.0 / 1024.0;
        let overhead_str = if overhead_mb < 0.001 { "-".to_string() } else { format!("{:.2} MB", overhead_mb) };
        body.push_str(&format!("<td class=\"px-4 py-2.5 border-b border-white/5 text-right font-mono text-xs text-orange-400/60\">{}</td>", overhead_str));
        
        body.push_str("</tr>");
    }
    
    if tables.is_empty() {
        body = String::from("<tr><td colspan=\"8\" class=\"p-12 text-center opacity-30 italic\">No tables found in this database.</td></tr>");
    }

    body
}

// Helper to render columns and indexes
fn render_detailed_structure_html(columns: &[ColumnInfo], indexes: &[crate::commands::indexes::IndexInfo]) -> String {
    let mut html = String::new();
    
    // COLUMNS SECTION
    html.push_str("<div class=\"mb-8\">");
    html.push_str("<h3 class=\"text-md font-bold mb-3 flex items-center gap-2\"><i data-lucide=\"columns-3\" class=\"w-4 h-4 opacity-70\"></i> Columns</h3>");
    html.push_str("<div class=\"glass-table-wrapper rounded-lg overflow-hidden border border-white/10\">");
    html.push_str("<table class=\"w-full text-left text-sm\">");
    html.push_str("<thead class=\"bg-black/20 text-xs uppercase font-semibold text-white/50\"><tr>");
    html.push_str("<th class=\"px-4 py-2\">#</th><th class=\"px-4 py-2\">Name</th><th class=\"px-4 py-2\">Type</th><th class=\"px-4 py-2\">Collation</th><th class=\"px-4 py-2\">Null</th><th class=\"px-4 py-2\">Default</th><th class=\"px-4 py-2\">Extra</th><th class=\"px-4 py-2 text-right\">Action</th>");
    html.push_str("</tr></thead><tbody class=\"divide-y divide-white/5\">");

    for (i, col) in columns.iter().enumerate() {
        let key_icon = if col.key == "PRI" { 
            "<i data-lucide=\"key\" class=\"w-3 h-3 text-yellow-500 inline mr-1\"></i>" 
        } else if col.key == "MUL" {
            "<i data-lucide=\"key\" class=\"w-3 h-3 text-blue-400 inline mr-1\"></i>" 
        } else if col.key == "UNI" {
            "<i data-lucide=\"key\" class=\"w-3 h-3 text-green-400 inline mr-1\"></i>" 
        } else { "" };

        html.push_str("<tr class=\"hover:bg-white/5 transition-colors\">");
        html.push_str(&format!("<td class=\"px-4 py-2 opacity-50 font-mono text-xs\">{}</td>", i+1));
        html.push_str(&format!("<td class=\"px-4 py-2 font-bold\">{}{}</td>", key_icon, col.field));
        html.push_str(&format!("<td class=\"px-4 py-2 text-accent font-mono text-xs\">{}</td>", col.data_type));
        html.push_str(&format!("<td class=\"px-4 py-2 text-xs opacity-70\">{}</td>", col.collation.as_deref().unwrap_or("-")));
        html.push_str(&format!("<td class=\"px-4 py-2 text-xs\">{}</td>", col.null));
        html.push_str(&format!("<td class=\"px-4 py-2 text-xs font-mono opacity-80\">{}</td>", col.default.as_deref().unwrap_or("<em>NULL</em>")));
        html.push_str(&format!("<td class=\"px-4 py-2 text-xs uppercase opacity-70\">{}</td>", col.extra));
        html.push_str(&format!("<td class=\"px-4 py-2 text-right\">\
            <button class=\"icon-btn text-blue-400 hover:bg-blue-500/20\" title=\"Change\" onclick=\"window.editColumn('{}')\"><i data-lucide=\"pencil\" style=\"width:14px;\"></i></button>\
            <button class=\"icon-btn text-red-400 hover:bg-red-500/20\" title=\"Drop\" onclick=\"window.dropColumn('{}')\"><i data-lucide=\"trash-2\" style=\"width:14px;\"></i></button>\
        </td>", col.field, col.field));
        html.push_str("</tr>");
    }
    html.push_str("</tbody></table></div></div>");

    // INDEXES SECTION
    html.push_str("<div class=\"mb-8\">");
    html.push_str("<h3 class=\"text-md font-bold mb-3 flex items-center gap-2\"><i data-lucide=\"list-tree\" class=\"w-4 h-4 opacity-70\"></i> Indexes</h3>");
    html.push_str("<div class=\"glass-table-wrapper rounded-lg overflow-hidden border border-white/10\">");
    html.push_str("<table class=\"w-full text-left text-sm\">");
    html.push_str("<thead class=\"bg-black/20 text-xs uppercase font-semibold text-white/50\"><tr>");
    html.push_str("<th class=\"px-4 py-2\">Key Name</th><th class=\"px-4 py-2\">Type</th><th class=\"px-4 py-2\">Unique</th><th class=\"px-4 py-2\">Column(s)</th><th class=\"px-4 py-2 text-right\">Action</th>");
    html.push_str("</tr></thead><tbody class=\"divide-y divide-white/5\">");

    if indexes.is_empty() {
        html.push_str("<tr><td colspan=\"5\" class=\"p-4 text-center opacity-50 italic\">No indexes defined.</td></tr>");
    } else {
        // Group by key name to show composite indexes properly
        let mut grouped: std::collections::HashMap<String, Vec<&crate::commands::indexes::IndexInfo>> = std::collections::HashMap::new();
        let mut order = Vec::new();
        
        for idx in indexes {
             if !grouped.contains_key(&idx.name) {
                 grouped.insert(idx.name.clone(), Vec::new());
                 order.push(idx.name.clone());
             }
             grouped.get_mut(&idx.name).unwrap().push(idx);
        }

        for key_name in order {
             if let Some(group) = grouped.get(&key_name) {
                 let first = group[0];
                 let cols = group.iter().map(|g| g.column.clone()).collect::<Vec<_>>().join(", ");
                 let type_badge = if first.is_primary {
                     "<span class=\"px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase border border-yellow-500/30\">PRIMARY</span>"
                 } else if !first.non_unique {
                     "<span class=\"px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase border border-green-500/30\">UNIQUE</span>"
                 } else {
                     "<span class=\"px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase border border-blue-500/30\">INDEX</span>"
                 };
                 
                 let unique_str = if !first.non_unique { "Yes" } else { "No" };

                 html.push_str("<tr class=\"hover:bg-white/5 transition-colors\">");
                 html.push_str(&format!("<td class=\"px-4 py-2 font-bold font-mono text-xs\">{}</td>", key_name));
                 html.push_str(&format!("<td class=\"px-4 py-2\">{}</td>", type_badge));
                 html.push_str(&format!("<td class=\"px-4 py-2 text-xs opacity-70\">{}</td>", unique_str));
                 html.push_str(&format!("<td class=\"px-4 py-2 font-mono text-xs text-accent\">{}</td>", cols));
                 html.push_str(&format!("<td class=\"px-4 py-2 text-right\">\
                     <button class=\"icon-btn text-red-400 hover:bg-red-500/20\" title=\"Drop\" onclick=\"window.dropIndex('{}')\"><i data-lucide=\"trash-2\" style=\"width:14px;\"></i></button>\
                 </td>", key_name));
                 html.push_str("</tr>");
             }
        }
    }
    html.push_str("</tbody></table></div>");
    
    // Add Index Form
    html.push_str("<div class=\"mt-4 p-4 border border-white/5 rounded-lg bg-white/5\">");
    html.push_str("<h4 class=\"text-sm font-bold mb-3\">Add Index</h4>");
    html.push_str("<div class=\"flex gap-2 items-center\">");
    html.push_str("<input type=\"text\" id=\"new-index-name\" placeholder=\"Index Name (Optional)\" class=\"p-2 rounded bg-black/20 border border-white/10 text-xs w-48\">");
    html.push_str("<select id=\"new-index-type\" class=\"p-2 rounded bg-black/20 border border-white/10 text-xs\">");
    html.push_str("<option value=\"INDEX\">INDEX</option><option value=\"UNIQUE\">UNIQUE</option><option value=\"FULLTEXT\">FULLTEXT</option><option value=\"SPATIAL\">SPATIAL</option>");
    html.push_str("</select>");
    html.push_str("<div class=\"text-xs opacity-50 px-2\">on</div>");
     // We need to render column options for selection.
     // For simplicity in this static string builder, let's inject a standard select we will populate or make multi-select later.
     // Actually constructing a multi-select UI in pure HTML string is hard without JS helpers.
     // Let's rely on frontend JS to populate a 'new-index-cols' select, OR just provide a text input for cols for now (v0.1)
    html.push_str("<input type=\"text\" id=\"new-index-cols\" placeholder=\"Column1, Column2\" class=\"p-2 rounded bg-black/20 border border-white/10 text-xs w-64\">");
    html.push_str("<button class=\"px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors\" onclick=\"window.addIndex()\">Go</button>");
    html.push_str("</div><p class=\"text-[10px] opacity-40 mt-2\">Comma separated column names for composite index.</p>");
    html.push_str("</div></div>");

    html
}

#[tauri::command]
pub async fn get_tables_html(db: String, table: Option<String>, state: State<'_, AppState>) -> Result<TablesResultHtml, String> {
    if let Some(tbl) = table {
        // Detailed Structure View (Columns + Indexes)
        let columns = get_columns(db.clone(), tbl.clone(), state.clone()).await?;
        // Need to call proper module for indexes
        let indexes = crate::commands::indexes::get_indexes(db.clone(), tbl.clone(), state.clone()).await?;
        
        // Render
        let body_html = render_detailed_structure_html(&columns, &indexes);
        return Ok(TablesResultHtml {
            body_html,
            count: columns.len(), // Use column count here
        });
    }

    // Default Table List View
    let tables = get_tables(db, state).await?;
    let body_html = render_structure_html(&tables);
    
    Ok(TablesResultHtml {
        body_html,
        count: tables.len(),
    })
}

#[tauri::command]
pub async fn browse_table_html(db: String, table: String, page: u32, limit: u32, state: State<'_, AppState>) -> Result<QueryResultHtml, String> {
    let start = std::time::Instant::now();
    let offset = (page - 1) * limit;
    
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    // 1. Get Count
    let count_sql = format!("SELECT count(*) FROM `{}`.`{}`", db, table);
    let count: Option<u64> = conn.query_first(count_sql).await.map_err(|e| e.to_string())?;
    let total_rows = count.unwrap_or(0);

    // 2. Get Primary Key
    let pk_query = format!("SHOW KEYS FROM `{}`.`{}` WHERE Key_name = 'PRIMARY'", db, table);
    let pk_row: Option<mysql_async::Row> = conn.query_first(pk_query).await.map_err(|e| e.to_string())?;
    let order_by = if let Some(row) = pk_row {
        let col_name: String = row.get("Column_name").unwrap_or_default();
        format!("ORDER BY `{}` ASC", col_name)
    } else {
        "".to_string()
    };

    // 3. Get Data
    let sql = format!("SELECT * FROM `{}`.`{}` {} LIMIT {} OFFSET {}", db, table, order_by, limit, offset);
    let mut result = conn.query_iter(sql).await.map_err(|e| e.to_string())?;
    
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

    let duration = start.elapsed().as_secs_f64();
    
    let (head_html, body_html) = render_table_html(&columns, &final_rows);
    let pagination_html = render_pagination_html(page, total_rows, limit);
    
    Ok(QueryResultHtml {
        head_html,
        body_html,
        pagination_html,
        count: final_rows.len(),
        total_rows,
        query_time: duration,
    })
}

#[tauri::command]
pub async fn browse_table(db: String, table: String, page: u32, limit: u32, state: State<'_, AppState>) -> Result<BrowseResultRaw, String> {
    let offset = (page - 1) * limit;
    
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    
    // 1. Get Count
    let count_sql = format!("SELECT count(*) FROM `{}`.`{}`", db, table);
    let count: Option<u64> = conn.query_first(count_sql).await.map_err(|e| e.to_string())?;
    let total_rows = count.unwrap_or(0);

    // 2. Get Primary Key for sorting
    let pk_query = format!("SHOW KEYS FROM `{}`.`{}` WHERE Key_name = 'PRIMARY'", db, table);
    let pk_row: Option<mysql_async::Row> = conn.query_first(pk_query).await.map_err(|e| e.to_string())?;
    
    let pk_col = pk_row.map(|row| row.get::<String, _>("Column_name").unwrap_or_default());
    
    let order_by = if let Some(ref col_name) = pk_col {
        format!("ORDER BY `{}` ASC", col_name)
    } else {
        "".to_string()
    };

    // 3. Get Data
    let sql = format!("SELECT * FROM `{}`.`{}` {} LIMIT {} OFFSET {}", db, table, order_by, limit, offset);
    let mut result = conn.query_iter(sql).await.map_err(|e| e.to_string())?;
    
    let mut columns = Vec::new();
    if let Some(col_slice) = result.columns() {
        for col in col_slice.iter() {
            columns.push(col.name_str().into_owned());
        }
    }

    let rows_data: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    let mut rows = Vec::new();

    for row in rows_data {
        let mut row_values = Vec::new();
        for i in 0..columns.len() {
            let val: mysql_async::Value = row.get(i).unwrap_or(mysql_async::Value::NULL);
            row_values.push(mysql_to_json(val));
        }
        rows.push(row_values);
    }
    
    Ok(BrowseResultRaw {
        columns,
        rows,
        total_rows,
        primary_key: pk_col,
    })
}

#[tauri::command]
pub async fn update_cell(
    db: String, 
    table: String, 
    column: String, 
    value: serde_json::Value, 
    primary_key_col: String,
    primary_key_val: serde_json::Value,
    state: State<'_, AppState>
) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    // Determine value representation (escape if string)
    let val_str = match value {
        serde_json::Value::String(s) => format!("'{}'", s.replace("'", "''")),
        serde_json::Value::Null => "NULL".to_string(),
        _ => value.to_string(),
    };

    let pk_val_str = match primary_key_val {
        serde_json::Value::String(s) => format!("'{}'", s.replace("'", "''")),
        _ => primary_key_val.to_string(),
    };

    let sql = format!(
        "UPDATE `{}`.`{}` SET `{}` = {} WHERE `{}` = {}", 
        db, table, column, val_str, primary_key_col, pk_val_str
    );

    conn.query_drop(sql).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_columns(db: String, table: String, state: State<'_, AppState>) -> Result<Vec<ColumnInfo>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    conn.query_drop(format!("USE `{}`", db)).await.map_err(|e| e.to_string())?;
    
    let query = format!("SHOW FULL COLUMNS FROM `{}`.`{}`", db, table);
    let mut result = conn.query_iter(query).await.map_err(|e| e.to_string())?;
    let rows: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    
    let mut columns = Vec::new();
    for row in rows {
        columns.push(ColumnInfo {
            field: row.get::<Option<String>, _>("Field").flatten().unwrap_or_default(),
            data_type: row.get::<Option<String>, _>("Type").flatten().unwrap_or_default(),
            collation: row.get::<Option<String>, _>("Collation").flatten(), 
            null: row.get::<Option<String>, _>("Null").flatten().unwrap_or_default(),
            key: row.get::<Option<String>, _>("Key").flatten().unwrap_or_default(),
            default: row.get::<Option<String>, _>("Default").flatten(),
            extra: row.get::<Option<String>, _>("Extra").flatten().unwrap_or_default(),
        });
    }
    Ok(columns)
}



#[tauri::command]
pub async fn get_table_count(db: String, table: String, state: State<'_, AppState>) -> Result<u64, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    let count: Option<u64> = conn.query_first(format!("SELECT COUNT(*) FROM `{}`.`{}`", db, table)).await.map_err(|e| e.to_string())?;
    Ok(count.unwrap_or(0))
}

#[tauri::command]
pub async fn rename_table(db: String, table: String, new_name: String, new_db: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let target_db = new_db.unwrap_or_else(|| db.clone());
    let query = format!("RENAME TABLE `{}`.`{}` TO `{}`.`{}`", db, table, target_db, new_name);
    
    conn.query_drop(query).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn truncate_table(db: String, table: String, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;
    conn.query_drop(format!("TRUNCATE TABLE `{}`.`{}`", db, table)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_table(db: String, table: String, new_db: String, new_table: String, with_data: bool, state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let create_query = format!("CREATE TABLE `{}`.`{}` LIKE `{}`.`{}`", new_db, new_table, db, table);
    conn.query_drop(create_query).await.map_err(|e| e.to_string())?;

    if with_data {
        let insert_query = format!("INSERT INTO `{}`.`{}` SELECT * FROM `{}`.`{}`", new_db, new_table, db, table);
        conn.query_drop(insert_query).await.map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn table_maintenance(db: String, table: String, op: String, state: State<'_, AppState>) -> Result<Vec<Vec<String>>, String> {
    let pool = {
        let pool_guard = state.pool.lock().unwrap();
        pool_guard.as_ref().cloned().ok_or("Not connected")?
    };
    let mut conn = pool.get_conn().await.map_err(|e| e.to_string())?;

    let valid_ops = ["ANALYZE", "OPTIMIZE", "CHECK", "CHECKSUM", "REPAIR", "FLUSH"];
    let op_upper = op.to_uppercase();
    if !valid_ops.contains(&op_upper.as_str()) {
        return Err("Invalid maintenance operation".to_string());
    }

    let query = format!("{} TABLE `{}`.`{}`", op_upper, db, table);
    let mut result = conn.query_iter(query).await.map_err(|e| e.to_string())?;
    
    let result_vec: Vec<mysql_async::Row> = result.collect().await.map_err(|e| e.to_string())?;
    
    let mut rows: Vec<Vec<String>> = Vec::new();
    for row in result_vec {
        let mut row_data = Vec::new();
        for i in 0..row.len() {
             let val: Option<String> = row.get(i);
             row_data.push(val.unwrap_or_else(|| "NULL".to_string()));
        }
        rows.push(row_data);
    }
    
    Ok(rows)
}

