
export enum StudyState {
    IDLE = 'IDLE',
    FOCUSED = 'FOCUSED',
    DISTRACTED = 'DISTRACTED',
    FATIGUED = 'FATIGUED',
    ABSENT = 'ABSENT'
}

export interface AnalysisResult {
    timestamp: number;
    isFocused: boolean;
    isFatigued: boolean;
    focusScore: number; // 0-100
    posture: string; // e.g., "Good", "Slouching", "Leaning"
    expression: string; // e.g., "Neutral", "Happy", "Yawning", "Confused"
    distractionReason: string | null; // Reason for distraction if !isFocused
    advice: string | null; // Text to speak/show
    state: StudyState;
    blinkRate: number; // Blinks per minute
}

export interface SessionStats {
    startTime: number;
    totalFocusTime: number; // seconds
    distractionCount: number;
    averageFocusScore: number;
}

export interface QuestionItem {
    id: number;
    timestamp: number;
    subject: string;
    questionText: string;
    standardAnswer: string;
    imageData: string; // base64
}
