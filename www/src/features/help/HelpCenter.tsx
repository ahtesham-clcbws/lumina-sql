import React, { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { 
    X, HelpCircle, Server, Database, Code2, 
    LayoutList, Sparkles, Command, Shield, 
    BookOpen, Search, MousePointerClick 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function HelpCenter() {
    const { showHelp, setShowHelp } = useAppStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'connections' | 'query' | 'designer' | 'ai' | 'shortcuts'>('overview');

    if (!showHelp) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BookOpen },
        { id: 'connections', label: 'Connections', icon: Server },
        { id: 'query', label: 'Query & Data', icon: Database },
        { id: 'designer', label: 'Schema Designer', icon: LayoutList },
        { id: 'ai', label: 'AI Assistant', icon: Sparkles },
        { id: 'shortcuts', label: 'Shortcuts', icon: Command },
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-6 bg-surface-alt">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 text-primary p-2 rounded-lg">
                            <HelpCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Help Center</h2>
                            <p className="text-xs text-text-muted">Documentation & Guides</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowHelp(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-64 bg-surface border-r border-white/10 p-4 space-y-2 overflow-y-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                                    activeTab === tab.id 
                                        ? "bg-primary/20 text-primary border border-primary/20 shadow-sm" 
                                        : "text-text-muted hover:bg-white/5 hover:text-white border border-transparent"
                                )}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-canvas/30">
                        {activeTab === 'overview' && (
                            <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
                                <div className="text-center space-y-4 mb-12">
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                                        Welcome to OmniMIN
                                    </h1>
                                    <p className="text-lg text-text-muted leading-relaxed">
                                        OmniMIN is a high-performance, native database manager built for speed and simplicity. 
                                        Designed to replace legacy web tools with a modern, secure desktop experience.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 rounded-xl bg-surface border border-white/5 hover:border-primary/30 transition-colors group cursor-default">
                                        <div className="mb-4 bg-blue-500/10 text-blue-400 w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Shield size={20} />
                                        </div>
                                        <h3 className="font-bold text-white mb-2">Secure & Native</h3>
                                        <p className="text-sm text-text-muted">
                                            Runs locally on your machine. Settings are encrypted. No web browser overhead.
                                        </p>
                                    </div>
                                    <div className="p-6 rounded-xl bg-surface border border-white/5 hover:border-primary/30 transition-colors group cursor-default">
                                        <div className="mb-4 bg-purple-500/10 text-purple-400 w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Sparkles size={20} />
                                        </div>
                                        <h3 className="font-bold text-white mb-2">AI Powered</h3>
                                        <p className="text-sm text-text-muted">
                                            Write SQL with natural language. Get explanations for complex queries instantly.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'connections' && (
                            <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <Server className="text-primary" /> Managing Connections
                                </h2>
                                
                                <section className="space-y-3">
                                    <h3 className="text-lg font-semibold text-white">Adding a Server</h3>
                                    <p className="text-text-muted text-sm leading-relaxed">
                                        Click the <strong className="text-white">+ Add Server</strong> button in the Dashboard. 
                                        OmniMIN creates a direct TCP connection to your database.
                                    </p>
                                    <ul className="grid gap-3 pt-2">
                                        <li className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-white/5">
                                            <div className="bg-green-500/10 text-green-400 p-1.5 rounded mt-0.5"><Command size={14}/></div>
                                            <div>
                                                <strong className="text-white block text-sm">Standard TCP</strong>
                                                <span className="text-xs text-text-muted">Direct connection (e.g., localhost, remote IP).</span>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-white/5">
                                            <div className="bg-yellow-500/10 text-yellow-400 p-1.5 rounded mt-0.5"><Shield size={14}/></div>
                                            <div>
                                                <strong className="text-white block text-sm">SSL / TLS</strong>
                                                <span className="text-xs text-text-muted">Enable "Use SSL" for secure cloud connections (AWS RDS, Azure, PlanetScale).</span>
                                            </div>
                                        </li>
                                    </ul>
                                </section>
                            </div>
                        )}

                        {activeTab === 'query' && (
                            <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <Database className="text-primary" /> Query Editor & Data
                                </h2>
                                
                                <section className="space-y-4">
                                    <div className="p-4 rounded-xl bg-surface border border-white/10">
                                        <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                                            <Code2 size={16} className="text-blue-400"/> SQL Editor
                                        </h3>
                                        <p className="text-sm text-text-muted mb-4">
                                            A powerful IDE-like editor with syntax highlighting.
                                        </p>
                                        <ul className="text-sm text-text-muted space-y-1 list-disc pl-5">
                                            <li>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-xs">Shift+Enter</kbd> to run query.</li>
                                            <li>Multiple statements supported.</li>
                                            <li>Use the "Explain" button to visualize execution plans.</li>
                                        </ul>
                                    </div>

                                    <div className="p-4 rounded-xl bg-surface border border-white/10">
                                        <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                                            <MousePointerClick size={16} className="text-purple-400"/> Visual Builder
                                        </h3>
                                        <p className="text-sm text-text-muted mb-4">
                                            Drag and drop tables from the sidebar to build queries without writing code.
                                        </p>
                                        <ul className="text-sm text-text-muted space-y-1 list-disc pl-5">
                                            <li>Drag tables to the canvas.</li>
                                            <li>OmniMIN automatically detects Foreign Keys and creates JOINs.</li>
                                            <li>Switch between databases to perform <strong>Cross-Database Joins</strong>.</li>
                                        </ul>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/10 p-6 rounded-2xl">
                                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-2 text-white">
                                        <Sparkles className="text-purple-400" /> AI Assistant
                                    </h2>
                                    <p className="text-text-muted">Your intelligent pair programmer for SQL.</p>
                                </div>

                                <section className="space-y-4">
                                    <h3 className="text-lg font-bold text-white">Capabilities</h3>
                                    <div className="grid gap-3">
                                        <div className="flex gap-4 p-4 rounded-xl bg-surface border border-white/5">
                                            <div className="shrink-0 text-primary font-bold">01</div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm">Text to SQL</h4>
                                                <p className="text-xs text-text-muted mt-1">
                                                    "Show me users who signed up last week." → <code>SELECT * FROM users WHERE...</code>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 p-4 rounded-xl bg-surface border border-white/5">
                                            <div className="shrink-0 text-primary font-bold">02</div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm">Query Explanation</h4>
                                                <p className="text-xs text-text-muted mt-1">
                                                    Highlight complex SQL and click "AI Explain" to understand logic in plain English.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                         {activeTab === 'designer' && (
                            <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <LayoutList className="text-primary" /> Schema Designer
                                </h2>
                                <p className="text-text-muted text-sm">
                                    Visually architect your database schema.
                                </p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-surface border border-white/10 rounded-xl">
                                        <h3 className="font-bold text-white mb-2">Visual Design</h3>
                                        <p className="text-xs text-text-muted">
                                            Drag tables onto the infinite canvas. Connect columns to create Foreign Keys.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-surface border border-white/10 rounded-xl">
                                        <h3 className="font-bold text-white mb-2">Code Generation</h3>
                                        <p className="text-xs text-text-muted">
                                            Export your visual schema to:
                                            <ul className="list-disc pl-4 mt-2 space-y-1">
                                                <li>Laravel Migrations</li>
                                                <li>Prisma Schema</li>
                                                <li>TypeScript Interfaces</li>
                                            </ul>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'shortcuts' && (
                            <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <Command className="text-primary" /> Keyboard Shortcuts
                                </h2>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-surface p-4 rounded-xl border border-white/10">
                                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">General</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-white">Global Search</span>
                                                <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Ctrl + K</kbd>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-white">Help Center</span>
                                                <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">F1</kbd>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-surface p-4 rounded-xl border border-white/10">
                                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Query Editor</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-white">Run Query</span>
                                                <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Shift + Enter</kbd>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-white">Format SQL</span>
                                                <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Ctrl + Shift + F</kbd>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
