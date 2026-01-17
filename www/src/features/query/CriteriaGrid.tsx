import React from 'react';
import { X, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QBEColumn {
    id: string;
    field: string;
    table: string;
    alias: string;
    show: boolean;
    sort: 'ASC' | 'DESC' | null;
    criteria: string;
    orCriteria: string; // Simplified for v1: just one OR line
}

interface CriteriaGridProps {
    columns: QBEColumn[];
    onChange: (cols: QBEColumn[]) => void;
    onRemoveInfo: (id: string) => void;
}

export function CriteriaGrid({ columns, onChange, onRemoveInfo }: CriteriaGridProps) {
    const updateColumn = (id: string, updates: Partial<QBEColumn>) => {
        onChange(columns.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar border border-white/10 rounded-lg bg-white/5">
            <table className="w-full text-sm">
                <tbody>
                    {/* Field Row */}
                    <tr className="border-b border-white/5 divide-x divide-white/5">
                        <td className="w-32 p-2 font-bold text-text-muted bg-surface/50 text-right sticky left-0 z-10 border-r border-white/10 backdrop-blur-sm">Field</td>
                        {columns.map(col => (
                            <td key={col.id} className="min-w-[150px] p-2 font-mono bg-canvas/30 text-text-main relative group">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate" title={col.field}>{col.field}</span>
                                    <button 
                                        onClick={() => onRemoveInfo(col.id)}
                                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            </td>
                        ))}
                    </tr>

                    {/* Table Row */}
                    <tr className="border-b border-white/5 divide-x divide-white/5">
                        <td className="p-2 font-bold text-text-muted bg-surface/50 text-right sticky left-0 z-10 border-r border-white/10 backdrop-blur-sm">Table</td>
                        {columns.map(col => (
                            <td key={col.id} className="p-2 text-xs text-text-muted bg-canvas/30">
                                {col.table}
                            </td>
                        ))}
                    </tr>

                    {/* Alias Row */}
                    <tr className="border-b border-white/5 divide-x divide-white/5">
                        <td className="p-2 font-bold text-text-muted bg-surface/50 text-right sticky left-0 z-10 border-r border-white/10 backdrop-blur-sm">Alias</td>
                        {columns.map(col => (
                            <td key={col.id} className="p-0 bg-canvas/30">
                                <input 
                                    type="text" 
                                    value={col.alias}
                                    onChange={(e) => updateColumn(col.id, { alias: e.target.value })}
                                    className="w-full h-full min-h-[32px] px-2 bg-transparent text-xs outline-none focus:bg-primary/5"
                                    placeholder="(Optional)"
                                />
                            </td>
                        ))}
                    </tr>

                    {/* Sort Row */}
                    <tr className="border-b border-white/5 divide-x divide-white/5">
                        <td className="p-2 font-bold text-text-muted bg-surface/50 text-right sticky left-0 z-10 border-r border-white/10 backdrop-blur-sm">Sort</td>
                        {columns.map(col => (
                            <td key={col.id} className="p-1 bg-canvas/30">
                                <div className="flex bg-black/20 rounded border border-white/5 p-0.5">
                                    <button 
                                        onClick={() => updateColumn(col.id, { sort: col.sort === 'ASC' ? null : 'ASC' })}
                                        className={cn(
                                            "flex-1 flex justify-center py-1 rounded-sm text-[10px] items-center gap-1 transition-colors",
                                            col.sort === 'ASC' ? "bg-primary text-white font-bold" : "text-text-muted hover:bg-white/5"
                                        )}
                                        title="Ascending"
                                    >
                                        <ArrowUp size={10} /> ASC
                                    </button>
                                    <div className="w-px bg-white/10 mx-0.5" />
                                    <button 
                                        onClick={() => updateColumn(col.id, { sort: col.sort === 'DESC' ? null : 'DESC' })}
                                        className={cn(
                                            "flex-1 flex justify-center py-1 rounded-sm text-[10px] items-center gap-1 transition-colors",
                                            col.sort === 'DESC' ? "bg-primary text-white font-bold" : "text-text-muted hover:bg-white/5"
                                        )}
                                        title="Descending"
                                    >
                                        <ArrowDown size={10} /> DESC
                                    </button>
                                </div>
                            </td>
                        ))}
                    </tr>

                    {/* Show Row */}
                    <tr className="border-b border-white/5 divide-x divide-white/5">
                        <td className="p-2 font-bold text-text-muted bg-surface/50 text-right sticky left-0 z-10 border-r border-white/10 backdrop-blur-sm">Show</td>
                        {columns.map(col => (
                            <td key={col.id} className="p-2 text-center bg-canvas/30">
                                <input 
                                    type="checkbox" 
                                    checked={col.show}
                                    onChange={(e) => updateColumn(col.id, { show: e.target.checked })}
                                    className="accent-primary w-4 h-4 cursor-pointer"
                                />
                            </td>
                        ))}
                    </tr>

                    {/* Criteria Row */}
                    <tr className="border-b border-white/5 divide-x divide-white/5">
                        <td className="p-2 font-bold text-text-muted bg-surface/50 text-right sticky left-0 z-10 border-r border-white/10 backdrop-blur-sm">Criteria</td>
                        {columns.map(col => (
                            <td key={col.id} className="p-0 bg-canvas/30">
                                <input 
                                    type="text" 
                                    value={col.criteria}
                                    onChange={(e) => updateColumn(col.id, { criteria: e.target.value })}
                                    className="w-full h-full min-h-[32px] px-2 bg-transparent text-xs outline-none focus:bg-primary/5 font-mono text-accent"
                                    placeholder="e.g. > 100"
                                />
                            </td>
                        ))}
                    </tr>

                    {/* Or Row */}
                    <tr className="divide-x divide-white/5">
                        <td className="p-2 font-bold text-text-muted bg-surface/50 text-right sticky left-0 z-10 border-r border-white/10 backdrop-blur-sm">Or...</td>
                        {columns.map(col => (
                            <td key={col.id} className="p-0 bg-canvas/30">
                                <input 
                                    type="text" 
                                    value={col.orCriteria}
                                    onChange={(e) => updateColumn(col.id, { orCriteria: e.target.value })}
                                    className="w-full h-full min-h-[32px] px-2 bg-transparent text-xs outline-none focus:bg-primary/5 font-mono text-accent"
                                    placeholder=""
                                />
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
            
            {columns.length === 0 && (
                <div className="p-8 text-center text-text-muted text-sm italic">
                    Double-click columns from the list on the left to add them to the grid.
                </div>
            )}
        </div>
    );
}
