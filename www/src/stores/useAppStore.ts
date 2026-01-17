import { create } from 'zustand';
// import { persist } from 'zustand/middleware'; // Removed for native persistence

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
  theme: 'dark' | 'light' | 'ultra-light' | 'neo';
  accentColor: string;
  density: 'compact' | 'default' | 'comfortable';
  fontFamily: string;
  view: 'dashboard' | 'browser' | 'settings' | 'query' | 'structure' | 'designer' | 'routines' | 'export' | 'import';
  dashboardViewMode: 'grid' | 'list';
  showSettings: boolean;
  showSystemDbs: boolean;
  
  // Selection Context
  currentServer: ServerConfig | null;
  currentDb: string | null;
  currentTable: string | null;
  queryHistory: QueryHistoryItem[];

  // Colors
  customColors: { id: string; hex: string; label: string }[];
  addCustomColor: (color: { id: string; hex: string; label: string }) => void;
  removeCustomColor: (id: string) => void;

  // Fonts
  customFonts: { id: string; label: string; family: string; type: 'system' | 'custom'; src?: string }[];
  addCustomFont: (font: { id: string; label: string; family: string; type: 'system' | 'custom'; src?: string }) => void;
  removeCustomFont: (id: string) => void;

  // Actions
  setPreferences: (prefs: any) => void;
  setTheme: (theme: 'dark' | 'light' | 'ultra-light' | 'neo') => void;
  setAccentColor: (color: string) => void;
  setDensity: (density: AppState['density']) => void;
  setFontFamily: (font: string) => void;
  setView: (view: AppState['view']) => void;
  setShowSettings: (show: boolean) => void;
  setDashboardViewMode: (mode: 'grid' | 'list') => void;
  setShowSystemDbs: (show: boolean) => void;
  
  // UI State
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;

  setCurrentServer: (server: ServerConfig | null) => void;
  setCurrentDb: (db: string | null) => void;
  setCurrentTable: (table: string | null) => void;
  addHistory: (sql: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
      theme: 'dark',
      accentColor: 'blue',
      density: 'default',
      fontFamily: 'sans',
      view: 'dashboard',
      dashboardViewMode: 'grid',
      showSettings: false,
      showSystemDbs: false,
      currentServer: null,
      currentDb: null,
      currentTable: null,
      queryHistory: [],
      customFonts: [],
      customColors: [],

      setPreferences: (prefs) => set({
          theme: prefs.theme as any,
          accentColor: prefs.accentColor,
          density: prefs.density as any,
          fontFamily: prefs.fontFamily,
          dashboardViewMode: prefs.dashboardViewMode as any,
          showSystemDbs: prefs.showSystemDbs,
          queryHistory: prefs.queryHistory.map((q: any) => ({ ...q, timestamp: new Date(q.timestamp) })),
      }),

      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setDensity: (density) => set({ density }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setView: (view) => set({ view }),
      setShowSettings: (show) => set({ showSettings: show }),
      setDashboardViewMode: (mode) => set({ dashboardViewMode: mode }),
      setShowSystemDbs: (show) => set({ showSystemDbs: show }),
      
      showHelp: false,
      setShowHelp: (show) => set({ showHelp: show }),

      setCurrentServer: (currentServer) => set({ currentServer }),
      setCurrentDb: (currentDb) => set({ currentDb }),
      setCurrentTable: (currentTable) => set({ currentTable }),
      addHistory: (sql) => set((state) => {
          return { 
              queryHistory: [{ sql, timestamp: new Date() }, ...state.queryHistory].slice(0, 50) 
          } as Partial<AppState>;
      }),
      addCustomColor: (color) => set((state) => ({
          customColors: [...state.customColors, color]
      })),
      removeCustomColor: (id) => {
          const state = get();
          if (state.accentColor === id) {
              set({ accentColor: 'blue' });
          }
          set((state) => ({
              customColors: state.customColors.filter(c => c.id !== id)
          }));
      },
      addCustomFont: (font) => set((state) => ({ 
          customFonts: [...state.customFonts, font] 
      })),
      removeCustomFont: (id) => set((state) => ({
          customFonts: state.customFonts.filter(f => f.id !== id)
      }))
}));
