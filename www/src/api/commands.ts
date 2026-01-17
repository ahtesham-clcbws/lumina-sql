
export interface SavedServer {
    id: string;
    name: string;
    host: string;
    port: number;
    user: string;
    pass?: string;
    ssl?: boolean;
    ssh_enabled?: boolean;
    ssh_host?: string;
    ssh_port?: number;
    ssh_user?: string;
    ssh_pass?: string;
    auto_connect?: boolean;
}

export interface Database {
    name: string;
    size?: number; // Rust returns u64
    tables_count?: number; // Rust returns u64
    // description?: string; // Removed as not in Rust
}

export interface Table {
    name: string;
    rows: number;
    size: number;
    overhead: number;
    // type: string; // Removed as not in Rust struct TableInfo
    engine: string;
    collation: string;
}

export interface BrowseResult {
    head_html: string;
    body_html: string;
    pagination_html: string;
    query_time: number;
    total_rows: number;
    count: number;
}

export interface BrowseResultRaw {
    columns: string[];
    rows: any[][];
    total_rows: number;
    primary_key?: string;
}

export interface SearchResult {
    table: string;
    matches: number;
}

export interface Routine {
    name: string;
    routine_type: 'PROCEDURE' | 'FUNCTION';
    data_type: string;
    created: string;
    last_altered: string;
}

export interface PrivilegeMatrix {
    global: string[];
    databases: [string, string[]][];
}

export interface ColumnInfo {
    field: string;
    data_type: string;
    collation: string | null;
    null: string;
    key: string;
    default: string | null;
    extra: string;
}

export interface QueryOptions {
    // Add fields if QueryOptions struct in Rust has them
}

export interface CsvPreview {
    headers: string[];
    rows: string[][];
}

export interface CsvImportOptions {
    delimiter: string;
    skip_header: boolean;
    mapping: Record<string, string>;
}

export interface ExportOptions {
    tables?: string[];
    export_structure: boolean;
    export_data: boolean;
    add_drop_table: boolean;
    add_create_table: boolean;
    add_if_not_exists: boolean;
    data_insertion_mode: string; // "INSERT", "INSERT IGNORE", "REPLACE"
}

