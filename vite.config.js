import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 빌드 시점 타임스탬프를 캐시 버스팅 키로 주입 (App.jsx에서 import.meta.env.VITE_CACHE_BUST 로 참조)
const buildStamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_CACHE_BUST': JSON.stringify(buildStamp),
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
