import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/ is one level deep, so root is ..
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const files = [
    {
        urls: [
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', // Official
            'https://cdn.jsdelivr.net/gh/google-ai-edge/mediapipe-samples@main/examples/face_landmarker/web/models/face_landmarker.task' // Mirror
        ],
        dir: 'models',
        file: 'face_landmarker.task'
    },
    {
        urls: [
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.js'
        ],
        dir: 'wasm',
        file: 'vision_wasm_internal.js'
    },
    {
        urls: [
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.wasm'
        ],
        dir: 'wasm',
        file: 'vision_wasm_internal.wasm'
    }
];

async function downloadFile(urls, targetPath) {
    for (const url of urls) {
        try {
            console.log(`⬇️  Attempting download from: ${url}`);
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                timeout: 15000 // 15s timeout
            });

            const writer = fs.createWriteStream(targetPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            console.log(`✅ Successfully saved to ${targetPath}`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Failed to download from source: ${error.message}. Trying next source...`);
            // Clean up partial file
            if (fs.existsSync(targetPath)) {
                try { fs.unlinkSync(targetPath); } catch(e) {}
            }
        }
    }
    return false;
}

async function download() {
    console.log('📦 Starting offline assets download...');
    
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

    for (const item of files) {
        const targetDir = path.join(publicDir, item.dir);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        
        const targetPath = path.join(targetDir, item.file);
        
        const success = await downloadFile(item.urls, targetPath);
        if (!success) {
            console.error(`❌ Critical Error: Could not download ${item.file} from any available source.`);
            process.exit(1);
        }
    }
    console.log('🎉 Download complete! You can now run offline.');
}

download();