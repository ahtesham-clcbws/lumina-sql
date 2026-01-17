import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { UserPlus, User, Globe, Key, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddUserModal({ isOpen, onClose }: AddUserModalProps) {
    const queryClient = useQueryClient();
    const { show: showNotification } = useNotificationStore();
    
    const [name, setName] = React.useState('');
    const [host, setHost] = React.useState('%');
    const [password, setPassword] = React.useState('');
    const [showPass, setShowPass] = React.useState(false);

    const createMutation = useMutation({
        mutationFn: () => dbApi.createUser(name, host, password),
        onSuccess: () => {
            showNotification(`User '${name}'@'${host}' created successfully`, 'success');
            queryClient.invalidateQueries({ queryKey: ['mysqlUsers'] });
            resetForm();
            onClose();
        },
        onError: (err) => showNotification('Failed to create user: ' + err, 'error')
    });

    const resetForm = () => {
        setName('');
        setHost('%');
        setPassword('');
    };

    const isValid = name.trim().length > 0 && host.trim().length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New User Account" size="md">
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted opacity-70 flex items-center gap-2">
                             <User size={12} /> User Name
                        </label>
                        <input 
                            className="w-full bg-surface border border-border rounded-lg px-4 h-11 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. dev_user"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted opacity-70 flex items-center gap-2">
                             <Globe size={12} /> Host
                        </label>
                        <input 
                            className="w-full bg-surface border border-border rounded-lg px-4 h-11 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            placeholder="% (Any) or localhost"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted opacity-70 flex items-center gap-2">
                             <Key size={12} /> Password
                        </label>
                        <div className="relative group">
                            <input 
                                type={showPass ? "text" : "password"}
                                className="w-full bg-surface border border-border rounded-lg px-4 h-11 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="User password..."
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button 
                        disabled={!isValid || createMutation.isPending}
                        onClick={() => createMutation.mutate()}
                        className="flex-[2] gap-2 font-bold"
                    >
                        {createMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                        Create User
                    </Button>
                </div>

                <p className="text-[10px] text-text-muted opacity-50 italic text-center leading-relaxed">
                    Note: Newly created users have NO privileges by default.<br/>
                    You can assign permissions using the "Privileges" matrix after creation.
                </p>
            </div>
        </Modal>
    );
}
