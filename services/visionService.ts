
import { AnalysisResult, StudyState } from "../types";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

// 核心视觉阈值
const EAR_THRESHOLD = 0.21;       // 闭眼判定阈值
const FATIGUE_FRAMES_THRESHOLD = 8; // 持续闭眼超过8帧判定为疲劳/磕睡

let closedEyeFrames = 0;
let blinkTimestamps: number[] = [];
let smoothFocusScore = 100;

export async function initializeVisionModel() {
    if (faceLandmarker) return;

    console.log("[Vision] Initializing MediaPipe...");
    
    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: { 
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", 
                delegate: "GPU" 
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        console.log("[Vision] Model loaded successfully");
    } catch (e) {
        console.error("[Vision] Failed to load model:", e);
        throw e;
    }
}

function calculateEAR(landmarks: any[], indices: number[]) {
    const p1 = landmarks[indices[0]], p2 = landmarks[indices[1]], p3 = landmarks[indices[2]], p4 = landmarks[indices[3]], p5 = landmarks[indices[4]], p6 = landmarks[indices[5]];
    const d = (a: any, b: any) => Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
    return (d(p2, p6) + d(p3, p5)) / (2.0 * d(p1, p4));
}

// 辅助：原生绘制连线
function drawPath(ctx: CanvasRenderingContext2D, landmarks: any[], indices: number[], closePath: boolean) {
    const region = new Path2D();
    region.moveTo(landmarks[indices[0]].x * ctx.canvas.width, landmarks[indices[0]].y * ctx.canvas.height);
    for (let i = 1; i < indices.length; i++) {
        const pt = landmarks[indices[i]];
        region.lineTo(pt.x * ctx.canvas.width, pt.y * ctx.canvas.height);
    }
    if (closePath) region.closePath();
    ctx.stroke(region);
}

export function analyzeVideoFrame(video: HTMLVideoElement | HTMLImageElement, canvas: HTMLCanvasElement): AnalysisResult | null {
    if (!faceLandmarker) return null;
    
    let result;
    try {
        result = faceLandmarker.detectForVideo(video, performance.now());
    } catch (e) { return null; }
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // --- 手写绘制逻辑 (不依赖 DrawingUtils) ---
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
            const landmarks = result.faceLandmarks[0];
            
            // 样式设置
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // 脸部网格颜色
            
            // 简单绘制脸部轮廓
            const faceOvalIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
            drawPath(ctx, landmarks, faceOvalIndices, true);

            // 绘制眼睛 (高亮)
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#06b6d4'; // 青色
            const leftEyeIndices = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
            const rightEyeIndices = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
            drawPath(ctx, landmarks, leftEyeIndices, true);
            drawPath(ctx, landmarks, rightEyeIndices, true);

            // 绘制眉毛
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            const leftEyebrow = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
            const rightEyebrow = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];
            drawPath(ctx, landmarks, leftEyebrow, false);
            drawPath(ctx, landmarks, rightEyebrow, false);
            
            // 绘制嘴巴
            const lips = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
            drawPath(ctx, landmarks, lips, true);
        }
    }

    let isFocused = true, isFatigued = false, score = 100, state = StudyState.FOCUSED, expr = "专注", reason = null, posture = "端正";

    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];
        
        // EAR (Eye Aspect Ratio) 分析
        const ear = (calculateEAR(landmarks, [33, 160, 158, 133, 153, 144]) + calculateEAR(landmarks, [362, 385, 387, 263, 373, 380])) / 2;
        
        if (ear < EAR_THRESHOLD) {
            closedEyeFrames++;
            if (closedEyeFrames > FATIGUE_FRAMES_THRESHOLD) {
                state = StudyState.FATIGUED; score = 20; expr = "闭眼/瞌睡"; isFatigued = true;
            }
        } else {
            if (closedEyeFrames > 1 && closedEyeFrames <= FATIGUE_FRAMES_THRESHOLD) {
                blinkTimestamps.push(Date.now());
            }
            closedEyeFrames = 0;
        }

        // 坐姿分析
        const nose = landmarks[1], lEar = landmarks[234], rEar = landmarks[454], eyeMidY = (landmarks[33].y + landmarks[263].y) / 2;
        const faceW = Math.abs(rEar.x - lEar.x);
        const pitch = (nose.y - eyeMidY) / faceW;
        const yaw = (nose.x - (lEar.x + rEar.x) / 2) / faceW;

        if (Math.abs(yaw) > 0.38) {
            state = StudyState.DISTRACTED; score = 30; reason = "侧头走神";
        } else if (pitch > 0.55) { 
            state = StudyState.DISTRACTED; score = 40; reason = "严重低头"; posture = "低头";
        } else if (pitch < 0.15) { 
            state = StudyState.DISTRACTED; score = 30; reason = "仰头走神"; posture = "仰头";
        }

        const now = Date.now();
        blinkTimestamps = blinkTimestamps.filter(t => now - t < 60000);
    } else {
        state = StudyState.ABSENT; score = 10; expr = "无人"; isFocused = false;
    }

    smoothFocusScore = smoothFocusScore * 0.8 + score * 0.2;
    
    let advice = null;
    if (state === StudyState.DISTRACTED) advice = `请注意专注，${reason}可能会影响效率。`;
    else if (state === StudyState.FATIGUED) advice = "检测到您已疲劳，建议起身休息 5 分钟。";

    return {
        timestamp: Date.now(), 
        isFocused, 
        isFatigued, 
        focusScore: Math.round(smoothFocusScore),
        posture, 
        expression: expr, 
        distractionReason: reason, 
        advice, 
        state, 
        blinkRate: blinkTimestamps.length
    };
}
