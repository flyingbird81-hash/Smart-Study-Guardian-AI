
export const ANALYSIS_INTERVAL_MS = 12000; // Increased to 12s to stay safely within free tier rate limits
export const MAX_HISTORY_ITEMS = 50;
export const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const STATUS_COLORS = {
    IDLE: 'text-gray-400',
    FOCUSED: 'text-emerald-400',
    DISTRACTED: 'text-orange-400',
    FATIGUED: 'text-red-400',
    ABSENT: 'text-gray-500'
};

export const STATUS_LABELS = {
    IDLE: '空闲',
    FOCUSED: '专注中',
    DISTRACTED: '分心中',
    FATIGUED: '疲劳',
    ABSENT: '离座'
};

export const STATUS_BG_COLORS = {
    IDLE: 'bg-gray-900/50',
    FOCUSED: 'bg-emerald-900/20',
    DISTRACTED: 'bg-orange-900/20',
    FATIGUED: 'bg-red-900/20',
    ABSENT: 'bg-gray-800/50'
};