// Map of Command Name -> [ArgsType, ReturnType]
export type TauriCommands = {
    // Server
    'get_server_info': [undefined, string[]];
    'get_saved_servers': [undefined, any[]]; // Returns generic server config json
    'get_saved_servers_local': [undefined, SavedServer[]];
    'save_server': [{ config: any }, void];
    'save_server_local': [{ server: SavedServer }, SavedServer[]];
    'delete_server': [{ id: string }, void];
    'delete_server_local': [{ id: string }, SavedServer[]];
    'connect_db': [{ config: any }, string];
    'get_process_list': [undefined, any[]];
    'get_status_variables': [{ filter?: string }, any[]]; 
    'get_server_variables': [{ filter?: string }, any[]]; 
    'get_monitor_data': [undefined, MonitorData];

    // Database
    'get_databases': [undefined, Database[]];
    'create_database': [{ name: string, collation?: string }, void];
    'drop_database': [{ name: string }, void];
    'get_collations': [undefined, string[]];
    'change_collation': [{ db: string, collation: string }, void];
    'alter_database_collation': [{ db: string, collation: string }, void]; // Alias
    'rename_database': [{ name: string, new_name: string }, void];
    'copy_database': [{ name: string, new_name: string, with_data: boolean }, void];
    
    // Table
    'get_tables': [{ db: string }, Table[]];
    'get_tables_html': [{ db: string, table?: string }, any]; // Returns TablesResultHtml
    'browse_table': [{ db: string, table: string, page: number, limit: number }, BrowseResultRaw];
    'browse_table_html': [{ db: string, table: string, page: number, limit: number }, BrowseResult];
    'update_cell': [{ db: string, table: string, column: string, value: any, primary_key_col: string, primary_key_val: any }, void];
    'get_columns': [{ db: string, table: string }, ColumnInfo[]]; 
    'get_table_count': [{ db: string, table: string }, number];
    'rename_table': [{ db: string, table: string, new_name: string, new_db?: string }, void];
    'truncate_table': [{ db: string, table: string }, void];
    'copy_table': [{ db: string, table: string, new_db: string, new_table: string, with_data: boolean }, void];
    'table_maintenance': [{ db: string, table: string, op: string }, string[][]];
    'global_search': [{ db?: string, term: string }, SearchResult[]];

    // Snippets
    'get_snippets': [undefined, Snippet[]];
    'save_snippet': [{ snippet: Snippet }, Snippet[]];
    'delete_snippet': [{ id: string }, Snippet[]];

    // AI
    'get_ai_config': [undefined, AIConfig];
    'save_ai_config': [{ config: AIConfig }, void];
    'generate_sql': [{ prompt: string, schema_context: string }, string];
    'explain_query': [{ sql: string }, string];

    // Query
    'execute_query': [{ sql: string, db?: string, options?: QueryOptions }, QueryResult];
    'execute_query_html': [{ sql: string, db?: string, options?: QueryOptions }, any];

    // Import/Export (Placeholder)
    'export_database': [{ db: string, file: string, options: ExportOptions }, void];
    'import_database': [{ db: string, file: string }, void];
    'import_sql': [{ db: string, sql: string }, void];
    'get_csv_preview': [{ filePath: string, delimiter: string }, CsvPreview];
    'import_csv': [{ db: string, table: string, filePath: string, options: CsvImportOptions }, number];

    // Relations (Placeholder)
    'get_foreign_keys': [{ db: string, table: string }, any[]];
    'add_foreign_key': [{ db: string, table: string, column: string, ref_db: string, ref_table: string, ref_column: string }, void];
    'drop_foreign_key': [{ db: string, table: string, name: string }, void];

    // Indexes (Placeholder)
    'get_indexes': [{ db: string, table: string }, any[]];
    'add_index': [{ db: string, table: string, name: string, columns: string[], type: string }, void];
    'drop_index': [{ db: string, table: string, name: string }, void];

    // Users
    'get_users': [undefined, any[]];
    'create_user': [{ name: string, host: string, password: string }, void];
    'drop_user': [{ name: string, host: string }, void];
    'rename_user': [{ oldName: string, oldHost: string, newName: string, newHost: string }, void];
    'get_grants': [{ name: string, host: string }, string[]];
    'get_privilege_matrix': [{ name: string, host: string }, PrivilegeMatrix];
    'update_privilege': [{ name: string, host: string, privilege: string, level: string, isGrant: boolean }, void];
    'change_password': [{ name: string, host: string, password: string }, void];
    'flush_privileges': [undefined, void];

    // Routines
    'get_routines': [{ db: string }, Routine[]];
    'get_routine_definition': [{ db: string, name: string, routineType: string }, string];
    'save_routine': [{ db: string, oldName: string, routineType: string, sql: string }, void];
    'drop_routine': [{ db: string, name: string, routineType: string }, void];
};

export type CommandName = keyof TauriCommands;

export interface MonitorData {
    time: number;
    questions: number;
    connections: number;
    threads_connected: number;
    threads_running: number;
    bytes_received: number;
    bytes_sent: number;
}

export interface GlobalSearchResult {
    category: string;
    label: string;
    description?: string;
    action_type: 'navigate' | 'execute' | 'cmd';
    action_value: string;
}

export interface Snippet {
    id: string;
    name: string;
    sql: string;
    description?: string;
    created_at: string;
}

export interface AIConfig {
    provider: 'openai' | 'ollama';
    api_key?: string;
    model: string;
    endpoint?: string;
}

export interface QueryResult {
    columns: string[];
    rows: any[][];
    affected_rows?: number;
    last_insert_id?: number;
    duration?: number;
}
