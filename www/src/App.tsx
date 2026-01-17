import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useAppStore } from './stores/useAppStore';
import { Dashboard } from './features/dashboard/Dashboard';
import { ServerOverview } from './features/server/ServerOverview';
import { Browser } from './features/browser/Browser';
import { QueryEditor } from './features/query/QueryEditor';
import { Structure } from './features/structure/Structure';
import { Designer } from './features/designer/Designer';
import { Routines } from './features/routines/Routines';
import { Export } from './features/export/Export';
import { Import } from './features/import/Import';
import { ViewTabs } from './features/common/ViewTabs';
import { dbApi } from './api/db';
import { Settings } from './features/settings/Settings';
import { NotFound } from './features/common/NotFound';
import { NotificationContainer } from './components/ui/NotificationContainer';
import { OmniBar } from './features/search/OmniBar';

const queryClient = new QueryClient();

// Route wrapper to handle server context
function ServerContextLayout() {
    const { serverId, dbName, tableName } = useParams();
    const { view, setView, currentDb, currentTable, setCurrentServer, setCurrentDb, setCurrentTable } = useAppStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // 1. Restore/Sync Server Context
    useEffect(() => {
        const initServer = async () => {
             const servers = await dbApi.getSavedServers();
             const target = servers.find((s: any) => s.id === serverId);
             if (target) {
                 try {
                    await dbApi.connect(target);
                    setCurrentServer(target);
                    queryClient.invalidateQueries({ queryKey: ['serverStats'] });
                    queryClient.invalidateQueries({ queryKey: ['databases'] });
                    queryClient.invalidateQueries({ queryKey: ['platform'] });
                 } catch (e) {
                     console.error("Failed to restore connection", e);
                 }
             } else {
                 navigate('/');
             }
        };
        initServer();
    }, [serverId]);

    // 2. Sync DB and Table from URL
    useEffect(() => {
        if (dbName && dbName !== currentDb) {
            setCurrentDb(dbName);
            // If we have a DB but no table, we are likely in the structure view
            if (!tableName && view === 'dashboard') {
                setView('structure');
            }
        } else if (!dbName && currentDb) {
            setCurrentDb(null);
            setView('dashboard');
        }

        if (tableName && tableName !== currentTable) {
            setCurrentTable(tableName);
            setView('browser');
        } else if (!tableName && currentTable) {
            setCurrentTable(null);
        }
    }, [dbName, tableName, currentDb, currentTable]);

    return (
        <Layout>
            {/* Context Tabs (Only show if DB selected and not in global settings/dashboard) */}
            {currentDb && view !== 'dashboard' && view !== 'settings' && <ViewTabs />}

            <div className="flex-1 overflow-hidden relative">
                {view === 'dashboard' && <ServerOverview />}
                {view === 'browser' && <Browser />}
                {view === 'structure' && <Structure />}
                {view === 'routines' && <Routines />}
                {view === 'designer' && <Designer />}
                {view === 'query' && <QueryEditor />}
                {view === 'export' && <Export />}
                {view === 'import' && <Import />}
                {view === 'settings' && (
                    <div className="p-8 flex items-center justify-center h-full text-white/30">
                        Settings View Placeholder
                    </div>
                )}
            </div>
        </Layout>
    );
}

