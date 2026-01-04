// This file is now a wrapper around apiService.ts to maintain compatibility
// or simply unused. We will export dummy functions or redirect them.
import { apiGetStats } from './apiService';

export const initDB = async () => {
    // No-op: DB is on server
    return Promise.resolve();
};

export const getAggregatedStats = async () => {
    const logs = await apiGetStats();
    if (!logs || logs.length === 0) return null;
    
    const totalSamples = logs.length;
    const avgFocus = Math.round(logs.reduce((a:any, b:any) => a + b.focus_score, 0) / totalSamples);
    const fatigueCount = logs.filter((l:any) => l.is_fatigued).length;
    const avgBlink = Math.round(logs.reduce((a:any, b:any) => a + b.blink_rate, 0) / totalSamples);

    return { totalSamples, avgFocus, fatigueCount, avgBlink };
};

export const getAllLogs = async () => {
    return await apiGetStats();
};

export const exportDatabase = () => {
    alert("请登录服务器后台下载 benben.db 文件");
};