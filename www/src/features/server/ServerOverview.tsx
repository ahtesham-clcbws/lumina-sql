import React from 'react';
import { ServerMonitor } from './ServerMonitor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { useNavigate } from 'react-router-dom';
import { 
    Activity, Clock, User, Database as DBIcon, Search, HardDrive, 
    LayoutGrid, List, Trash2, Plus, Settings as SettingsIcon, MoreHorizontal, 
    RefreshCcw, Zap, Terminal, Info, ChevronRight, Key
} from 'lucide-react';
import { AddServerModal } from '../dashboard/AddServerModal';
import { CreateDatabaseModal } from './CreateDatabaseModal';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { cn } from '@/lib/utils';
import { UsersManagementModal } from './UsersManagementModal';
import { PasswordRotationModal } from './PasswordRotationModal';

function ProcessListModal({ onClose }: { onClose: () => void }) {
    const { data: processes, isLoading, refetch } = useQuery({
        queryKey: ['processList'],
        queryFn: () => dbApi.getProcessList(),
        refetchInterval: 5000
    });

    const killMutation = useMutation({
        mutationFn: (id: number) => dbApi.executeQuery(`KILL ${id}`),
        onSuccess: () => {
            refetch();
        }
    });

    return (
        <Modal isOpen={true} onClose={onClose} title="Server Processes" size="lg">
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-text-muted">Live view of active connections and queries.</p>
                    <Button size="xs" variant="outline" onClick={() => refetch()} className="gap-2">
                        <RefreshCcw size={12} className={isLoading ? 'animate-spin' : ''} /> Refresh
                    </Button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden bg-canvas">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-surface border-b border-border">
                            <tr>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">ID</th>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">User</th>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">Host</th>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">DB</th>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">Command</th>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">Time</th>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">State</th>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {processes?.map((p: any) => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-2 font-mono">{p.id}</td>
                                    <td className="px-4 py-2">{p.user}</td>
                                    <td className="px-4 py-2 truncate max-w-[100px]" title={p.host}>{p.host}</td>
                                    <td className="px-4 py-2">{p.db || '-'}</td>
                                    <td className="px-4 py-2 font-semibold text-primary">{p.command}</td>
                                    <td className="px-4 py-2">{p.time}s</td>
                                    <td className="px-4 py-2 italic text-text-muted/60">{p.state || '-'}</td>
                                    <td className="px-4 py-2">
                                        <button 
                                            onClick={() => killMutation.mutate(p.id)}
                                            className="text-error hover:underline font-bold disabled:opacity-30"
                                            disabled={killMutation.isPending}
                                        >
                                            Kill
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}

function VariablesModal({ type, onClose }: { type: 'status' | 'variables', onClose: () => void }) {
    const [filter, setFilter] = React.useState('');
    const { data: variables, isLoading } = useQuery({
        queryKey: [type, filter],
        queryFn: () => type === 'status' ? dbApi.getStatusVariables(filter) : dbApi.getServerVariables(filter),
        refetchInterval: type === 'status' ? 10000 : false // Status variables might update
    });

    const title = type === 'status' ? 'Global Status Variables' : 'System Variables';
    const description = type === 'status' 
        ? 'Real-time throughput and performance counters.' 
        : 'Server-level system configuration settings.';

    return (
        <Modal isOpen={true} onClose={onClose} title={title} size="lg">
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-text-muted">{description}</p>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40 w-3 h-3 pointer-events-none" />
                        <input 
                            type="text" 
                            placeholder="Filter..." 
                            className="bg-canvas border border-border rounded-lg pl-8 pr-4 h-7 w-40 text-xs outline-none focus:border-primary/50" 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden bg-canvas max-h-[50vh] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-surface border-b border-border sticky top-0">
                            <tr>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">Variable Name</th>
                                <th className="px-4 py-2 font-bold opacity-50 uppercase">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {isLoading ? (
                                <tr><td colSpan={2} className="px-4 py-4 text-center opacity-40">Loading...</td></tr>
                            ) : variables?.length === 0 ? (
                                <tr><td colSpan={2} className="px-4 py-4 text-center opacity-40">No variables found.</td></tr>
                            ) : (
                                variables?.map((v: any) => (
                                    <tr key={v.variable_name} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-2 font-mono text-primary/80">{v.variable_name}</td>
                                        <td className="px-4 py-2 font-mono break-all">{v.value}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}

function ServerActionMenu({ onClose, onAction }: { onClose: () => void, onAction: (action: string) => void }) {
    const { showSystemDbs, setShowSystemDbs } = useAppStore();

    const actions = [
        { id: 'flush', label: 'Flush Privileges', icon: Zap, color: 'text-orange-400' },
        { id: 'flush_logs', label: 'Flush Logs/Cache', icon: RefreshCcw, color: 'text-blue-400' },
        { id: 'processes', label: 'Show Processes', icon: Terminal, color: 'text-primary' },
        { id: 'variables', label: 'System Variables', icon: Info, color: 'text-purple-400' },
        { id: 'status', label: 'Global Status', icon: Activity, color: 'text-green-400' },
        { id: 'users', label: 'User Accounts', icon: User, color: 'text-amber-400' },
        { id: 'rotate_pass', label: 'Rotate My Password', icon: Key, color: 'text-rose-400' },
        { id: 'refresh', label: 'Force Refresh Stats', icon: RefreshCcw, color: 'text-green-400' },
        { id: 'toggle_system', label: showSystemDbs ? 'Hide System Databases' : 'Show System Databases', icon: Info, color: 'text-blue-400' },
    ];

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-border/50 bg-black/5">
                    <p className="text-[12px] font-bold uppercase opacity-40 tracking-wider">Administrative Actions</p>
                </div>
                <div className="flex flex-col divide-y">
                    {actions.map(action => (
                        <button
                            key={action.id}
                            onClick={() => { onAction(action.id); onClose(); }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-hover-bg transition-colors flex items-center gap-3 group border-0! rounded-none! focus:outline-none!"
                        >
                            <action.icon size={16} className={`${action.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                            <span className="flex-1 font-medium whitespace-nowrap">{action.label}</span>
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-20 transition-all -translate-x-1 group-hover:translate-x-0" />
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}


export function ServerOverview() {
    const { 
        currentServer, setCurrentDb, setView, 
        dashboardViewMode, setDashboardViewMode,
        showSystemDbs, setShowSystemDbs
    } = useAppStore();
    const { show: showNotification } = useNotificationStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Helper: Format Bytes
    const formatBytes = (bytes?: number) => {
        if (bytes === undefined || bytes === null) return '0 B';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 1. Fetch Server Stats
    const { data: statsData, error: statsError } = useQuery({
        queryKey: ['serverStats', currentServer?.id],
        queryFn: () => dbApi.getServerStats(),
        enabled: !!currentServer
    });

    // 2. Fetch Databases
    const { data: databases, isLoading: loadingDbs, isFetching: fetchingDbs } = useQuery({
        queryKey: ['databases', currentServer?.id],
        queryFn: () => dbApi.getDatabases(),
        enabled: !!currentServer
    });

    const stats = statsData?.rows?.[0] || [];
    const version = stats[0] || 'Unknown';
    const uptimeValue = stats[1]; // Might be string or number
    const uptimeSeconds = typeof uptimeValue === 'number' ? uptimeValue : parseInt(uptimeValue || '0');
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptime = uptimeHours > 0 ? `${uptimeHours}h` : `${Math.floor(uptimeSeconds / 60)}m`;
    const user = stats[2] || 'Unknown';

    const sortedDbs = React.useMemo(() => {
        if (!databases) return [];
        const systemDbs = ['information_schema', 'mysql', 'performance_schema', 'sys'];
        
        let filtered = [...databases];
        
        // Filter system databases if not enabled
        if (!showSystemDbs) {
            filtered = filtered.filter(db => !systemDbs.includes(db.name.toLowerCase()));
        }

        // Sort alphabetically (A-Z)
        return filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [databases, showSystemDbs]);

    const DatabaseSkeleton = () => (
        <div className="glass-panel p-4 flex flex-col gap-3 relative animate-pulse">
            <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded bg-white/5" />
            </div>
            <div className="space-y-2">
                <div className="h-5 w-3/4 bg-white/5 rounded" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
                <div className="h-3 w-1/3 bg-white/5 rounded" />
            </div>
        </div>
    );

    const handleDbClick = (dbName: string) => {
        if (currentServer) {
            navigate(`/server/${currentServer.id}/${dbName}`);
        }
    };

    const handleDropDb = async (e: React.MouseEvent, dbName: string) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to DROP the database '${dbName}'? This cannot be undone.`)) {
            try {
                await dbApi.dropDatabase(dbName);
                queryClient.invalidateQueries({ queryKey: ['databases'] });
            } catch (err) {
                console.error("Failed to drop database", err);
                showNotification("Failed to drop database: " + err, 'error');
            }
        }
    };

    const flushMutation = useMutation({
        mutationFn: () => dbApi.executeQuery('FLUSH PRIVILEGES'),
        onSuccess: () => {
            showNotification('Privileges flushed successfully!', 'success');
        },
        onError: (err) => {
            showNotification('Failed to flush privileges: ' + err, 'error');
        }
    });

    const [showCreateDbModal, setShowCreateDbModal] = React.useState(false);
    const [showEditServerModal, setShowEditServerModal] = React.useState(false);
    const [showProcessList, setShowProcessList] = React.useState(false);
    const [showVariablesModal, setShowVariablesModal] = React.useState<'status' | 'variables' | null>(null);
    const [showActionMenu, setShowActionMenu] = React.useState(false);
    const [showUsersModal, setShowUsersModal] = React.useState(false);
    const [showRotationModal, setShowRotationModal] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const filteredDbs = React.useMemo(() => {
        if (!databases) return [];
        return sortedDbs.filter(db => db.name.toLowerCase().includes(search.toLowerCase()));
    }, [sortedDbs, search]);

    return (
        <div className="p-8 h-full flex flex-col overflow-hidden bg-main">
            {/* Header Area */}
            <header className="mb-8 flex-shrink-0 flex items-end justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="text-primary" size={32} />
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">
                                {currentServer?.name || 'Server Overview'}
                            </h1>
                            <div className="flex items-baseline gap-1 bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 shadow-sm shadow-primary/5">
                                <span className="text-sm font-bold text-primary">{uptime}</span>
                                <span className="text-[10px] uppercase font-bold opacity-60 text-primary">uptime</span>
                            </div>
                        </div>
                        {fetchingDbs && !loadingDbs && (
                            <div className="flex items-center gap-2 text-[10px] text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 animate-in fade-in duration-300 ml-2">
                                <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                                Syncing...
                            </div>
                        )}
                    </div>
                    <p className="text-text-muted text-xs opacity-70 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-main">
                            {version.includes('MariaDB') ? 'MariaDB Engine' : 'MySQL Community'} ({version.split('-')[0]})
                        </span>
                        <span className="opacity-30">&bull;</span>
                        <span>{user.split('@')[0]}@{currentServer?.host}</span>
                        <span className="opacity-30">&bull;</span>
                        <span>
                            {databases?.length || 0} Databases, {databases?.reduce((acc, db) => acc + (db.tables_count || 0), 0) || 0} Tables
                        </span>
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Actions Toolbar */}
                    <div className="flex items-center gap-2 pr-3 border-r border-border/20">
                        <Button 
                            size="sm" 
                            className="h-10 gap-2 px-4 text-xs font-bold shadow-sm"
                            onClick={() => setShowCreateDbModal(true)}
                        >
                            <Plus size={16} /> Create
                        </Button>
                    </div>

                    {/* Search and Toggle Group */}
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:opacity-70 group-focus-within:text-primary w-4 h-4 transition-all pointer-events-none" />
                            <input 
                                type="text" 
                                placeholder="Search databases..." 
                                className="bg-surface/50 border border-border rounded-lg pl-10 pr-4 h-10 w-64 text-xs outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-text-muted/30 hover:border-border/60" 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex bg-surface/50 border border-border rounded-lg p-1 h-10 gap-1 shadow-inner shadow-black/20">
                            <button 
                                onClick={() => setDashboardViewMode('grid')}
                                className={cn(
                                    "px-3 flex items-center justify-center rounded transition-all",
                                    dashboardViewMode === 'grid' 
                                        ? "bg-primary! text-white shadow-sm" 
                                        : "text-text-muted hover:text-text-main hover:bg-white/5"
                                )}
                                title="Grid View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button 
                                onClick={() => setDashboardViewMode('list')}
                                className={cn(
                                    "px-3 flex items-center justify-center rounded transition-all",
                                    dashboardViewMode === 'list' 
                                        ? "bg-primary! text-white shadow-sm" 
                                        : "text-text-muted hover:text-text-main hover:bg-white/5"
                                )}
                                title="List View"
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pl-1">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowEditServerModal(true)}
                            className="h-10 shrink-0 p-1!"
                            title="Server Settings"
                        >
                            <SettingsIcon size={18} />
                        </Button>
                        <div className="relative">
                            <Button 
                                variant="outline"
                                size="icon"
                                onClick={() => setShowActionMenu(!showActionMenu)}
                                className={cn(
                                    "h-10 shrink-0 p-1!",
                                    showActionMenu && "bg-primary/20! border-primary/40! text-primary hover:bg-primary/30!"
                                )} 
                                title="More Options"
                            >
                                <MoreHorizontal size={18} />
                            </Button>
                            {showActionMenu && (
                                <ServerActionMenu 
                                    onClose={() => setShowActionMenu(false)} 
                                    onAction={(action) => {
                                        if (action === 'processes') setShowProcessList(true);
                                        if (action === 'status') setShowVariablesModal('status');
                                        if (action === 'variables') setShowVariablesModal('variables');
                                        if (action === 'refresh') queryClient.invalidateQueries({ queryKey: ['serverStats'] });
                                        if (action === 'flush') flushMutation.mutate();
                                        if (action === 'flush_logs') {
                                            dbApi.executeQuery('FLUSH LOGS')
                                                .then(() => showNotification('Logs flushed successfully', 'success'))
                                                .catch(err => showNotification('Failed: ' + err, 'error'));
                                        }
                                        if (action === 'toggle_system') {
                                            setShowSystemDbs(!showSystemDbs);
                                        }
                                        if (action === 'users') {
                                            setShowUsersModal(true);
                                        }
                                        if (action === 'rotate_pass') {
                                            setShowRotationModal(true);
                                        }
                                    }} 
                                />
                            )}
                        </div>
                    </div>
                </div>
            </header>


            {/* Databases Section */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

                <div className="flex-1 min-h-0 flex flex-col">
                    {loadingDbs ? (
                        /* SKELETON LOADING STATE */
                        <div className={cn(
                            "flex-1 overflow-y-auto pr-2 custom-scrollbar",
                            dashboardViewMode === 'grid' 
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6"
                                : "flex flex-col gap-2"
                        )}>
                            {[...Array(8)].map((_, i) => (
                                dashboardViewMode === 'grid' ? (
                                    <DatabaseSkeleton key={i} />
                                ) : (
                                    <div key={i} className="glass-panel p-4 flex items-center justify-between animate-pulse">
                                        <div className="flex items-center gap-3 w-1/3">
                                            <div className="w-4 h-4 bg-white/5 rounded" />
                                            <div className="h-4 bg-white/5 rounded w-full" />
                                        </div>
                                        <div className="h-4 bg-white/5 rounded w-16" />
                                        <div className="h-4 bg-white/5 rounded w-20" />
                                    </div>
                                )
                            ))}
                        </div>
                    ) : dashboardViewMode === 'grid' ? (
                        /* GRID VIEW */
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
                            {filteredDbs.map(db => (
                                <button 
                                    key={db.name}
                                    onClick={() => handleDbClick(db.name)}
                                    className="glass-panel p-3! text-left hover:border-primary group transition-all hover:bg-white/5 flex flex-col gap-2 relative"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 truncate pr-6">
                                            <DBIcon className="text-primary flex-shrink-0" size={18} />
                                            <div className="font-bold text-lg truncate group-hover:text-primary transition-colors" title={db.name}>
                                                {db.name}
                                            </div>
                                        </div>
                                        <div className="absolute top-2 right-2 flex items-center gap-2">
                                            <div 
                                                className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                onClick={(e) => handleDropDb(e, db.name)}
                                                title="Drop Database"
                                            >
                                                <Trash2 size={14} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between mt-auto">
                                        <div className="text-[10px] font-mono opacity-50 flex items-center gap-1.5">
                                            <span className="font-bold text-text-main/70">{db.tables_count || 0} Tables</span>
                                            <span className="opacity-30">•</span>
                                            <span>{formatBytes(db.size)}</span>
                                        </div>
                                        <div className="text-[10px] opacity-40 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                            utf8mb4_unicode_ci
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* LIST VIEW */
                        <div className="glass-panel border border-border/10 flex flex-col flex-1 min-h-0 overflow-hidden mb-6">
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10 bg-surface/90 backdrop-blur-md">
                                        <tr className="border-b border-border bg-black/20 text-[10px] uppercase font-bold text-text-muted tracking-wide">
                                            <th className="px-5 py-3">Database Name</th>
                                            <th className="px-5 py-3">Collation</th>
                                            <th className="px-5 py-3 text-right">Tables</th>
                                            <th className="px-5 py-3 text-right">Size</th>
                                            <th className="px-5 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {filteredDbs.map(db => (
                                            <tr 
                                                key={db.name} 
                                                onClick={() => handleDbClick(db.name)}
                                                className="hover:bg-white/5 cursor-pointer group transition-colors"
                                            >
                                                <td className="px-5 py-3 font-semibold text-text-main group-hover:text-primary transition-colors flex items-center gap-3">
                                                    <DBIcon size={16} className="text-text-muted/50" />
                                                    {db.name}
                                                </td>
                                                <td className="px-5 py-3 text-xs opacity-40 font-mono text-nowrap">utf8mb4_unicode_ci</td> 
                                                <td className="px-5 py-3 text-right font-mono text-xs opacity-60">{db.tables_count || 0}</td>
                                                <td className="px-5 py-3 text-right font-mono text-xs opacity-60 text-nowrap">{formatBytes(db.size)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                            onClick={(e) => handleDropDb(e, db.name)}
                                                            title="Drop Database"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showCreateDbModal && (
                <CreateDatabaseModal 
                    onClose={() => setShowCreateDbModal(false)}
                    onCreated={() => {
                        queryClient.invalidateQueries({ queryKey: ['databases'] });
                    }}
                />
            )}

            {showEditServerModal && currentServer && (
                <AddServerModal 
                    editingServer={currentServer}
                    onClose={() => setShowEditServerModal(false)}
                    onAdd={() => {
                        setShowEditServerModal(false);
                        queryClient.invalidateQueries({ queryKey: ['savedServers'] });
                    }}
                />
            )}

            {showProcessList && (
                <ProcessListModal onClose={() => setShowProcessList(false)} />
            )}

            {showVariablesModal && (
                <VariablesModal
                    type={showVariablesModal}
                    onClose={() => setShowVariablesModal(null)}
                />
            )}

            <UsersManagementModal
                isOpen={showUsersModal}
                onClose={() => setShowUsersModal(false)}
            />

            <PasswordRotationModal
                isOpen={showRotationModal}
                onClose={() => setShowRotationModal(false)}
            />
        </div>
    );
}
