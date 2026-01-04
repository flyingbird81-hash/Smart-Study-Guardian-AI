
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { AnalysisResult } from '../types';
import { initializeVisionModel, analyzeVideoFrame } from '../services/visionService';
import { StopCircle, Video, AlertTriangle, TrendingDown, Lock, Server, RefreshCw } from 'lucide-react';

interface WebcamMonitorProps {
    isActive: boolean;
    onResult: (result: AnalysisResult) => void;
    onToggle: () => void;
    userRole?: string;
}

export interface WebcamRef {
    captureSnapshot: () => string | null;
}

const WebcamMonitor = forwardRef<WebcamRef, WebcamMonitorProps>(({ isActive, onResult, onToggle, userRole }, ref) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const onResultRef = useRef(onResult);
    
    const [error, setError] = useState<string | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [showLowFocusAlert, setShowLowFocusAlert] = useState(false);
    const [imgLoadError, setImgLoadError] = useState(false);
    const [streamKey, setStreamKey] = useState(Date.now()); // For Cache Busting
    const lastAlertTimeRef = useRef(0);

    const hasPermission = userRole === 'admin';
    const VIDEO_FEED_URL = `/video_feed?t=${streamKey}`; 

    useImperativeHandle(ref, () => ({
        captureSnapshot: () => {
            const img = imgRef.current;
            if (!img || !img.complete) {
                console.warn("[Snapshot] Image not ready or not loaded.");
                return null;
            }
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                return tempCanvas.toDataURL('image/jpeg', 0.8);
            }
            return null;
        }
    }));

    useEffect(() => {
        onResultRef.current = onResult;
    }, [onResult]);

    // Load Model
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            console.log("[Vision] Loading MediaPipe model...");
            const t0 = performance.now();
            try {
                await initializeVisionModel();
                const t1 = performance.now();
                console.log(`[Vision] Model loaded in ${(t1 - t0).toFixed(0)}ms`);
                if (mounted) setModelLoaded(true);
            } catch (e: any) {
                console.error("[Vision] Model Load Failed:", e);
                if (mounted) setError("AI模型加载失败: " + e.message);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    // Handle Image Stream Errors
    const handleImgError = (e: any) => {
        // Prevent spamming logs if we already know it's errored
        if (!imgLoadError) {
            console.error("[Video Stream] Failed to load MJPEG stream.", e);
            console.log("提示: 请检查摄像头是否已正确连接，且浏览器/系统已授权访问权限。");
            setImgLoadError(true);
            setError("无法连接摄像头流 - 请检查后端服务");
        }
    };

    const handleImgLoad = () => {
        if (imgLoadError) {
            console.log("[Video Stream] Connection recovered.");
            setImgLoadError(false);
            setError(null);
        }
    };

    const retryConnection = () => {
        setImgLoadError(false); 
        setStreamKey(Date.now()); // Update key to force reload
    };

    // Analysis Loop
    useEffect(() => {
        if (!isActive || !modelLoaded || !hasPermission) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        const loop = () => {
            try {
                const img = imgRef.current;
                const canvas = canvasRef.current;

                if (img && canvas && img.complete && img.naturalWidth > 0 && !imgLoadError) {
                    if (canvas.width !== img.naturalWidth) {
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                    }

                    const result = analyzeVideoFrame(img, canvas);
                    if (result) {
                        onResultRef.current(result);
                            if (result.focusScore < 70) {
                            const now = Date.now();
                            if (now - lastAlertTimeRef.current > 3000) {
                                setShowLowFocusAlert(true);
                                lastAlertTimeRef.current = now;
                                setTimeout(() => setShowLowFocusAlert(false), 1500);
                            }
                        }
                    }
                }
            } catch (e) {
                // Swallow frame analysis errors to prevent loop crash, but log occasionally
                if (Math.random() < 0.01) console.warn("[Vision] Frame analysis skip:", e);
            }
            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [isActive, modelLoaded, hasPermission, imgLoadError]);

    if (!hasPermission) {
        return (
            <div className="bg-gray-900 rounded-2xl flex items-center justify-center p-8 text-center border border-gray-800 h-full">
                <div><Lock className="mx-auto mb-4 text-gray-500"/><h3>无权访问</h3></div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-800 group">
            {/* MJPEG Stream Image */}
            {isActive ? (
                <img 
                    ref={imgRef}
                    src={VIDEO_FEED_URL}
                    className="w-full h-full object-cover"
                    alt="Server Stream"
                    onError={handleImgError}
                    onLoad={handleImgLoad}
                    crossOrigin="anonymous" 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <Server className="text-gray-600 w-16 h-16" />
                </div>
            )}
            
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {showLowFocusAlert && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="bg-red-500/90 text-white px-6 py-3 rounded-2xl animate-pulse flex items-center">
                        <TrendingDown className="mr-2"/> 专注度下降
                    </div>
                </div>
            )}

            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
                <button
                    onClick={onToggle}
                    disabled={!modelLoaded && !error && !imgLoadError}
                    className={`flex items-center space-x-2 px-8 py-4 rounded-full font-bold text-white shadow-lg transition-all ${isActive ? 'bg-red-500' : 'bg-indigo-600'} disabled:opacity-50`}
                >
                    {isActive ? <><StopCircle/><span>停止监测</span></> : <><Video/><span>{modelLoaded ? '连接服务器摄像头' : 'AI模型加载中...'}</span></>}
                </button>
            </div>

            {(error || imgLoadError) && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 p-4">
                   <div className="text-center text-red-400 mb-4"><AlertTriangle className="mx-auto mb-2 w-10 h-10"/>
                     <p className="font-bold text-lg">{error || "连接错误"}</p>
                   </div>
                   {imgLoadError && isActive && (
                       <button onClick={retryConnection} className="flex items-center px-4 py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700">
                           <RefreshCw className="mr-2" size={16}/> 重试连接
                       </button>
                   )}
                </div>
            )}
        </div>
    );
});

export default WebcamMonitor;
