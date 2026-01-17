import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, BackgroundVariant, Node, Edge, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '@/stores/useAppStore';
import { Loader2, Download } from 'lucide-react';
import { TableNode } from './TableNode';
import { useDesignerData } from './hooks/useDesignerData';
import { useDesignerExport } from './hooks/useDesignerExport';
import { ExportModal } from './components/ExportModal';

const nodeTypes = {
    table: TableNode,
};

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
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // 1. Data Fetching Hook
    const { tables, loadingTables, relations, loadedSchemas } = useDesignerData(currentDb);

    // 2. Export Logic Hook
    const { 
        exportFormat, setExportFormat, 
        exportResult, setExportResult, 
        generating, handleExport 
    } = useDesignerExport(currentDb, nodes, edges);

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
        if (loadedSchemas.length > 0) {
            setNodes(nds => nds.map(node => {
                const schema = loadedSchemas.find(s => s.table === node.id);
                if (schema && !node.data.columns) {
                    return { ...node, data: { ...node.data, columns: schema.columns }};
                }
                return node;
            }));
        }
    }, [loadedSchemas, setNodes]);

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

            <ExportModal 
                exportResult={exportResult}
                exportFormat={exportFormat}
                onClose={() => setExportResult(null)}
                onFormatChange={setExportFormat}
                onRegenerate={handleExport}
            />
        </div>
    );
}
