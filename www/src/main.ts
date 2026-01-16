/**
 * Main Application Entry Point
 * Initializes modules and sets up global event listeners.
 */

import './libs/lucide-local';
import { AppState, setCurrentDb } from './core/state';
import { Elements, showView } from './utils/ui';
import { loadSavedServers, openAddServerModal, saveServer, deleteServer } from './modules/dashboard';
import { connectDb } from './modules/auth';
import { setupOperationsHandlers, initOperationsTab } from './modules/operations';
import { initQueryBuilder, executeSql } from './modules/query';
import { setupStructureHandlers, loadStructure } from './modules/structure';
import { initImportTab, initExportTab } from './modules/import_export';
import { initSearch } from './modules/search';
import { initOperationsDb, loadCollations } from './modules/operations_db';
import { initServerHome } from './modules/server_home';
import { initRelations } from './modules/relations';
import { initUsers } from './modules/users';
import { initTriggers } from './modules/triggers';
import { loadTableData, loadDatabases } from './modules/browser';


import { ThemeManager } from './modules/theme';
import { Playground } from './modules/playground';

console.log("SQL Native (Modular) Initializing...");

// Authorization Helper
function requireAuth(): boolean {
    // Check activeServer (canonical) or currentServer (alias)
    if (!AppState.activeServer && !AppState.currentServer) {
        showView('login');
        return false;
    }
    return true;
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 1. DEV MODE LOGGER
    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target) return;
        const id = target.id ? `#${target.id}` : '';
        const className = target.className; 
        const cls = (typeof className === 'string' && className) ? `.${className.split(' ').join('.')}` : '';
        console.log(`[Interaction] Clicked: <${target.tagName.toLowerCase()}${id}${cls}>`);
    }, true);

    // 1. Theme Engine (Immediate apply)
    ThemeManager.init();
    
    // 2. Playground Init
    Playground.init();

    // 3. Load Saved Servers
    await loadSavedServers();
    
    // 4. Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 5. Setup Global Listeners
    setupGlobalListeners();
    
    // 6. Setup Module Handlers
    initExportTab();
    initSearch();
    initOperationsDb();
    initServerHome();
    initRelations();
    initUsers();
    initTriggers();
    loadCollations(); // Preload
    setupOperationsHandlers();
    setupStructureHandlers();
    initImportTab();

    // Expose ThemeManager for HTML inline events
    window.ThemeManager = ThemeManager;
    
    // Wire up Theme Settings Modal
    const settingsBtn = document.getElementById('theme-settings-btn');
    const settingsModal = document.getElementById('theme-settings-modal');
    const closeSettingsBtn = document.getElementById('close-theme-settings');
    
    if (settingsModal && closeSettingsBtn) {
        closeSettingsBtn.onclick = () => settingsModal.classList.add('hidden');
        settingsModal.onclick = (e: MouseEvent) => {
            if (e.target === settingsModal) settingsModal.classList.add('hidden');
        };
    }

    // --- Native App Feel Enhancements ---
    // 1. Disable Context Menu
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 2. Disable Image/Link Dragging
    document.addEventListener('dragstart', (e: DragEvent) => {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'IMG' || target.tagName === 'A')) {
            e.preventDefault();
        }
    });

    // 3. Disable specific browser shortcuts (F5, Ctrl+R, etc.)
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        // Disable F5 and Ctrl+R for reloading
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r')) {
            e.preventDefault();
            console.log("[Native] Reload blocked.");
        }
        // Optional: Disable Ctrl+S (save) or other browser defaults
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'f')) {
            e.preventDefault();
        }
    });

    // 4. Input Resizer Logic
    const sqlResizer = document.getElementById('sql-resizer');
    const sqlInput = document.getElementById('sql-input');
    if (sqlResizer && sqlInput) {
        let isResizing = false;
        sqlResizer.onmousedown = () => {
            isResizing = true;
            document.body.style.cursor = 'ns-resize';
            sqlResizer.style.background = 'rgba(255,255,255,0.1)';
        };
        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (!isResizing) return;
            const rect = sqlInput.getBoundingClientRect();
            const newHeight = e.clientY - rect.top;
            if (newHeight > 100) {
                sqlInput.style.height = `${newHeight}px`;
            }
        });
        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = 'default';
            sqlResizer.style.background = 'rgba(255,255,255,0.03)';
        });
    }
});

declare global {
    interface Window {
        lucide: {
            createIcons: (options?: any) => void;
            icons: any;
        };
        ThemeManager: any;
        switchTabTo: (tabId: string) => void;
        dropUser: (user: string, host: string) => void;
        editUser: (user: string, host: string) => void;
        dropTrigger: (name: string) => void;
        dropEvent: (name: string) => void;
        toggleEventScheduleInputs: () => void;
    }
}

