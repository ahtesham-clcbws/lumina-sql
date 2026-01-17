import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { User, Globe, Loader2, Save } from 'lucide-react';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: { user: string; host: string } | null;
}

export function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
    const queryClient = useQueryClient();
    const { show: showNotification } = useNotificationStore();
    
    const [newName, setNewName] = React.useState('');
    const [newHost, setNewHost] = React.useState('');

    React.useEffect(() => {
        if (user) {
            setNewName(user.user);
            setNewHost(user.host);
        }
    }, [user]);

    const editMutation = useMutation({
        mutationFn: () => dbApi.renameUser(user!.user, user!.host, newName, newHost),
        onSuccess: () => {
            showNotification(`User renamed successfully`, 'success');
            queryClient.invalidateQueries({ queryKey: ['mysqlUsers'] });
            onClose();
        },
        onError: (err) => showNotification('Failed to rename user: ' + err, 'error')
    });

    const isValid = newName.trim().length > 0 && newHost.trim().length > 0 && (newName !== user?.user || newHost !== user?.host);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit User Account" size="sm">
            <div className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner shadow-primary/20">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">Editing Account</p>
                        <p className="text-sm font-mono font-bold text-text-main line-clamp-1">{user?.user}@{user?.host}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted opacity-70 flex items-center gap-2">
                             <User size={12} /> User Name
                        </label>
                        <input 
                            className="w-full bg-surface border border-border rounded-lg px-4 h-11 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="User name..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted opacity-70 flex items-center gap-2">
                             <Globe size={12} /> Host
                        </label>
                        <input 
                            className="w-full bg-surface border border-border rounded-lg px-4 h-11 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                            value={newHost}
                            onChange={(e) => setNewHost(e.target.value)}
                            placeholder="Host (e.g. % or localhost)"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button 
                        disabled={!isValid || editMutation.isPending}
                        onClick={() => editMutation.mutate()}
                        className="flex-[2] gap-2 font-bold"
                    >
                        {editMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
