
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Upload, Trash2, Edit2, Check, X, Download, Loader2, Save, FileText, FileDown, Maximize2, Minimize2, Search, ExternalLink, Copy, ClipboardCopy, Brain } from 'lucide-react';
import { analyzeQuestion } from '../services/geminiService';
import { apiGetQuestions, apiSaveQuestion, apiUpdateQuestion, apiDeleteQuestion } from '../services/apiService';
import { QuestionItem } from '../types';

interface QuestionBankProps {
    onBack: () => void;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ onBack }) => {
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReportMode, setIsReportMode] = useState(false); 
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<{q: string, a: string}>({q: '', a: ''});

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        setIsLoading(true);
        const data = await apiGetQuestions();
        setQuestions(data);
        setIsLoading(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyzeAndSave = async () => {
        if (!uploadPreview) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeQuestion(uploadPreview);
            
            const newQ = {
                timestamp: Date.now(),
                subject: result.subject,
                questionText: result.question,
                standardAnswer: result.answer,
                imageData: uploadPreview
            };

            await apiSaveQuestion(newQ);
            setUploadPreview(null);
            await loadQuestions();
        } catch (error) {
            alert("分析失败，请检查网络或 API Key 设置。");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("确定要删除这道题吗？")) {
            await apiDeleteQuestion(id);
            loadQuestions();
        }
    };

    const startEdit = (q: QuestionItem) => {
        setEditingId(q.id);
        setEditForm({ q: q.questionText, a: q.standardAnswer });
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async (id: number) => {
        await apiUpdateQuestion(id, editForm.q, editForm.a);
        setEditingId(null);
        loadQuestions();
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "study_questions_export.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // 专门针对 Word 优化的复制功能
    const handleCopyToWord = (q: QuestionItem) => {
        try {
            const div = document.createElement('div');
            // 构建一个 Word 友好的 HTML 结构
            // 使用 table 布局通常在 Word 中最稳定
            div.innerHTML = `
                <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 1px solid #ccc; margin-bottom: 20px; font-family: 'Microsoft YaHei', sans-serif;">
                    <tr>
                        <td style="width: 150px; vertical-align: top; padding: 10px;">
                            <img src="${q.imageData}" width="120" height="auto" style="display: block; width: 120px; height: auto;" />
                        </td>
                        <td style="vertical-align: top; padding: 10px;">
                            <p style="margin: 0 0 5px 0; font-size: 14px; color: #666;">
                                <strong>[${q.subject}]</strong> ${new Date(q.timestamp).toLocaleDateString()}
                            </p>
                            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #000;">${q.questionText}</p>
                            <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; color: #333;">
                                <strong>解析：</strong><br/>
                                ${q.standardAnswer.replace(/\n/g, '<br/>')}
                            </div>
                        </td>
                    </tr>
                </table>
                <br/>
            `;

            const blob = new Blob([div.innerHTML], { type: 'text/html' });
            // 同时提供纯文本回退
            const textFallback = `[${q.subject}] ${q.questionText}\n答案：${q.standardAnswer}`;
            const textBlob = new Blob([textFallback], { type: 'text/plain' });

            const item = new ClipboardItem({
                'text/html': blob,
                'text/plain': textBlob
            });

            navigator.clipboard.write([item]).then(() => {
                alert("已复制！请直接在 Word 中粘贴 (Ctrl+V)");
            });
        } catch (err) {
            console.error("Clipboard write failed", err);
            alert("复制失败，您的浏览器可能不支持此操作。");
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-6 md:p-12 animate-fade-in relative">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div className="flex items-center space-x-4">
                        <button onClick={onBack} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                            <X size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center">
                                <Brain className="mr-3 text-emerald-400" />
                                AI 学习辅导
                            </h1>
                            <p className="text-gray-400 mt-1">拍照搜题，AI 智能解析与作业管理</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 w-full md:w-auto">
                        <button 
                            onClick={() => setIsReportMode(!isReportMode)}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all border ${isReportMode ? 'bg-amber-600 border-amber-500 text-white shadow-xl shadow-amber-900/40' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                        >
                            {isReportMode ? <Minimize2 size={18}/> : <FileDown size={18}/>}
                            <span>{isReportMode ? '常规模式' : '报告模式 (图片极小化)'}</span>
                        </button>

                        <button 
                            onClick={handleExport}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold flex items-center shadow-lg transition-all"
                        >
                            <Download className="mr-2" size={20} />
                            导出备份
                        </button>
                    </div>
                </div>

                {isReportMode && (
                    <div className="bg-amber-900/20 border border-amber-500/30 p-5 rounded-2xl mb-8 flex items-start text-amber-100">
                        <Copy className="mr-4 shrink-0 mt-1 text-amber-400" size={24}/>
                        <div>
                            <p className="font-bold text-lg mb-1">📐 Word 粘贴优化已就绪</p>
                            <p className="text-amber-200/80 text-sm leading-relaxed">
                                建议使用每道题右上角的 <strong className="text-white bg-amber-600 px-1 rounded">复制到 Word</strong> 按钮。
                                <br/>这会将图片和文字以表格形式格式化，粘贴到 Word 后图片将自动显示，不会丢失。
                            </p>
                        </div>
                    </div>
                )}

                {/* Upload Section */}
                {!isReportMode && (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 mb-12 shadow-2xl">
                        <h3 className="text-xl font-bold mb-6 flex items-center text-emerald-400">
                            <Plus className="mr-2" size={22}/> 录入新题
                        </h3>
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            <div className="w-full lg:w-2/5">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed border-slate-600 rounded-2xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-all ${uploadPreview ? 'bg-black p-2' : 'bg-slate-900/50 hover:bg-slate-800'}`}
                                >
                                    {uploadPreview ? (
                                        <img src={uploadPreview} alt="Preview" className="h-full w-full object-contain rounded-lg" />
                                    ) : (
                                        <>
                                            <Upload className="text-slate-500 mb-3" size={40} />
                                            <span className="text-slate-400 font-medium">点击上传题目图片</span>
                                        </>
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                            </div>
                            <div className="w-full lg:w-3/5">
                                 <button 
                                    disabled={!uploadPreview || isAnalyzing}
                                    onClick={handleAnalyzeAndSave}
                                    className={`py-4 px-8 rounded-2xl font-bold flex items-center justify-center w-full transition-all ${!uploadPreview || isAnalyzing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/20 active:scale-95'}`}
                                 >
                                     {isAnalyzing ? (
                                         <><Loader2 className="animate-spin mr-3"/> AI 正在提取公式...</>
                                     ) : (
                                         <><Check className="mr-2" size={20}/> 识别并保存</>
                                     )}
                                 </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Question List */}
                <div className="space-y-6 pb-32">
                    {isLoading ? (
                        <div className="text-center py-24 text-slate-500 font-mono tracking-widest">LOADING...</div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-24 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
                            <p className="text-slate-500">暂无题目数据。</p>
                        </div>
                    ) : (
                        questions.map(q => (
                            <div key={q.id} className={`bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all duration-300 ${isReportMode ? 'mb-4 ring-1 ring-amber-500/20' : 'md:flex-row'}`}>
                                
                                {/* 核心图片显示区 - 修复 Word 兼容性问题 */}
                                <div className={`${isReportMode ? 'w-full p-4 border-b border-slate-700 bg-[#070b14]' : 'md:w-1/3 p-4 border-r border-slate-700 bg-black'} flex items-center justify-center group relative`}>
                                    <img 
                                        src={q.imageData} 
                                        alt="formula-img" 
                                        width={isReportMode ? "120" : undefined} // 增加宽度并使用固定值
                                        height={isReportMode ? "auto" : undefined}
                                        style={isReportMode ? { 
                                            width: '120px',  // 使用像素单位而非百分比，Word 对 px 支持更好
                                            height: 'auto',
                                            display: 'block',
                                            border: '1px solid #334155',
                                            backgroundColor: '#fff' // 增加白色背景防止透明图在Word变黑
                                        } : { 
                                            width: '100%', 
                                            maxHeight: '220px', 
                                            objectFit: 'contain' 
                                        }}
                                    />
                                    {!isReportMode && (
                                        <button 
                                            onClick={() => setPreviewImage(q.imageData)}
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold"
                                        >
                                            <Search className="mr-2" size={16}/> 点击查看大图
                                        </button>
                                    )}
                                </div>
                                
                                {/* 文本内容区 */}
                                <div className={`p-6 ${isReportMode ? 'w-full' : 'md:w-2/3'} flex flex-col`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-2">
                                            <span className="bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold border border-emerald-700/50 uppercase">
                                                {q.subject}
                                            </span>
                                            <span className="text-slate-500 text-[10px]">
                                                {new Date(q.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button 
                                                onClick={() => handleCopyToWord(q)} 
                                                className="flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg transition-colors font-bold shadow-lg"
                                                title="复制为 Word 格式"
                                            >
                                                <ClipboardCopy size={14} className="mr-1.5" /> 复制到 Word
                                            </button>
                                            
                                            {editingId === q.id ? (
                                                <button onClick={() => saveEdit(q.id)} className="p-1.5 bg-emerald-600 rounded-lg"><Save size={14}/></button>
                                            ) : (
                                                <button onClick={() => startEdit(q)} className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/40"><Edit2 size={14}/></button>
                                            )}
                                            <button onClick={() => handleDelete(q.id)} className="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40"><Trash2 size={14}/></button>
                                        </div>
                                    </div>

                                    {editingId === q.id ? (
                                        <div className="space-y-3">
                                            <textarea 
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
                                                rows={2}
                                                value={editForm.q}
                                                onChange={e => setEditForm({...editForm, q: e.target.value})}
                                            />
                                            <textarea 
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
                                                rows={4}
                                                value={editForm.a}
                                                onChange={e => setEditForm({...editForm, a: e.target.value})}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">题目文本:</h4>
                                                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{q.questionText}</p>
                                            </div>
                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                                <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">AI 详解答案:</h4>
                                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{q.standardAnswer}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 大图预览遮罩 */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setPreviewImage(null)}
                >
                    <button className="absolute top-8 right-8 text-white/50 hover:text-white bg-white/10 p-3 rounded-full">
                        <X size={32}/>
                    </button>
                    <img 
                        src={previewImage} 
                        alt="Zoomed" 
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-xl ring-1 ring-white/10"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default QuestionBank;