function setupGlobalListeners() {
    
    // Login Actions
    const handleConnectWrapper = () => {
        const hostEl = document.getElementById('db-host') as HTMLInputElement;
        const portEl = document.getElementById('db-port') as HTMLInputElement;
        const userEl = document.getElementById('db-user') as HTMLInputElement;
        const passEl = document.getElementById('db-pass') as HTMLInputElement;
        
        if (!hostEl || !portEl || !userEl || !passEl) return;

        const host = hostEl.value;
        const port = parseInt(portEl.value) || 3306;
        const user = userEl.value;
        const pass = passEl.value;
        // Pass empty callback or handle success logic here
        connectDb({ name: 'Temp', host, port, user, pass }, async () => {
             console.log("Connected via Login Form");
        });
    };

    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) connectBtn.onclick = handleConnectWrapper;

    // Add Server Modal Actions
    const saveServerBtn = document.getElementById('save-server-btn');
    const cancelServerBtn = document.getElementById('cancel-add-btn');
    const addServerMainBtn = document.getElementById('add-server-btn');

    if (saveServerBtn) saveServerBtn.onclick = saveServer;
    if (cancelServerBtn) {
        cancelServerBtn.onclick = () => {
            const modal = document.getElementById('add-server-modal');
            if (modal) modal.classList.add('hidden');
        };
    }
    if (addServerMainBtn) addServerMainBtn.onclick = openAddServerModal;
    
    document.querySelectorAll<HTMLElement>('.nav-item[data-view]').forEach(item => {
        item.onclick = () => {
            const view = item.getAttribute('data-view');
            if (!view) return;

            if (view === 'settings') {
                const modal = document.getElementById('theme-settings-modal');
                if (modal) modal.classList.remove('hidden');
                return;
            }

            // UI Highlight
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            
            showView(view);
        };
    });

    // Dashboard Search
    const searchInput = document.getElementById('dashboard-search') as HTMLInputElement;
    if (searchInput) {
        searchInput.oninput = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const filter = target.value;
            import('./modules/dashboard').then(m => m.renderServerGrid(filter));
        };
    }

    // Theme Toggle Global
    const themeToggleGlobal = document.getElementById('theme-toggle-global');
    if (themeToggleGlobal) {
        themeToggleGlobal.onclick = () => {
            ThemeManager.toggle();
            // Update Icon
            const icon = document.getElementById('theme-icon-global');
            if (icon) {
                const newAttr = ThemeManager.state.mode === 'dark' ? 'moon' : 'sun';
                icon.setAttribute('data-lucide', newAttr);
                window.lucide.createIcons();
            }
        };
    }

    // Tab Navigation
    document.querySelectorAll<HTMLElement>('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.getAttribute('data-tab');
            // Ensure switchTabTo handles null gracefully or we check here
            if (tabId && window.switchTabTo) {
                window.switchTabTo(tabId);
            }
        };
    });

    // App Events (Custom Event needs casting)
    document.addEventListener('app:connected', async () => {
        console.log("App Connected! Loading databases...");
        
        // Import sidebar event binder dynamically or from browser module
        // We know loadDatabases is from browser, so we can probably assume browser is loaded.
        // Actually, let's explicitly import it or check if it's available.
        // For simplicity, we assume browser.js exports are available or we re-import them.
        const { loadDatabases, bindSidebarEvents } = await import('./modules/browser');
        
        bindSidebarEvents();
        showView('browser');
        await loadDatabases();
    });


    // Theme Toggle (Quick Switcher)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.onclick = () => {
        const newMode = ThemeManager.state.mode === 'dark' ? 'light' : 'dark';
        ThemeManager.setMode(newMode);
        
        const themeText = document.getElementById('theme-text');
        if (themeText) themeText.innerText = newMode === 'dark' ? 'Dark Mode' : 'Light Mode';
        
        const span = themeToggle.querySelector('span');
        if (span && span.previousSibling) {
            span.previousSibling.textContent = newMode === 'dark' ? '🌙 ' : '☀️ ';
        }
    };

    // Global Key Events
    document.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            const addServerModal = document.getElementById('add-server-modal');
            const loginView = document.getElementById('login-view');
            
            if (addServerModal && !addServerModal.classList.contains('hidden')) {
                saveServer();
            } else if (loginView && !loginView.classList.contains('hidden')) {
                handleConnectWrapper();
            }
        }
    });
}


