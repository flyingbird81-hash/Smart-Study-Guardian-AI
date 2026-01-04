
import { AnalysisResult, StudyState } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";

// Helper to check if we are effectively offline
const isOffline = () => {
    const apiKey = process.env.API_KEY;
    return !apiKey || apiKey.trim() === "" || apiKey === "undefined";
};

// Helper to initialize AI
const getAiClient = () => {
    if (isOffline()) {
        throw new Error("OFFLINE_MODE");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const checkHomework = async (base64Image: string): Promise<string> => {
    if (isOffline()) {
        return `【离线模式】
        
目前系统未连接互联网或未配置 API Key。

在离线模式下，无法使用 Gemini 大模型进行图像识别和作业批改。

如果您的树莓派已联网，请在 .env 文件中配置有效的 API_KEY。`;
    }

    try {
        const ai = getAiClient();
        const cleanBase64 = base64Image.split(',')[1] || base64Image;

        const response = await ai.models.generateContent({
            // 使用 Gemini 2.0 Flash Exp 以获得最佳的多模态性能
            model: 'gemini-2.0-flash-exp',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: "请帮我检查这张图片里的作业。1. 识别这是什么科目的作业。 2. 检查是否有明显的错误。 3. 给出简短的评价和辅导建议。请用温柔、鼓励的老师口吻回答，格式要清晰。" },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: cleanBase64
                            }
                        }
                    ]
                }
            ]
        });

        return response.text || "未能识别作业内容，请调整角度重试。";
    } catch (error: any) {
        console.error("Homework check failed:", error);
        return "网络请求失败，请检查网络连接。";
    }
};

export const generateSessionReport = async (history: AnalysisResult[]): Promise<string> => {
    const totalDurationSec = Math.round(history.length * 0.2); 
    const avgFocus = history.length > 0 ? Math.round(history.reduce((acc, cur) => acc + cur.focusScore, 0) / history.length) : 0;
    const fatigueCount = history.filter(h => h.state === StudyState.FATIGUED).length;
    const distractedCount = history.filter(h => h.state === StudyState.DISTRACTED).length;
    const avgBlinkRate = history.length > 0 ? Math.round(history.reduce((acc, cur) => acc + cur.blinkRate, 0) / history.length) : 0;

    if (isOffline()) {
        let evaluation = "一般";
        if (avgFocus > 85) evaluation = "非常高效";
        else if (avgFocus > 60) evaluation = "尚可";
        else evaluation = "需待提高";

        return `### 📊 离线学习报告
        
**由于未连接云端 AI，以下基于本地规则生成：**

- **状态评价**: ${evaluation}
- **时长**: ${totalDurationSec} 秒
- **平均专注度**: ${avgFocus}/100
- **疲劳次数**: ${fatigueCount} 次
- **分心次数**: ${distractedCount} 次
- **平均眨眼**: ${avgBlinkRate} 次/分

**建议**:
${fatigueCount > 2 ? "- 检测到多次疲劳，建议休息5分钟。\n" : ""}${distractedCount > 5 ? "- 分心较多，请移除桌面无关物品。\n" : ""}${avgFocus > 80 ? "- 保持得很好，继续加油！" : "- 尝试用番茄工作法来提高专注度。"}`;
    }

    try {
        const ai = getAiClient();
        const step = Math.max(1, Math.floor(history.length / 20));
        const trendSample = history.filter((_, i) => i % step === 0).map(h => h.focusScore).join(', ');

        const prompt = `
        你是一位专业的学习效率分析师。请根据以下采集到的学生学习数据，生成一份简短但深刻的个性化学习建议报告。
        
        【数据概览】
        - 学习时长：约 ${totalDurationSec} 秒
        - 平均专注度：${avgFocus}/100
        - 疲劳检测次数：${fatigueCount} 次
        - 分心次数：${distractedCount} 次
        - 平均眨眼频率：${avgBlinkRate} 次/分 (正常约为15-20次，过低可能导致干眼，过高可能疲劳)
        - 专注度变化趋势(采样): [${trendSample}]

        【任务】
        请生成一段Markdown格式的报告，包含以下部分：
        1. **状态总结**：用一句话评价刚才的学习状态。
        2. **效率分析**：指出专注度波动的原因或规律。
        3. **个性化建议**：针对眨眼频率、疲劳和分心情况给出具体建议。
        
        语气要专业、亲切。`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp', // Text generation
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return response.text || "无法生成报告。";

    } catch (error: any) {
        console.error("Report generation failed:", error);
        return "生成报告时发生网络错误，请查看本地数据统计。";
    }
};

/**
 * Analyzes an image of a question to extract text and provide a standard answer.
 * Returns a JSON object with subject, question, and answer.
 */
export const analyzeQuestion = async (base64Image: string): Promise<{subject: string, question: string, answer: string}> => {
    if (isOffline()) {
        throw new Error("OFFLINE_MODE");
    }

    try {
        const ai = getAiClient();
        const cleanBase64 = base64Image.split(',')[1] || base64Image;

        const prompt = `
        我将上传一张题目的图片。请你完成以下任务：
        1. 识别图片中的题目内容（如果是手写体，请准确转录）。
        2. 判断这是什么学科（如数学、物理、语文等）。
        3. 提供一个详细的、分步骤的标准解答和最终答案。

        请严格按照 JSON 格式返回，不要包含 Markdown 格式标记（如 \`\`\`json）：
        {
            "subject": "学科名称",
            "question": "识别出的题目文字",
            "answer": "标准解答步骤和答案"
        }
        `;

        const response = await ai.models.generateContent({
            // 修复：使用有效的视觉模型 'gemini-2.0-flash-exp'
            model: 'gemini-2.0-flash-exp',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: cleanBase64
                            }
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        // Clean up markdown code blocks just in case
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);

    } catch (error: any) {
        console.error("Question analysis failed:", error);
        throw error;
    }
};
