import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Loader2, Clock, Trash2, Database, AlertTriangle, Download, FileJson, Terminal, History as HistoryIcon, Code2, LayoutList } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { cn } from '@/lib/utils';
import { VisualExplain } from './VisualExplain';
import { Microscope } from 'lucide-react';
import { VisualQueryBuilder } from './VisualQueryBuilder';
import { SnippetLibrary } from './SnippetLibrary';
import { AIAssistant } from '../ai/AIAssistant';
import { AIExplanationModal } from '../ai/AIExplanationModal';
import { v4 as uuidv4 } from 'uuid';


export function QueryEditor() {
    const { currentDb, queryHistory, addHistory } = useAppStore();
    const [mode, setMode] = useState<'editor' | 'builder' | 'explain'>('editor');
    const [sql, setSql] = useState('SELECT * FROM ');
    const [lastResult, setLastResult] = useState<any>(null);

    const [showSnippets, setShowSnippets] = useState(false);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [snippetName, setSnippetName] = useState('');

    // AI State
    const [showAI, setShowAI] = useState(false);
    const [showExplainAI, setShowExplainAI] = useState(false);

    // Mutation for executing SQL
    const { mutate: runQuery, isPending } = useMutation({
        mutationFn: async (sqlCmd: string) => {
            if (!currentDb) throw new Error("No database selected");
            return dbApi.executeQuery(currentDb, sqlCmd);
        },
        onSuccess: (data, variables) => {
            setLastResult({ data, sql: variables, error: null });
            addHistory(variables);
        },
        onError: (error) => {
             setLastResult({ data: null, error: error, sql: null });
        }
    });

    const handleRunQuery = (sqlToRun?: string) => {
        const query = sqlToRun || sql;
        if (!query.trim()) return;
        runQuery(query);
    };

    const handleExplain = () => {
        if (!sql.trim()) return;
        setMode('explain');
    };

    if (!currentDb) {
        return <div className="p-12 text-center opacity-50 flex flex-col items-center gap-4">
            <Database className="w-12 h-12 opacity-20" />
            <div>Select a database to run queries</div>
        </div>
    }

    const results = lastResult?.data;
    const error = lastResult?.error;
    const running = isPending;

    return (
        <div className="flex h-full">
            {/* L: Editor & Results */}
            <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
                {/* Mode Toggle Header */}
                <div className="flex items-center gap-1 p-1 bg-surface border-b border-border">
                    <button 
                        onClick={() => setMode('editor')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2",
                            mode === 'editor' ? "bg-surface-alt text-primary" : "text-text-muted hover:text-text-main"
                        )}
                    >
                        <Code2 size={14} /> SQL Editor
                    </button>
                    <div className="w-px h-3 bg-border mx-1" />
                    <button 
                        onClick={() => setMode('builder')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2",
                            mode === 'builder' ? "bg-surface-alt text-primary" : "text-text-muted hover:text-text-main"
                        )}
                    >
                        <LayoutList size={14} /> Visual Builder
                    </button>
                    <div className="w-px h-3 bg-border mx-1" />
                    <button 
                        onClick={() => mode === 'explain' ? setMode('editor') : handleExplain()}
                        className={cn(
                            "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2",
                            mode === 'explain' ? "bg-surface-alt text-primary" : "text-text-muted hover:text-text-main"
                        )}
                        title="Visualize Query execution plan"
                    >
                        <Microscope size={14} /> Explain
                    </button>
                </div>

                {/* Editor Area */}
                <div className="h-1/3 flex flex-col bg-surface border-b border-border relative">
                   {mode === 'editor' ? (
                       <>
                           <div className="flex items-center justify-between p-2 pl-4 border-b border-border bg-surface-alt">
                                <span className="text-xs font-bold opacity-50 text-text-muted">RAW SQL</span>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={() => handleRunQuery()}
                                        disabled={running}
                                        className={cn("btn-primary py-1 px-3 text-xs", running && "opacity-50")}
                                     >
                                        {running ? <Loader2 className="animate-spin w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                                        Run SQL
                                     </button>
                                </div>
                           </div>
                           <textarea 
                                className="flex-1 bg-transparent p-4 font-mono text-sm outline-none resize-none text-text-main placeholder-text-muted/50"
                                value={sql}
                                onChange={e => setSql(e.target.value)}
                                placeholder="Enter SQL query..."
                                spellCheck={false}
                           />
                            <div className="h-10 border-t border-border flex items-center justify-between px-4 bg-surface">
                                <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
                                    <span>Ln 1, Col 1</span>
                                    <span>Shift+Enter to Run</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        className="p-1.5 hover:bg-hover-bg rounded text-text-muted transition-colors"
                                        title="Format Query"
                                    >
                                        <div className="scale-75"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H3"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M21 18H3"/></svg></div>
                                    </button>
                                </div>
                            </div>
                       </>
                   ) : mode === 'builder' ? (
                       <div className="absolute inset-0 z-10 bg-canvas">
                           <VisualQueryBuilder onRunQuery={(q) => {
                               setSql(q); // Sync to editor
                               handleRunQuery(q); // Run it
                           }} />
                       </div>
                   ) : (
                        <div className="absolute inset-0 z-10 bg-canvas">
                            {/* @ts-ignore */}
                            <VisualExplain sql={sql} db={currentDb} />
                        </div>
                   )}
                </div>

                {/* Results Pane */}
                <div className="flex-1 overflow-auto bg-canvas relative">
                    {error ? (
                        <div className="p-8 text-center text-error">
                            <div className="bg-error/10 border border-error/20 inline-block p-4 rounded-lg">
                                <h3 className="font-bold mb-2 flex items-center gap-2 justify-center"><AlertTriangle size={16} /> Error Executing Query</h3>
                                <div className="font-mono text-xs opacity-80">{String(error)}</div>
                            </div>
                        </div>
                    ) : results ? (
                        <div className="min-w-full inline-block align-middle">
                             {results.rows ? (
                                <>
                                    <div className="sticky top-0 bg-surface shadow-sm z-10 px-4 py-2 text-xs text-text-muted border-b border-border flex justify-between items-center">
                                        <span>{results.rows.length} rows in set ({results.duration}ms)</span>
                                        <div className="flex gap-2">
                                            <button className="hover:text-text-main flex items-center gap-1"><Download size={12}/> CSV</button>
                                            <button className="hover:text-text-main flex items-center gap-1"><FileJson size={12}/> JSON</button>
                                        </div>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                         <thead className="sticky top-[33px] bg-surface shadow-sm z-10">
                                             <tr>
                                                 {results.columns.map((col: string, i: number) => (
                                                     <th key={i} className="p-2 border-b border-border font-mono text-primary font-normal">{col}</th>
                                                 ))}
                                             </tr>
                                         </thead>
                                         <tbody className="font-mono text-xs">
                                             {results.rows.map((row: any[], i: number) => (
                                                 <tr key={i} className="hover:bg-hover-bg border-b border-border">
                                                     {row.map((val: any, j: number) => (
                                                         <td key={j} className="p-2 border-r border-border max-w-[300px] truncate opacity-80 text-text-main">
                                                             {val === null ? <span className="text-text-muted italic">NULL</span> : String(val)}
                                                         </td>
                                                     ))}
                                                 </tr>
                                             ))}
                                         </tbody>
                                    </table>
                                </>
                             ) : (
                                 <div className="p-8 text-center text-green-400">
                                     <div className="font-bold mb-2">Query Executed Successfully</div>
                                     <div className="text-xs opacity-70">Affected Rows: {results.affected_rows}</div>
                                 </div>
                             )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-50 gap-4">
                            <Terminal size={48} strokeWidth={1} />
                            <p>Write a query and hit Run</p>
                        </div>
                    )}
                     {/* Snippet Library Overlay/Sidebar */}
                 <SnippetLibrary 
                    isOpen={showSnippets} 
                    onClose={() => setShowSnippets(false)}
                    onSelect={(s) => setSql(s)}
                    onRun={(s) => { setSql(s); handleRunQuery(s); }}
                />

                {/* AI Assistant Overlay */}
                <AIAssistant 
                    isOpen={showAI}
                    onClose={() => setShowAI(false)}
                    onInsertSql={(s) => setSql(s)}
                />

                {showExplainAI && (
                    <AIExplanationModal 
                        sql={sql} 
                        onClose={() => setShowExplainAI(false)} 
                    />
                )}
            </div>
            </div>

            {/* R: History Sidebar */}
            <div className="w-[240px] bg-canvas flex flex-col border-l border-border h-full">
                 <div className="p-3 border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-muted opacity-50 flex items-center gap-2">
                     <HistoryIcon size={12} /> Query History
                 </div>
                 <div className="flex-1 overflow-y-auto">
                     {queryHistory.map((item, i) => (
                         <div 
                            key={i} 
                            className="p-3 border-b border-border hover:bg-hover-bg cursor-pointer group"
                            onClick={() => {
                                setSql(item.sql);
                                setMode('editor');
                            }}
                         >
                             <div className="font-mono text-[10px] line-clamp-3 text-text-muted group-hover:text-primary transition-colors mb-1">
                                 {item.sql}
                             </div>
                             <div className="text-[9px] opacity-30">
                                 {item.timestamp.toLocaleTimeString()}
                             </div>
                         </div>
                     ))}
                     {queryHistory.length === 0 && (
                         <div className="p-4 text-center opacity-20 text-[10px] italic">No history yet</div>
                     )}
                 </div>
            </div>
        </div>
    );
}
