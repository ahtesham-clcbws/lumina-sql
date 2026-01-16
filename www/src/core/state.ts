import { ServerConfig } from '../interfaces';

interface AppStateInterface {
    currentDb: string | null;
    currentTable: string | null;
    activeServer: ServerConfig | null;
    currentServer: ServerConfig | null; // Added to fix main.ts reference (legacy alias for activeServer?)
    savedServers: ServerConfig[];
    isDarkMode: boolean;
    sidebarState: {
        databases: Record<string, any>;
    };
    browseState: {
        page: number;
        limit: number;
        columns: any[];
        primaryKeys: any[];
        totalRows: number;
        selection: Set<any>;
    };
    structState: {
        selection: Set<any>;
    };
    queryHistory: any[]; // Or more specific type
}

export const AppState: AppStateInterface = {
    currentDb: null,
    currentTable: null,
    activeServer: null,
    currentServer: null, 
    savedServers: [],
    
    // UI State
    isDarkMode: true,
    sidebarState: {
        databases: {} 
    },
    
    // Browser State
    browseState: {
        page: 1,
        limit: 25,
        columns: [],
        primaryKeys: [],
        totalRows: 0,
        selection: new Set()
    },
    
    // Structure State
    structState: {
        selection: new Set()
    },
    queryHistory: []
};

/**
 * Updates the current database context.
 * @param {string|null} dbName 
 */
export function setCurrentDb(dbName: string | null) {
    AppState.currentDb = dbName;
    // Notify listeners if we implement an event bus later
}

/**
 * Updates the current table context.
 * @param {string|null} tableName 
 */
export function setCurrentTable(tableName: string | null) {
    AppState.currentTable = tableName;
}
