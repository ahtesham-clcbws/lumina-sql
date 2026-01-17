use std::sync::Mutex;


pub mod state;
pub mod commands;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            pool: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // Server
            commands::server::connect_db, 
            commands::server::get_saved_servers,
            commands::server::save_server,
            commands::server::delete_server,
            commands::server::get_server_info,
            commands::server::get_process_list,
            commands::server::get_status_variables,
            commands::server::get_server_variables,
            commands::server::get_monitor_data,

            // Search
            commands::search::global_search,

            // Database
            commands::database::get_databases, 
            commands::database::create_database,
            commands::database::change_collation,
            commands::database::rename_database,
            commands::database::copy_database,
            commands::database::drop_database,
            commands::database::get_collations,
            commands::database::alter_database_collation,

            // Table
            commands::table::get_tables,
            commands::table::get_tables_html,
            commands::table::browse_table_html,
            commands::table::browse_table,
            commands::table::update_cell,
            commands::table::get_columns,
            commands::table::get_table_count,
            commands::table::rename_table,
            commands::table::truncate_table,
            commands::table::copy_table,
            commands::table::table_maintenance,

            // Query
            commands::server::get_saved_servers_local,
            commands::server::save_server_local,
            commands::server::delete_server_local,
            commands::query::execute_query,
            commands::query::execute_query_html,

            // Import/Export
            commands::import_export::export_database,
            commands::import_export::import_database,
            commands::import_export::import_sql,
            commands::import_export::get_csv_preview,
            commands::import_export::import_csv,

            // Relations
            commands::relations::get_foreign_keys,
            commands::relations::add_foreign_key,
            commands::relations::drop_foreign_key,
            
            // Indexes
            commands::indexes::get_indexes,
            commands::indexes::add_index,
            commands::indexes::drop_index,
            
            // Users
            commands::users::get_users,
            commands::users::create_user,
            commands::users::drop_user,
            commands::users::rename_user,
            commands::users::get_grants,
            commands::users::get_privilege_matrix,
            commands::users::update_privilege,
            commands::users::change_password,
            commands::users::flush_privileges,
            
            // Triggers & Events
            commands::triggers::get_triggers,
            commands::triggers::create_trigger,
            commands::triggers::drop_trigger,
            commands::triggers::get_events,
            commands::triggers::create_event,
            commands::triggers::drop_event,
            
            // Routines
            commands::routines::get_routines,
            commands::routines::get_routine_definition,
            commands::routines::save_routine,
            commands::routines::drop_routine,

            // Snippets
            commands::snippets::get_snippets,
            commands::snippets::save_snippet,
            commands::snippets::save_snippet,
            commands::snippets::delete_snippet,

            // Preferences
            commands::preferences::load_preferences,
            commands::preferences::save_preferences,
            // AI
            commands::ai::get_ai_config,
            commands::ai::save_ai_config,
            commands::ai::generate_sql,
            commands::ai::explain_query
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
