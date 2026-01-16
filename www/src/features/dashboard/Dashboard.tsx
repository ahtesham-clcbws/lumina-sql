import React from 'react';
import { Search, Plus, MoreHorizontal, Activity, Clock, Server as ServerIcon, User } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useQuery } from '@tanstack/react-query';
import { dbApi } from '@/api/db';

function ServerStats() {
    const { data } = useQuery({
        queryKey: ['serverStats'],
        queryFn: () => dbApi.getServerStats()
    });

    const stats = data?.rows?.[0] || [];
    // safeInvoke -> rows: [[version, uptime, user, db]]
    const version = stats[0] || '-';
    const uptime = stats[1] ? Math.floor(stats[1] / 3600) + 'h' : '-';
    const user = stats[2] || '-';

    if (!data) return null;

    return (
        <div className="grid grid-cols-3 gap-4 mb-8">
             <div className="glass-panel p-4 flex items-center gap-4">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Activity size={20} /></div>
                <div>
                    <div className="text-xs opacity-50 uppercase tracking-wider">Version</div>
                    <div className="font-mono font-bold text-lg">{version.split('-')[0]}</div>
                </div>
             </div>
             <div className="glass-panel p-4 flex items-center gap-4">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Clock size={20} /></div>
                <div>
                    <div className="text-xs opacity-50 uppercase tracking-wider">Uptime</div>
                    <div className="font-mono font-bold text-lg">{uptime}</div>
                </div>
             </div>
             <div className="glass-panel p-4 flex items-center gap-4">
                <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><User size={20} /></div>
                <div>
                    <div className="text-xs opacity-50 uppercase tracking-wider">User</div>
                    <div className="font-mono font-bold text-lg">{user.split('@')[0]}</div>
                </div>
             </div>
        </div>
    );
}

export function Dashboard() {
    const { setCurrentServer, setView } = useAppStore();

    // Mock servers for now - will be replaced by Query later
    const servers = [
        { id: '1', name: 'Localhost', host: '127.0.0.1', port: 3306, user: 'root' }
    ];

    return (
        <div className="flex-1 overflow-y-auto p-8">
             <div className="max-w-7xl mx-auto w-full">
                <h1 className="text-3xl font-bold mb-6 text-white">Server Dashboard</h1>
                
                <ServerStats />

                <div className="flex items-center gap-4 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Find your servers..." 
                            className="input w-full pl-10"
                        />
                    </div>
                    <button className="btn-primary">
                        <Plus className="w-4 h-4" /> Add New Server
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Server Card */}
                    {servers.map(server => (
                        <div key={server.id} 
                             className="glass-panel p-6 hover:border-blue-500 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col"
                             onClick={() => {
                                 setCurrentServer(server);
                                 setView('dashboard'); // Stay on dashboard, but select server context?
                                 // Actually, usually selecting a server might open it. 
                                 // But 'dashboard' IS the server home. 
                                 // Maybe we want to go into 'browser' if a DB was auto-selected?
                                 // For now, let's keep it simple.
                             }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold group-hover:text-blue-400 transition-colors">{server.name}</h3>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
                            </div>
                            <div className="text-sm opacity-50 font-mono space-y-1 mb-6 flex-1">
                                <div className="flex gap-2 items-center">
                                    <span className="w-16 opacity-50">Host:</span>
                                    <span>{server.host}</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="w-16 opacity-50">User:</span>
                                    <span>{server.user}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20">
                                    Connect
                                </button>
                                <button className="p-2 hover:bg-white/10 rounded text-white/50 hover:text-white">
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    )
}
