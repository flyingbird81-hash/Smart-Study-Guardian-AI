# 🎓 智能学习动态效率分析与个性化建议系统
# Smart Study Guardian AI

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933.svg)
![MediaPipe](https://img.shields.io/badge/AI-MediaPipe_Vision-FFA500.svg)
![Gemini](https://img.shields.io/badge/LLM-Google_Gemini_2.0-8E75B2.svg)

> **基于端-边-云协同架构的下一代 AI 伴学解决方案**

## 📖 项目简介 (Introduction)

本项目是一个软硬件结合的智能学习辅助系统，旨在解决学生独自学习时缺乏监管、容易分心以及遇到难题无法解决的痛点。

系统采用 **端-边-云 (End-Edge-Cloud)** 架构：
1.  **端侧 (Browser)**：利用 MediaPipe 实现无隐私风险的本地视觉分析（眨眼、坐姿、专注度）。
2.  **边侧 (Raspberry Pi)**：运行 Node.js 服务，控制智能台灯呼吸/闪烁，进行物理干预。
3.  **云端 (Google Cloud)**：接入 Gemini 2.0 模型，实现作业 OCR 批改和实时语音导师功能。

## ✨ 核心功能 (Key Features)

*   **👁️ 实时视觉监测**:
    *   基于 MediaPipe Face Mesh (468点) 的高精度面部捕捉。
    *   实时计算专注度评分 (0-100)、眨眼频率 (EAR 算法) 及头部姿态 (Euler Angles)。
    *   **隐私保护**: 所有视觉推理在本地浏览器完成，不上传视频流。

*   **💡 智能硬件闭环**:
    *   **疲劳提醒**: 检测到闭眼 > 8秒，台灯自动进入“呼吸模式”并播放语音提醒。
    *   **分心警示**: 检测到长时间低头或侧头，台灯快速闪烁。
    *   **状态常亮**: 专注状态下台灯保持恒定舒适亮度。

*   **🤖 Gemini AI 赋能**:
    *   **AI 语音导师**: 基于 Gemini Live API，提供毫秒级延迟的全双工语音对话，练习口语或询问概念。
    *   **作业拍照批改**: 上传作业图片，Gemini 2.0 进行 OCR 识别、判题并生成详细解题步骤（支持导出 Word）。
    *   **个性化报告**: 根据历史数据生成带有情感色彩的学习建议周报。

*   **📊 数据可视化大屏**:
    *   实时显示专注度波动曲线。
    *   本地 SQLite 数据库存储历史学习日志。
    *   支持导出完整数据集用于科研分析。

## 🛠️ 技术栈 (Tech Stack)

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端 (Client)** | React 18, Vite, Tailwind CSS | UI 界面与状态逻辑 |
| **视觉算法** | MediaPipe Tasks Vision (WASM) | 浏览器端 GPU 加速推理 |
| **后端 (Edge)** | Node.js, Express, SQLite3 | API 服务与数据持久化 |
| **AI 模型** | Google Gemini 2.0 Flash / Live | 多模态推理与语音交互 |
| **硬件控制** | Raspberry Pi GPIO (`pinctrl`) | 台灯 PWM/开关控制 |
| **流媒体** | MJPEG (fluent-ffmpeg / rpicam-vid) | 局域网低延迟视频推流 |

## 🚀 快速开始 (Quick Start)

### 硬件要求
*   Raspberry Pi 4B 或更高版本
*   USB 摄像头 或 CSI 摄像头
*   LED 台灯 (连接至 GPIO 26)
*   扬声器与麦克风

### 1. 克隆仓库
```bash
git clone https://github.com/your-username/Smart-Study-Guardian-AI.git
cd Smart-Study-Guardian-AI