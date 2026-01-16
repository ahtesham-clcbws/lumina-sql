import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { Loader2, Play, Trash2, FileText, Plus } from 'lucide-react';
import { showToast } from '@/utils/ui';

export function Routines() {
    const { currentDb, setView } = useAppStore();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['routines', currentDb],
        queryFn: () => dbApi.getProcedures(currentDb!),
        enabled: !!currentDb
    });

    const deleteRoutine = useMutation({
        mutationFn: async (name: string) => {
            await dbApi.executeQuery(currentDb!, `DROP PROCEDURE IF EXISTS \`${name}\``);
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['routines'] });
             showToast('Procedure dropped successfully');
        },
        onError: (e) => showToast('Failed to drop procedure', 'error')
    });

    if (isLoading) return <div className="p-12 text-center text-white/50"><Loader2 className="animate-spin inline mr-2"/>Loading routines...</div>;

    const routines = data?.rows || [];

    return (
        <div className="p-8 max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="text-blue-400" /> Stored Procedures
                </h1>
                <button className="btn-primary" onClick={() => {
                    // Quick placeholder for create
                    setView('query');
                    // ideally pre-fill query editor
                }}>
                    <Plus size={16} /> Create Procedure
                </button>
            </div>

            <div className="glass-panel overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/50">
                            <th className="p-4">Name</th>
                            <th className="p-4">Created</th>
                            <th className="p-4">Security</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {routines.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center opacity-50">No routines found in this database.</td></tr>
                        ) : routines.map((r: any[]) => (
                            <tr key={r[1]} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4 font-mono text-blue-300 font-bold">{r[1]}</td>
                                <td className="p-4 opacity-70 text-sm">{r[4]}</td>
                                <td className="p-4 opacity-70 text-sm">{r[5]}</td>
                                <td className="p-4 flex gap-2 justify-end">
                                    <button className="p-2 hover:bg-green-500/20 text-green-400 rounded" title="Execute">
                                        <Play size={16} />
                                    </button>
                                    <button 
                                        className="p-2 hover:bg-red-500/20 text-red-400 rounded" 
                                        title="Drop"
                                        onClick={() => {
                                            if(confirm(`Drop procedure ${r[1]}?`)) deleteRoutine.mutate(r[1]);
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
