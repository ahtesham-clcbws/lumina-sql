import React, { useEffect, useState } from 'react';
import { dbApi } from '@/api/db';
import { Loader2, Sparkles, X, Lightbulb } from 'lucide-react';
// Removed unused invalid import
// I will build raw to avoid dependency issues on UI components I haven't checked.

export function AIExplanationModal({ sql, onClose }: { sql: string; onClose: () => void }) {
    const [explanation, setExplanation] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        
        async function fetch() {
            try {
                const res = await dbApi.explainQuery(sql);
                if (mounted) setExplanation(res);
            } catch (e) {
                if (mounted) setError(String(e));
            } finally {
                if (mounted) setLoading(false);
            }
        }
        
        fetch();
        return () => { mounted = false; };
    }, [sql]);

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
                        <Sparkles size={18} /> AI Query Explanation
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 leading-relaxed text-sm text-text-main">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 opacity-50 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p>Analyzing query logic and performance...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400">
                            Error: {error}
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                            <div className="bg-black/20 p-3 rounded font-mono text-xs text-text-muted mb-4 line-clamp-4">
                                {sql}
                            </div>
                            <div className="whitespace-pre-wrap">{explanation}</div>
                            
                            <div className="mt-6 flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200 items-start">
                                <Lightbulb size={16} className="shrink-0 mt-0.5" />
                                <div>
                                    <strong>Tip:</strong> Use standard <code>EXPLAIN</code> (Visual Explain) for precise index usage details. AI provides high-level logic and optimization advice.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
