import React from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { Loader2, Table2, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to render editable cells
function EditableCell({ value, onSave }: { value: any, onSave: (val: any) => void }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editValue, setEditValue] = React.useState(value);

    // Update local state if prop changes (e.g. after successful save and refetch)
    React.useEffect(() => {
        setEditValue(value);
    }, [value]);

    const handleSave = () => {
        setIsEditing(false);
        if (editValue !== value) {
            onSave(editValue);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 w-full min-w-[120px]">
                <input 
                    autoFocus
                    className="bg-black/40 border border-primary/50 w-full px-2 py-1 text-sm outline-none rounded"
                    value={editValue ?? ''}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={(e) => {
                        // Delay handleSave to allow clicking the Save button
                        setTimeout(() => handleSave(), 200);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
            </div>
        );
    }

    return (
        <div 
            onDoubleClick={() => setIsEditing(true)}
            className={cn(
                "group relative truncate max-w-[300px] cursor-text min-h-[1.5em] px-2 py-1 rounded hover:bg-white/5 transition-colors",
                value === null && "text-white/20 italic"
            )}
            title="Double-click to edit"
        >
            {value === null ? "NULL" : String(value)}
            <Edit2 size={10} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 pointer-events-none" />
        </div>
    );
}

export function Browser() {
    const { currentDb, currentTable } = useAppStore();

    // 1. Fetch Tables List (Background)
    const { data: tables, isLoading: loadingTables } = useQuery({
        queryKey: ['tables', currentDb],
        queryFn: () => dbApi.getTables(currentDb!),
        enabled: !!currentDb
    });

    const sortedTables = React.useMemo(() => {
        if (!tables) return [];
        return [...tables].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [tables]);

    const [page, setPage] = React.useState(1);
    const limit = 50; // Better for interactive grid

    // Reset page when table changes
    React.useEffect(() => {
        setPage(1);
    }, [currentDb, currentTable]);

    // 2. Fetch Table Data (RAW JSON)
    const { data: browseData, isLoading: loadingData, refetch } = useQuery({
        queryKey: ['browseRaw', currentDb, currentTable, page],
        queryFn: () => dbApi.browseTableRaw(currentDb!, currentTable!, page, limit),
        enabled: !!currentDb && !!currentTable,
        placeholderData: keepPreviousData
    });

    // 3. Update Cell Mutation
    const updateMutation = useMutation({
        mutationFn: (args: { column: string, value: any, pkVal: any }) => 
            dbApi.updateCell(currentDb!, currentTable!, args.column, args.value, browseData?.primary_key!, args.pkVal),
        onSuccess: () => {
            // We could update cache locally for instant feedback, but refetch is safer for now
            refetch();
        }
    });

    const pkIndex = React.useMemo(() => {
        if (!browseData?.primary_key || !browseData?.columns) return -1;
        return browseData.columns.indexOf(browseData.primary_key);
    }, [browseData]);

    if (!currentDb) {
        return <div className="p-8 text-center text-white/30">Select a database to browse</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header / Toolbar */}
            <div className="h-14 border-b border-white/5 flex items-center px-4 justify-between bg-black/20">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Table2 className="text-primary" /> Browsing: 
                        <span className="opacity-50 font-normal ml-2 text-xs">SELECT * FROM</span>
                        <span className="font-bold text-primary font-mono">{currentTable}</span>
                    </h1>    
                </div>
                {/* Pagination Controls */}
                {currentTable && (
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] text-white/40 font-mono">
                            {browseData?.total_rows?.toLocaleString()} rows total
                        </span>
                        <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-lg border border-white/5">
                            <button 
                                disabled={page === 1 || loadingData}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 text-xs font-bold hover:bg-white/5 rounded-md disabled:opacity-20 transition-colors"
                            >Prev</button>
                            <div className="h-4 w-px bg-white/10 mx-1"></div>
                            <span className="text-xs font-bold min-w-[60px] text-center">
                                Page {page} {browseData?.total_rows ? `of ${Math.ceil(browseData.total_rows / limit)}` : ''}
                            </span>
                            <div className="h-4 w-px bg-white/10 mx-1"></div>
                            <button 
                                disabled={!browseData || (page * limit >= browseData.total_rows) || loadingData}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 text-xs font-bold hover:bg-white/5 rounded-md disabled:opacity-20 transition-colors"
                            >Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                {/* STATE 1: Database Overview (List Tables) */}
                {!currentTable && (
                    <div className="p-8">
                         <div className="flex items-center gap-3 mb-8">
                            <h2 className="text-2xl font-bold">Tables in <span className="text-primary">{currentDb}</span></h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                        </div>
                        {loadingTables ? <Loader2 className="animate-spin text-primary" /> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {sortedTables?.map(t => (
                                    <div key={t.name} className="glass-panel p-4 flex justify-between items-center group cursor-pointer hover:border-primary/30 transition-all">
                                        <div>
                                            <div className="font-bold text-sm mb-1">{t.name}</div>
                                            <div className="text-[10px] uppercase tracking-wider opacity-40 font-bold">{t.rows?.toLocaleString()} rows • {t.size}</div>
                                        </div>
                                        <button className="opacity-0 group-hover:opacity-100 btn-secondary text-[10px] py-1 px-3 uppercase tracking-tighter transition-opacity">
                                            Open
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STATE 2: Table Data (Interactive Grid) */}
                {currentTable && (
                     <div className="h-full flex flex-col">
                        {loadingData ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4">
                                <Loader2 className="animate-spin w-10 h-10 text-primary" />
                                <span className="text-sm font-bold animate-pulse">Fetching records...</span>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto bg-canvas">
                                <table className="w-full text-left border-collapse table-fixed min-w-max">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-surface/95 backdrop-blur border-b border-border shadow-sm">
                                            <th className="p-3 w-12 text-center bg-black/10">#</th>
                                            {browseData?.columns.map(col => (
                                                <th key={col} className={cn(
                                                    "p-3 text-[11px] font-bold uppercase tracking-wider text-text-muted border-r border-border/50",
                                                    col === browseData.primary_key && "text-primary"
                                                )}>
                                                    <div className="flex items-center gap-2">
                                                        {col}
                                                        {col === browseData.primary_key && <span className="text-[8px] bg-primary/20 text-primary px-1 rounded">PK</span>}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {browseData?.rows.map((row, rowIndex) => {
                                            const pkVal = pkIndex !== -1 ? row[pkIndex] : null;
                                            return (
                                                <tr key={rowIndex} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="p-3 text-[10px] text-center opacity-30 font-mono bg-black/5">
                                                        {((page - 1) * limit) + rowIndex + 1}
                                                    </td>
                                                    {row.map((val, cellIndex) => (
                                                        <td key={cellIndex} className="p-0 border-r border-border/30">
                                                            <EditableCell 
                                                                value={val} 
                                                                onSave={(newVal) => {
                                                                    if (browseData.primary_key && pkVal !== null) {
                                                                        updateMutation.mutate({ 
                                                                            column: browseData.columns[cellIndex], 
                                                                            value: newVal, 
                                                                            pkVal 
                                                                        });
                                                                    } else {
                                                                        console.warn('Cannot update: Primary Key not found for this table/row');
                                                                    }
                                                                }}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {browseData?.rows.length === 0 && (
                                    <div className="p-20 text-center text-white/10 italic">
                                        No results found in this table.
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                )}
            </div>
        </div>
    )
}
