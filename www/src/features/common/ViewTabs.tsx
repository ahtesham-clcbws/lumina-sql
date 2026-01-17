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
        <div className="flex items-center gap-1 border-b border-border bg-canvas px-4 pt-4">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setView(tab.id)}
                    className={cn(
                        "tab-btn",
                        view === tab.id
                        ? "bg-white/5 text-primary border-primary"
                        : "border-transparent hover:text-text-main"
                    )}
                >
                    <tab.icon size={16} />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
