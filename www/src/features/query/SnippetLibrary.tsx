import React, { useEffect, useState } from 'react';
import { dbApi } from '@/api/db';
import { Snippet } from '@/api/commands';
import { Trash2, Play, Copy, Code, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SnippetLibraryProps {
    onSelect: (sql: string) => void;
    onRun: (sql: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function SnippetLibrary({ onSelect, onRun, isOpen, onClose }: SnippetLibraryProps) {
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const loadSnippets = async () => {
        setLoading(true);
        try {
            const data = await dbApi.getSnippets();
            // Sort by created_at desc
            setSnippets(data.sort((a: Snippet, b: Snippet) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this snippet?')) return;
        try {
            const updated = await dbApi.deleteSnippet(id);
            setSnippets(updated);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadSnippets();
        }
    }, [isOpen]);

    const filtered = snippets.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.sql.toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-surface/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="h-12 flex items-center justify-between px-4 border-b border-white/5">
                <span className="font-bold text-sm flex items-center gap-2">
                    <Code size={14} className="text-primary" /> Snippets
                </span>
                <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                    &times;
                </button>
            </div>

            <div className="p-3 border-b border-white/5">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search snippets..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black/20 border-none rounded h-8 pl-8 pr-3 text-xs focus:ring-1 focus:ring-primary placeholder:text-text-muted/50"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading && <div className="text-center p-4 opacity-50 text-xs">Loading...</div>}
                
                {!loading && filtered.length === 0 && (
                    <div className="text-center p-8 opacity-40 text-xs flex flex-col items-center gap-2">
                        <Code size={24} />
                        <span>No snippets found</span>
                        <span className="text-[10px]">Save queries to see them here</span>
                    </div>
                )}

                {filtered.map(snippet => (
                    <div key={snippet.id} className="group bg-white/5 hover:bg-white/10 rounded-lg p-3 border border-white/5 transition-all text-left">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs truncate text-accent">{snippet.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    title="Run"
                                    onClick={(e) => { e.stopPropagation(); onRun(snippet.sql); }}
                                    className="p-1.5 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                                >
                                    <Play size={12} fill="currentColor" />
                                </button>
                                <button 
                                    title="Delete"
                                    onClick={(e) => handleDelete(snippet.id, e)}
                                    className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                        
                        <div 
                            className="bg-black/30 rounded p-2 font-mono text-[10px] text-text-muted line-clamp-3 mb-2 cursor-pointer hover:bg-black/40"
                            onClick={() => onSelect(snippet.sql)}
                            title="Click to copy to editor"
                        >
                            {snippet.sql}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-text-muted opacity-50">
                            <span>{new Date(snippet.created_at).toLocaleDateString()}</span>
                            <span className="uppercase">{snippet.sql.split(' ')[0]}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
