import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Code, Trash2, Play, FileCode } from 'lucide-react';
import { dbApi } from '@/api/db';
import { useAppStore } from '@/stores/useAppStore';
import { showToast } from '@/utils/ui';
import { cn } from '@/lib/utils';

export function RoutinesList() {
    const { currentDb } = useAppStore();
    const queryClient = useQueryClient();
    const [viewingRoutine, setViewingRoutine] = React.useState<{name: string, type: 'PROCEDURE' | 'FUNCTION'} | null>(null);

    const { data: routines, isLoading: loadingRoutines } = useQuery({
        queryKey: ['routines', currentDb],
        queryFn: () => dbApi.getRoutines(currentDb!),
        enabled: !!currentDb
    });

    const { data: definition, isLoading: loadingDefinition } = useQuery({
        queryKey: ['routine-definition', currentDb, viewingRoutine?.name],
        queryFn: () => dbApi.getRoutineDefinition(currentDb!, viewingRoutine!.name, viewingRoutine!.type),
        enabled: !!currentDb && !!viewingRoutine
    });

    const dropMutation = useMutation({
        mutationFn: ({ name, type }: { name: string, type: 'PROCEDURE' | 'FUNCTION' }) => 
            dbApi.dropRoutine(currentDb!, name, type),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['routines', currentDb] });
             showToast('Routine dropped successfully');
        }
    });

    if (!currentDb) return <div className="p-8 text-center opacity-50">Select a database</div>;

    return (
        <div className="flex flex-col h-full bg-canvas/30">
            <div className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-black/20">
                <div className="flex items-center gap-2">
                    <Code className="text-primary w-5 h-5" />
                    <h1 className="text-lg font-bold">Stored Routines</h1>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
                <div className="glass-panel overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-hover-bg text-[10px] uppercase tracking-wider text-text-muted font-bold">
                                <th className="p-4">Name</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Returns</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-right px-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingRoutines ? (
                                <tr><td colSpan={5} className="p-12 text-center opacity-50"><Loader2 className="animate-spin inline mr-2"/> Loading routines...</td></tr>
                            ) : routines?.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center opacity-30 text-xs italic">No routines found in this database.</td></tr>
                            ) : routines?.map((r) => (
                                <tr key={r.name} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="p-4 font-mono font-bold text-primary text-sm">{r.name}</td>
                                    <td className="p-4">
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                            r.routine_type === 'PROCEDURE' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                                        )}>{r.routine_type}</span>
                                    </td>
                                    <td className="p-4 text-xs font-mono opacity-50">{r.data_type || '-'}</td>
                                    <td className="p-4 text-xs opacity-40">{r.created}</td>
                                    <td className="p-4 px-6 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setViewingRoutine({ name: r.name, type: r.routine_type as any })}
                                            className="p-1.5 hover:bg-white/10 rounded-md text-primary" 
                                            title="View Definition"
                                        >
                                            <FileCode size={16} />
                                        </button>
                                        <button className="p-1.5 hover:bg-white/10 rounded-md text-green-500" title="Execute">
                                            <Play size={16} />
                                        </button>
                                        <button 
                                            onClick={() => { if(confirm(`Drop ${r.routine_type} ${r.name}?`)) dropMutation.mutate({ name: r.name, type: r.routine_type as any }); }}
                                            className="p-1.5 hover:bg-white/10 rounded-md text-red-500" 
                                            title="Drop"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {viewingRoutine && (
                    <div className="glass-panel p-6 space-y-4 border-primary/20 bg-primary/[0.02]">
                        <div className="flex justify-between items-center">
                            <h2 className="text-sm font-bold flex items-center gap-2">
                                <Code size={14} className="text-primary" />
                                {viewingRoutine.type}: <span className="text-primary">{viewingRoutine.name}</span>
                            </h2>
                            <button onClick={() => setViewingRoutine(null)} className="text-[10px] uppercase font-bold opacity-50 hover:opacity-100">Close</button>
                        </div>
                        <div className="bg-black/40 rounded-lg border border-white/5 p-4 font-mono text-sm overflow-x-auto whitespace-pre custom-scrollbar max-h-96">
                            {loadingDefinition ? (
                                <div className="flex items-center gap-2 opacity-40"><Loader2 className="animate-spin w-3 h-3"/> Fetching definition...</div>
                            ) : (
                                <code className="text-white/80">{definition}</code>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
