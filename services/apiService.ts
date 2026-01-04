
import { AnalysisResult, QuestionItem } from '../types';

const API_BASE = ''; 

const fetchPost = async (endpoint: string, body: any) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
};

const fetchGet = async (endpoint: string) => {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
};

const fetchPut = async (endpoint: string, body: any) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
};

const fetchDelete = async (endpoint: string) => {
    const response = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
};

export const apiLogin = async (username: string, password: string) => {
    try {
        return await fetchPost('/api/login', { username, password });
    } catch (e) { 
        return { success: false, msg: "网络连接失败" }; 
    }
};

export const apiLogData = async (data: AnalysisResult) => {
    try { await fetchPost('/api/logs', data); } catch (e) {}
};

export const apiGetStats = async () => {
    try { return await fetchGet('/api/stats'); } catch (e) { return []; }
};

let lastLampState = { mode: '', value: -1, speed: -1 };
export const apiControlLamp = async (mode: 'PWM' | 'BREATHE' | 'FLASH' | 'ON' | 'OFF', value: number = 0, speed: number = 2000) => {
    if (mode === lastLampState.mode) {
        if (mode === 'PWM' && Math.abs(value - lastLampState.value) < 5) return;
        if (mode === 'BREATHE' && Math.abs(speed - lastLampState.speed) < 100) return;
        if (mode === 'OFF' && lastLampState.mode === 'OFF') return;
    }
    lastLampState = { mode, value, speed };
    try { await fetchPost('/api/lamp', { mode, interval: speed, speed: speed }); } catch (e) {}
};

// --- Audio Handling (Browser Native Priority) ---

// 初始化音频上下文 (仅用于 LiveSession 或其他音频用途，不阻碍 SpeechSynthesis)
export const initAudioContext = async () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass({ sampleRate: 24000 });
        if (ctx.state === 'suspended') await ctx.resume();
        return true;
    } catch (e) {
        return false;
    }
};

// 触发服务器发声 (兜底方案)
const fallbackToServer = (text: string) => {
    console.log("[TTS] 浏览器发声失败，转由树莓派服务器播放(Espeak)...");
    fetchPost('/api/speak', { text }).catch(e => console.error("[TTS] Server speak failed", e));
};

export const apiSpeak = async (text: string) => {
    console.log(`[TTS] 请求播放: "${text}"`);
    
    // 1. 优先使用浏览器原生 SpeechSynthesis (电脑/手机直接发声)
    // 这是最可靠的方法，可以将声音输出到当前操作的设备，而不是远程树莓派
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            // 停止当前正在说的内容
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN'; // 强制中文
            utterance.rate = 1.0;     // 语速正常
            utterance.volume = 1.0;   // 音量最大

            // 尝试选择最佳中文语音
            const voices = window.speechSynthesis.getVoices();
            const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
            if (zhVoice) {
                utterance.voice = zhVoice;
            }

            // 错误处理：如果浏览器播放出错，转服务器
            utterance.onerror = (e) => {
                console.warn("[TTS] 浏览器语音播放错误:", e);
                fallbackToServer(text);
            };

            window.speechSynthesis.speak(utterance);
            console.log("[TTS] 已发送至浏览器播放队列");
            return; // 成功发送给浏览器，结束函数
        } catch (e) {
            console.error("[TTS] 浏览器语音接口异常:", e);
            // 异常则继续向下执行，调用服务器
        }
    } else {
        console.warn("[TTS] 当前浏览器不支持 SpeechSynthesis API");
    }

    // 2. 如果浏览器不支持或报错，调用树莓派服务器 (机械音)
    fallbackToServer(text);
};

// --- Question Bank Services ---
export const apiGetQuestions = async (): Promise<QuestionItem[]> => {
    try {
        const data = await fetchGet('/api/questions');
        if (Array.isArray(data)) {
            return data.map((q: any) => ({
                id: q.id,
                timestamp: q.timestamp,
                subject: q.subject,
                questionText: q.question_text,
                standardAnswer: q.standard_answer,
                imageData: q.image_data
            }));
        }
        return [];
    } catch (e) { return []; }
};

export const apiSaveQuestion = async (q: Omit<QuestionItem, 'id'>) => {
    try { return await fetchPost('/api/questions', q); } catch (e) { return { success: false }; }
};

export const apiUpdateQuestion = async (id: number, questionText: string, standardAnswer: string) => {
    try { return await fetchPut(`/api/questions/${id}`, { questionText, standardAnswer }); } catch (e) { return { success: false }; }
};

export const apiDeleteQuestion = async (id: number) => {
    try { return await fetchDelete(`/api/questions/${id}`); } catch (e) { return { success: false }; }
};
