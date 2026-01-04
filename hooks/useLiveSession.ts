
import { useState, useRef, useCallback } from 'react';
import { LIVE_MODEL } from '../constants';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';
import { GoogleGenAI, Modality } from "@google/genai";

interface UseLiveSessionReturn {
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    volumeLevel: number; 
}

export const useLiveSession = (): UseLiveSessionReturn => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [volumeLevel, setVolumeLevel] = useState(0);

    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const activeSessionPromiseRef = useRef<Promise<any> | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const cleanup = useCallback(() => {
        console.log("[Audio] Cleaning up session resources...");
        sourcesRef.current.forEach(source => {
            try { source.stop(); } catch (e) { /* ignore */ }
        });
        sourcesRef.current.clear();

        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log(`[Audio] Track stopped: ${track.label}`);
            });
            mediaStreamRef.current = null;
        }

        activeSessionPromiseRef.current = null;
        setIsConnected(false);
        setIsConnecting(false);
        setVolumeLevel(0);
    }, []);

    const connect = useCallback(async () => {
        if (isConnecting || isConnected) return;

        const apiKey = process.env.API_KEY;
        if (!apiKey || apiKey.trim() === "" || apiKey === "undefined") {
            console.error("[Audio] No API Key provided.");
            setError("离线模式：无法使用语音导师 (需配置 API Key 并连接互联网)");
            return;
        }

        try {
            console.log("[Audio] Starting connection sequence...");
            setIsConnecting(true);
            setError(null);

            // 1. Initialize Audio Contexts
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                
                // Input context (Microphone)
                inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
                
                // Output context (Speaker) - Critical: Handle Autoplay Policy
                outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
                if (outputAudioContextRef.current.state === 'suspended') {
                    console.log("[Audio] Resuming output audio context...");
                    await outputAudioContextRef.current.resume();
                }

                console.log("[Audio] AudioContexts initialized");
            } catch (e: any) {
                throw new Error(`AudioContext creation failed: ${e.message}`);
            }
            
            // 2. Request Mic Permission
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStreamRef.current = stream;
                console.log(`[Audio] Microphone acquired: ${stream.getAudioTracks()[0].label}`);
            } catch (e: any) {
                console.error("[Audio] getUserMedia failed", e);
                if (e.name === 'NotAllowedError') throw new Error("麦克风权限被拒绝，请在浏览器设置中允许。");
                if (e.name === 'NotFoundError') throw new Error("未检测到麦克风设备。");
                throw new Error(`无法访问麦克风: ${e.message}`);
            }

            // 3. Connect to Gemini Live
            const ai = new GoogleGenAI({ apiKey });
            console.log(`[Audio] Connecting to Gemini model: ${LIVE_MODEL}`);
            
            const sessionPromise = ai.live.connect({
                model: LIVE_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                    systemInstruction: "你是一个乐于助人的AI学习导师。请用简短、鼓励性的中文与学生对话。",
                },
                callbacks: {
                    onopen: () => {
                        console.log("✅ [Gemini] WebSocket Session Opened");
                        setIsConnected(true);
                        setIsConnecting(false);
                        
                        if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
                        
                        // Setup Processing Pipeline
                        try {
                            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                            
                            scriptProcessor.onaudioprocess = (e) => {
                                const inputData = e.inputBuffer.getChannelData(0);
                                
                                // Calculate Volume
                                let sum = 0;
                                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                                const rms = Math.sqrt(sum / inputData.length);
                                setVolumeLevel(Math.min(100, rms * 1000));

                                const pcmBlob = createPcmBlob(inputData);
                                sessionPromise.then((session: any) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };

                            source.connect(scriptProcessor);
                            scriptProcessor.connect(inputAudioContextRef.current.destination);
                            console.log("[Audio] Audio processing pipeline established");
                        } catch (pipelineError: any) {
                            console.error("[Audio] Pipeline setup error:", pipelineError);
                            setError("音频处理初始化失败");
                        }
                    },
                    onmessage: async (message: any) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        
                        if (base64Audio && outputAudioContextRef.current) {
                            try {
                                const ctx = outputAudioContextRef.current;
                                // Double check resume if needed
                                if (ctx.state === 'suspended') await ctx.resume();

                                const uint8Array = base64ToUint8Array(base64Audio);
                                const audioBuffer = await decodeAudioData(uint8Array, ctx, 24000, 1);
                                
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                                
                                const source = ctx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(ctx.destination);
                                
                                source.onended = () => {
                                    sourcesRef.current.delete(source);
                                };
                                
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                sourcesRef.current.add(source);
                            } catch (decodeError) {
                                console.error("[Audio] Decoding error:", decodeError);
                            }
                        }
                        
                        if (message.serverContent?.interrupted) {
                            console.log("[Gemini] Output interrupted");
                            sourcesRef.current.forEach(src => src.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onclose: (e: any) => {
                        console.log(`[Gemini] Session Closed: Code ${e.code}, Reason: ${e.reason}`);
                        cleanup();
                    },
                    onerror: (e: any) => {
                        console.error("[Gemini] Session Error Event:", e);
                        setError("连接中断，服务器错误");
                        cleanup();
                    }
                }
            });
            
            activeSessionPromiseRef.current = sessionPromise;

        } catch (err: any) {
            console.error("[Audio] Connection Routine Failed:", err);
            setError(`无法启动: ${err.message}`);
            cleanup();
        }
    }, [isConnecting, isConnected, cleanup]);

    const disconnect = useCallback(() => {
        console.log("[Audio] User requested disconnect");
        cleanup();
    }, [cleanup]);

    return {
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
        volumeLevel
    };
};
