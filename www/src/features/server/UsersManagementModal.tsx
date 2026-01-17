import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { User, Shield, Trash2, Key, Loader2, Plus, Info, ChevronRight, Lock, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PasswordRotationModal } from './PasswordRotationModal';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { Edit2 } from 'lucide-react';

interface UsersManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UsersManagementModal({ isOpen, onClose }: UsersManagementModalProps) {
    const queryClient = useQueryClient();
    const { show: showNotification } = useNotificationStore();
    const [search, setSearch] = React.useState('');
    const [editingUser, setEditingUser] = React.useState<{user: string, host: string} | null>(null); // For Matrix
    const [userToEdit, setUserToEdit] = React.useState<{user: string, host: string} | null>(null); // For Renaming
    const [passwordRotationUser, setPasswordRotationUser] = React.useState<{user: string, host: string} | null>(null);
    const [showAddUser, setShowAddUser] = React.useState(false);

    const { data: users, isLoading, refetch } = useQuery({
        queryKey: ['mysqlUsers'],
        queryFn: () => dbApi.getUsers(),
        enabled: isOpen
    });

    const { data: matrix, isLoading: loadingMatrix } = useQuery({
        queryKey: ['userPrivileges', editingUser?.user, editingUser?.host],
        queryFn: () => dbApi.getPrivilegeMatrix(editingUser!.user, editingUser!.host),
        enabled: !!editingUser
    });

    const dropMutation = useMutation({
        mutationFn: ({ user, host }: { user: string; host: string }) => dbApi.dropUser(user, host),
        onSuccess: () => {
            showNotification('User dropped successfully', 'success');
            refetch();
        },
        onError: (err) => showNotification('Failed to drop user: ' + err, 'error')
    });

    const togglePrivilege = useMutation({
        mutationFn: ({ privilege, level, isGrant }: { privilege: string, level: string, isGrant: boolean }) => 
            dbApi.updatePrivilege(editingUser!.user, editingUser!.host, privilege, level, isGrant),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userPrivileges', editingUser?.user, editingUser?.host] });
            showNotification('Privilege updated', 'success');
        },
        onError: (err) => showNotification('Failed to update privilege: ' + err, 'error')
    });

    const filteredUsers = React.useMemo(() => {
        if (!users) return [];
        return users.filter(u => 
            u.user.toLowerCase().includes(search.toLowerCase()) || 
            u.host.toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    const COMMON_PRIVILEGES = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'RELOAD', 'SHUTDOWN', 
        'PROCESS', 'FILE', 'GRANT OPTION', 'REFERENCES', 'INDEX', 'ALTER', 'SHOW DATABASES', 
        'SUPER', 'CREATE TEMPORARY TABLES', 'LOCK TABLES', 'EXECUTE', 'REPLICATION SLAVE', 
        'REPLICATION CLIENT', 'CREATE VIEW', 'SHOW VIEW', 'CREATE ROUTINE', 'ALTER ROUTINE', 
        'CREATE USER', 'EVENT', 'TRIGGER', 'CREATE TABLESPACE'
    ];

    const isGlobalGranted = (priv: string) => matrix?.global.includes(priv) || matrix?.global.includes('ALL PRIVILEGES');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingUser ? `Manage Privileges: ${editingUser.user}@${editingUser.host}` : "User Accounts & Privileges"} size={editingUser ? "xl" : "lg"}>
            <div className="flex flex-col min-h-[600px] max-h-[80vh]">
                {editingUser ? (
                    <div className="flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-4">
                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)} className="gap-2">
                                <ChevronRight className="rotate-180" size={14} /> Back to Users
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => dbApi.flushPrivileges().then(() => showNotification('Privileges flushed', 'success'))}>Flush Privileges</Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto space-y-8 pr-2 custom-scrollbar">
                            <section>
                                <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                                    <Shield size={16} /> Global Privileges
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                    {loadingMatrix ? (
                                        <div className="col-span-full py-12 text-center opacity-30"><Loader2 className="animate-spin inline mr-2"/> Loading privileges...</div>
                                    ) : COMMON_PRIVILEGES.map(priv => {
                                        const granted = isGlobalGranted(priv);
                                        return (
                                            <label 
                                                key={priv} 
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                                                    granted 
                                                        ? "border-primary/40 bg-primary/10 shadow-[inner_0_0_20px_rgba(var(--primary-rgb),0.1)]" 
                                                        : "border-white/5 bg-black/40 opacity-40 hover:opacity-100 hover:border-white/20"
                                                )}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={granted} 
                                                    className="w-4 h-4 accent-primary z-10"
                                                    onChange={(e) => togglePrivilege.mutate({ privilege: priv, level: '*.*', isGrant: e.target.checked })}
                                                />
                                                <span className={cn(
                                                    "text-[10px] font-black tracking-widest uppercase z-10",
                                                    granted ? "text-primary" : "text-text-muted"
                                                )}>{priv}</span>
                                                {granted && <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />}
                                            </label>
                                        );
                                    })}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                                    <LayoutGrid size={16} /> Database-Specific Privileges
                                </h3>
                                <div className="glass-panel overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="p-3 text-left">Database</th>
                                                <th className="p-3 text-left">Privileges</th>
                                                <th className="p-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {matrix?.databases.map(([db, privs]) => (
                                                <tr key={db} className="hover:bg-white/5">
                                                    <td className="p-3 font-bold text-blue-400 font-mono">{db}</td>
                                                    <td className="p-3 opacity-60 italic">{privs.join(', ')}</td>
                                                    <td className="p-3 text-right">
                                                        <Button variant="ghost" size="sm" className="h-7 text-[10px] text-red-400" onClick={() => togglePrivilege.mutate({ privilege: 'ALL PRIVILEGES', level: `\`${db}\`.*`, isGrant: false })}>Revoke All</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!matrix?.databases || matrix.databases.length === 0) && (
                                                <tr><td colSpan={3} className="p-8 text-center opacity-40 italic text-xs">No database-specific privileges assigned.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </div>
                ) : (
                    <>
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
                            <Button className="gap-2 h-10" onClick={() => setShowAddUser(true)}>
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
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-[11px] gap-2 hover:bg-white/10"
                                                            onClick={() => setEditingUser({ user: u.user, host: u.host })}
                                                        >
                                                            <Shield size={12} className="text-blue-400" /> Privileges
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-[11px] gap-2 hover:bg-white/10"
                                                            onClick={() => setUserToEdit({ user: u.user, host: u.host })}
                                                        >
                                                            <Edit2 size={12} className="text-primary" /> Rename
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-[11px] gap-2 hover:bg-white/10"
                                                            onClick={() => setPasswordRotationUser({ user: u.user, host: u.host })}
                                                        >
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
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>

            <PasswordRotationModal 
                isOpen={!!passwordRotationUser} 
                onClose={() => setPasswordRotationUser(null)} 
                targetUser={passwordRotationUser || undefined}
            />
            <AddUserModal 
                isOpen={showAddUser} 
                onClose={() => setShowAddUser(false)} 
            />

            <EditUserModal
                isOpen={!!userToEdit}
                onClose={() => setUserToEdit(null)}
                user={userToEdit}
            />
        </Modal>
    );
}
