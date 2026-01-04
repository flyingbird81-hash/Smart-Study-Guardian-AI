
import React, { useMemo } from 'react';
import { AnalysisResult } from '../types';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
import { Activity, X, Zap, Eye, Cpu, Table2, Timer, TrendingUp } from 'lucide-react';

interface BenchmarkReportProps {
    data: AnalysisResult[];
    durationSec: number;
    onClose: () => void;
}

const BenchmarkReport: React.FC<BenchmarkReportProps> = ({ data, durationSec, onClose }) => {
    // 数据处理与指标计算
    const stats = useMemo(() => {
        const totalFrames = data.length;
        if (totalFrames === 0) return null;

        // 计算 FPS
        const startTime = data[0].timestamp;
        const endTime = data[totalFrames - 1].timestamp;
        const actualDuration = (endTime - startTime) / 1000; // 秒
        const fps = totalFrames / (actualDuration || 1);

        // 核心业务指标
        const avgFocus = Math.round(data.reduce((acc, cur) => acc + cur.focusScore, 0) / totalFrames);
        const avgBlinkRate = Math.round(data.reduce((acc, cur) => acc + cur.blinkRate, 0) / totalFrames);
        
        // 疲劳帧占比
        const fatigueFrames = data.filter(d => d.isFatigued).length;
        const fatigueRatio = ((fatigueFrames / totalFrames) * 100).toFixed(1);

        // FPS 抖动计算 (帧间隔标准差)
        const intervals = [];
        for (let i = 1; i < totalFrames; i++) {
            intervals.push(data[i].timestamp - data[i-1].timestamp);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalVariance = intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / intervals.length;
        const jitter = Math.sqrt(intervalVariance).toFixed(1);

        return { totalFrames, fps, avgFocus, avgBlinkRate, fatigueRatio, jitter, actualDuration };
    }, [data]);

    // 图表数据降采样 (避免渲染过多点导致卡顿)
    const chartData = useMemo(() => {
        if (!stats) return [];
        const samplingRate = Math.max(1, Math.floor(data.length / 100)); // 目标约100个点
        return data.filter((_, i) => i % samplingRate === 0).map((d, i) => {
            const frameInterval = i > 0 ? (d.timestamp - data[(i * samplingRate) - 1].timestamp) : 33;
            return {
                time: (i * samplingRate * stats.actualDuration / data.length).toFixed(1),
                focus: d.focusScore,
                blink: d.blinkRate,
                fps_moment: Math.min(60, 1000 / (frameInterval || 33)) // 瞬时FPS，上限60
            };
        });
    }, [data, stats]);

    if (!stats) return <div className="fixed inset-0 bg-black/80 flex items-center justify-center text-white">暂无测试数据</div>;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* 顶部栏 */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center">
                            <Activity className="mr-3 text-orange-500" />
                            算法性能与模型基准测试报告
                        </h2>
                        <div className="flex space-x-4 mt-2 text-slate-400 text-sm font-mono">
                            <span className="flex items-center"><Timer size={14} className="mr-1"/> 时长: {stats.actualDuration.toFixed(1)}s</span>
                            <span className="flex items-center"><Table2 size={14} className="mr-1"/> 样本数: {stats.totalFrames} 帧</span>
                            <span className="flex items-center text-emerald-400"><Cpu size={14} className="mr-1"/> 引擎: WASM/GPU</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={28} />
                    </button>
                </div>

                {/* 内容滚动区 */}
                <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    
                    {/* 1. 核心指标卡片 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
                            <div className="flex items-center text-slate-400 text-sm mb-2">
                                <Zap size={16} className="mr-2 text-yellow-400"/> 平均帧率 (FPS)
                            </div>
                            <div className="text-4xl font-black text-white">{stats.fps.toFixed(1)}</div>
                            <div className="text-xs text-slate-500 mt-2 flex justify-between">
                                <span>抖动: {stats.jitter}ms</span>
                                <span className={stats.fps > 20 ? "text-emerald-500" : "text-orange-500"}>
                                    {stats.fps > 24 ? "非常流畅" : "一般"}
                                </span>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
                            <div className="flex items-center text-slate-400 text-sm mb-2">
                                <TrendingUp size={16} className="mr-2 text-indigo-400"/> 平均专注分
                            </div>
                            <div className="text-4xl font-black text-indigo-400">{stats.avgFocus}</div>
                            <div className="w-full bg-slate-700 h-1.5 mt-3 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full" style={{width: `${stats.avgFocus}%`}}></div>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
                            <div className="flex items-center text-slate-400 text-sm mb-2">
                                <Eye size={16} className="mr-2 text-blue-400"/> 眨眼捕获率
                            </div>
                            <div className="text-4xl font-black text-blue-400">{stats.avgBlinkRate} <span className="text-sm text-slate-500 font-normal">bpm</span></div>
                            <div className="text-xs text-slate-500 mt-2">模型灵敏度指标</div>
                        </div>

                        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
                            <div className="flex items-center text-slate-400 text-sm mb-2">
                                <Activity size={16} className="mr-2 text-rose-400"/> 疲劳/闭眼帧占比
                            </div>
                            <div className="text-4xl font-black text-rose-400">{stats.fatigueRatio}%</div>
                            <div className="text-xs text-slate-500 mt-2">EAR 阈值触发频率</div>
                        </div>
                    </div>

                    {/* 2. 图表区域 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 专注度与眨眼关联图 */}
                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                            <h3 className="text-white font-bold mb-4 flex items-center text-sm">
                                <Zap size={16} className="mr-2 text-indigo-400"/> 专注度(Line) 与 眨眼(Step) 趋势
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickFormatter={v => `${v}s`} />
                                        <YAxis yAxisId="left" stroke="#818cf8" fontSize={10} domain={[0, 100]} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={10} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc', fontSize: '12px' }}
                                        />
                                        <Area yAxisId="left" type="monotone" dataKey="focus" name="专注分" stroke="#818cf8" fill="#818cf8" fillOpacity={0.1} strokeWidth={2} />
                                        <Line yAxisId="right" type="step" dataKey="blink" name="眨眼率" stroke="#38bdf8" strokeWidth={2} dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* FPS 稳定性图 */}
                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                            <h3 className="text-white font-bold mb-4 flex items-center text-sm">
                                <Cpu size={16} className="mr-2 text-emerald-400"/> 系统性能：瞬时 FPS 波动
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickFormatter={v => `${v}s`} />
                                        <YAxis stroke="#10b981" fontSize={10} domain={[0, 65]} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="fps_moment" name="瞬时FPS" fill="#10b981" barSize={4} radius={[2,2,0,0]} />
                                        <Line type="monotone" dataKey="fps_moment" stroke="#34d399" strokeWidth={1} dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* 3. 数据表格预览 */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700 bg-slate-800 flex items-center">
                             <Table2 size={16} className="mr-2 text-slate-400"/> 
                             <span className="text-sm font-bold text-slate-200">原始数据采样 (前20条)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left text-slate-400">
                                <thead className="text-slate-300 uppercase bg-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-3">Timestamp</th>
                                        <th className="px-6 py-3">Focus Score</th>
                                        <th className="px-6 py-3">Blink Rate</th>
                                        <th className="px-6 py-3">State</th>
                                        <th className="px-6 py-3">Posture</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {data.slice(0, 20).map((row, index) => (
                                        <tr key={index} className="hover:bg-slate-700/30">
                                            <td className="px-6 py-3 font-mono">{new Date(row.timestamp).toLocaleTimeString()}</td>
                                            <td className="px-6 py-3">
                                                <span className={row.focusScore > 80 ? "text-emerald-400" : row.focusScore < 60 ? "text-orange-400" : "text-white"}>
                                                    {row.focusScore}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">{row.blinkRate}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                                    row.state === 'FOCUSED' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                    row.state === 'FATIGUED' ? 'bg-rose-500/20 text-rose-400' : 'bg-orange-500/20 text-orange-400'
                                                }`}>
                                                    {row.state}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">{row.posture || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default BenchmarkReport;
