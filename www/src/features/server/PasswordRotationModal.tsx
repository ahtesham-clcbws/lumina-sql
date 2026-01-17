import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useAppStore } from '@/stores/useAppStore';
import { Key, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordRotationModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUser?: { user: string; host: string };
}

export function PasswordRotationModal({ isOpen, onClose, targetUser }: PasswordRotationModalProps) {
    const { currentServer } = useAppStore();
    const { show: showNotification } = useNotificationStore();
    
    // If no targetUser provided, default to the current connection user
    const user = targetUser?.user || currentServer?.user || '';
    const host = targetUser?.host || currentServer?.host || '%';

    const [password, setPassword] = React.useState('');
    const [confirm, setConfirm] = React.useState('');
    const [showPass, setShowPass] = React.useState(false);

    const rotationMutation = useMutation({
        mutationFn: () => dbApi.changePassword(user, host, password),
        onSuccess: () => {
            showNotification(`Password rotated for user '${user}'@'${host}'`, 'success');
            setPassword('');
            setConfirm('');
            onClose();
        },
        onError: (err) => showNotification('Rotation failed: ' + err, 'error')
    });

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let pass = "";
        for (let i = 0; i < 16; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(pass);
        setConfirm(pass);
    };

    const isValid = password.length > 0 && password === confirm;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Password Rotation" size="md">
            <div className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner shadow-primary/20">
                        <Key size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">Target Account</p>
                        <p className="text-lg font-mono font-bold text-text-main line-clamp-1">{user}@{host}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted opacity-70">New Password</label>
                        <div className="relative group">
                            <input 
                                type={showPass ? "text" : "password"}
                                className="w-full bg-surface border border-border rounded-lg px-4 h-12 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter strong password..."
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                            >
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-muted opacity-70">Confirm Password</label>
                        <input 
                            type={showPass ? "text" : "password"}
                            className={cn(
                                "w-full bg-surface border border-border rounded-lg px-4 h-12 text-sm outline-none transition-all font-mono",
                                confirm && password !== confirm ? "border-red-500/50 focus:border-red-500/50" : "focus:border-primary/50"
                            )}
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="Repeat password..."
                        />
                        {confirm && password !== confirm && (
                            <p className="text-[10px] text-red-500 mt-1 font-bold italic">Passwords do not match</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={generatePassword}
                        className="flex-1 gap-2 h-11 border-dashed hover:border-primary/50 hover:bg-primary/5 text-xs font-bold transition-all"
                    >
                        <RefreshCw size={16} /> Generate Strong
                    </Button>
                    <Button 
                        disabled={!isValid || rotationMutation.isPending}
                        onClick={() => rotationMutation.mutate()}
                        className="flex-[2] h-11 gap-2 text-sm font-bold shadow-lg shadow-primary/20"
                    >
                        {rotationMutation.isPending ? <RefreshCw className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                        Update Password
                    </Button>
                </div>

                <p className="text-[11px] text-text-muted text-center opacity-60 leading-tight">
                    This action will immediately update the user's password in the database.<br/>
                    Existing connections may still persist until re-authenticated.
                </p>
            </div>
        </Modal>
    );
}
