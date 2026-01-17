import React, { useState } from 'react';
import { X, Server as ServerIcon, Check, AlertCircle } from 'lucide-react';
import { dbApi } from '@/api/db';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';

interface AddServerModalProps {
    onClose: () => void;
    onAdd: () => void;
    editingServer?: any;
}

export function AddServerModal({ onClose, onAdd, editingServer }: AddServerModalProps) {
    const [config, setConfig] = useState(editingServer || {
        name: '',
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        pass: '',
        ssl: false,
        ssh_enabled: false,
        ssh_host: '',
        ssh_port: 22,
        ssh_user: '',
        ssh_pass: '',
        auto_connect: false
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setConfig({ ...config, [e.target.name]: value });
        setError(null);
    };

    const handleTest = async () => {
        if (!config.name || !config.host || !config.user) {
            setError("Display name, host, and username are required.");
            return;
        }

        setTesting(true);
        setError(null);
        try {
            await dbApi.connect({ ...config, id: 'test' });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (e: any) {
            setError(e.toString());
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        if (!config.name) {
            setError("Display name is required.");
            return;
        }
        try {
            const id = editingServer?.id || config.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            await dbApi.saveServer({ ...config, id });
            onAdd();
            onClose();
        } catch (e: any) {
            console.error(e);
            setError(e.toString());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-border bg-black/10">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-text-main">
                        <ServerIcon className="text-primary" /> {editingServer ? 'Edit Server' : 'Add Server'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-hover-bg rounded-lg transition-colors text-text-muted hover:text-text-main">
                        <X size={20} className="opacity-50" />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold opacity-50 uppercase text-text-muted tracking-wider">Display Name</label>
                        <input name="name" value={config.name} onChange={handleChange} className="w-full bg-canvas border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary transition-colors text-text-main" placeholder="e.g. Production DB" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold opacity-50 uppercase text-text-muted tracking-wider">Host</label>
                            <input name="host" value={config.host} onChange={handleChange} className="w-full bg-canvas border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary transition-colors text-text-main" placeholder="127.0.0.1" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold opacity-50 uppercase text-text-muted tracking-wider">Port</label>
                            <input name="port" type="number" value={config.port} onChange={handleChange} className="w-full bg-canvas border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary transition-colors text-text-main" placeholder="3306" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold opacity-50 uppercase text-text-muted tracking-wider">Username</label>
                            <input name="user" value={config.user} onChange={handleChange} className="w-full bg-canvas border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary transition-colors text-text-main" placeholder="root" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold opacity-50 uppercase text-text-muted tracking-wider">Password</label>
                            <input name="pass" type="password" value={config.pass} onChange={handleChange} className="w-full bg-canvas border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary transition-colors text-text-main" placeholder="••••••" />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2 pb-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" name="ssl" checked={config.ssl} onChange={handleChange} className="w-4 h-4 rounded border-border bg-canvas checked:bg-primary transition-all" />
                            <span className="text-xs font-semibold text-text-muted group-hover:text-text-main">Enable SSL</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" name="auto_connect" checked={config.auto_connect} onChange={handleChange} className="w-4 h-4 rounded border-border bg-canvas checked:bg-primary transition-all" />
                            <span className="text-xs font-semibold text-text-muted group-hover:text-text-main">Auto-connect</span>
                        </label>
                    </div>

                    <div className="pt-2 border-t border-border/50">
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-[10px] font-bold uppercase text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
                        >
                            {showAdvanced ? 'Hide' : 'Show'} SSH Tunneling Settings
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 p-4 bg-black/20 rounded-lg border border-border/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                <label className="flex items-center gap-2 cursor-pointer group mb-2">
                                    <input type="checkbox" name="ssh_enabled" checked={config.ssh_enabled} onChange={handleChange} className="w-4 h-4 rounded border-border bg-canvas checked:bg-primary" />
                                    <span className="text-xs font-bold text-text-main">Enable SSH Tunnel</span>
                                </label>
                                
                                <div className="grid grid-cols-3 gap-4 opacity-80">
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold opacity-50 uppercase">SSH Host</label>
                                        <input name="ssh_host" disabled={!config.ssh_enabled} value={config.ssh_host} onChange={handleChange} className="w-full bg-canvas border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-30" placeholder="remote-host.com" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold opacity-50 uppercase">SSH Port</label>
                                        <input name="ssh_port" type="number" disabled={!config.ssh_enabled} value={config.ssh_port} onChange={handleChange} className="w-full bg-canvas border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-30" placeholder="22" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 opacity-80">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold opacity-50 uppercase">SSH User</label>
                                        <input name="ssh_user" disabled={!config.ssh_enabled} value={config.ssh_user} onChange={handleChange} className="w-full bg-canvas border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-30" placeholder="ssh-user" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold opacity-50 uppercase">SSH Pass/Key</label>
                                        <input name="ssh_pass" type="password" disabled={!config.ssh_enabled} value={config.ssh_pass} onChange={handleChange} className="w-full bg-canvas border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-30" placeholder="••••••" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 text-red-500 text-xs rounded-lg border border-red-500/20 flex items-center gap-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3 bg-black/5">
                    <Button
                        variant="outline"
                        onClick={handleTest}
                        disabled={testing || success}
                        className="h-9 px-4 text-xs font-semibold"
                    >
                        {testing ? 'Connecting...' : (success ? <span className="text-success flex items-center gap-1"><Check size={14}/> Success</span> : 'Test Connection')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={testing}
                        className="h-9 px-6 text-xs font-semibold shadow-lg shadow-primary/20"
                    >
                        {editingServer ? 'Update Server' : 'Save Server'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
