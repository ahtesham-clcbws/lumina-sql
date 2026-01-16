use mysql_async;
use serde_json;

pub fn mysql_to_json(val: mysql_async::Value) -> serde_json::Value {
    match val {
        mysql_async::Value::NULL => serde_json::Value::Null,
        mysql_async::Value::Bytes(b) => {
            String::from_utf8(b)
                .map(serde_json::Value::String)
                .unwrap_or_else(|_| serde_json::Value::Null)
        }
        mysql_async::Value::Int(i) => serde_json::Value::Number(i.into()),
        mysql_async::Value::UInt(u) => serde_json::Value::Number(u.into()),
        mysql_async::Value::Float(f) => {
            serde_json::Number::from_f64(f as f64)
                .map(serde_json::Value::Number)
                .unwrap_or(serde_json::Value::Null)
        }
        mysql_async::Value::Double(d) => {
            serde_json::Number::from_f64(d)
                .map(serde_json::Value::Number)
                .unwrap_or(serde_json::Value::Null)
        }
        mysql_async::Value::Date(y, m, d, h, i, s, ms) => {
            serde_json::Value::String(format!("{}-{:02}-{:02} {:02}:{:02}:{:02}.{:03}", y, m, d, h, i, s, ms))
        }
        mysql_async::Value::Time(neg, d, h, m, s, ms) => {
            serde_json::Value::String(format!("{}{}d {:02}:{:02}:{:02}.{:03}", if neg { "-" } else { "" }, d, h, m, s, ms))
        }
    }
}

pub fn render_pagination_html(page: u32, total: u64, limit: u32) -> String {
    let total_pages = (total as f64 / limit as f64).ceil() as u32;
    let total_pages = if total_pages == 0 { 1 } else { total_pages };
    
    let prev_disabled = if page <= 1 { "disabled" } else { "" };
    let next_disabled = if page >= total_pages { "disabled" } else { "" };
    
    format!(r#"
        <div class="flex items-center gap-2 p-2 px-4 bg-black/10 border-b border-white/5">
            <span class="text-[11px] opacity-60 mr-4">Showing page <b>{}</b> of <b>{}</b> ({} total rows)</span>
            
            <button class="icon-btn-sm" title="First" onclick="document.dispatchEvent(new CustomEvent('browse:page', {{detail: {}}}));" {}>
                <i data-lucide="chevrons-left"></i>
            </button>
            <button class="icon-btn-sm" title="Prev" onclick="document.dispatchEvent(new CustomEvent('browse:page', {{detail: {}}}));" {}>
                <i data-lucide="chevron-left"></i>
            </button>
            
            <span class="mx-2 text-xs font-mono opacity-80 bg-white/5 px-2 py-1 rounded">{}</span>
            
            <button class="icon-btn-sm" title="Next" onclick="document.dispatchEvent(new CustomEvent('browse:page', {{detail: {}}}));" {}>
                <i data-lucide="chevron-right"></i>
            </button>
            <button class="icon-btn-sm" title="Last" onclick="document.dispatchEvent(new CustomEvent('browse:page', {{detail: {}}}));" {}>
                <i data-lucide="chevrons-right"></i>
            </button>
        </div>
    "#, 
    page, total_pages, total,
    1 - (page as i32), prev_disabled, 
    -1, prev_disabled, 
    page,
    1, next_disabled, 
    (total_pages as i32) - (page as i32), next_disabled 
    )
}

pub fn render_table_html(columns: &[String], rows: &[Vec<serde_json::Value>]) -> (String, String) {
    let mut head = String::from("<tr>");
    head.push_str("<th class=\"w-10 text-center\"><input type=\"checkbox\" class=\"row-checkbox-all\"></th>");
    head.push_str("<th colspan=\"3\" class=\"text-center bg-black/10\">ACTION</th>");
    for col in columns {
        head.push_str(&format!("<th>{}</th>", col));
    }
    head.push_str("</tr>");

    let mut body = String::new();
    for row in rows {
        body.push_str("<tr>");
        body.push_str("<td class=\"text-center\"><input type=\"checkbox\" class=\"row-checkbox\"></td>");
        
        body.push_str("<td class=\"w-12\"><a href=\"#\" class=\"pma-action-icon edit\"><i data-lucide=\"pencil\" style=\"width:10px;height:10px;\"></i> Edit</a></td>");
        body.push_str("<td class=\"w-12\"><a href=\"#\" class=\"pma-action-icon copy\"><i data-lucide=\"copy\" style=\"width:10px;height:10px;\"></i> Copy</a></td>");
        body.push_str("<td class=\"w-10\"><a href=\"#\" class=\"pma-action-icon delete\"><i data-lucide=\"trash-2\" style=\"width:10px;height:10px;\"></i></a></td>");

        for val in row {
            match val {
                serde_json::Value::Null => body.push_str("<td class=\"text-white/30 italic\">NULL</td>"),
                serde_json::Value::String(s) => {
                    let display = if s.len() > 200 { format!("{}...", &s[..200]) } else { s.clone() };
                    body.push_str(&format!("<td><div class=\"truncate max-w-[300px]\">{}</div></td>", display));
                }
                _ => body.push_str(&format!("<td>{}</td>", val)),
            }
        }
        body.push_str("</tr>");
    }

    if rows.is_empty() {
        body = String::from("<tr><td colspan=\"100\" class=\"p-12 text-center opacity-30 italic\">No data found in this table.</td></tr>");
    }

    (head, body)
}
