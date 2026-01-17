import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dbApi } from '@/api/db';
import { Activity, Network, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonitorData } from '@/api/commands';

// Keep last 60 points (e.g. 1 minute if polling every 1s)
const MAX_POINTS = 60;

export function ServerMonitor() {
    const [history, setHistory] = useState<MonitorData[]>([]);

    // Poll every 1s
    const { data } = useQuery({
        queryKey: ['monitor-live'],
        queryFn: dbApi.getMonitorData,
        refetchInterval: 2000, 
    });

    useEffect(() => {
        if (data) {
            setHistory(prev => {
                const newHistory = [...prev, data];
                if (newHistory.length > MAX_POINTS) {
                    return newHistory.slice(newHistory.length - MAX_POINTS);
                }
                return newHistory;
            });
        }
    }, [data]);

    // Calculate rates (per second)
    const chartData = history.map((point, i) => {
        if (i === 0) return { ...point, qps: 0, kbs_in: 0, kbs_out: 0 };
        const prev = history[i - 1];
        const timeDiff = (point.time - prev.time) / 1000; // seconds
        if (timeDiff <= 0) return { ...point, qps: 0, kbs_in: 0, kbs_out: 0 };

        return {
            ...point,
            timeLabel: new Date(point.time).toLocaleTimeString(),
            qps: Math.max(0, (point.questions - prev.questions) / timeDiff),
            kbs_in: Math.max(0, (point.bytes_received - prev.bytes_received) / 1024 / timeDiff),
            kbs_out: Math.max(0, (point.bytes_sent - prev.bytes_sent) / 1024 / timeDiff),
        };
    }).slice(1); // Remove first point as it has no rate

    if (history.length < 2) {
        return (
            <div className="p-8 text-center text-text-muted flex flex-col items-center gap-2 animate-pulse">
                <Activity size={24} />
                <span className="text-xs font-mono">Initializing Monitor...</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[300px]">
            {/* Queries Per Second */}
            <div className="glass-panel p-4 flex flex-col bg-surface/50">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                    <Database size={14} className="text-primary" /> Queries / Sec
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorQps" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <YAxis 
                                hide={false} 
                                tick={{fontSize: 10, fill: '#888'}} 
                                width={30}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ display: 'none' }}
                                formatter={(val: number | undefined) => [val?.toFixed(1) || '0', "QPS"]}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="qps" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorQps)" 
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-right text-xs font-mono text-primary font-bold mt-2">
                    {chartData[chartData.length-1]?.qps.toFixed(1)} QPS
                </div>
            </div>

            {/* Network Traffic */}
            <div className="glass-panel p-4 flex flex-col bg-surface/50">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                    <Network size={14} className="text-green-400" /> Network I/O (KB/s)
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                             <YAxis 
                                hide={false} 
                                tick={{fontSize: 10, fill: '#888'}} 
                                width={30}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area type="monotone" dataKey="kbs_in" name="In" stackId="1" stroke="#4ade80" fill="url(#colorIn)" strokeWidth={1} isAnimationActive={false} />
                            <Area type="monotone" dataKey="kbs_out" name="Out" stackId="1" stroke="#f43f5e" fill="url(#colorOut)" strokeWidth={1} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-end gap-4 text-xs font-mono mt-2">
                    <span className="text-green-400">In: {chartData[chartData.length-1]?.kbs_in.toFixed(1)} KB/s</span>
                    <span className="text-rose-400">Out: {chartData[chartData.length-1]?.kbs_out.toFixed(1)} KB/s</span>
                </div>
            </div>

            {/* Connections */}
            <div className="glass-panel p-4 flex flex-col bg-surface/50">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                    <Activity size={14} className="text-amber-400" /> Connections
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorConn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                             <YAxis 
                                hide={false} 
                                tick={{fontSize: 10, fill: '#888'}} 
                                width={30}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}
                                itemStyle={{ color: '#fbbf24' }}
                                labelStyle={{ display: 'none' }}
                            />
                            <Area type="step" dataKey="threads_connected" name="Connected" stroke="#fbbf24" strokeWidth={2} fill="url(#colorConn)" isAnimationActive={false} />
                            <Area type="step" dataKey="threads_running" name="Running" stroke="#f59e0b" strokeWidth={2} fill="none" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-end gap-4 text-xs font-mono mt-2 text-amber-400">
                    <span>{chartData[chartData.length-1]?.threads_connected} Connected</span>
                    <span>{chartData[chartData.length-1]?.threads_running} Running</span>
                </div>
            </div>
        </div>
    );
}
