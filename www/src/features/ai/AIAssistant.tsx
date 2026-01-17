import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Settings, User, Database, Loader2, Sparkles, X, Check, HelpCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { dbApi } from '@/api/db';
import { AIConfig } from '@/api/commands';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isSql?: boolean;
}

interface AIAssistantProps {
    onInsertSql: (sql: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function AIAssistant({ onInsertSql, isOpen, onClose }: AIAssistantProps) {
    const { currentDb } = useAppStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [view, setView] = useState<'chat' | 'settings' | 'help'>('chat');
    
    const [config, setConfig] = useState<AIConfig>({
        provider: 'ollama',
        model: 'llama3',
        endpoint: 'http://localhost:11434'
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadConfig();
            if (messages.length === 0) {
                 setMessages([
                    { role: 'assistant', content: "Hello! I'm your SQL Assistant. Go to Settings/Help to get started, or ask me a question about your database." }
                ]);
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, view]);

    const loadConfig = async () => {
        try {
            const cfg = await dbApi.getAIConfig();
            setConfig(cfg);
        } catch (e) {
            console.error("Failed to load AI config", e);
        }
    };

    const saveConfig = async () => {
        try {
            await dbApi.saveAIConfig(config);
            setView('chat');
            setMessages(prev => [...prev, { role: 'assistant', content: "Configuration saved! I'm ready to help." }]);
        } catch (e) {
            console.error("Failed to save config", e);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            let schemaContext = "";
            if (currentDb) {
                const tables = await dbApi.getTables(currentDb);
                const tableNames = tables.map(t => t.name).join(', ');
                schemaContext = `Database: ${currentDb}\nTables: ${tableNames}`;
            }

            const sql = await dbApi.generateSQL(userMsg, schemaContext);
            setMessages(prev => [...prev, { role: 'assistant', content: sql, isSql: true }]);
        } catch (e) {
            const errStr = String(e);
            let friendlyError = errStr;
            if (errStr.includes('Ollama Error') || errStr.includes('econnrefused')) {
                friendlyError = "I couldn't connect to Ollama. Make sure it's running locally (default: localhost:11434) or check Settings.";
            } else if (errStr.includes('OpenAI Error')) {
                 friendlyError = "OpenAI API returned an error. Check your API Key in Settings.";
            }
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${friendlyError}` }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-surface border-l border-border shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200 font-sans">
             {/* Header */}
             <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-muted/20 shrink-0">
                <div className="flex items-center gap-2 font-bold select-none">
                    <Bot className="text-primary w-5 h-5" />
                    <span>AI Assistant</span>
                </div>
                <div className="flex items-center gap-1">
                     <button 
                        onClick={() => setView('help')}
                        className={cn("p-2 rounded-full transition-colors", view === 'help' ? "bg-white/10 text-white" : "text-text-muted hover:text-white hover:bg-white/5")}
                        title="Help & Guide"
                    >
                        <HelpCircle size={16} />
                    </button>
                    <button 
                        onClick={() => setView('settings')}
                        className={cn("p-2 rounded-full transition-colors", view === 'settings' ? "bg-white/10 text-white" : "text-text-muted hover:text-white hover:bg-white/5")}
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                     <div className="w-px h-4 bg-white/10 mx-1"></div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-text-muted"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-canvas/50 relative" ref={scrollRef}>
                
                {view === 'settings' && (
                     <div className="p-6 space-y-6 animate-in fade-in duration-200">
                        <div className="mb-4">
                            <h3 className="font-bold text-lg text-white mb-1">Configuration</h3>
                            <p className="text-xs text-text-muted">Choose your AI provider.</p>
                        </div>

                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold mb-1.5 text-text-muted">AI Provider</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setConfig({ ...config, provider: 'ollama' })}
                                        className={cn("p-3 rounded border text-sm font-medium transition-all", config.provider === 'ollama' ? "bg-primary/20 border-primary text-primary" : "bg-black/20 border-transparent text-text-muted hover:bg-white/5")}
                                    >
                                        Ollama (Local)
                                    </button>
                                    <button 
                                        onClick={() => setConfig({ ...config, provider: 'openai' })}
                                        className={cn("p-3 rounded border text-sm font-medium transition-all", config.provider === 'openai' ? "bg-primary/20 border-primary text-primary" : "bg-black/20 border-transparent text-text-muted hover:bg-white/5")}
                                    >
                                        OpenAI (Cloud)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1.5 text-text-muted">Model Name</label>
                                <input 
                                    className="w-full bg-black/20 border border-white/10 rounded p-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-text-muted/30"
                                    value={config.model}
                                    onChange={e => setConfig({ ...config, model: e.target.value })}
                                    placeholder={config.provider === 'openai' ? 'gpt-4o' : 'llama3'}
                                />
                                <p className="text-[10px] text-text-muted mt-1 opacity-70">
                                    {config.provider === 'ollama' ? "Ensure you have pulled this model: `ollama pull llama3`" : "e.g., gpt-4o, gpt-3.5-turbo"}
                                </p>
                            </div>

                            {config.provider === 'openai' && (
                                <div>
                                    <label className="block text-xs font-bold mb-1.5 text-text-muted">API Key</label>
                                    <input 
                                        type="password"
                                        className="w-full bg-black/20 border border-white/10 rounded p-2.5 text-sm outline-none focus:border-primary transition-colors"
                                        value={config.api_key || ''}
                                        onChange={e => setConfig({ ...config, api_key: e.target.value })}
                                        placeholder="sk-..."
                                    />
                                </div>
                            )}

                             {config.provider === 'ollama' && (
                                <div>
                                    <label className="block text-xs font-bold mb-1.5 text-text-muted">Ollama Endpoint</label>
                                    <input 
                                        className="w-full bg-black/20 border border-white/10 rounded p-2.5 text-sm outline-none focus:border-primary transition-colors"
                                        value={config.endpoint || ''}
                                        onChange={e => setConfig({ ...config, endpoint: e.target.value })}
                                        placeholder="http://localhost:11434"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="pt-4 flex gap-2">
                             <button 
                                onClick={() => setView('chat')}
                                className="flex-1 py-2.5 rounded text-xs font-bold text-text-muted hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={saveConfig}
                                className="flex-1 bg-primary hover:bg-primary-hover text-white py-2.5 rounded font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={14} /> Save
                            </button>
                        </div>
                    </div>
                )}

                {view === 'help' && (
                    <div className="p-6 space-y-6 animate-in fade-in duration-200">
                        <div className="mb-4">
                            <h3 className="font-bold text-lg text-white mb-1 flex items-center gap-2"><Sparkles className="text-primary" size={18}/> Getting Started</h3>
                            <p className="text-xs text-text-muted">How to use the AI Assistant.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-white">1. Configure Provider</h4>
                                <p className="text-xs text-text-muted leading-relaxed">
                                    Go to <Settings size={10} className="inline mx-1"/> Settings. You can use <strong>Ollama</strong> (free, local) or <strong>OpenAI</strong> (paid, cloud).
                                    <br/><br/>
                                    <strong>For Ollama:</strong>
                                    <ul className="list-disc pl-4 mt-1 space-y-1 opacity-80">
                                        <li>Download from <a href="#" className="text-primary hover:underline">ollama.com</a>.</li>
                                        <li>Run <code>ollama run llama3</code> in your terminal.</li>
                                        <li>Ensure it's running on port 11434.</li>
                                    </ul>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-white">2. Ask Questions</h4>
                                <p className="text-xs text-text-muted leading-relaxed">
                                    The AI knows about the <strong>currently selected database tables</strong>. You can ask:
                                    <ul className="list-disc pl-4 mt-1 space-y-1 opacity-80">
                                        <li>"Show me the top 5 customers."</li>
                                        <li>"Count users by registration month."</li>
                                        <li>"Delete all inactive sessions."</li>
                                    </ul>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-white">3. Explain Queries</h4>
                                <p className="text-xs text-text-muted leading-relaxed">
                                    In the Query Editor, click the <strong>AI Explain</strong> button to get a plain-English explanation of complex SQL queries.
                                </p>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-3">
                                <AlertTriangle className="text-blue-400 shrink-0" size={16} />
                                <div className="text-[10px] text-blue-200 leading-relaxed">
                                    <strong>Note:</strong> AI generates SQL based on table names. It works best with descriptive table/column names. Always review the SQL before running it.
                                </div>
                            </div>
                        </div>

                         <button 
                            onClick={() => setView('chat')}
                            className="w-full bg-surface-alt hover:bg-white/10 text-white py-2.5 rounded font-bold mt-4 transition-colors"
                        >
                            Back to Chat
                        </button>
                    </div>
                )}

                {view === 'chat' && (
                    <div className="flex flex-col min-h-full">
                        <div className="flex-1 p-4 space-y-4">
                             {messages.map((msg, i) => (
                                <div key={i} className={cn("flex gap-3 max-w-[90%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm", 
                                        msg.role === 'user' ? "bg-accent text-white" : "bg-surface-alt border border-white/5 text-primary"
                                    )}>
                                        {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                                    </div>
                                    <div className="space-y-2">
                                        <div className={cn(
                                            "p-3 rounded-xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                                            msg.role === 'user' ? "bg-accent/10 border border-accent/20 text-white" : "bg-surface border border-white/10 text-text-main"
                                        )}>
                                            {msg.content}
                                        </div>
                                        
                                        {msg.isSql && (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onInsertSql(msg.content)}
                                                    className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded flex items-center gap-2 transition-colors border border-primary/20 font-bold"
                                                >
                                                    <Database size={12} /> Insert
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-3 max-w-[80%]">
                                    <div className="w-8 h-8 rounded-full bg-surface-alt border border-white/5 text-primary flex items-center justify-center shrink-0">
                                        <Loader2 size={14} className="animate-spin" />
                                    </div>
                                    <div className="p-3 bg-surface border border-white/10 rounded-xl text-sm text-text-muted flex items-center gap-2 animate-pulse">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area (Only visible in Chat View) */}
            {view === 'chat' && (
                <div className="p-4 bg-surface border-t border-border mt-auto shrink-0 z-10">
                    <div className="relative group">
                        <textarea 
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-primary outline-none resize-none min-h-[50px] max-h-[150px] transition-all focus:bg-black/30 placeholder:text-text-muted/50"
                            placeholder={currentDb ? `Ask about schemas in ${currentDb}...` : "Select a database to ask context-aware questions..."}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <button 
                            disabled={!input.trim() || loading}
                            onClick={handleSend}
                            className="absolute right-2 bottom-2 p-2 bg-primary hover:bg-primary-hover text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                    <div className="text-[10px] text-text-muted text-center mt-2 opacity-30 flex justify-center items-center gap-1">
                        <AlertTriangle size={8} /> Check generated SQL for safety
                    </div>
                </div>
            )}
        </div>
    );
}
