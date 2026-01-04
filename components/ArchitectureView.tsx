
import React from 'react';
import { ArrowLeft, Video, Mic, BookOpen, Wrench, AlertTriangle, PlayCircle, HelpCircle } from 'lucide-react';

interface ArchitectureViewProps {
    onBack: () => void;
}

const HelpCard: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, color: string }> = ({ title, icon, children, color }) => (
    <div className={`bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 shadow-xl`}>
        <div className={`flex items-center mb-4 ${color}`}>
            {icon}
            <h3 className="ml-3 text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="text-slate-300 text-sm leading-relaxed space-y-2">
            {children}
        </div>
    </div>
);

const ArchitectureView: React.FC<ArchitectureViewProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-6 md:p-12 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center mb-10">
                    <button onClick={onBack} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 mr-4 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center">
                            <HelpCircle className="mr-3 text-indigo-400" />
                            用户使用帮助
                        </h1>
                        <p className="text-gray-400 mt-1">系统操作指南与常见问题解答</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <HelpCard 
                        title="1. 开启实时专注监测" 
                        icon={<Video size={24}/>} 
                        color="text-indigo-400"
                    >
                        <p><strong>第一步：</strong> 点击主页中央的 <span className="bg-indigo-600 px-2 py-0.5 rounded text-xs">连接服务器摄像头</span> 按钮。</p>
                        <p><strong>第二步：</strong> 确保您的浏览器允许使用摄像头权限。如果是树莓派专用摄像头，系统会自动调用 MJPEG 流。</p>
                        <p><strong>功能：</strong> 系统将实时分析您的面部状态，检测是否疲劳（闭眼）、分心（转头）或专注。如果发现异常，台灯会自动闪烁提醒。</p>
                    </HelpCard>

                    <HelpCard 
                        title="2. 使用 AI 语音导师" 
                        icon={<Mic size={24}/>} 
                        color="text-emerald-400"
                    >
                        <p><strong>开启对话：</strong> 点击右上角的 <span className="bg-slate-700 px-2 py-0.5 rounded text-xs border border-slate-600">开启 AI 导师语音</span> 按钮。</p>
                        <p><strong>交互方式：</strong> 您可以直接通过麦克风与 AI 导师对话，询问学习问题或寻求鼓励。AI 会通过语音实时回复。</p>
                        <p><strong>注意：</strong> 此功能需要稳定的互联网连接以访问 Gemini Live API。</p>
                    </HelpCard>

                    <HelpCard 
                        title="3. AI 学习辅导 (作业批改)" 
                        icon={<BookOpen size={24}/>} 
                        color="text-amber-400"
                    >
                        <p><strong>作业批改：</strong> 在主页点击 <span className="bg-indigo-600 px-2 py-0.5 rounded text-xs">批改当前作业</span>，系统会拍摄当前画面并进行智能批改。</p>
                        <p><strong>题库录入：</strong> 进入侧边栏的“AI 学习辅导”页面，上传题目照片。AI 将自动提取文字、判断科目并生成标准解析。</p>
                        <p><strong>导出：</strong> 您可以将解析内容一键复制到 Word，或导出为 JSON 备份。</p>
                    </HelpCard>

                    <HelpCard 
                        title="4. 硬件控制与调试" 
                        icon={<Wrench size={24}/>} 
                        color="text-blue-400"
                    >
                        <p><strong>智能台灯：</strong> 台灯会根据您的专注状态自动调节。专注时常亮，疲劳时呼吸，分心时闪烁。</p>
                        <p><strong>手动调试：</strong> 点击主页右上角的扳手图标 <Wrench size={12} className="inline"/>，打开调试面板，可以手动测试台灯开关和语音播放功能。</p>
                    </HelpCard>
                </div>

                <div className="mt-10 bg-rose-900/20 border border-rose-500/30 p-6 rounded-2xl">
                    <h3 className="font-bold text-rose-300 mb-4 flex items-center">
                        <AlertTriangle size={20} className="mr-2"/> 常见问题 (FAQ)
                    </h3>
                    <div className="space-y-4 text-sm text-slate-300">
                        <details className="group">
                            <summary className="cursor-pointer font-bold text-white group-hover:text-rose-300 transition-colors">
                                Q: AI 分析提示“网络错误”或“API Key 设置”怎么办？
                            </summary>
                            <p className="mt-2 pl-4 border-l-2 border-rose-500/50">
                                请检查您的设备是否连接互联网。如果在树莓派上运行，请确保 `.env` 文件中配置了正确的 `API_KEY`。我们建议使用 Gemini 2.0 Flash 模型以获得最佳稳定性。
                            </p>
                        </details>
                        
                        <details className="group">
                            <summary className="cursor-pointer font-bold text-white group-hover:text-rose-300 transition-colors">
                                Q: 摄像头无法加载画面？
                            </summary>
                            <p className="mt-2 pl-4 border-l-2 border-rose-500/50">
                                1. 确保摄像头已插入 USB 或 CSI 接口。<br/>
                                2. 尝试刷新页面。<br/>
                                3. 检查后端服务是否运行 (`npm run server`)。<br/>
                                4. 如果使用 Chrome，请确保给予了网页摄像头权限。
                            </p>
                        </details>

                        <details className="group">
                            <summary className="cursor-pointer font-bold text-white group-hover:text-rose-300 transition-colors">
                                Q: 语音播报没有声音？
                            </summary>
                            <p className="mt-2 pl-4 border-l-2 border-rose-500/50">
                                系统优先使用浏览器自带语音。请检查电脑/手机是否静音。如果浏览器不支持，系统会尝试让树莓派播放声音（需连接音响）。
                            </p>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArchitectureView;