// Theme Sync Component
function ThemeSync() {
    const { theme, accentColor, density, fontFamily, customFonts, customColors } = useAppStore();

    useEffect(() => {
        const root = document.documentElement;
        
        // 1. Theme Mode
        root.classList.remove('dark', 'light-mode', 'ultra-light-mode');
        
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.add('light-mode');
        } else if (theme === 'ultra-light') {
            root.classList.add('ultra-light-mode');
        } else if (theme === 'neo') {
            root.classList.add('neo-mode');
            // Neo mode forces a slightly different accent behavior or global font weight if desired, 
            // but for now purely CSS variables handle the colors.
        }

        // 2. Accent Color
        const presets = ['blue', 'purple', 'green', 'orange', 'red'];
        
        // Check if accentColor is a Custom ID
        const customColorObj = customColors?.find(c => c.id === accentColor);
        const resolvedColor = customColorObj ? customColorObj.hex : accentColor;

        if (presets.includes(resolvedColor)) {
            root.setAttribute('data-accent', resolvedColor);
            root.style.removeProperty('--accent');
            root.style.removeProperty('--accent-glow');
        } else {
            root.removeAttribute('data-accent');
            // Custom Hex Logic
            root.style.setProperty('--accent', resolvedColor);
            
            // Simple hex to rgba for glow
            const hex = resolvedColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            if (!isNaN(r)) {
                root.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
            }
        }

        // 3. Density
        if (density === 'compact') {
            root.style.setProperty('--spacing-unit', '0.5'); // Ultra Tight
            root.style.setProperty('--font-size-base', '11px');
            root.style.setProperty('--cell-padding', '2px 6px'); 
            root.style.setProperty('--nav-item-height', '24px');
        } else if (density === 'comfortable') {
            root.style.setProperty('--spacing-unit', '1.25');
            root.style.setProperty('--font-size-base', '14px');
            root.style.setProperty('--cell-padding', '12px 16px');
        } else {
            root.style.setProperty('--spacing-unit', '1');
            root.style.setProperty('--font-size-base', '13px');
            root.style.setProperty('--cell-padding', '8px 12px');
        }

        // 4. Font Family
        
        // Inject Custom Fonts
        const styleId = 'custom-fonts-style';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        
        const fontFaces = customFonts?.filter(f => f.type === 'custom' && f.src).map(f => `
            @font-face {
                font-family: '${f.family}';
                src: url('${f.src}') format('truetype');
                font-weight: normal;
                font-style: normal;
            }
        `).join('\n') || '';
        styleTag.textContent = fontFaces;

        const fonts: Record<string, string> = {
            sans: "'Inter', system-ui, sans-serif",
            mono: "'JetBrains Mono', monospace",
            serif: "serif"
        };
        
        // Check if it's a known preset or a custom font
        const customFont = customFonts?.find(f => f.id === fontFamily);
        if (customFont) {
             root.style.setProperty('--font-main', customFont.type === 'custom' ? `'${customFont.family}', sans-serif` : customFont.family);
        } else {
             root.style.setProperty('--font-main', fonts[fontFamily] || fontFamily);
        }

    }, [theme, accentColor, density, fontFamily, customFonts, customColors]);

    return null;
}

// Persistence Sync Component
function PersistenceSync() {
    const { 
        theme, accentColor, density, fontFamily, dashboardViewMode, 
        showSystemDbs, queryHistory, customFonts, customColors,
        setPreferences 
    } = useAppStore();

    // 1. Load on Mount
    useEffect(() => {
        const load = async () => {
            try {
                const prefs: any = await invoke('load_preferences');
                if (prefs) {
                    console.log('Loaded Preferences:', prefs);
                    setPreferences(prefs);
                }
            } catch (e) {
                console.error("Failed to load preferences:", e);
            }
        };
        load();
    }, []);

    // 2. Save on Change (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            const save = async () => {
                const payload = {
                    theme, accentColor, density, fontFamily, dashboardViewMode,
                    showSystemDbs, 
                    queryHistory: queryHistory.map(q => ({
                        ...q,
                        timestamp: q.timestamp.toISOString() // Backend expects String ISO
                    }))
                    // customFonts/Colors logic if we add to backend later
                };
                try {
                   await invoke('save_preferences', { preferences: payload });
                } catch (e) {
                    console.error("Failed to save preferences:", e);
                }
            };
            save();
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [theme, accentColor, density, fontFamily, dashboardViewMode, showSystemDbs, queryHistory]);

    return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <ThemeSync />
        <PersistenceSync />
        <NotificationContainer />
        <BrowserRouter>
            <Settings /> 
            <Routes>
                <Route path="/" element={<Layout><Dashboard /></Layout>} />
                <Route path="/server/:serverId/:dbName?/:tableName?" element={<ServerContextLayout />} />
                {/* <Route path="/settings" element={<Layout><Settings /></Layout>} /> - Moved to Modal */}
                {/* Fallback for unknown routes */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
