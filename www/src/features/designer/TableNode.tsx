import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Key } from 'lucide-react';

export const TableNode = memo(({ data }: { data: any }) => {
    return (
        <div className="bg-[#1e293b] border border-white/10 rounded-lg shadow-xl min-w-[200px] overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600/20 p-2 border-b border-white/10 flex justify-between items-center">
                <div className="font-bold text-sm text-blue-100">{data.label}</div>
                <div className="text-[10px] bg-black/30 px-1.5 rounded text-white/50">{data.rows} rows</div>
            </div>
            
            {/* Columns */}
            <div className="p-2 space-y-1">
                {data.columns?.map((col: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs group">
                        <div className="flex items-center gap-1.5 text-white/80">
                            {col.Key === 'PRI' && <Key size={10} className="text-yellow-500" />}
                            <span>{col.Field}</span>
                        </div>
                        <span className="text-[10px] text-white/30 group-hover:text-white/50 font-mono">{col.Type}</span>
                        <Handle type="source" position={Position.Right} id={col.Field} className="!bg-white/10 !w-2 !h-2" />
                        <Handle type="target" position={Position.Left} id={col.Field} className="!bg-white/10 !w-2 !h-2" />
                    </div>
                ))}
                {!data.columns && <div className="text-[10px] opacity-30 italic">Loading columns...</div>}
            </div>
        </div>
    );
});
