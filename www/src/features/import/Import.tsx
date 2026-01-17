import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Upload, FileCode, FileSpreadsheet, Loader2, Info, ChevronRight } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { ImportMappingModal } from '@/features/database/ImportMappingModal';

export function Import() {
    const { currentDb, currentTable } = useAppStore();
    const { show: showNotification } = useNotificationStore();
    const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
    const [isMappingOpen, setIsMappingOpen] = React.useState(false);
    const [isImportingSql, setIsImportingSql] = React.useState(false);

    const handleSelectFile = async () => {
        const selected = await open({
            multiple: false,
            filters: [{
                name: 'Database Files',
                extensions: ['sql', 'csv']
            }]
        });

        if (selected && !Array.isArray(selected)) {
            // Check if selected is an object (FileResponse) or string
            const path = typeof selected === 'string' ? selected : selected.path;
            setSelectedFile(path);
        }
    };

    const handleExecuteImport = async () => {
        if (!selectedFile || !currentDb) return;

        const isCsv = selectedFile.toLowerCase().endsWith('.csv');
        
        if (isCsv) {
            setIsMappingOpen(true);
        } else {
            // SQL Import
            setIsImportingSql(true);
            try {
                await dbApi.importDatabase(currentDb, selectedFile);
                showNotification('SQL Import completed successfully', 'success');
                setSelectedFile(null);
            } catch (err) {
                showNotification('SQL Import failed: ' + err, 'error');
            } finally {
                setIsImportingSql(false);
            }
        }
    };

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-canvas/30">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tighter text-text-main flex items-center gap-3">
                        <Upload size={28} className="text-primary" /> Advanced Data Import
                    </h1>
                    <p className="text-sm text-text-muted opacity-60">Upload SQL dumps or CSV files to populate your database.</p>
                </div>

                {/* Main Action Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-8 space-y-6 flex flex-col items-center justify-center border-dashed border-2 border-white/10 hover:border-primary/40 transition-all group cursor-pointer" onClick={handleSelectFile}>
                        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-2xl shadow-primary/20">
                            <Upload size={32} />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold">Select File</h3>
                            <p className="text-xs text-text-muted opacity-60">Supports .sql and .csv files up to 2GB</p>
                        </div>
                        {selectedFile && (
                            <div className="p-3 bg-white/5 rounded-xl border border-white/10 w-full flex items-center gap-3 animate-in zoom-in-95">
                                {selectedFile.endsWith('.csv') ? <FileSpreadsheet size={16} className="text-green-500" /> : <FileCode size={16} className="text-blue-400" />}
                                <span className="text-[10px] font-mono truncate flex-1">{selectedFile.split(/[\\/]/).pop()}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Info size={14} /> Import Help
                            </h4>
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="mt-1"><ChevronRight size={12} className="text-primary" /></div>
                                    <p className="text-xs text-text-muted leading-relaxed"><strong>SQL Files:</strong> Will be executed as a script. Existing tables might be dropped if specified in the file.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="mt-1"><ChevronRight size={12} className="text-primary" /></div>
                                    <p className="text-xs text-text-muted leading-relaxed"><strong>CSV Files:</strong> You will be prompted to map CSV columns to your database table columns in the next step.</p>
                                </div>
                            </div>
                        </div>

                        <Button 
                            disabled={!selectedFile || isImportingSql}
                            onClick={handleExecuteImport}
                            className="w-full h-14 text-lg font-black uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                        >
                            {isImportingSql ? <Loader2 className="animate-spin" size={24} /> : <ChevronRight size={24} />}
                            {selectedFile?.endsWith('.csv') ? 'Configure Mapping' : 'Execute SQl Import'}
                        </Button>
                    </div>
                </div>

                {/* CSV Mapping Modal */}
                {selectedFile?.endsWith('.csv') && currentDb && (
                    <ImportMappingModal 
                        isOpen={isMappingOpen}
                        onClose={() => setIsMappingOpen(false)}
                        db={currentDb}
                        table={currentTable || ''}
                        filePath={selectedFile}
                    />
                )}
            </div>
        </div>
    );
}
