import React, { useMemo, useEffect } from 'react';
import { 
    ReactFlow, 
    Background, 
    Controls, 
    useNodesState, 
    useEdgesState,
    Position,
    Node,
    Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { QueryResult } from '@/api/commands';
import { Loader2, Database, AlertTriangle, ArrowRight } from 'lucide-react';

interface VisualExplainProps {
    sql: string;
    db?: string;
}

// Custom Node Component
function ExplainNode({ data }: { data: any }) {
    const isFullScan = data.type === 'ALL' || data.type === 'index';
    
    return (
        <div className={`min-w-[200px] border rounded-lg shadow-lg overflow-hidden bg-surface ${isFullScan ? 'border-red-500/50' : 'border-border'}`}>
            <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center ${isFullScan ? 'bg-red-500/10 text-red-400' : 'bg-black/20 text-text-muted'}`}>
                <span>#{data.id} {data.select_type}</span>
                {isFullScan && <AlertTriangle size={12} />}
            </div>
            <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <Database size={14} className="text-primary" />
                    <span className="font-bold text-sm text-text-main">{data.table || '<derived>'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono opacity-80">
                    <div className="flex flex-col">
                        <span className="opacity-50 uppercase">Type</span>
                        <span className={isFullScan ? "text-red-400 font-bold" : "text-green-400"}>{data.type}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="opacity-50 uppercase">Rows</span>
                        <span>{parseInt(data.rows).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="opacity-50 uppercase">Key</span>
                        <span className="truncate" title={data.key}>{data.key || 'NULL'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="opacity-50 uppercase">Ref</span>
                        <span className="truncate" title={data.ref}>{data.ref || 'NULL'}</span>
                    </div>
                </div>

                {data.extra && (
                    <div className="pt-2 border-t border-white/5 mt-1">
                         <div className="text-[10px] text-text-muted italic">{data.extra}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

const nodeTypes = {
    explain: ExplainNode,
};

export function VisualExplain({ sql, db }: VisualExplainProps) {
    // 1. Fetch Explain Data
    const { data: explainData, isLoading, error } = useQuery({
        queryKey: ['explain', db, sql],
        queryFn: () => dbApi.executeQuery(`EXPLAIN ${sql}`, db),
        enabled: !!sql,
        staleTime: 0, // Always fresh
    });

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // 2. Parse Data into Graph
    useEffect(() => {
        const result = explainData as unknown as QueryResult;
        if (!result?.columns || !result?.rows) return;

        const cols = result.columns; // e.g. ["id", "select_type", "table", ...]
        const rows = result.rows;

        // Helper to get value by column name
        const getVal = (row: any[], colName: string) => {
            const idx = cols.indexOf(colName);
            return idx !== -1 ? row[idx] : null;
        };

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        let lastNodeId: string | null = null;
        let xPos = 0;
        const yPos = 50;
        const spacing = 250;

        // Simple Layout: Linear for now, showing query flow
        rows.forEach((row: any[], i: number) => {
            const id = getVal(row, 'id');
            const selectType = getVal(row, 'select_type');
            
            const nodeId = `node-${i}`;
            
            newNodes.push({
                id: nodeId,
                type: 'explain',
                position: { x: xPos, y: yPos },
                data: {
                    id: id,
                    select_type: selectType,
                    table: getVal(row, 'table'),
                    type: getVal(row, 'type'),
                    possible_keys: getVal(row, 'possible_keys'),
                    key: getVal(row, 'key'),
                    key_len: getVal(row, 'key_len'),
                    ref: getVal(row, 'ref'),
                    rows: getVal(row, 'rows'),
                    filtered: getVal(row, 'filtered'),
                    extra: getVal(row, 'Extra') || getVal(row, 'extra'),
                },
            });

            if (lastNodeId) {
                newEdges.push({
                    id: `edge-${lastNodeId}-${nodeId}`,
                    source: lastNodeId,
                    target: nodeId,
                    animated: true,
                    style: { stroke: '#ffffff30' },
                });
            }

            lastNodeId = nodeId;
            xPos += spacing;
        });

        setNodes(newNodes);
        setEdges(newEdges);

    }, [explainData]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-text-muted gap-2">
                <Loader2 className="animate-spin" /> Analyzing Query...
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center flex-col gap-2 text-error p-8 text-center">
                <AlertTriangle size={32} />
                <p>Failed to explain query.</p>
                <code className="text-xs bg-black/20 p-2 rounded block mt-2 text-left">{String(error)}</code>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-canvas/50">
             <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                minZoom={0.5}
                maxZoom={1.5}
                attributionPosition="bottom-right"
            >
                <Background color="#ffffff" gap={16} size={1} style={{ opacity: 0.05 }} />
                <Controls className="bg-surface border-border !fill-text-muted" />
            </ReactFlow>
        </div>
    );
}
