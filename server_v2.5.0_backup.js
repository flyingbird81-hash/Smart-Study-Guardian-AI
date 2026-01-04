
/*
 * 🟢 STUDY GUARDIAN AI - SERVER (AUTO-KILL PORT & RETRY)
 * 🔒 BACKUP FILE - V2.5.0
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Bonjour } from 'bonjour-service';
import { exec, spawn, execSync } from 'child_process';

// --- Utils for Logging ---
const log = (tag, message, error = null) => {
    const time = new Date().toLocaleTimeString();
    if (error) {
        const errMsg = error.message || error.toString();
        console.error(`[${time}] [${tag}] 🔴 ERROR: ${message} -> ${errMsg}`);
    } else {
        console.log(`[${time}] [${tag}] 🟢 ${message}`);
    }
};

// --- Configuration ---
const PORT = 3000;
const DB_PATH = path.resolve('./benben.db'); 
// 🔴 GPIO 26 (与 hardware_check.js 一致)
const LAMP_GPIO_PIN = 26; 
const PINCTRL_CMD = fs.existsSync('/usr/bin/pinctrl') ? '/usr/bin/pinctrl' : 'pinctrl';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- mDNS Setup ---
const bonjourInstance = new Bonjour();

// --- Database Setup ---
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) log('DB', 'Failed to connect to SQLite', err);
    else log('DB', `Connected to SQLite database at ${DB_PATH}`);
});

db.serialize(() => {
    try {
        db.run(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, role TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS study_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER, focus_score INTEGER, is_focused BOOLEAN, is_fatigued BOOLEAN, blink_rate INTEGER, state TEXT, posture TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS question_bank (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER, subject TEXT, question_text TEXT, standard_answer TEXT, image_data TEXT)`);
        db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('root', 'benben123456', 'admin')`);
        db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('user', '123456', 'user')`);
        log('DB', 'Tables initialized successfully');
    } catch (e) {
        log('DB', 'Error during table initialization', e);
    }
});

// --- Hardware Diagnostics ---
let isHardwareAvailable = false;

const runCommand = (cmd) => {
    return new Promise((resolve) => {
        exec(cmd, (error, stdout) => {
            if (error && !stdout) resolve('');
            else resolve(stdout ? stdout.trim() : '');
        });
    });
};

const initHardware = async () => {
    log('SYSTEM', '--- Starting Hardware Diagnostics ---');
    if (fs.existsSync('/dev/video0')) log('HARDWARE', `✅ Camera device found at /dev/video0.`);
    else log('HARDWARE', `⚠️ No camera found at /dev/video0.`);

    try {
        const gpioCheck = await runCommand(`${PINCTRL_CMD} get ${LAMP_GPIO_PIN}`);
        if (gpioCheck) {
            isHardwareAvailable = true;
            log('HARDWARE', `✅ GPIO Control: '${PINCTRL_CMD}' available on PIN ${LAMP_GPIO_PIN}.`);
            // Init GPIO
            await runCommand(`${PINCTRL_CMD} set ${LAMP_GPIO_PIN} op`);
            await runCommand(`${PINCTRL_CMD} set ${LAMP_GPIO_PIN} dl`);
        } else {
            log('HARDWARE', `⚠️ GPIO Control Check Failed. Simulation Mode.`);
        }
    } catch (e) {
        log('HARDWARE', `⚠️ GPIO Error. Simulation Mode.`);
    }

    exec('which espeak', (err) => {
        if (!err) log('HARDWARE', '✅ TTS Engine (espeak) is available.');
        else log('HARDWARE', '⚠️ TTS Engine (espeak) NOT found.');
    });

    log('SYSTEM', '--- End Diagnostics ---');
};

initHardware();

// --- Lamp Control ---
let blinkInterval = null;

const setLampHardware = async (mode, options = {}) => {
    if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
    }

    if (!isHardwareAvailable) {
        if (mode === 'FLASH') log('GPIO', `[SIMULATION] FLASH mode`);
        else log('GPIO', `[SIMULATION] Set to ${mode}`);
        return;
    }

    try {
        if (mode === 'FLASH') {
            const interval = options.interval || 500;
            let state = 'dl'; 
            exec(`${PINCTRL_CMD} set ${LAMP_GPIO_PIN} dl`);
            blinkInterval = setInterval(() => {
                state = (state === 'dl') ? 'dh' : 'dl';
                exec(`${PINCTRL_CMD} set ${LAMP_GPIO_PIN} ${state}`);
            }, interval);
        } else if (mode === 'ON' || mode === 'PWM') {
            await runCommand(`${PINCTRL_CMD} set ${LAMP_GPIO_PIN} dh`);
        } else if (mode === 'OFF') {
            await runCommand(`${PINCTRL_CMD} set ${LAMP_GPIO_PIN} dl`);
        } else if (mode === 'BREATHE') {
             const interval = options.interval || 1000;
             let state = 'dl';
             exec(`${PINCTRL_CMD} set ${LAMP_GPIO_PIN} dl`);
             blinkInterval = setInterval(() => {
                state = (state === 'dl') ? 'dh' : 'dl';
                exec(`${PINCTRL_CMD} set ${LAMP_GPIO_PIN} ${state}`);
            }, interval);
        }
    } catch (e) {
        log('GPIO', "Control Error", e);
    }
};

// --- API Routes ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT role FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) res.json({ success: true, role: row.role });
        else res.json({ success: false, msg: "Invalid credentials" });
    });
});

app.post('/api/logs', (req, res) => {
    const d = req.body;
    const stmt = db.prepare("INSERT INTO study_logs (timestamp, focus_score, is_focused, is_fatigued, blink_rate, state, posture) VALUES (?,?,?,?,?,?,?)");
    stmt.run([d.timestamp, d.focusScore, d.isFocused, d.isFatigued, d.blinkRate, d.state, d.posture], (err) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ success: true });
    });
    stmt.finalize();
});

app.get('/api/stats', (req, res) => {
    db.all("SELECT * FROM study_logs ORDER BY timestamp ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/lamp', (req, res) => {
    const { mode, interval, speed } = req.body; 
    const actualInterval = interval || speed || 1000;
    log('API', `Lamp control: ${mode} (Pin ${LAMP_GPIO_PIN})`);
    setLampHardware(mode, { interval: actualInterval });
    res.json({ success: true });
});

// 🔴 修复：音频播放 (简化指令，移除管道以提高稳定性)
app.post('/api/speak', (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({error: 'No text provided'});
    
    log('TTS', `Server Voice Requested: "${text}"`);
    // 直接调用 espeak，不使用管道 pipe 到 aplay，这样通常在树莓派默认配置下更稳定
    const cmd = `espeak -v zh "${text}" 2>/dev/null`;
    exec(cmd, (error) => {
        if (error) log('TTS', 'Espeak Error', error);
    });
    res.json({ success: true });
});

// Question Bank Endpoints
app.get('/api/questions', (req, res) => {
    db.all("SELECT * FROM question_bank ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/questions', (req, res) => {
    const { timestamp, subject, questionText, standardAnswer, imageData } = req.body;
    const stmt = db.prepare("INSERT INTO question_bank (timestamp, subject, question_text, standard_answer, image_data) VALUES (?,?,?,?,?)");
    stmt.run([timestamp, subject, questionText, standardAnswer, imageData], function(err) {
        if (err) res.status(500).json({ success: false, error: err.message });
        else res.json({ success: true, id: this.lastID });
    });
    stmt.finalize();
});

app.put('/api/questions/:id', (req, res) => {
    const { questionText, standardAnswer } = req.body;
    db.run("UPDATE question_bank SET question_text = ?, standard_answer = ? WHERE id = ?", [questionText, standardAnswer, req.params.id], (err) => {
        if (err) res.status(500).json({ success: false, error: err.message });
        else res.json({ success: true });
    });
});

app.delete('/api/questions/:id', (req, res) => {
    db.run("DELETE FROM question_bank WHERE id = ?", [req.params.id], (err) => {
        if (err) res.status(500).json({ success: false, error: err.message });
        else res.json({ success: true });
    });
});

// --- Video Streaming ---
let activeCameraProcess = null;
let connectedClients = []; 
const BOUNDARY = 'study-guardian-boundary';

const broadcastFrame = (frameData) => {
    const header = `--${BOUNDARY}\r\n` +
                   `Content-Type: image/jpeg\r\n` +
                   `Content-Length: ${frameData.length}\r\n` +
                   `\r\n`;
    const bufferToSend = Buffer.concat([Buffer.from(header), frameData, Buffer.from('\r\n')]);
    connectedClients.forEach(client => {
        try { client.write(bufferToSend); } catch (e) {}
    });
};

const startCameraDaemon = async () => {
    if (activeCameraProcess) return;

    let useRpiCam = false;
    try {
        await runCommand('which rpicam-vid');
        useRpiCam = true;
    } catch(e) {}

    if (useRpiCam) {
        log('STREAM', 'Starting Shared RPi Camera Process...');
        const rpiArgs = [
            '-t', '0', 
            '--codec', 'mjpeg', 
            '--width', '640', 
            '--height', '480', 
            '--framerate', '30',
            '--quality', '80', 
            '--nopreview', 
            '--inline', 
            '-o', '-'
        ];
        activeCameraProcess = spawn('rpicam-vid', rpiArgs);
        let buffer = Buffer.alloc(0);
        const SOI = Buffer.from([0xff, 0xd8]);
        const EOI = Buffer.from([0xff, 0xd9]);

        activeCameraProcess.stdout.on('data', (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            if (buffer.length > 200000) { 
                 const lastSOI = buffer.lastIndexOf(SOI);
                 if (lastSOI > 0) buffer = buffer.subarray(lastSOI); 
                 else buffer = Buffer.alloc(0);
            }
            let offset = 0;
            while (true) {
                const soi = buffer.indexOf(SOI, offset);
                if (soi === -1) break;
                const eoi = buffer.indexOf(EOI, soi);
                if (eoi === -1) { 
                    if (soi > 0) buffer = buffer.slice(soi); 
                    break; 
                }
                const frameEnd = eoi + 2;
                broadcastFrame(buffer.slice(soi, frameEnd));
                offset = frameEnd;
            }
            if (offset > 0) buffer = buffer.slice(offset);
        });
        activeCameraProcess.on('exit', () => activeCameraProcess = null);
    } else {
        log('STREAM', 'Starting FFmpeg Fallback...');
        activeCameraProcess = ffmpeg('testsrc=size=640x480:rate=20')
            .inputFormat('lavfi')
            .outputOptions(['-f', 'image2pipe', '-vcodec', 'mjpeg', '-q:v', '2'])
            .pipe();
        activeCameraProcess.on('data', (chunk) => connectedClients.forEach(c => c.write(chunk)));
    }
};

const stopCameraDaemon = () => {
    if (activeCameraProcess) {
        try { if (activeCameraProcess.kill) activeCameraProcess.kill('SIGKILL'); else activeCameraProcess.destroy(); } catch(e) {}
        activeCameraProcess = null;
    }
};

app.get('/video_feed', async (req, res) => {
    res.writeHead(200, {
        'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
        'Connection': 'keep-alive'
    });
    connectedClients.push(res);
    if (!activeCameraProcess) startCameraDaemon();
    req.on('close', () => {
        connectedClients = connectedClients.filter(client => client !== res);
        if (connectedClients.length === 0) stopCameraDaemon();
    });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/video_feed')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else res.status(404).end();
});

// --- 🔴 Robust Server Startup Logic ---

const killPortProcess = (port) => {
    try {
        log('SYSTEM', `Attempting to force kill processes on port ${port}...`);
        // fuser -k 3000/tcp 是标准的 Linux 命令，用于杀掉指定端口的进程
        execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
        return true;
    } catch (e) {
        // 如果返回非0，说明可能没有进程在用，或者没权限
        return false;
    }
};

const startServer = (retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    // 启动前先尝试清理
    killPortProcess(PORT);

    // 稍微等待操作系统释放端口
    setTimeout(() => {
        const server = app.listen(PORT, '0.0.0.0', () => {
            log('SYSTEM', `Server running successfully on http://0.0.0.0:${PORT}`);
            try {
                bonjourInstance.publish({ name: 'study-guardian', type: 'http', port: PORT });
                log('SYSTEM', `mDNS Service published.`);
            } catch(e) {}
        });

        server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                log('SYSTEM', `❌ Port ${PORT} is still busy.`);
                if (retryCount < MAX_RETRIES) {
                    log('SYSTEM', `🔄 Retrying in 1 second... (${retryCount + 1}/${MAX_RETRIES})`);
                    setTimeout(() => startServer(retryCount + 1), 1000);
                } else {
                    console.error('\n🔴 严重错误：端口 3000 无法释放。');
                    console.error('👉 可能有一个 Root 权限的进程占用了端口。');
                    console.error('👉 请尝试手动运行: sudo fuser -k 3000/tcp');
                    console.error('   然后再次运行: npm run server\n');
                    process.exit(1);
                }
            } else {
                console.error(e);
            }
        });
    }, 500); // Wait 500ms after kill
};

// Start the sequence
startServer();

process.on('SIGINT', () => {
    stopCameraDaemon();
    bonjourInstance.unpublishAll(() => process.exit());
});
