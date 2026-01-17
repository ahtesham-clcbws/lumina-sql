import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { User, Shield, Trash2, Key, Loader2, Plus, Info, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsersManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UsersManagementModal({ isOpen, onClose }: UsersManagementModalProps) {
    const queryClient = useQueryClient();
    const { show: showNotification } = useNotificationStore();
    const [search, setSearch] = React.useState('');

    const { data: users, isLoading, refetch } = useQuery({
        queryKey: ['mysqlUsers'],
        queryFn: () => dbApi.getUsers(),
        enabled: isOpen
    });

    const dropMutation = useMutation({
        mutationFn: ({ user, host }: { user: string; host: string }) => dbApi.dropUser(user, host),
        onSuccess: () => {
            showNotification('User dropped successfully', 'success');
            refetch();
        },
        onError: (err) => showNotification('Failed to drop user: ' + err, 'error')
    });

    const filteredUsers = React.useMemo(() => {
        if (!users) return [];
        return users.filter(u => 
            u.user.toLowerCase().includes(search.toLowerCase()) || 
            u.host.toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="User Accounts & Privileges" size="lg">
            <div className="flex flex-col h-[600px]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-50" />
                        <input 
                            className="w-full bg-surface/50 border border-border rounded-lg pl-10 pr-4 h-10 text-sm outline-none focus:border-primary/50 transition-all"
                            placeholder="Filter users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button disabled className="gap-2 h-10">
                        <Plus size={16} /> Add User
                    </Button>
                </div>

                <div className="flex-1 overflow-auto border border-border rounded-lg bg-black/10">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="animate-spin text-primary" />
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-surface border-b border-border z-10">
                                <tr>
                                    <th className="px-4 py-3 font-bold opacity-50 uppercase text-[10px] tracking-wider">User</th>
                                    <th className="px-4 py-3 font-bold opacity-50 uppercase text-[10px] tracking-wider">Host</th>
                                    <th className="px-4 py-3 font-bold opacity-50 uppercase text-[10px] tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredUsers.map((u, i) => (
                                    <tr key={`${u.user}-${u.host}-${i}`} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <User size={14} />
                                                </div>
                                                <span className="font-mono font-bold text-text-main">{u.user}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-text-muted font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{u.host}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-2 hover:bg-white/10" disabled>
                                                    <Shield size={12} className="text-blue-400" /> Privileges
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-2 hover:bg-white/10" disabled>
                                                    <Lock size={12} className="text-yellow-400" /> Password
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 text-[11px] gap-2 text-red-400 hover:bg-red-400/10 hover:text-red-400"
                                                    onClick={() => {
                                                        if (confirm(`Drop user '${u.user}'@'${u.host}'?`)) {
                                                            dropMutation.mutate({ user: u.user, host: u.host });
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={12} /> Drop
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-12 text-center text-text-muted italic opacity-50">
                                            No users found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg flex items-start gap-4">
                    <Shield className="text-primary shrink-0 mt-1" size={20} />
                    <div>
                        <h4 className="text-sm font-bold text-primary mb-1">Global Privileges</h4>
                        <p className="text-xs text-text-muted leading-relaxed">
                            Changes here affect server-wide permissions. Be careful when dropping users or modifying 
                            the <code className="text-primary font-bold bg-primary/10 px-1 rounded">root</code> account.
                            Remember to <span className="font-bold underline cursor-pointer" onClick={() => dbApi.flushPrivileges().then(() => showNotification('Privileges flushed', 'success'))}>FLUSH PRIVILEGES</span> after manual SQL changes.
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
