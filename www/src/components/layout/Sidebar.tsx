import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Table, ChevronRight, ChevronDown, Search, Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { cn } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';

export function Sidebar() {
    const { serverId } = useParams();
    const navigate = useNavigate();
    const { currentDb, currentTable, setCurrentDb, setCurrentTable, setView, showSystemDbs } = useAppStore();
    const [search, setSearch] = useState('');

    // Fetch Databases
    const { data: databases, isLoading: loadingDbs } = useQuery({
        queryKey: ['databases'],
        queryFn: dbApi.getDatabases
    });

    // Fetch Tables (if DB selected)
    const { data: tables, isLoading: loadingTables } = useQuery({
        queryKey: ['tables', currentDb],
        queryFn: () => dbApi.getTables(currentDb!),
        enabled: !!currentDb
    });

    const filteredDbs = React.useMemo(() => {
        if (!databases) return [];
        const systemDbs = ['information_schema', 'mysql', 'performance_schema', 'sys'];
        
        return databases
            .filter(db => {
                const matchesSearch = db.name.toLowerCase().includes(search.toLowerCase());
                const isSystem = systemDbs.includes(db.name.toLowerCase());
                return matchesSearch && (showSystemDbs || !isSystem);
            })
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [databases, search, showSystemDbs]);

    const handleSelectDb = (dbName: string) => {
        if (currentDb === dbName) {
            // Collapse if clicking same - just go back to server root
            navigate(`/server/${serverId}`);
        } else {
            navigate(`/server/${serverId}/${dbName}`);
        }
    };

    const handleSelectTable = (e: React.MouseEvent, tableName: string) => {
        e.stopPropagation();
        navigate(`/server/${serverId}/${currentDb}/${tableName}`);
    };

    return (
        <aside className="w-[300px] bg-canvas border-r border-border h-full flex flex-col shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted opacity-70">Explorer</h2>
                    {loadingDbs && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted transition-colors opacity-70" />
                    <input 
                        className="w-full bg-surface border border-border rounded px-2.5 pl-8 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-text-main transition-all placeholder:text-text-muted/50"
                        placeholder="Search databases..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* DB List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {filteredDbs?.map(db => {
                    const isOpen = currentDb === db.name;
                    return (
                        <div key={db.name} className="mb-0.5">
                            {/* DB Item */}
                            <div 
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none transition-all group font-mono text-sm",
                                    isOpen 
                                        ? "bg-primary/10 text-primary font-bold" 
                                        : "text-text-muted hover:bg-hover-bg hover:text-text-main"
                                )}
                                onClick={() => handleSelectDb(db.name)}
                            >
                                <span className={cn("transition-transform duration-200", isOpen && "rotate-90")}>
                                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                                </span>
                                <Database className={cn("w-3.5 h-3.5", isOpen ? "fill-current opacity-100" : "opacity-70")} />
                                <span className="truncate flex-1 tracking-tight">{db.name}</span>
                            </div>

                            {/* Table List (Nested) */}
                             {isOpen && (
                                <div className="ml-[11px] pl-3 border-l border-border mt-1 flex flex-col gap-px animate-in slide-in-from-left-1 duration-200">
                                    {loadingTables ? (
                                        <div className="py-2 pl-4 text-xs text-text-muted opacity-70 flex items-center gap-2">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                                        </div>
                                    ) : [...(tables || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map(t => (
                                        <div 
                                            key={t.name}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none transition-colors text-xs font-mono",
                                                currentTable === t.name 
                                                    ? "bg-primary/10 text-primary font-semibold" 
                                                    : "text-text-muted hover:bg-hover-bg hover:text-text-main"
                                            )}
                                            onClick={(e) => handleSelectTable(e, t.name)}
                                        >
                                            <Table className={cn("w-3 h-3 transition-opacity", currentTable === t.name ? "opacity-100" : "opacity-50")} />
                                            <span className="truncate">{t.name}</span>
                                        </div>
                                    ))}
                                    {tables?.length === 0 && <div className="pl-4 py-1 text-[10px] text-text-muted opacity-50 italic">No tables found</div>}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </aside>
    )
}
