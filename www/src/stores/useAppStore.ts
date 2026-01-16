import { create } from 'zustand';

interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
}

interface QueryHistoryItem {
  sql: string;
  timestamp: Date;
}

interface AppState {
  theme: 'dark' | 'light';
  view: 'dashboard' | 'browser' | 'settings' | 'query' | 'structure' | 'designer' | 'routines' | 'export';
  
  // Selection Context
  currentServer: ServerConfig | null;
  currentDb: string | null;
  currentTable: string | null;

  // History
  queryHistory: QueryHistoryItem[];

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setView: (view: AppState['view']) => void;
  setCurrentServer: (server: ServerConfig | null) => void;
  setCurrentDb: (db: string | null) => void;
  setCurrentTable: (table: string | null) => void;
  addHistory: (sql: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  view: 'dashboard',
  currentServer: null,
  currentDb: null,
  currentTable: null,
  queryHistory: [],

  setTheme: (theme) => set({ theme }),
  setView: (view) => set({ view }),
  setCurrentServer: (currentServer) => set({ currentServer }),
  setCurrentDb: (currentDb) => set({ currentDb }),
  setCurrentTable: (currentTable) => set({ currentTable }),
  addHistory: (sql) => set((state) => ({ 
      queryHistory: [{ sql, timestamp: new Date() }, ...state.queryHistory].slice(0, 50) 
  })),
}));
