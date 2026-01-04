
import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, 
  BarChart3, 
  BookOpen, 
  LogOut, 
  LayoutDashboard, 
  User as UserIcon,
  Sparkles,
  Zap,
  Mic,
  MicOff,
  Activity,
  Timer,
  Volume2,
  List,
  Wrench,
  HelpCircle,
  ClipboardList
} from 'lucide-react';
import WebcamMonitor, { WebcamRef } from './components/WebcamMonitor';
import MetricsCard from './components/MetricsCard';
import LiveChart from './components/LiveChart';
import StudyReport from './components/StudyReport';
import LoginPage from './components/LoginPage';
import DataDashboard from './components/DataDashboard';
import QuestionBank from './components/QuestionBank';
import ArchitectureView from './components/ArchitectureView';
import BenchmarkReport from './components/BenchmarkReport';
import { AnalysisResult, StudyState } from './types';
import { STATUS_COLORS, STATUS_LABELS, STATUS_BG_COLORS } from './constants';
import { apiLogData, apiControlLamp, apiSpeak, initAudioContext } from './services/apiService'; 
import { generateSessionReport } from './services/geminiService';
import { useLiveSession } from './hooks/useLiveSession';

// Restored QUESTION_BANK to view types
type AppView = 'MAIN' | 'REPORT' | 'DATABASE' | 'QUESTION_BANK' | 'ARCHITECTURE';

const BENCHMARK_DURATION = 120; // 2 minutes
const APP_VERSION = "V2.5.0 Stable";

