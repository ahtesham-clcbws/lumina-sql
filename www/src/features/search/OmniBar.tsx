import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchStore } from '@/stores/useSearchStore';
import { useAppStore } from '@/stores/useAppStore';
import { Search, Command, Database, Table, FileText, Terminal, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { GlobalSearchResult } from '@/api/commands';

export function OmniBar() {
    const { isOpen, setOpen, term, setTerm, results, performSearch, isLoading, selectedIndex, moveSelection } = useSearchStore();
    const { currentDb } = useAppStore();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    // 1. Keyboard Shortcuts (Ctrl+K to Open)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(!isOpen);
            }
            
            if (isOpen) {
                if (e.key === 'Escape') {
                    setOpen(false);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    moveSelection('down');
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    moveSelection('up');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSelect(results[selectedIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex]);

    // 2. Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // 3. Debounced Search
    useEffect(() => {
        const delay = setTimeout(() => {
            if (isOpen && term) {
                performSearch(term, currentDb || undefined);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [term, isOpen, currentDb]);


    const handleSelect = (item?: GlobalSearchResult) => {
        if (!item) return;

        if (item.action_type === 'navigate') {
            navigate(item.action_value);
        } else if (item.action_type === 'cmd') {
            // Handle special commands like "flush_privileges"
             // For now, just log or show todo
             console.log("Execute command:", item.action_value);
        }
        
        setOpen(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
            <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                
                {/* Header / Input */}
                <div className="flex items-center px-4 py-3 border-b border-white/5 gap-3">
                    <Search className="text-text-muted" size={20} />
                    <input 
                        ref={inputRef}
                        type="text" 
                        className="flex-1 bg-transparent border-none outline-none text-lg text-text-main placeholder:text-text-muted/50"
                        placeholder="Search databases, tables, or run commands..."
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                    />
                    <div className="flex items-center gap-1 text-xs text-text-muted bg-black/20 px-2 py-1 rounded">
                        <span className="font-mono">ESC</span>
                    </div>
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
                    {isLoading && (
                        <div className="py-8 flex items-center justify-center text-text-muted gap-2">
                             <Loader2 className="animate-spin" size={16} /> Searching...
                        </div>
                    )}

                    {!isLoading && results.length === 0 && term && (
                        <div className="py-8 text-center text-text-muted">
                            No results found for "<span className="text-text-main">{term}</span>"
                        </div>
                    )}

                    {!isLoading && results.length === 0 && !term && (
                         <div className="py-8 text-center text-text-muted/50 text-sm">
                            Type to find anything in your database...
                        </div>
                    )}
                    
                    {results.map((result, i) => (
                        <div 
                            key={i}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors group",
                                i === selectedIndex ? "bg-primary/20" : "hover:bg-white/5"
                            )}
                            onClick={() => handleSelect(result)}
                            onMouseEnter={() => useSearchStore.setState({ selectedIndex: i })}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded flex items-center justify-center shrink-0",
                                result.category === 'Database' ? "bg-blue-500/20 text-blue-400" :
                                result.category === 'Table' ? "bg-green-500/20 text-green-400" :
                                result.category === 'Command' ? "bg-purple-500/20 text-purple-400" :
                                "bg-orange-500/20 text-orange-400"
                            )}>
                                {result.category === 'Database' && <Database size={16} />}
                                {result.category === 'Table' && <Table size={16} />}
                                {result.category === 'Command' && <Terminal size={16} />}
                                {result.category === 'Data Row' && <FileText size={16} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-text-main truncate">{result.label}</span>
                                    <span className="text-[10px] uppercase tracking-wider opacity-50 bg-black/20 px-1.5 rounded">{result.category}</span>
                                </div>
                                {result.description && (
                                    <div className="text-sm text-text-muted truncate mt-0.5">{result.description}</div>
                                )}
                            </div>

                            <ArrowRight size={16} className={cn(
                                "opacity-0 -translate-x-2 transition-all",
                                i === selectedIndex && "opacity-50 translate-x-0"
                            )} />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex items-center justify-between text-[10px] text-text-muted">
                     <div className="flex gap-3">
                         <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">↵</kbd> select</span>
                         <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">↑↓</kbd> navigate</span>
                     </div>
                     <div>
                         {results.length} results
                     </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
