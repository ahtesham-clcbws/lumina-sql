import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { useAppStore } from '@/stores/useAppStore';
import { LayoutList, Search, Play, Eraser, Code2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CriteriaGrid, QBEColumn } from './CriteriaGrid';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/stores/useNotificationStore';

interface VisualQueryBuilderProps {
    onRunQuery: (sql: string) => void;
}

export function VisualQueryBuilder({ onRunQuery }: VisualQueryBuilderProps) {
    const { currentDb } = useAppStore();
    const { show: showNotification } = useNotificationStore();

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        // Placeholder for future drag-drop logic
    };
    
    // State
    // Format: "db.table" if cross-db, or just "table" if local? 
    // Let's use fully qualified "db.table" always for selectedTables to be safe, 
    // OR keep simple and detect.
    // Better: Helper function to parse "db.table".
    const [selectedTables, setSelectedTables] = useState<string[]>([]);
    const [tableSearch, setTableSearch] = useState('');
    const [qbeColumns, setQbeColumns] = useState<QBEColumn[]>([]);
    const [generatedSql, setGeneratedSql] = useState('');

    // Fetch Tables
    const { data: tables } = useQuery({
        queryKey: ['tables', currentDb],
        queryFn: () => dbApi.getTables(currentDb!),
        enabled: !!currentDb
    });

    // Fetch Columns for Selected Tables (to allow adding to grid)
    const { data: tableColumns } = useQuery({
        queryKey: ['columns-multi', currentDb, selectedTables],
        queryFn: async () => {
            if (!currentDb || selectedTables.length === 0) return {};
            const res: Record<string, any[]> = {};
            for (const tableRef of selectedTables) {
                // Check if qualified
                let db = currentDb;
                let table = tableRef;
                if (tableRef.includes('.')) {
                    [db, table] = tableRef.split('.');
                }
                
                try {
                    const cols = await dbApi.getColumns(db, table);
                    res[tableRef] = cols;
                } catch (e) {
                    console.error(`Failed to load cols for ${tableRef}`, e);
                }
            }
            return res;
        },
        enabled: !!currentDb && selectedTables.length > 0
    });

    // Update SQL when grid changes
    useEffect(() => {
        generateSql();
    }, [qbeColumns, selectedTables]);

    const handleAddColumn = (table: string, field: string) => {
        const newCol: QBEColumn = {
            id: crypto.randomUUID(),
            table,
            field,
            alias: '',
            show: true,
            sort: null,
            criteria: '',
            orCriteria: ''
        };
        setQbeColumns(prev => [...prev, newCol]);
    };

    const handleRemoveColumn = (id: string) => {
        setQbeColumns(prev => prev.filter(c => c.id !== id));
    };

    const generateSql = () => {
        if (qbeColumns.length === 0) {
            setGeneratedSql('');
            return;
        }

        let selectParts: string[] = [];
        let fromParts: string[] = [...new Set(qbeColumns.map(c => c.table))]; 
        // Note: Simple FROM for now. Joins logic would go here in v2 (auto-detect relationships).
        // Since we don't have visual join builder yet, we'll just list tables. 
        // If >1 table, it's an implicit cross join or needs manual WHERE adjust in basic mode, 
        // BUT standard QBE usually assumes implicit joins or simple single-table. 
        // Let's stick to listing tables in FROM.

        if (fromParts.length === 0 && selectedTables.length > 0) {
            // Fallback if no cols but tables selected? 
            // usually QBE needs cols.
        }

        let whereParts: string[] = [];
        let orderParts: string[] = [];

        qbeColumns.forEach(col => {
            let colRef;
             if (col.table.includes('.')) {
                const [db, table] = col.table.split('.');
                colRef = `\`${db}\`.\`${table}\`.\`${col.field}\``;
            } else {
                colRef = `\`${col.table}\`.\`${col.field}\``;
            }
            
            // SELECT
            if (col.show) {
                selectParts.push(col.alias ? `${colRef} AS \`${col.alias}\`` : colRef);
            }

            // WHERE
            if (col.criteria) {
                whereParts.push(buildCondition(colRef, col.criteria));
            }
            if (col.orCriteria) {
                 whereParts.pop(); // remove simple push
                 whereParts.push(`(${buildCondition(colRef, col.criteria)} OR ${buildCondition(colRef, col.orCriteria)})`);
            }

            // ORDER
            if (col.sort) {
                orderParts.push(`${colRef} ${col.sort}`);
            }
        });

        const selectClause = selectParts.length > 0 ? `SELECT ${selectParts.join(', ')}` : 'SELECT *';
        
        // FROM clause with fully qualified names if needed
        const fromClause = `FROM ${fromParts.map(t => {
            if (t.includes('.')) {
                const [db, table] = t.split('.');
                return `\`${db}\`.\`${table}\``;
            }
            return `\`${t}\``;
        }).join(', ')}`;
        
        const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
        const orderClause = orderParts.length > 0 ? `ORDER BY ${orderParts.join(', ')}` : '';

        setGeneratedSql(`${selectClause}\n${fromClause}\n${whereClause}\n${orderClause}`);
    };

    const buildCondition = (colRef: string, criteria: string) => {
        const trimmed = criteria.trim();
        if (trimmed.startsWith('>') || trimmed.startsWith('<') || trimmed.startsWith('=') || trimmed.toUpperCase().startsWith('LIKE') || trimmed.toUpperCase().startsWith('IS')) {
            return `${colRef} ${trimmed}`;
        }
        return `${colRef} = ${trimmed}`;
    };

    const filteredTables = tables?.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase())) || [];

    return (
        <div className="h-full flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Tables & Columns */}
                <div className="w-[300px] flex flex-col border-r border-white/10 bg-black/20">
                    <div className="p-4 border-b border-white/10">
                         <div className="relative">
                            <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
                            <input 
                                type="text"
                                placeholder="Search tables..."
                                value={tableSearch}
                                onChange={e => setTableSearch(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredTables.map(t => (
                            <div key={t.name} className="border border-white/5 rounded-lg overflow-hidden bg-surface/50">
                                <div 
                                    className="p-2 bg-white/5 text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-white/10"
                                    onClick={() => setSelectedTables(prev => 
                                        prev.includes(t.name) ? prev.filter(x => x !== t.name) : [...prev, t.name]
                                    )}
                                >
                                    <div className={cn("w-3 h-3 border rounded-sm flex items-center justify-center", selectedTables.includes(t.name) ? "bg-primary border-primary" : "border-white/20")}>
                                        {selectedTables.includes(t.name) && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                                    </div>
                                    <Database size={12} className="text-primary/70" />
                                    <span className="truncate">{t.name}</span>
                                </div>
                                {selectedTables.includes(t.name) && tableColumns?.[t.name] && (
                                    <div className="bg-black/20 p-1 max-h-[150px] overflow-y-auto">
                                        {tableColumns[t.name].map((col: any) => (
                                            <div 
                                                key={col.field}
                                                onDoubleClick={() => handleAddColumn(t.name, col.field)}
                                                className="px-2 py-1 text-[11px] font-mono hover:bg-white/10 cursor-pointer flex items-center gap-2 group text-text-muted hover:text-text-main transition-colors"
                                            >
                                                <div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-primary" />
                                                {col.field}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Area: Grid & Preview */}
                <div className="flex-1 flex flex-col overflow-hidden bg-canvas/30">
                    {/* Toolbar */}
                    <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-surface/30">
                        <div className="flex items-center gap-2">
                            <LayoutList size={16} className="text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Visual Query Builder</span>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 text-[10px]"
                                onClick={() => { setQbeColumns([]); setGeneratedSql(''); }}
                                disabled={qbeColumns.length === 0}
                            >
                                <Eraser size={12} className="mr-1.5" /> Clear
                            </Button>
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-8 text-[10px] font-bold"
                                onClick={() => onRunQuery(generatedSql)}
                                disabled={!generatedSql}
                            >
                                <Play size={12} className="mr-1.5 bg-white text-primary rounded-full p-0.5" /> Run Query
                            </Button>
                        </div>
                    </div>

                    {/* Grid Container */}
                    <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
                        <div className="glass-panel p-4 flex-1 flex flex-col min-h-0 border-white/10 bg-black/20">
                            <h3 className="text-xs font-black uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
                                <LayoutList size={14} /> Criteria Grid
                            </h3>
                            <div className="flex-1 overflow-auto">
                                <CriteriaGrid 
                                    columns={qbeColumns} 
                                    onChange={setQbeColumns}
                                    onRemoveInfo={handleRemoveColumn}
                                />
                            </div>
                        </div>

                        {/* SQL Preview */}
                        <div className="h-[150px] glass-panel p-0 flex flex-col border-white/10 bg-black/40 overflow-hidden shrink-0">
                            <div className="h-8 border-b border-white/10 bg-white/5 flex items-center px-3 justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                                    <Code2 size={12} /> Live SQL Preview
                                </span>
                            </div>
                            <textarea 
                                readOnly
                                value={generatedSql}
                                className="flex-1 w-full bg-transparent p-3 font-mono text-xs text-green-400 resize-none outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
