
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Check all possible key names from the user's .env file
  const apiKey = env.API_KEY || env.GEMINI_API_KEY || env.VITE_GOOGLE_API_KEY || env["Google Gemini API Key"] || "";

  return {
    plugins: [
      react(),
      basicSsl()
    ],
    define: {
      // Inject the found key into process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    server: {
      host: true,
      port: 5173,
      https: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        },
        '/video_feed': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