const App: React.FC = () => {
    // Auth State
    const [user, setUser] = useState<{username: string, role: string} | null>(null);
    
    // UI State
    const [currentView, setCurrentView] = useState<AppView>('MAIN');
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [showDebugPanel, setShowDebugPanel] = useState(false); // Hardware Debug
    
    // Benchmark State
    const [isBenchmarking, setIsBenchmarking] = useState(false);
    const [benchmarkTimeLeft, setBenchmarkTimeLeft] = useState(0);
    const [benchmarkData, setBenchmarkData] = useState<AnalysisResult[]>([]);
    const [showBenchmarkReport, setShowBenchmarkReport] = useState(false);

    // Monitoring Data
    const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
    const [history, setHistory] = useState<AnalysisResult[]>([]);
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);

    // Refs
    const webcamRef = useRef<WebcamRef>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const lastAlertTimeRef = useRef<number>(0); // Timestamp for throttling
    
    // Gemini Live Session Hook
    const { isConnected, isConnecting, connect, disconnect, error: audioError } = useLiveSession();

    // Benchmark Timer
    useEffect(() => {
        let timer: any;
        if (isBenchmarking && benchmarkTimeLeft > 0) {
            timer = setInterval(() => {
                setBenchmarkTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (isBenchmarking && benchmarkTimeLeft === 0) {
            // End Benchmark
            setIsBenchmarking(false);
            setIsMonitoring(false);
            setShowBenchmarkReport(true);
            apiSpeak("性能测试已完成。"); 
        }
        return () => clearInterval(timer);
    }, [isBenchmarking, benchmarkTimeLeft]);

    // Handle results from WebcamMonitor
    const handleAnalysisResult = (result: AnalysisResult) => {
        setCurrentResult(result);
        
        if (isBenchmarking) {
            setBenchmarkData(prev => [...prev, result]);
        } else {
            setHistory(prev => [...prev, result].slice(-200)); 
            apiLogData(result);

            const now = Date.now();
            // 冷却时间：8000ms (8秒)
            const COOLDOWN = 8000; 

            if (now - lastAlertTimeRef.current > COOLDOWN) {
                if (result.state === StudyState.FATIGUED) {
                    // 1. 硬件反馈
                    apiControlLamp('BREATHE', 80, 1000); 
                    // 2. 语音反馈 (优先 AI)
                    apiSpeak("检测到您有些疲倦，要注意休息哦。");
                    lastAlertTimeRef.current = now;
                } else if (result.state === StudyState.DISTRACTED) {
                    // 1. 硬件反馈
                    apiControlLamp('FLASH', 100, 300); // 快速闪烁提醒
                    // 2. 语音反馈
                    apiSpeak("请保持专注，不要分心。");
                    lastAlertTimeRef.current = now;
                } else if (result.state === StudyState.FOCUSED) {
                    // 专注时保持常亮，不发声，也不更新冷却时间
                    apiControlLamp('ON', 50); 
                }
            }
        }
    };

    const toggleMonitoring = async () => {
        if (isMonitoring) {
            if (isBenchmarking) {
                setIsBenchmarking(false);
                setBenchmarkTimeLeft(0);
                setBenchmarkData([]);
            } else {
                handleFinishSession();
            }
            setIsMonitoring(false);
            apiControlLamp('OFF'); // Stop lamp when stopping monitor
        } else {
            // 关键：在用户点击时解锁音频上下文
            await initAudioContext();
            
            setHistory([]);
            setAiAdvice(null);
            setIsMonitoring(true);
            apiSpeak("系统已启动，开始为您护航。");
        }
    };

    const startBenchmark = async () => {
        if (isMonitoring && !isBenchmarking) {
            alert("请先停止当前的常规监控模式。");
            return;
        }
        // 解锁音频
        await initAudioContext();

        setBenchmarkData([]);
        setBenchmarkTimeLeft(BENCHMARK_DURATION);
        setIsBenchmarking(true);
        setIsMonitoring(true); 
        setShowBenchmarkReport(false);
        apiSpeak("开始性能基准测试。");
    };

    const handleFinishSession = async () => {
        setIsMonitoring(false);
        if (history.length < 5) {
            setCurrentView('MAIN');
            return;
        }
        
        setCurrentView('REPORT');
        setIsGeneratingReport(true);
        try {
            const report = await generateSessionReport(history);
            setAiAdvice(report);
            apiSpeak("学习结束，正在生成报告。");
        } catch (e) {
            console.error("Report generation failed", e);
        } finally {
            setIsGeneratingReport(false);
        }
    };

    // 硬件调试函数
    const handleDebugLamp = (mode: 'ON' | 'OFF' | 'FLASH') => {
        apiControlLamp(mode, 100, 500);
    };
    const handleDebugSpeak = async () => {
        // 调试时也要尝试初始化音频
        await initAudioContext();
        apiSpeak("硬件测试正常，我是智能语音助手。");
    };

    if (!user) return <LoginPage onLogin={setUser} />;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 flex overflow-hidden font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-20 lg:w-64 bg-[#1e293b]/50 backdrop-blur-xl border-r border-gray-800 flex flex-col z-50">
                <div className="p-6 flex items-center space-x-3">
                    <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 shrink-0">
                        <Brain className="text-white" size={24} />
                    </div>
                    {/* 更新侧边栏标题 */}
                    <span className="font-bold text-xs lg:text-xs hidden lg:inline leading-tight tracking-tight">
                        智能学习动态效率分析与<br/>个性化建议系统
                    </span>
                </div>

                <nav className="flex-grow px-3 py-4 space-y-2">
                    <button 
                        onClick={() => setCurrentView('MAIN')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${currentView === 'MAIN' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'text-slate-400 hover:bg-slate-800/50'}`}
                    >
                        <LayoutDashboard size={20} />
                        <span className="hidden lg:inline text-sm">实时监控中心</span>
                    </button>
                    <button 
                        onClick={() => setCurrentView('REPORT')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${currentView === 'REPORT' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'text-slate-400 hover:bg-slate-800/50'}`}
                    >
                        <ClipboardList size={20} />
                        <span className="hidden lg:inline text-sm">分析与建议报告</span>
                    </button>
                    <button 
                        onClick={() => setCurrentView('DATABASE')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${currentView === 'DATABASE' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'text-slate-400 hover:bg-slate-800/50'}`}
                    >
                        <BarChart3 size={20} />
                        <span className="hidden lg:inline text-sm">数据统计大屏</span>
                    </button>
                    
                    {/* 恢复 AI 学习辅导按钮 */}
                    <button 
                        onClick={() => setCurrentView('QUESTION_BANK')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${currentView === 'QUESTION_BANK' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'text-slate-400 hover:bg-slate-800/50'}`}
                    >
                        <BookOpen size={20} />
                        <span className="hidden lg:inline text-sm">AI 学习辅导</span>
                    </button>

                    <button 
                        onClick={() => setCurrentView('ARCHITECTURE')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${currentView === 'ARCHITECTURE' ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'text-slate-400 hover:bg-slate-800/50'}`}
                    >
                        <HelpCircle size={20} />
                        <span className="hidden lg:inline text-sm">用户使用帮助</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center space-x-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                            <UserIcon size={16} />
                        </div>
                        <div className="hidden lg:block overflow-hidden">
                            <p className="text-xs font-bold truncate">{user.username}</p>
                            <p className="text-xs text-slate-500 uppercase">{user.role}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setUser(null)}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
                    >
                        <LogOut size={20} />
                        <span className="hidden lg:inline text-sm font-medium">安全退出</span>
                    </button>
                    <div className="mt-4 text-center">
                        <span className="text-[10px] text-slate-600 font-mono">{APP_VERSION}</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-grow relative overflow-y-auto custom-scrollbar">
                {currentView === 'MAIN' && (
                    <div className="p-6 md:p-8 animate-fade-in relative">
                        {/* Hardware Debug Toggle */}
                        <div className="absolute top-6 right-8 z-50">
                            <button 
                                onClick={() => setShowDebugPanel(!showDebugPanel)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-700"
                                title="打开硬件调试与高级功能面板"
                            >
                                <Wrench size={18} />
                            </button>
                        </div>

                        {/* Hardware Debug Panel - Expanded with Performance and Voice Controls */}
                        {showDebugPanel && (
                            <div className="mb-8 p-6 bg-slate-800/80 border border-slate-600 rounded-2xl flex flex-col gap-4 animate-in slide-in-from-top-4">
                                {/* Row 1: Basic Hardware Control */}
                                <div className="flex flex-wrap gap-4 items-center">
                                    <span className="text-sm font-bold text-slate-300 flex items-center border-r border-slate-600 pr-4 mr-2 min-w-[100px]">
                                        <Wrench size={16} className="mr-2 text-indigo-400"/> 硬件调试
                                    </span>
                                    <button onClick={() => handleDebugLamp('ON')} className="px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded-lg text-xs font-bold border border-yellow-600/50">
                                        开启台灯
                                    </button>
                                    <button onClick={() => handleDebugLamp('OFF')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold border border-slate-600">
                                        关闭台灯
                                    </button>
                                    <button onClick={() => handleDebugLamp('FLASH')} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-bold border border-red-600/50">
                                        测试闪烁
                                    </button>
                                    <div className="w-px h-6 bg-slate-600 mx-2 hidden sm:block"></div>
                                    <button onClick={handleDebugSpeak} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-600/50 flex items-center">
                                        <Volume2 size={12} className="mr-1"/> 测试播报
                                    </button>
                                </div>

                                {/* Row 2: Advanced Functions (Moved from Header) */}
                                <div className="flex flex-wrap gap-4 items-center border-t border-slate-700 pt-4">
                                     <span className="text-sm font-bold text-slate-300 flex items-center border-r border-slate-600 pr-4 mr-2 min-w-[100px]">
                                        <Activity size={16} className="mr-2 text-pink-400"/> 高级功能
                                    </span>
                                    
                                    {/* 性能测试按钮 */}
                                    {!isBenchmarking && (
                                        <button 
                                            onClick={startBenchmark}
                                            disabled={isMonitoring}
                                            className={`flex items-center space-x-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold border border-slate-600 transition-all ${isMonitoring ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Timer size={14} className="text-orange-400"/>
                                            <span>性能基准测试</span>
                                        </button>
                                    )}

                                    {/* AI 语音按钮 */}
                                    <button 
                                        onClick={isConnected ? disconnect : connect}
                                        disabled={isConnecting || isBenchmarking}
                                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isConnected ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}
                                    >
                                        {isConnecting ? (
                                            <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                        ) : isConnected ? <Mic size={14}/> : <MicOff size={14}/>}
                                        <span>{isConnected ? 'AI 导师在线' : '开启 AI 导师语音'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center">
                                    <Sparkles className="mr-2 text-yellow-400" size={20}/>
                                    欢迎回来, {user.username}
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">
                                    {isBenchmarking 
                                        ? `⚠️ 正在进行性能测试... 剩余 ${benchmarkTimeLeft} 秒` 
                                        : `系统已就绪，AI 视觉分析引擎状态：${isMonitoring ? '运行中' : '空闲'}`
                                    }
                                </p>
                            </div>
                        </header>

                        {/* Analysis Dashboard Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                            {/* Camera Section */}
                            <div className="lg:col-span-7 xl:col-span-8 aspect-video rounded-3xl overflow-hidden shadow-2xl relative border border-gray-800 bg-black">
                                <WebcamMonitor 
                                    ref={webcamRef}
                                    isActive={isMonitoring} 
                                    onResult={handleAnalysisResult}
                                    onToggle={toggleMonitoring}
                                    userRole={user.role}
                                />
                                
                                {/* Benchmark Overlay */}
                                {isBenchmarking && (
                                    <div className="absolute top-4 right-4 bg-orange-600/90 text-white px-4 py-2 rounded-lg backdrop-blur flex items-center font-mono font-bold animate-pulse shadow-lg z-20">
                                        <Timer className="mr-2" size={20}/>
                                        TESTING: {benchmarkTimeLeft}s
                                    </div>
                                )}

                                {isMonitoring && currentResult && !isBenchmarking && (
                                    <div className={`absolute top-6 left-6 px-4 py-2 rounded-2xl flex items-center space-x-2 backdrop-blur-md border ${STATUS_BG_COLORS[currentResult.state]} border-white/10 shadow-xl`}>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${STATUS_COLORS[currentResult.state].replace('text-', 'bg-')}`} />
                                        <span className={`text-sm font-bold ${STATUS_COLORS[currentResult.state]}`}>{STATUS_LABELS[currentResult.state]}</span>
                                    </div>
                                )}
                            </div>

                            {/* Metrics & Feed Section */}
                            <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <MetricsCard 
                                        title="专注评分" 
                                        value={currentResult?.focusScore || 0} 
                                        icon={<Zap size={16} className="text-yellow-400"/>}
                                        color={currentResult && currentResult.focusScore < 60 ? "text-orange-400" : "text-emerald-400"}
                                    />
                                    <MetricsCard 
                                        title="眨眼频率" 
                                        value={currentResult?.blinkRate || 0} 
                                        icon={<Brain size={16} className="text-indigo-400"/>}
                                        trend="次/分钟"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Chart & Log Section Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Chart */}
                            <div className="lg:col-span-2 bg-[#1e293b]/30 rounded-3xl border border-gray-800/50 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold flex items-center text-slate-300">
                                        <BarChart3 className="mr-2 text-indigo-400" size={18}/> 实时专注度波动曲线
                                    </h3>
                                    <div className="flex space-x-4 text-[10px] text-slate-500">
                                        <span className="flex items-center"><div className="w-2 h-2 bg-emerald-500 rounded-full mr-1"/> 专注度</span>
                                        <span className="flex items-center"><div className="w-2 h-2 bg-rose-500 rounded-full mr-1"/> 疲劳预警</span>
                                    </div>
                                </div>
                                <LiveChart data={history} />
                            </div>

                            {/* Right Log Table */}
                            <div className="lg:col-span-1 bg-[#1e293b]/30 rounded-3xl border border-gray-800/50 p-6 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold flex items-center text-slate-300">
                                        <List className="mr-2 text-emerald-400" size={18}/> 实时数据表
                                    </h3>
                                    <span className="text-[10px] text-slate-500">最近 10 条</span>
                                </div>
                                <div className="flex-grow overflow-hidden relative">
                                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-slate-500 sticky top-0 bg-[#0f172a] z-10">
                                                <tr className="border-b border-gray-800">
                                                    <th className="pb-2 pl-2">时间</th>
                                                    <th className="pb-2">状态</th>
                                                    <th className="pb-2 text-right pr-2">专注分</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800/50">
                                                {history.slice(-10).reverse().map((item, idx) => (
                                                    <tr key={idx} className="text-slate-400 hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-2 pl-2 font-mono opacity-70">
                                                            {new Date(item.timestamp).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'})}
                                                        </td>
                                                        <td className="py-2">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                                item.state === 'FOCUSED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                item.state === 'FATIGUED' ? 'bg-red-500/20 text-red-400' :
                                                                item.state === 'DISTRACTED' ? 'bg-orange-500/20 text-orange-400' : 
                                                                'text-gray-500'
                                                            }`}>
                                                                {STATUS_LABELS[item.state]}
                                                            </span>
                                                        </td>
                                                        <td className={`py-2 text-right pr-2 font-bold ${item.focusScore < 60 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                                            {item.focusScore}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {history.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="text-center py-8 text-slate-600 italic">
                                                            等待监测数据...
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Report Views */}
                {currentView === 'REPORT' && (
                    <div className="p-8 h-full">
                        <StudyReport 
                            history={history} 
                            aiAdvice={aiAdvice} 
                            onBack={() => setCurrentView('MAIN')} 
                            isLoading={isGeneratingReport}
                        />
                    </div>
                )}

                {currentView === 'DATABASE' && (
                    <DataDashboard onBack={() => setCurrentView('MAIN')} />
                )}

                {/* 恢复 AI 学习辅导视图 */}
                {currentView === 'QUESTION_BANK' && (
                    <QuestionBank onBack={() => setCurrentView('MAIN')} />
                )}

                {currentView === 'ARCHITECTURE' && (
                    <ArchitectureView onBack={() => setCurrentView('MAIN')} />
                )}

                {/* Benchmark Result Modal */}
                {showBenchmarkReport && (
                    <BenchmarkReport 
                        data={benchmarkData} 
                        durationSec={BENCHMARK_DURATION} 
                        onClose={() => setShowBenchmarkReport(false)} 
                    />
                )}
            </main>

            {/* Audio Feedback Hidden Player */}
            <audio ref={audioPlayerRef} className="hidden" />
        </div>
    );
};

export default App;
