import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, Database, Settings, CheckSquare, Square, FileCode, Check } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { showToast } from '@/utils/ui';
import { save } from '@tauri-apps/plugin-dialog';
import { cn } from '@/lib/utils';
import { ExportOptions } from '@/api/commands';
import { Button } from '@/components/ui/button';

export function Export() {
    const { currentDb } = useAppStore();
    const [mode, setMode] = useState<'quick' | 'custom'>('quick');
    const [generating, setGenerating] = useState(false);
    
    // Custom Options State
    const [selectedTables, setSelectedTables] = useState<string[]>([]);
    const [options, setOptions] = useState<Omit<ExportOptions, 'tables'>>({
        export_structure: true,
        export_data: true,
        add_drop_table: true,
        add_create_table: true,
        add_if_not_exists: false,
        data_insertion_mode: 'INSERT'
    });

    const { data: tables } = useQuery({
        queryKey: ['tables', currentDb],
        queryFn: () => dbApi.getTables(currentDb!),
        enabled: !!currentDb
    });

    // Initialize selected tables when loaded
    useEffect(() => {
        if (tables) {
            setSelectedTables(tables.map(t => t.name));
        }
    }, [tables]);

    const handleSelectAll = (select: boolean) => {
        if (tables) {
            setSelectedTables(select ? tables.map(t => t.name) : []);
        }
    };

    const toggleTable = (name: string) => {
        setSelectedTables(prev => 
            prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
        );
    };

    const handleExport = async () => {
        if (!currentDb) return;

        try {
            const filePath = await save({
                defaultPath: `${currentDb}_dump_${new Date().toISOString().split('T')[0]}.sql`,
                filters: [{
                    name: 'SQL File',
                    extensions: ['sql']
                }]
            });

            if (!filePath) return;

            setGenerating(true);

            const exportOps: ExportOptions = mode === 'quick' ? {
                tables: undefined, // All
                export_structure: true,
                export_data: true,
                add_drop_table: true,
                add_create_table: true,
                add_if_not_exists: false,
                data_insertion_mode: 'INSERT'
            } : {
                ...options,
                tables: selectedTables.length === tables?.length ? undefined : selectedTables
            };

            await dbApi.exportDatabase(currentDb, filePath, exportOps);
            showToast('Export completed successfully', 'success');
        } catch (e) {
            console.error(e);
            showToast('Export failed: ' + e, 'error');
        } finally {
            setGenerating(false);
        }
    };

    if (!currentDb) return <div className="p-12 text-center opacity-50">Select a database</div>;

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-canvas/30">
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                 <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tighter text-text-main flex items-center gap-3">
                        <Download size={28} className="text-primary" /> Export Database
                    </h1>
                    <p className="text-sm text-text-muted opacity-60">
                        Create a backup or migrate your database <span className="text-primary font-mono font-bold">{currentDb}</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Mode & Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Mode Selection */}
                        <div className="glass-panel p-1.5 flex bg-black/20">
                            <button 
                                onClick={() => setMode('quick')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                                    mode === 'quick' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-muted hover:text-white"
                                )}
                            >
                                Quick
                            </button>
                            <button 
                                onClick={() => setMode('custom')}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                                    mode === 'custom' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-muted hover:text-white"
                                )}
                            >
                                Custom
                            </button>
                        </div>

                        {/* Quick Info */}
                        {mode === 'quick' && (
                            <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Quick Export</h3>
                                <ul className="space-y-2 text-xs text-text-muted">
                                    <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Export Structure</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Export Data</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Drop Tables if exists</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-green-500" /> All Tables included</li>
                                </ul>
                            </div>
                        )}

                        {/* Custom Options - Only visible in Custom mode */}
                        {mode === 'custom' && (
                            <div className="space-y-6 animation-fade-in">
                                <div className="glass-panel p-5 space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Settings size={14} /> Output Options
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        <label className="flex items-center justify-between text-xs cursor-pointer group">
                                            <span className="group-hover:text-white transition-colors">Export Structure</span>
                                            <input type="checkbox" checked={options.export_structure} onChange={e => setOptions({...options, export_structure: e.target.checked})} className="accent-primary" />
                                        </label>
                                        <label className="flex items-center justify-between text-xs cursor-pointer group">
                                            <span className="group-hover:text-white transition-colors">Export Data</span>
                                            <input type="checkbox" checked={options.export_data} onChange={e => setOptions({...options, export_data: e.target.checked})} className="accent-primary" />
                                        </label>
                                        <div className="h-px bg-white/5 my-2" />
                                        <label className="flex items-center justify-between text-xs cursor-pointer group">
                                            <span className="group-hover:text-white transition-colors">Add DROP TABLE</span>
                                            <input type="checkbox" checked={options.add_drop_table} onChange={e => setOptions({...options, add_drop_table: e.target.checked})} className="accent-primary" />
                                        </label>
                                        <label className="flex items-center justify-between text-xs cursor-pointer group">
                                            <span className="group-hover:text-white transition-colors">IF NOT EXISTS</span>
                                            <input type="checkbox" checked={options.add_if_not_exists} onChange={e => setOptions({...options, add_if_not_exists: e.target.checked})} className="accent-primary" />
                                        </label>
                                    </div>

                                    <div className="space-y-1 pt-2">
                                        <span className="text-[10px] font-bold uppercase text-text-muted">Insertion Mode</span>
                                        <select 
                                            value={options.data_insertion_mode}
                                            onChange={e => setOptions({...options, data_insertion_mode: e.target.value})}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-primary/50"
                                        >
                                            <option value="INSERT">INSERT</option>
                                            <option value="INSERT IGNORE">INSERT IGNORE</option>
                                            <option value="REPLACE">REPLACE</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button 
                            onClick={handleExport}
                            disabled={generating || !currentDb || (mode === 'custom' && selectedTables.length === 0)}
                            className="w-full h-12 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                        >
                            {generating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} className="mr-2" />}
                            {generating ? 'Exporting...' : 'Export File'}
                        </Button>
                    </div>

                    {/* Right Column: Table Selection (Custom Mode) */}
                    {mode === 'custom' && (
                        <div className="lg:col-span-2 glass-panel flex flex-col min-h-[400px]">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-white/5">
                                <div className="flex items-center gap-2">
                                    <Database size={16} className="text-primary" />
                                    <span className="text-xs font-black uppercase tracking-widest text-text-muted">Tables ({selectedTables.length}/{tables?.length})</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleSelectAll(true)} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                        <CheckSquare size={12} /> Select All
                                    </button>
                                    <button onClick={() => handleSelectAll(false)} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                        <Square size={12} /> Unselect All
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {tables ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {tables.map(t => (
                                            <div 
                                                key={t.name}
                                                onClick={() => toggleTable(t.name)}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all group",
                                                    selectedTables.includes(t.name) 
                                                        ? "bg-primary/10 border-primary/30" 
                                                        : "bg-surface border-transparent hover:bg-hover-bg"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-sm border flex items-center justify-center transition-colors",
                                                        selectedTables.includes(t.name) ? "bg-primary border-primary" : "border-white/20 group-hover:border-white/40"
                                                    )}>
                                                        {selectedTables.includes(t.name) && <Check size={10} className="text-white" />}
                                                    </div>
                                                    <span className={cn(
                                                        "text-sm font-mono truncate",
                                                        selectedTables.includes(t.name) ? "text-primary font-bold" : "text-text-muted"
                                                    )}>{t.name}</span>
                                                </div>
                                                <span className="text-[10px] opacity-40">{t.rows} rows</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex justify-center items-center h-full opacity-50">
                                        <Loader2 className="animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Placeholder for Quick Mode visualization */}
                    {mode === 'quick' && (
                        <div className="lg:col-span-2 flex items-center justify-center opacity-20 border-2 border-dashed border-white/10 rounded-2xl">
                             <div className="text-center space-y-4">
                                <FileCode size={64} className="mx-auto" />
                                <p className="text-lg font-bold">Ready to Dump</p>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Support other generators if we want to keep them later as sub-options
