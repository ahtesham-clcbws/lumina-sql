import React from 'react';
import { Table, LayoutGrid, FileCode, PenTool, FileText, Download } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';

export function ViewTabs() {
    const { view, setView, currentDb } = useAppStore();

    if (!currentDb) return null;

    const tabs = [
        { id: 'browser', label: 'Browse', icon: Table },
        { id: 'structure', label: 'Structure', icon: LayoutGrid },
        { id: 'query', label: 'SQL', icon: FileCode },
        { id: 'routines', label: 'Routines', icon: FileText },
        { id: 'designer', label: 'Designer', icon: PenTool },
        { id: 'export', label: 'Export', icon: Download },
    ] as const;

    return (
        <div className="flex items-center gap-1 border-b border-white/5 bg-[#0f172a] px-4 pt-4">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setView(tab.id)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2",
                        view === tab.id 
                            ? "bg-white/5 text-blue-400 border-blue-400" 
                            : "text-white/50 border-transparent hover:text-white hover:bg-white/5"
                    )}
                >
                    <tab.icon size={16} />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
