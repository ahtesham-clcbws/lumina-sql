import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Loader2, FileSpreadsheet, ArrowRight, Save, Settings2, Table as TableIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    db: string;
    table: string;
    filePath: string;
}

export function ImportMappingModal({ isOpen, onClose, db, table, filePath }: ImportMappingModalProps) {
    const { show: showNotification } = useNotificationStore();
    const [delimiter, setDelimiter] = React.useState(',');
    const [skipHeader, setSkipHeader] = React.useState(true);
    const [mapping, setMapping] = React.useState<Record<string, string>>({});

    // Fetch CSV Preview
    const { data: preview, isLoading: loadingPreview } = useQuery({
        queryKey: ['csvPreview', filePath, delimiter],
        queryFn: () => dbApi.getCsvPreview(filePath, delimiter),
        enabled: isOpen && !!filePath
    });

    // Fetch DB Columns
    const { data: dbColumns, isLoading: loadingCols } = useQuery({
        queryKey: ['columns', db, table],
        queryFn: () => dbApi.getColumns(db, table),
        enabled: isOpen && !!db && !!table
    });

    // Auto-map columns by name match
    React.useEffect(() => {
        if (preview?.headers && dbColumns) {
            const newMapping: Record<string, string> = {};
            preview.headers.forEach((h: string) => {
                // Using ColumnInfo from commands.ts which has 'field' instead of 'name'
                const match = dbColumns.find((c: any) => c.field.toLowerCase() === h.toLowerCase());
                if (match) {
                    newMapping[h] = match.field;
                }
            });
            setMapping(newMapping);
        }
    }, [preview, dbColumns]);

    const importMutation = useMutation({
        mutationFn: () => dbApi.importCsv(db, table, filePath, {
            delimiter,
            skip_header: skipHeader,
            mapping
        }),
        onSuccess: (count) => {
            showNotification(`Successfully imported ${count} rows into ${table}`, 'success');
            onClose();
        },
        onError: (err) => showNotification('Import failed: ' + err, 'error')
    });

    const handleMap = (csvHeader: string, dbCol: string) => {
        setMapping(prev => {
            const next = { ...prev };
            if (dbCol === "") {
                delete next[csvHeader];
            } else {
                next[csvHeader] = dbCol;
            }
            return next;
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Import CSV to ${table}`} size="lg">
            <div className="space-y-6">
                {/* File Info & Options */}
                <div className="flex items-center gap-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                        <FileSpreadsheet size={24} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Source File</p>
                        <p className="text-sm font-mono truncate">{filePath.split(/[\\/]/).pop()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-text-muted">Delimiter</label>
                            <select 
                                className="bg-surface border border-border rounded px-2 h-8 text-xs outline-none"
                                value={delimiter}
                                onChange={(e) => setDelimiter(e.target.value)}
                            >
                                <option value=",">Comma (,)</option>
                                <option value=";">Semicolon (;)</option>
                                <option value="\t">Tab</option>
                                <option value="|">Pipe (|)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <input 
                                type="checkbox" 
                                id="skipHeader"
                                checked={skipHeader}
                                onChange={(e) => setSkipHeader(e.target.checked)}
                                className="w-3 h-3 accent-primary"
                            />
                            <label htmlFor="skipHeader" className="text-[10px] font-black uppercase text-text-muted cursor-pointer">Skip Header</label>
                        </div>
                    </div>
                </div>

                {/* Preview Table */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <TableIcon size={14} /> Data Preview
                    </h3>
                    <div className="border border-white/5 rounded-lg overflow-hidden bg-black/20">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] font-mono whitespace-nowrap">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        {preview?.headers.map(h => (
                                            <th key={h} className="p-2 text-left text-text-muted">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview?.rows.map((row, i) => (
                                        <tr key={i} className="border-b border-white/5 last:border-0">
                                            {row.map((cell, j) => (
                                                <td key={j} className="p-2 opacity-60">{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {loadingPreview && (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center opacity-40">
                                                <Loader2 className="animate-spin inline mr-2" size={14} /> Loading preview...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Mapping UI */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Settings2 size={14} /> Column Mapping
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-text-muted uppercase px-2">CSV Column</p>
                            <div className="space-y-1">
                                {preview?.headers.map(h => (
                                    <div key={h} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg group transition-colors hover:border-white/10">
                                        <span className="text-xs font-mono font-bold truncate pr-4">{h}</span>
                                        <ArrowRight size={14} className="opacity-20 group-hover:opacity-100 transition-opacity text-primary" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-text-muted uppercase px-2">Table Column</p>
                            <div className="space-y-1">
                                {preview?.headers.map(h => (
                                    <div key={h} className="relative">
                                        <select 
                                            className={cn(
                                                "w-full bg-surface border border-border rounded-lg px-3 h-[46px] text-xs outline-none transition-all focus:border-primary/50",
                                                mapping[h] ? "border-primary/40 text-primary font-bold" : "opacity-60"
                                            )}
                                            value={mapping[h] || ""}
                                            onChange={(e) => handleMap(h, e.target.value)}
                                        >
                                            <option value="">-- Ignored --</option>
                                            {dbColumns?.map((col: any) => (
                                                <option key={col.field} value={col.field}>{col.field}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                    <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button 
                        disabled={Object.keys(mapping).length === 0 || importMutation.isPending}
                        onClick={() => importMutation.mutate()}
                        className="flex-[2] gap-2 font-black uppercase tracking-widest"
                    >
                        {importMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Execute Import
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
