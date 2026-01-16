import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Table, ChevronRight, ChevronDown, Search, Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { cn } from '@/lib/utils';

export function Sidebar() {
    const { currentDb, currentTable, setCurrentDb, setCurrentTable, setView } = useAppStore();
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

    const filteredDbs = databases?.filter(db => db.name.toLowerCase().includes(search.toLowerCase()));

    const handleSelectDb = (dbName: string) => {
        if (currentDb === dbName) {
            // Collapse if clicking same
            setCurrentDb(null);
        } else {
            setCurrentDb(dbName);
            setView('browser');
        }
        setCurrentTable(null);
    };

    const handleSelectTable = (e: React.MouseEvent, tableName: string) => {
        e.stopPropagation();
        setCurrentTable(tableName);
        setView('browser');
    };

    return (
        <aside className="w-[300px] bg-[#0f172a] border-r border-white/10 h-full flex flex-col shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider opacity-50">Explorer</h2>
                    {loadingDbs && <Loader2 className="w-3 h-3 animate-spin opacity-50" />}
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
                    <input 
                        className="w-full bg-black/20 border border-white/10 rounded px-2.5 pl-8 py-1.5 text-xs outline-none focus:border-blue-500/50 transition-colors"
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
                        <div key={db.name} className="mb-1">
                            {/* DB Item */}
                            <div 
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none transition-colors group",
                                    isOpen ? "bg-white/5 text-blue-400" : "text-white/70 hover:bg-white/5 hover:text-white"
                                )}
                                onClick={() => handleSelectDb(db.name)}
                            >
                                {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-70" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                                <Database className="w-3.5 h-3.5" />
                                <span className="text-sm truncate flex-1">{db.name}</span>
                            </div>

                            {/* Table List (Nested) */}
                            {isOpen && (
                                <div className="ml-2 pl-2 border-l border-white/10 mt-1 flex flex-col gap-0.5">
                                    {loadingTables ? (
                                        <div className="py-2 pl-4 text-xs opacity-50 flex items-center gap-2">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Loading tables...
                                        </div>
                                    ) : tables?.map(t => (
                                        <div 
                                            key={t.name}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none transition-colors text-xs",
                                                currentTable === t.name ? "bg-blue-500/10 text-blue-400" : "text-white/50 hover:bg-white/5 hover:text-white"
                                            )}
                                            onClick={(e) => handleSelectTable(e, t.name)}
                                        >
                                            <Table className="w-3 h-3 opacity-70" />
                                            <span className="truncate">{t.name}</span>
                                        </div>
                                    ))}
                                    {tables?.length === 0 && <div className="pl-4 py-1 text-[10px] opacity-30 italic">No tables found</div>}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </aside>
    )
}
