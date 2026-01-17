import { invoke } from '@tauri-apps/api/core';
import { TauriCommands, CommandName } from './commands';

// Re-export types for consumers
export type { Database, Table, BrowseResult, SavedServer } from './commands';

// Mock invoke for browser dev mode (since window.__TAURI__ won't exist in pure browser)
const isTauri = 'window' in globalThis && '__TAURI__' in window;

async function safeInvoke<K extends CommandName>(
    cmd: K, 
    args?: TauriCommands[K][0]
): Promise<TauriCommands[K][1]> {
    if (isTauri) {
        // @ts-ignore - Tauri invoke signature is loose, we enforce strictness here
        return invoke(cmd, args);
    }
    console.warn(`[Mock] Invoke: ${cmd}`, args);
    // Return mocks for development
    if (cmd === 'get_tables') return [] as any;
    if (cmd === 'get_databases') return [] as any;
    if (cmd === 'get_saved_servers_local') return [] as any;
    return {} as any;
}



export const dbApi = {
    getDatabases: async () => {
        return safeInvoke('get_databases');
    },

    getTables: async (db: string) => {
        return safeInvoke('get_tables', { db });
    },

    browseTable: async (db: string, table: string, page: number, limit: number) => {
        return safeInvoke('browse_table_html', { db, table, page, limit });
    },

    browseTableRaw: async (db: string, table: string, page: number, limit: number) => {
        return safeInvoke('browse_table', { db, table, page, limit });
    },

    updateCell: async (db: string, table: string, column: string, value: any, pk_col: string, pk_val: any) => {
        return safeInvoke('update_cell', { db, table, column, value, primary_key_col: pk_col, primary_key_val: pk_val });
    },

    executeQuery: async (sql: string, db?: string) => {
        return safeInvoke('execute_query', { sql, db });
    },

    getProcessList: async () => {
        return safeInvoke('get_process_list');
    },

    getStatusVariables: async (filter?: string) => {
        return safeInvoke('get_status_variables', { filter });
    },

    getServerVariables: async (filter?: string) => {
        return safeInvoke('get_server_variables', { filter });
    },

    getRelations: async (db: string) => {
        const sql = `
            SELECT 
                TABLE_NAME, 
                COLUMN_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME 
            FROM 
                information_schema.KEY_COLUMN_USAGE 
            WHERE 
                TABLE_SCHEMA = '${db}' 
                AND REFERENCED_TABLE_NAME IS NOT NULL;
        `;
        return safeInvoke('execute_query', { db, sql });
    },

    getServerStats: async () => {
        // Fetch most things in one go, but uptime is tricky. 
        // We'll use a safer query that works on most MySQL/MariaDB.
        const sql = `
            SELECT 
                VERSION() as version, 
                (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'UPTIME') as uptime, 
                CURRENT_USER() as user, 
                DATABASE() as current_db
        `;
        // Note: global_status might not be enabled or named differently.
        // Fallback to purely VERSION/USER/DB first if it fails.
        return safeInvoke('execute_query', { sql }).catch(() => {
             return safeInvoke('execute_query', { sql: "SELECT VERSION() as version, 0 as uptime, CURRENT_USER() as user, '' as current_db" });
        });
    },

    getCreateTable: async (db: string, table: string) => {
        const res = await safeInvoke('execute_query', { db, sql: `SHOW CREATE TABLE \`${table}\`` });
        return res.rows?.[0]?.[1] || ''; // Row 0, Col 1 contains the Create Table SQL
    },

    getProcedures: async (db: string) => {
        const sql = `SHOW PROCEDURE STATUS WHERE Db = '${db}'`;
        return safeInvoke('execute_query', { db, sql });
    },

    runMaintenance: async (db: string, tables: string[], operation: 'CHECK' | 'ANALYZE' | 'REPAIR' | 'OPTIMIZE') => {
        const tableList = tables.map(t => `\`${t}\``).join(',');
        const sql = `${operation} TABLE ${tableList}`;
        return safeInvoke('execute_query', { db, sql });
    },

    // Server Management
    connect: async (config: any) => {
        return safeInvoke('connect_db', { config });
    },

    getSavedServers: async () => {
        return safeInvoke('get_saved_servers_local');
    },

    saveServer: async (server: any) => {
        return safeInvoke('save_server_local', { server });
    },

    deleteServer: async (id: string) => {
        return safeInvoke('delete_server_local', { id });
    },

    dropDatabase: async (name: string) => {
        return safeInvoke('drop_database', { name });
    },

    createDatabase: async (name: string, collation?: string) => {
        return safeInvoke('create_database', { name, collation });
    },

    getCollations: async () => {
        return safeInvoke('get_collations');
    },

    // User Management
    getUsers: async () => {
        return safeInvoke('get_users');
    },

    createUser: async (name: string, host: string, pass: string) => {
        return safeInvoke('create_user', { name, host, password: pass });
    },

    dropUser: async (name: string, host: string) => {
        return safeInvoke('drop_user', { name, host });
    },

    getGrants: async (name: string, host: string) => {
        return safeInvoke('get_grants', { name, host });
    },

    changePassword: async (name: string, host: string, pass: string) => {
        return safeInvoke('change_password', { name, host, password: pass });
    },

    flushPrivileges: async () => {
        return safeInvoke('flush_privileges');
    }
};
