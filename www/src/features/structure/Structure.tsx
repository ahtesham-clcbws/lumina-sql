import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Table2, Plus, Eye, Trash2, Eraser, Key } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { showToast } from '@/utils/ui';

export function Structure() {
    const { currentDb, setView } = useAppStore();
    const queryClient = useQueryClient();
    const [currentTable, setCurrentTable] = React.useState<string | null>(null);
    const [selectedTables, setSelectedTables] = React.useState<string[]>([]);
    
    // FETCH: List Tables
    const { data: tables, isLoading: loadingTables } = useQuery({
        queryKey: ['tables', currentDb],
        queryFn: () => dbApi.getTables(currentDb!),
        enabled: !!currentDb && !currentTable
    });

    // FETCH: Table Structure
    const { data: columns, isLoading: loadingStructure } = useQuery({
        queryKey: ['structure', currentDb, currentTable],
        queryFn: async () => {
             const res = await dbApi.executeQuery(currentDb!, `DESCRIBE \`${currentTable}\``);
             return res.rows;
        },
        enabled: !!currentDb && !!currentTable
    });

    const dropTableMutation = useMutation({
        mutationFn: async (table: string) => {
            await dbApi.executeQuery(currentDb!, `DROP TABLE \`${table}\``);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables', currentDb] });
            showToast('Table dropped successfully');
        }
    });

    const truncateTableMutation = useMutation({
        mutationFn: async (table: string) => {
            await dbApi.executeQuery(currentDb!, `TRUNCATE TABLE \`${table}\``);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables', currentDb] });
            showToast('Table truncated successfully');
        }
    });

    const runMaintenance = useMutation({
        mutationFn: async (op: 'CHECK' | 'ANALYZE' | 'REPAIR' | 'OPTIMIZE') => {
            if (!selectedTables.length) return;
            await dbApi.runMaintenance(currentDb!, selectedTables, op);
        },
        onSuccess: (data, variables) => {
             showToast(`${variables} operation completed`, 'success');
             setSelectedTables([]); 
        },
        onError: () => showToast('Operation failed', 'error')
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked && tables) {
            setSelectedTables(tables.map(t => t.name));
        } else {
            setSelectedTables([]);
        }
    };

    const handleSelectOne = (table: string, checked: boolean) => {
        setSelectedTables(prev => 
            checked ? [...prev, table] : prev.filter(t => t !== table)
        );
    };

    if (!currentDb) return <div className="p-8 text-center opacity-50">Select a database</div>;

    // RENDER: TABLE STRUCTURE (Columns)
    if (currentTable) {
         return (
             <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setCurrentTable(null)} className="text-white/50 hover:text-white">← Back</button>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Table2 className="text-blue-400" /> Structure: {currentTable}
                    </h1>
                </div>
                
                <div className="glass-panel overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/50">
                                <th className="p-4">Column</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Null</th>
                                <th className="p-4">Key</th>
                                <th className="p-4">Default</th>
                                <th className="p-4">Extra</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingStructure ? (
                                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin inline mr-2"/> Loading structure...</td></tr>
                            ) : columns?.map((col: any[], i: number) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono font-bold text-blue-300">{col[0]}</td>
                                    <td className="p-4 font-mono text-sm opacity-80">{col[1]}</td>
                                    <td className="p-4 text-sm opacity-60">{col[2]}</td>
                                    <td className="p-4 text-sm font-bold text-yellow-500">{col[3]}</td>
                                    <td className="p-4 text-sm opacity-60">{col[4] === null ? 'NULL' : col[4]}</td>
                                    <td className="p-4 text-sm opacity-60">{col[5]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
         )
    }

    // RENDER: DATABASE STRUCTURE (List Tables)
    if (loadingTables) return <div className="p-12 text-center text-white/50"><Loader2 className="animate-spin inline mr-2"/>Loading tables...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Table2 className="text-blue-400" /> Database Structure
                </h1>
                <div className="flex gap-2">
                     <button className="btn-secondary" onClick={() => {/* Mock Quick Create */}}>
                        <Plus size={16} /> Create Table
                     </button>
                </div>
            </div>

            <div className="glass-panel overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/50">
                            <th className="p-4 w-10">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-white/10 bg-white/5"
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    checked={tables?.length === selectedTables.length && tables?.length > 0}
                                />
                            </th>
                            <th className="p-4">Table</th>
                            <th className="p-4 text-right">Rows</th>
                            <th className="p-4 text-right">Size</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Collation</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tables?.map((t) => (
                            <tr key={t.name} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                     <input 
                                        type="checkbox" 
                                        className="rounded border-white/10 bg-white/5"
                                        checked={selectedTables.includes(t.name)}
                                        onChange={(e) => handleSelectOne(t.name, e.target.checked)}
                                    />
                                </td>
                                <td className="p-4 font-mono font-bold text-blue-300 w-1/4">
                                    <button onClick={() => { setCurrentTable(t.name); setView('browser'); }} className="hover:underline flex items-center gap-2">
                                        <Table2 size={14} className="opacity-50" />
                                        {t.name}
                                    </button>
                                </td>
                                <td className="p-4 text-right font-mono text-sm opacity-70">{t.rows.toLocaleString()}</td>
                                <td className="p-4 text-right font-mono text-sm opacity-70">{t.size}</td>
                                <td className="p-4 text-xs opacity-50">{t.engine}</td>
                                <td className="p-4 text-xs opacity-50">{t.collation}</td>
                                <td className="p-4 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        className="p-1.5 hover:bg-white/10 rounded text-blue-400" 
                                        title="Structure"
                                        onClick={() => setCurrentTable(t.name)}
                                    >
                                        <Eye size={14} />
                                    </button>
                                    <button className="p-1.5 hover:bg-white/10 rounded text-yellow-500" title="Empty">
                                        <Eraser size={14} />
                                    </button>
                                    <button className="p-1.5 hover:bg-white/10 rounded text-red-500" title="Drop" onClick={() => { if(confirm(`Drop table ${t.name}?`)) dropTableMutation.mutate(t.name); }}>
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Bulk Actions Footer */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex items-center gap-4 text-sm">
                    <span className="opacity-50">{selectedTables.length} selected</span>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex gap-2">
                        <button onClick={() => runMaintenance.mutate('CHECK')} disabled={!selectedTables.length} className="px-3 py-1.5 hover:bg-white/10 rounded disabled:opacity-30">Check</button>
                        <button onClick={() => runMaintenance.mutate('ANALYZE')} disabled={!selectedTables.length} className="px-3 py-1.5 hover:bg-white/10 rounded disabled:opacity-30">Analyze</button>
                        <button onClick={() => runMaintenance.mutate('REPAIR')} disabled={!selectedTables.length} className="px-3 py-1.5 hover:bg-white/10 rounded disabled:opacity-30">Repair</button>
                        <button onClick={() => runMaintenance.mutate('OPTIMIZE')} disabled={!selectedTables.length} className="px-3 py-1.5 hover:bg-white/10 rounded disabled:opacity-30">Optimize</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
