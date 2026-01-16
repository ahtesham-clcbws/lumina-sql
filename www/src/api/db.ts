import { invoke } from '@tauri-apps/api/core';

export interface Database {
    name: string;
    size?: string;
    description?: string;
}

export interface Table {
    name: string;
    rows: number;
    size: string;
    type: string;
    engine: string;
    collation: string;
}

export interface BrowseResult {
    head_html: string; // Legacy HTML return (To be replaced by raw data later)
    body_html: string;
    pagination_html: string;
    query_time: number;
    total_rows: number;
    count: number;
}

// Mock invoke for browser dev mode (since window.__TAURI__ won't exist in pure browser)
const isTauri = 'window' in globalThis && '__TAURI__' in window;

async function safeInvoke<T>(cmd: string, args?: any): Promise<T> {
    if (isTauri) {
        return invoke(cmd, args);
    }
    console.warn(`[Mock] Invoke: ${cmd}`, args);
    // Return mocks for development
    if (cmd === 'get_tables') return [] as any;
    if (cmd === 'get_databases') return [] as any;
    return {} as any;
}


export const dbApi = {
    getDatabases: async () => {
        return safeInvoke<Database[]>('get_databases');
    },

    getTables: async (db: string) => {
        return safeInvoke<Table[]>('get_tables', { db });
    },

    browseTable: async (db: string, table: string, page: number, limit: number) => {
        return safeInvoke<BrowseResult>('browse_table_html', { db, table, page, limit });
    },

    executeQuery: async (db: string, sql: string) => {
        return safeInvoke<any>('execute_query', { db, sql });
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
        return safeInvoke<any>('execute_query', { db, sql });
    },

    getServerStats: async () => {
        const sql = `
            SELECT 
                VERSION() as version, 
                @@uptime as uptime, 
                CURRENT_USER() as user, 
                DATABASE() as current_db
        `;
        return safeInvoke<any>('execute_query', { db: 'information_schema', sql });
    },

    getCreateTable: async (db: string, table: string) => {
        const res = await safeInvoke<any>('execute_query', { db, sql: `SHOW CREATE TABLE \`${table}\`` });
        return res.rows?.[0]?.[1] || ''; // Row 0, Col 1 contains the Create Table SQL
    },

    getProcedures: async (db: string) => {
        const sql = `SHOW PROCEDURE STATUS WHERE Db = '${db}'`;
        return safeInvoke<any>('execute_query', { db, sql });
    },

    runMaintenance: async (db: string, tables: string[], operation: 'CHECK' | 'ANALYZE' | 'REPAIR' | 'OPTIMIZE') => {
        const tableList = tables.map(t => `\`${t}\``).join(',');
        const sql = `${operation} TABLE ${tableList}`;
        return safeInvoke<any>('execute_query', { db, sql });
    }
};
