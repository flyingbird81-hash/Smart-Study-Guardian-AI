
import React, { useEffect, useState } from 'react';
import { getAllLogs } from '../services/dbService';
import { Database, Download, ArrowLeft, PieChart, Activity, CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DataDashboardProps {
    onBack: () => void;
}

const DataDashboard: React.FC<DataDashboardProps> = ({ onBack }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const l = await getAllLogs();
            setLogs(l || []);
        } catch (e) { 
            console.error(e); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 关键修正：SQLite 中布尔值存储为 0 或 1。前端读取时需显式判断。
    const totalRecords = logs.length;
    const focusRecords = logs.filter(l => 
        Number(l.is_focused) === 1 || 
        l.is_focused === true ||
        l.focus_score >= 75
    ).length;
    
    const fatigueRecords = logs.filter(l => 
        Number(l.is_fatigued) === 1 || 
        l.is_fatigued === true
    ).length;
    
    const distractedRecords = logs.filter(l => 
        l.state === 'DISTRACTED'
    ).length;

    const avgFocus = totalRecords > 0 
        ? Math.round(logs.reduce((a, b) => a + (Number(b.focus_score) || 0), 0) / totalRecords) 
        : 0;

    const handleDownload = () => {
        window.open('/api/download_db', '_blank');
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-6 md:p-12 animate-fade-in">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center space-x-4">
                        <button onClick={onBack} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center">
                                <Database className="mr-3 text-indigo-400" />
                                数据库管理中心
                            </h1>
                            <p className="text-gray-400 mt-1">本地数据库 (benben.db) 统计数据汇总</p>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button 
                            onClick={fetchData}
                            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all"
                            title="刷新数据"
                        >
                            <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            onClick={handleDownload}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold flex items-center shadow-lg transition-all"
                        >
                            <Download className="mr-2" size={20} />
                            导出数据库文件
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 shadow-xl transition-transform hover:scale-105">
                        <h3 className="text-gray-400 flex items-center mb-2 text-sm">
                            <Activity size={14} className="mr-2"/> 数据总量
                        </h3>
                        <p className="text-4xl font-black">{totalRecords}</p>
                        <p className="text-xs text-gray-500 mt-2">有效采样记录条数</p>
                    </div>
                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 shadow-xl transition-transform hover:scale-105">
                        <h3 className="text-gray-400 flex items-center mb-2 text-sm">
                            <CheckCircle size={14} className="mr-2 text-emerald-400"/> 专注记录
                        </h3>
                        <p className="text-4xl font-black text-emerald-400">{focusRecords}</p>
                        <p className="text-xs text-gray-500 mt-2">专注率: {totalRecords > 0 ? Math.round(focusRecords/totalRecords*100) : 0}%</p>
                    </div>
                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 shadow-xl transition-transform hover:scale-105">
                        <h3 className="text-gray-400 flex items-center mb-2 text-sm">
                            <AlertTriangle size={14} className="mr-2 text-red-400"/> 异常记录
                        </h3>
                        <p className="text-4xl font-black text-red-400">{fatigueRecords + distractedRecords}</p>
                        <p className="text-xs text-gray-500 mt-2">包含疲劳 {fatigueRecords} 条，分心 {distractedRecords} 条</p>
                    </div>
                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 shadow-xl transition-transform hover:scale-105">
                        <h3 className="text-gray-400 flex items-center mb-2 text-sm">
                            <PieChart size={14} className="mr-2 text-indigo-400"/> 总体均分
                        </h3>
                        <p className="text-4xl font-black text-indigo-400">{avgFocus}</p>
                        <p className="text-xs text-gray-500 mt-2">系统综合评分 (0-100)</p>
                    </div>
                </div>

                <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 mb-8 h-80 shadow-2xl">
                    <h3 className="text-lg font-bold mb-6 text-gray-200">学习效率时间分布图</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={logs}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis 
                                dataKey="timestamp" 
                                tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                                stroke="#475569"
                                fontSize={10}
                            />
                            <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} />
                            <Tooltip 
                                contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px'}}
                                labelFormatter={(val) => new Date(val).toLocaleString()}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="focus_score" 
                                stroke="#818cf8" 
                                strokeWidth={3} 
                                dot={false} 
                                animationDuration={1000}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-[#1e293b] rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                        <h3 className="font-bold flex items-center"><Database className="mr-2 text-indigo-400" size={18}/> 原始数据日志</h3>
                        <span className="text-xs text-gray-500">显示最近 100 条</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-gray-800 text-gray-200 uppercase text-xs">
                                <tr>
                                    <th className="p-4">时间</th>
                                    <th className="p-4">状态标识</th>
                                    <th className="p-4 text-center">专注分值</th>
                                    <th className="p-4 text-center">眨眼频率</th>
                                    <th className="p-4">坐姿详情</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.slice(-100).reverse().map((log: any, i) => (
                                    <tr key={log.id || i} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                                        <td className="p-4 text-gray-300">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                                log.state === 'FOCUSED' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                log.state === 'DISTRACTED' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {log.state}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-mono font-bold text-gray-200">{log.focus_score}</td>
                                        <td className="p-4 text-center">{log.blink_rate}</td>
                                        <td className="p-4 text-gray-300">{log.posture}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(logs.length === 0 && !isLoading) && (
                            <div className="p-20 text-center flex flex-col items-center">
                                <Database size={48} className="text-gray-700 mb-4" />
                                <p className="text-gray-600">数据库为空或尚未开始记录</p>
                            </div>
                        )}
                        {isLoading && (
                            <div className="p-20 text-center flex flex-col items-center">
                                <RefreshCcw size={48} className="text-indigo-600 animate-spin mb-4" />
                                <p className="text-gray-600">正在同步数据库记录...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataDashboard;
