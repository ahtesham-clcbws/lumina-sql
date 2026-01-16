
import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { Loader2 } from 'lucide-react';

export function Browser() {
    const { currentDb, currentTable } = useAppStore();

    // 1. Fetch Tables List (Background)
    const { data: tables, isLoading: loadingTables } = useQuery({
        queryKey: ['tables', currentDb],
        queryFn: () => dbApi.getTables(currentDb!),
        enabled: !!currentDb
    });

    const [page, setPage] = React.useState(1);
    const limit = 100;

    // Reset page when table changes
    React.useEffect(() => {
        setPage(1);
    }, [currentDb, currentTable]);

    // 2. Fetch Table Data
    const { data: browseData, isLoading: loadingData } = useQuery({
        queryKey: ['browse', currentDb, currentTable, page],
        queryFn: () => dbApi.browseTable(currentDb!, currentTable!, page, limit),
        enabled: !!currentDb && !!currentTable,
        placeholderData: keepPreviousData
    });

    if (!currentDb) {
        return <div className="p-8 text-center text-white/30">Select a database to browse</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header / Toolbar */}
            <div className="h-14 border-b border-white/5 flex items-center px-4 justify-between bg-black/20">
                <div className="flex items-center gap-2">
                    <span className="text-white/50">{currentDb}</span>
                    {currentTable && <>
                        <span className="text-white/20">/</span>
                        <span className="font-bold text-blue-400">{currentTable}</span>
                    </>}
                </div>
                {/* Pagination Controls */}
                {currentTable && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">
                            Page {page} {browseData?.total_rows ? `of ${Math.ceil(browseData.total_rows / limit)}` : ''}
                        </span>
                        <div className="flex rounded-md overflow-hidden border border-white/10">
                            <button 
                                disabled={page === 1 || loadingData}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 btn-secondary rounded-none disabled:opacity-50"
                            >Prev</button>
                            <button 
                                disabled={!browseData || (page * limit >= browseData.total_rows) || loadingData}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 btn-secondary rounded-none disabled:opacity-50"
                            >Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4">
                {/* STATE 1: Database Overview (List Tables) */}
                {!currentTable && (
                    <div>
                        <h2 className="text-xl font-bold mb-4">Tables in `{currentDb}`</h2>
                        {loadingTables ? <Loader2 className="animate-spin" /> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tables?.map(t => (
                                    <div key={t.name} className="glass-panel p-4 flex justify-between items-center group cursor-pointer hover:bg-white/5 transition-all">
                                        <div>
                                            <div className="font-bold">{t.name}</div>
                                            <div className="text-xs opacity-50">{t.rows} rows • {t.size}</div>
                                        </div>
                                        <button className="opacity-0 group-hover:opacity-100 btn-secondary text-xs py-1 px-3">
                                            Browse
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STATE 2: Table Data */}
                {currentTable && (
                     <div className="glass-panel overflow-hidden">
                        {loadingData ? (
                            <div className="p-12 flex justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>
                        ) : (
                            // Legacy HTML Injection (Temp) - In future refactor to real TanStack Table
                            <div dangerouslySetInnerHTML={{ __html: browseData?.body_html || '' }} />
                        )}
                     </div>
                )}
            </div>
        </div>
    )
}
