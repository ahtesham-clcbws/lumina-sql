import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Loader2, Clock, Trash2, Database } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { cn } from '@/lib/utils';

export function QueryEditor() {
    const { currentDb, queryHistory, addHistory } = useAppStore();
    const [sql, setSql] = useState('SELECT * FROM ');
    const [lastResult, setLastResult] = useState<any>(null);

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

    const handleRun = () => {
        if (!sql.trim()) return;
        runQuery(sql);
    };

    if (!currentDb) {
        return <div className="p-12 text-center opacity-50 flex flex-col items-center gap-4">
            <Database className="w-12 h-12 opacity-20" />
            <div>Select a database to run queries</div>
        </div>
    }

    return (
        <div className="flex h-full">
            {/* L: Editor & Results */}
            <div className="flex-1 flex flex-col border-r border-white/10 overflow-hidden">
                {/* Editor Area */}
                <div className="h-1/3 flex flex-col bg-black/20 border-b border-white/10">
                   <div className="flex items-center justify-between p-2 pl-4 border-b border-white/5 bg-white/5">
                        <span className="text-xs font-bold opacity-50">SQL EDITOR</span>
                        <div className="flex gap-2">
                             <button 
                                onClick={handleRun}
                                disabled={isPending}
                                className={cn("btn-primary py-1 px-3 text-xs", isPending && "opacity-50")}
                             >
                                {isPending ? <Loader2 className="animate-spin w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                                Run SQL
                             </button>
                        </div>
                   </div>
                   <textarea 
                        className="flex-1 bg-transparent p-4 font-mono text-sm outline-none resize-none text-blue-100 placeholder-white/20"
                        value={sql}
                        onChange={e => setSql(e.target.value)}
                        placeholder="SELECT * FROM table..."
                        spellCheck={false}
                   />
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-auto bg-[#0f172a] relative">
                    {!lastResult && <div className="p-8 text-center opacity-30 text-xs">Query results will appear here</div>}
                    
                    {lastResult?.error && (
                        <div className="p-4 m-4 bg-red-500/10 border border-red-500/20 rounded text-red-200 text-sm font-mono whitespace-pre-wrap">
                            Error: {String(lastResult.error)}
                        </div>
                    )}

                    {lastResult?.data && (
                        <div className="min-w-max">
                             {lastResult.data.rows ? (
                                <table className="w-full text-left border-collapse text-xs">
                                     <thead className="sticky top-0 bg-[#1e293b] shadow-sm z-10">
                                         <tr>
                                             {lastResult.data.columns.map((col: string, i: number) => (
                                                 <th key={i} className="p-2 border-b border-white/10 font-mono text-blue-400 font-normal">{col}</th>
                                             ))}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {lastResult.data.rows.map((row: any[], i: number) => (
                                             <tr key={i} className="hover:bg-white/5 border-b border-white/5">
                                                 {row.map((val: any, j: number) => (
                                                     <td key={j} className="p-2 border-r border-white/5 max-w-[300px] truncate opacity-80">
                                                         {val === null ? <span className="text-white/30 italic">NULL</span> : String(val)}
                                                     </td>
                                                 ))}
                                             </tr>
                                         ))}
                                     </tbody>
                                </table>
                             ) : (
                                 <div className="p-8 text-center text-green-400">
                                     <div className="font-bold mb-2">Query Executed Successfully</div>
                                     <div className="text-xs opacity-70">Affected Rows: {lastResult.data.affected_rows}</div>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            </div>

            {/* R: History Sidebar */}
            <div className="w-[200px] bg-black/20 flex flex-col shrink-0">
                 <div className="p-3 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider opacity-50 flex items-center gap-2">
                     <Clock className="w-3 h-3" /> Recent Queries
                 </div>
                 <div className="flex-1 overflow-y-auto">
                     {queryHistory.map((item, i) => (
                         <div 
                            key={i} 
                            className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer group"
                            onClick={() => setSql(item.sql)}
                         >
                             <div className="font-mono text-[10px] line-clamp-3 text-white/70 group-hover:text-blue-300 transition-colors mb-1">
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
