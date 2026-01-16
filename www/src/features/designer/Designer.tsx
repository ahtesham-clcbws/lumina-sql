import React, { useMemo, useCallback, useState } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, BackgroundVariant, Node, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useAppStore } from '@/stores/useAppStore';
import { dbApi } from '@/api/db';
import { Loader2, Download, Copy, X } from 'lucide-react';
import { TableNode } from './TableNode';
import { showToast } from '@/utils/ui';

const nodeTypes = {
    table: TableNode,
};

// Type definition to fix TS error
type AppNode = Node & {
    data: {
        label: string;
        rows: number;
        columns?: any[];
    }
};

export function Designer() {
    const { currentDb } = useAppStore();
    
    // Nodes & Edges State
    const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // 1. Fetch Tables List
    const { data: tables, isLoading: loadingTables } = useQuery({
        queryKey: ['tables', currentDb],
        queryFn: () => dbApi.getTables(currentDb!),
        enabled: !!currentDb
    });

    // 2. Fetch Columns for ALL tables (Parallel)
    // Note: In a real app with 100+ tables, this should be lazy loaded or batched. 
    // For local desktop app, handling 20-50 requests is usually 'okay' but we should be careful.
    // Ideally we'd have a 'get_schema' API. For now, we MAP over tables.
    const tableQueries = useQueries({
        queries: (tables || []).map(t => ({
            queryKey: ['columns', currentDb, t.name],
            queryFn: async () => {
                const res = await dbApi.executeQuery(currentDb!, `SHOW COLUMNS FROM \`${t.name}\``);
                return { table: t.name, columns: res.rows ? res.rows.map((r: any[]) => ({ Field: r[0], Type: r[1], Null: r[2], Key: r[3], Default: r[4], Extra: r[5] })) : [] };
            },
            enabled: !!tables
        }))
    });

    // 3. Fetch Relations (Foreign Keys)
    const { data: relations } = useQuery({
        queryKey: ['relations', currentDb],
        queryFn: async () => {
            const res = await dbApi.getRelations(currentDb!);
            return res.rows || [];
        },
        enabled: !!currentDb
    });

    // Effect: Create Edges from Relations
    React.useEffect(() => {
        if (relations) {
            const newEdges = relations.map((rel: any[], i: number) => ({
                id: `e-${rel[0]}-${rel[1]}-${rel[2]}-${rel[3]}`,
                source: rel[0],      // Table Name
                sourceHandle: rel[1], // Column Name
                target: rel[2],      // Referenced Table
                targetHandle: rel[3], // Referenced Column
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
            }));
            setEdges(newEdges);
        }
    }, [relations, setEdges]);

    // Effect: Initialize Nodes when tables loaded
    React.useEffect(() => {
        if (tables && nodes.length === 0) {
            const newNodes: AppNode[] = tables.map((t, i) => ({
                id: t.name,
                position: { x: (i % 4) * 350, y: Math.floor(i / 4) * 450 }, // Spacing for larger cards
                data: { label: t.name, rows: t.rows, columns: undefined },
                type: 'table',
            }));
            setNodes(newNodes);
        }
    }, [tables, setNodes, nodes.length]);

    // Effect: Update Nodes when columns load
    React.useEffect(() => {
        // Check if any new column data arrived
        const loadedSchemas = tableQueries.filter(q => q.data).map(q => q.data!);
        
        if (loadedSchemas.length > 0) {
            setNodes(nds => nds.map(node => {
                const schema = loadedSchemas.find(s => s.table === node.id);
                if (schema && !node.data.columns) {
                    return { ...node, data: { ...node.data, columns: schema.columns }};
                }
                return node;
            }));
        }
    }, [tableQueries, setNodes]);





    // Export State
    const [exportFormat, setExportFormat] = useState<'sql' | 'laravel' | 'prisma' | 'typescript'>('sql');
    const [exportResult, setExportResult] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const handleExport = async () => {
        if (!nodes.length) return;
        setGenerating(true);
        try {
            // Convert Nodes to SchemaTable standardized format
            const schemaTables: any[] = nodes.map(n => ({
                name: n.data.label,
                columns: n.data.columns?.map((c: any) => ({
                    name: c[0],
                    type: c[1],
                    nullable: c[2] === 'YES',
                    key: c[3] === 'PRI' ? 'PRI' : (c[3] === 'UNI' ? 'UNI' : undefined),
                    default: c[4],
                    extra: c[5]
                })) || [],
                relations: edges.filter(e => e.source === n.id).map(e => ({
                     column: e.sourceHandle || 'id',
                     referencedTable: nodes.find(rn => rn.id === e.target)?.data.label || e.target,
                     referencedColumn: e.targetHandle || 'id'
                }))
            }));

            let result = '';

            if (exportFormat === 'sql') {
                const promises = nodes.map(n => dbApi.getCreateTable(currentDb!, n.id));
                const sqls = await Promise.all(promises);
                result = `-- Schema Export for ${currentDb}\n-- Generated by LuminaSQL\n\n` + sqls.join(';\n\n') + ';';
            } 
            else if (exportFormat === 'laravel') {
                const { LaravelGenerator } = await import('@/generators/laravel');
                result = schemaTables.map(t => 
                    `// Migration: ${t.name}\n` + LaravelGenerator.generateMigration(t) + "\n\n" + 
                    `// Model: ${t.name}\n` + LaravelGenerator.generateModel(t)
                ).join('\n\n// --------------------------------------------------------\n\n');
            }
            else if (exportFormat === 'typescript') {
                const { TypescriptGenerator } = await import('@/generators/typescript');
                result = schemaTables.map(t => TypescriptGenerator.generateInterface(t)).join('\n\n');
            }
            else if (exportFormat === 'prisma') {
                const { PrismaGenerator } = await import('@/generators/prisma');
                result = schemaTables.map(t => PrismaGenerator.generateModel(t)).join('\n\n');
            }

            setExportResult(result);
        } catch (e) {
            console.error(e);
            showToast("Failed to generate export", 'error');
        } finally {
            setGenerating(false);
        }
    };

    if (!currentDb) return <div className="p-12 text-center opacity-50">Select a database</div>;
    if (loadingTables) return <div className="p-12 text-center flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div style={{ width: '100%', height: '100%' }} className="relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                colorMode="dark"
                fitView
                minZoom={0.1}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
                <Controls />
                <Panel position="top-right">
                    <button 
                        onClick={handleExport}
                        disabled={generating}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                        Export Schema
                    </button>
                </Panel>
            </ReactFlow>

            {/* Export Modal */}
            {exportResult && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
                    <div className="bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Download size={18} className="text-blue-400" /> Export Schema
                            </h3>
                            <div className="flex gap-2">
                                <select 
                                    className="bg-black/20 border border-white/10 rounded px-3 py-1 text-sm outline-none focus:border-blue-500"
                                    value={exportFormat}
                                    onChange={(e) => {
                                        setExportFormat(e.target.value as any);
                                        // Ideally we would trigger re-generation here
                                        // For now, user must click 'Regenerate' or we add an effect
                                    }}
                                >
                                    <option value="sql">SQL (Create Table)</option>
                                    <option value="laravel">Laravel (Migration & Model)</option>
                                    <option value="typescript">TypeScript (Interfaces)</option>
                                    <option value="prisma">Prisma (Schema)</option>
                                </select>
                                <button 
                                    onClick={handleExport}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs uppercase font-bold tracking-wider"
                                >
                                    Regenerate
                                </button>
                                <button onClick={() => setExportResult(null)} className="p-1 hover:bg-white/10 rounded"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-[#020617]">
                            <pre className="font-mono text-xs text-blue-100 whitespace-pre-wrap selection:bg-blue-500/30">{exportResult}</pre>
                        </div>
                        <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                             <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(exportResult!);
                                    showToast("Copied to clipboard");
                                }}
                                className="btn-secondary flex items-center gap-2"
                             >
                                <Copy size={16} /> Copy to Clipboard
                             </button>
                             <button onClick={() => setExportResult(null)} className="btn-secondary">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
