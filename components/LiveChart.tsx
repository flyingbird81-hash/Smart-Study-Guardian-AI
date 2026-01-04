
import React from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnalysisResult } from '../types';

interface LiveChartProps {
    data: AnalysisResult[];
}

const LiveChart: React.FC<LiveChartProps> = ({ data }) => {
    // Transform data for the chart
    const chartData = data.map((d) => ({
        time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        score: d.focusScore,
        // If fatigued, set a value of 100 to create a full-height red background bar
        fatigueIndicator: d.isFatigued ? 100 : 0, 
        state: d.state
    }));

    return (
        <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        {/* Green Gradient for Focus Score */}
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        {/* Red Gradient for Fatigue Alert */}
                        <linearGradient id="colorFatigue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    
                    <XAxis 
                        dataKey="time" 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis 
                        domain={[0, 100]} 
                        hide 
                    />
                    
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9', fontSize: '12px', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        formatter={(value: any, name: string) => {
                            if (name === "fatigueIndicator") return value > 0 ? ["是", "疲劳状态"] : [null, null];
                            if (name === "score") return [value, "专注度"];
                            return [value, name];
                        }}
                    />

                    {/* Fatigue Background Layer (Red) - Uses 'step' type for blocky alert zones */}
                    <Area 
                        type="step" 
                        dataKey="fatigueIndicator" 
                        stroke="none"
                        fill="url(#colorFatigue)" 
                        fillOpacity={1}
                        isAnimationActive={false} 
                    />

                    {/* Focus Score Layer (Green) */}
                    <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fill="url(#colorScore)" 
                        fillOpacity={1} 
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default LiveChart;
