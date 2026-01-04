
import React from 'react';
import { AnalysisResult, StudyState } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Brain, Zap, Clock, Eye, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';

interface StudyReportProps {
    history: AnalysisResult[];
    aiAdvice: string | null;
    onBack: () => void;
    isLoading: boolean;
}

const StudyReport: React.FC<StudyReportProps> = ({ history, aiAdvice, onBack, isLoading }) => {
    // Calculate Summary Stats
    const totalSamples = history.length;
    const avgFocus = totalSamples > 0 ? Math.round(history.reduce((acc, cur) => acc + cur.focusScore, 0) / totalSamples) : 0;
    const fatigueCount = history.filter(h => h.state === StudyState.FATIGUED).length;
    const distractedCount = history.filter(h => h.state === StudyState.DISTRACTED).length;
    const avgBlinkRate = totalSamples > 0 ? Math.round(history.reduce((acc, cur) => acc + cur.blinkRate, 0) / totalSamples) : 0;

    const chartData = history.map((h, i) => ({
        index: i,
        time: new Date(h.timestamp).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}),
        score: h.focusScore,
        fatigue: h.isFatigued ? 100 : 0
    }));

    return (
        <div className="h-full w-full bg-[#1e293b]/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-y-auto p-6 relative animate-fade-in custom-scrollbar">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-gray-700/50 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">分析与建议报告</h2>
                        <p className="text-sm text-gray-400">基于多模态数据与 AI 的深度评估</p>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-500 font-mono">SESSION ID: {Date.now().toString().slice(-6)}</p>
                    <p className="text-xs text-gray-500 font-mono">SAMPLES: {totalSamples}</p>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center space-x-2 text-gray-400 mb-2">
                        <Brain size={16} />
                        <span className="text-sm">平均专注度</span>
                    </div>
                    <div className={`text-3xl font-bold ${avgFocus > 80 ? 'text-emerald-400' : avgFocus > 60 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {avgFocus}
                    </div>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center space-x-2 text-gray-400 mb-2">
                        <Eye size={16} />
                        <span className="text-sm">眨眼频率</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-400">
                        {avgBlinkRate} <span className="text-sm text-gray-500 font-normal">次/分</span>
                    </div>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center space-x-2 text-gray-400 mb-2">
                        <AlertTriangle size={16} />
                        <span className="text-sm">疲劳检测</span>
                    </div>
                    <div className={`text-3xl font-bold ${fatigueCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {fatigueCount} <span className="text-sm text-gray-500 font-normal">次</span>
                    </div>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center space-x-2 text-gray-400 mb-2">
                        <Clock size={16} />
                        <span className="text-sm">分心次数</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-400">
                        {distractedCount} <span className="text-sm text-gray-500 font-normal">次</span>
                    </div>
                </div>
            </div>

            {/* Deep Analysis Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-gray-900/40 p-5 rounded-xl border border-gray-700/50">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center">
                        <Zap size={16} className="mr-2 text-yellow-500" /> 全程专注度曲线
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 100]} hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: '达标线', fill: '#ef4444', fontSize: 10 }} />
                                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFocus)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Advice Section */}
                <div className="lg:col-span-1 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 p-1 rounded-xl border border-indigo-500/30 relative">
                     <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-xl" />
                     <div className="h-full bg-[#0f172a]/80 backdrop-blur rounded-lg p-5 overflow-y-auto max-h-[350px]">
                        <h3 className="text-base font-bold text-white mb-4 flex items-center">
                            <Brain size={18} className="mr-2 text-indigo-400" />
                            智能辅助诊断
                        </h3>
                        
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-40 space-y-3">
                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-indigo-300 animate-pulse">正在深度分析数据...</p>
                            </div>
                        ) : (
                            <div className="prose prose-invert prose-sm">
                                {aiAdvice ? (
                                    <div className="whitespace-pre-wrap text-gray-300 leading-relaxed text-sm">
                                        {aiAdvice}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">暂无分析数据。</p>
                                )}
                            </div>
                        )}
                     </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-center">
                 <button 
                    onClick={onBack}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-lg shadow-indigo-500/30 transition-all flex items-center"
                 >
                     <CheckCircle2 className="mr-2" size={20} />
                     确认已阅读，继续学习
                 </button>
            </div>
        </div>
    );
};

export default StudyReport;
