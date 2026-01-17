import React, { useState } from 'react';
import { X, Database, Check, AlertCircle, Loader2 } from 'lucide-react';
import { dbApi } from '@/api/db';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

interface CreateDatabaseModalProps {
    onClose: () => void;
    onCreated: () => void;
}

export function CreateDatabaseModal({ onClose, onCreated }: CreateDatabaseModalProps) {
    const [name, setName] = useState('');
    const [collation, setCollation] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: collations, isLoading: loadingCollations } = useQuery({
        queryKey: ['collations'],
        queryFn: dbApi.getCollations
    });

    const handleCreate = async () => {
        if (!name) {
            setError("Database name is required.");
            return;
        }

        setBusy(true);
        setError(null);
        try {
            await dbApi.createDatabase(name, collation || undefined);
            onCreated();
            onClose();
        } catch (e: any) {
            setError(e.toString());
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-text-main">
                        <Database className="text-primary" /> Create Database
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-hover-bg rounded-lg transition-colors text-text-muted hover:text-text-main">
                        <X size={20} className="opacity-50" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold opacity-50 uppercase text-text-muted">Database Name</label>
                        <input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="w-full bg-canvas border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary text-text-main" 
                            placeholder="e.g. my_new_db" 
                            autoFocus
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold opacity-50 uppercase text-text-muted">Collation (Optional)</label>
                        <div className="relative">
                            <select 
                                value={collation} 
                                onChange={(e) => setCollation(e.target.value)}
                                className="w-full bg-canvas border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary text-text-main appearance-none cursor-pointer"
                                disabled={loadingCollations}
                            >
                                <option value="">Server Default</option>
                                {collations?.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            {loadingCollations && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 size={14} className="animate-spin opacity-50" />
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-error/10 text-error text-sm rounded-lg border border-error/20 flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={busy}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={busy || !name}
                    >
                        {busy ? <Loader2 size={16} className="animate-spin" /> : 'Create Database'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
