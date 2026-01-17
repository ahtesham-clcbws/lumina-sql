import React, { useState } from 'react';
import { Search, Plus, Server as ServerIcon, LayoutGrid, List as ListIcon, Edit2, Trash2, Shield, Terminal } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { AddServerModal } from './AddServerModal';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';


export function Dashboard() {
    const { setCurrentServer, setView, dashboardViewMode, setDashboardViewMode, setCurrentDb, setCurrentTable } = useAppStore();
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingServer, setEditingServer] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Saved Servers
    const { data: servers, refetch } = useQuery({
        queryKey: ['savedServers'],
        queryFn: dbApi.getSavedServers,
        initialData: []
    });

    const navigate = useNavigate();

    const handleConnect = (server: any) => {
        setView('dashboard');
        setCurrentDb(null);
        setCurrentTable(null);
        navigate(`/server/${server.id}`);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this server?')) {
            await dbApi.deleteServer(id);
            refetch();
        }
    };

    const handleEdit = (e: React.MouseEvent, server: any) => {
        e.stopPropagation();
        setEditingServer(server);
        setShowAddModal(true);
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto w-full">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                            Server Dashboard
                        </h1>
                    </div>
                </div>


                <div className="flex items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                placeholder="Find your servers..."
                                className="w-80 bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm text-text-main placeholder:text-text-muted/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />        </div>
                        <Button onClick={() => setShowAddModal(true)} className="gap-2">
                            <Plus className="w-4 h-4" /> Add New Server
                        </Button>
                    </div>

                    {/* View Toggle */}
                    <div className="bg-canvas p-1 rounded-lg flex border border-border">
                        <button
                            onClick={() => setDashboardViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${dashboardViewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text-main hover:bg-hover-bg'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setDashboardViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${dashboardViewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text-main hover:bg-hover-bg'}`}
                            title="List View"
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                </div>

                <div className={
                    dashboardViewMode === 'grid'
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                        : "flex flex-col gap-3"
                }>
                    {/* Server Card */}
                    {servers.map((server: any) => (
                        <div key={server.id}
                            className={`glass-panel p-6 hover:border-primary hover:-translate-y-0.5 transition-all cursor-pointer group flex relative z-10 ${dashboardViewMode === 'grid'
                                    ? "flex-col"
                                    : "flex-row items-center justify-between py-4"
                                }`}
                            onClick={() => handleConnect(server)}
                        >
                            <div className={`flex items-start ${dashboardViewMode === 'list' ? 'gap-4 items-center mb-0' : 'justify-between mb-4'}`}>
                                <h3 className={`font-bold group-hover:text-primary transition-colors ${dashboardViewMode === 'list' ? 'text-base w-48' : 'text-lg'}`}>{server.name}</h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        {server.ssl && <span title="SSL Enabled"><Shield size={14} className="text-primary/70" /></span>}
                                        {server.ssh_enabled && <span title="SSH Tunnel"><Terminal size={14} className="text-purple-400/70" /></span>}
                                    </div>
                                    {dashboardViewMode === 'grid' && <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>}
                                </div>
                            </div>

                            <div className={`text-sm opacity-50 font-mono flex-1 ${dashboardViewMode === 'grid' ? 'space-y-1 mb-6' : 'flex gap-8 items-center mb-0'}`}>
                                <div className="flex gap-2 items-center">
                                    <span className="opacity-50">Host:</span>
                                    <span>{server.host}</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="opacity-50">User:</span>
                                    <span>{server.user}</span>
                                </div>
                            </div>

                            <div className={`flex items-center ${dashboardViewMode === 'grid' ? 'justify-between mt-auto pt-4 border-t border-border' : 'gap-4'}`}>
                                {dashboardViewMode === 'list' && <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_10px_rgba(16,185,129,0.3)] mr-4"></div>}
                                <Button 
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleConnect(server); }}
                                >
                                    Connect
                                </Button>
                                <div className="flex items-center gap-1">
                                    <button
                                        className="p-2 hover:bg-white/10 hover:text-white rounded text-white/50 transition-colors"
                                        onClick={(e) => handleEdit(e, server)}
                                        title="Edit Server"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="p-2 hover:bg-error/20 hover:text-error rounded text-error transition-colors"
                                        onClick={(e) => handleDelete(e, server.id)}
                                        title="Delete Server"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {servers.length === 0 && (
                        <div className="col-span-full py-12 text-center opacity-50 border-2 border-dashed border-border rounded-xl">
                            <ServerIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No servers saved. Add one to get started.</p>
                        </div>
                    )}
                </div>
            </div>

            {showAddModal && (
                <AddServerModal
                    editingServer={editingServer}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingServer(null);
                    }}
                    onAdd={() => {
                        setShowAddModal(false);
                        setEditingServer(null);
                        refetch();
                    }}
                />
            )}
        </div>
    )
}
