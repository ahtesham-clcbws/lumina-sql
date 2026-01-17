import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Table2, Plus, Eye, Trash2, Eraser, Key } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { showToast } from '@/utils/ui';
import { cn } from '@/lib/utils';

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

    const [maintenanceResults, setMaintenanceResults] = React.useState<{op: string, data: any[][]} | null>(null);

    const runMaintenance = useMutation({
        mutationFn: async (op: 'CHECK' | 'ANALYZE' | 'REPAIR' | 'OPTIMIZE') => {
            if (!selectedTables.length) return;
            return dbApi.runMaintenance(currentDb!, selectedTables, op);
        },
        onSuccess: (data, variables) => {
             setMaintenanceResults({ op: variables, data: data as any[][] });
             showToast(`${variables} operation completed`, 'success');
             setSelectedTables([]); 
             queryClient.invalidateQueries({ queryKey: ['tables', currentDb] });
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

    // RENDER: Maintenance Results
    if (maintenanceResults) {
        return (
            <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Table2 className="text-primary" /> Maintenance: {maintenanceResults.op}
                    </h1>
                    <button onClick={() => setMaintenanceResults(null)} className="btn-secondary">Close Results</button>
                </div>
                <div className="glass-panel overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-hover-bg text-xs uppercase tracking-wider text-text-muted">
                                <th className="p-4">Table</th>
                                <th className="p-4">Op</th>
                                <th className="p-4">Msg Type</th>
                                <th className="p-4">Msg Text</th>
                            </tr>
                        </thead>
                        <tbody>
                            {maintenanceResults.data.map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono font-bold text-primary">{row[0]}</td>
                                    <td className="p-4 text-sm opacity-80">{row[1]}</td>
                                    <td className="p-4">
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                                            row[2] === 'status' ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                                        )}>{row[2]}</span>
                                    </td>
                                    <td className="p-4 text-sm opacity-60">{row[3]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // RENDER: TABLE STRUCTURE (Columns)
    if (currentTable) {
         return (
             <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setCurrentTable(null)} className="text-white/50 hover:text-white">← Back</button>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Table2 className="text-primary" /> Structure: {currentTable}
                    </h1>
                </div>
                
                <div className="glass-panel overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-hover-bg text-xs uppercase tracking-wider text-text-muted">
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
                                    <td className="p-4 font-mono font-bold text-primary">{col[0]}</td>
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
        <div className="flex flex-col h-full">
            {/* Header / Toolbar */}
            <div className="h-14 border-b border-white/5 flex items-center px-4 justify-between bg-black/20">
                 <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Table2 className="text-primary" /> Database Structure
                    </h1>
                </div>
                <div className="flex gap-2">
                     <button className="btn-secondary h-8 text-[11px] gap-2" onClick={() => {/* Mock Quick Create */}}>
                        <Plus size={14} /> Create Table
                     </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8 max-w-7xl mx-auto w-full">
                <div className="glass-panel overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-hover-bg text-xs uppercase tracking-wider text-text-muted">
                            <th className="p-4 w-10">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-border bg-canvas checked:bg-primary"
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
                            <tr key={t.name} className="border-b border-border hover:bg-hover-bg transition-colors group">
                                <td className="p-4">
                                     <input 
                                        type="checkbox" 
                                        className="rounded border-border bg-canvas checked:bg-primary"
                                        checked={selectedTables.includes(t.name)}
                                        onChange={(e) => handleSelectOne(t.name, e.target.checked)}
                                    />
                                </td>
                                <td className="p-4 font-mono font-bold text-primary w-1/4">
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
                                        className="p-1.5 hover:bg-white/10 rounded text-primary" 
                                        title="Structure"
                                        onClick={() => setCurrentTable(t.name)}
                                    >
                                        <Eye size={14} />
                                    </button>
                                    <button 
                                        className="p-1.5 hover:bg-white/10 rounded text-yellow-500" 
                                        title="Empty"
                                        onClick={() => { if(confirm(`Empty (TRUNCATE) table ${t.name}?`)) truncateTableMutation.mutate(t.name); }}
                                    >
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
                <div className="p-4 bg-hover-bg border-t border-border flex items-center gap-4 text-sm justify-between">
                    <div className="flex items-center gap-4">
                        <span className="opacity-50 font-bold">{selectedTables.length} selected</span>
                        <div className="flex gap-2">
                             <button onClick={() => handleSelectAll(true)} className="text-[10px] uppercase font-bold text-primary hover:underline">Select All</button>
                             <button onClick={() => handleSelectAll(false)} className="text-[10px] uppercase font-bold opacity-50 hover:underline">None</button>
                        </div>
                    </div>
                    <div className="h-4 w-px bg-border"></div>
                    <div className="flex gap-2">
                        <button onClick={() => runMaintenance.mutate('CHECK')} disabled={!selectedTables.length} className="px-3 py-1.5 hover:bg-white/10 border border-white/5 rounded text-[11px] font-bold uppercase transition-colors disabled:opacity-20">Check</button>
                        <button onClick={() => runMaintenance.mutate('ANALYZE')} disabled={!selectedTables.length} className="px-3 py-1.5 hover:bg-white/10 border border-white/5 rounded text-[11px] font-bold uppercase transition-colors disabled:opacity-20">Analyze</button>
                        <button onClick={() => runMaintenance.mutate('REPAIR')} disabled={!selectedTables.length} className="px-3 py-1.5 hover:bg-white/10 border border-white/5 rounded text-[11px] font-bold uppercase transition-colors disabled:opacity-20">Repair</button>
                        <button onClick={() => runMaintenance.mutate('OPTIMIZE')} disabled={!selectedTables.length} className="px-3 py-1.5 hover:bg-white/10 border border-white/5 rounded text-[11px] font-bold uppercase transition-colors disabled:opacity-20">Optimize</button>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}
