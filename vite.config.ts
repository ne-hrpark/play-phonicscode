import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 개발 환경에서는 base를 제거하거나 '/'로 설정
  // 프로덕션 배포 시에만 특정 base path가 필요하면 주석 해제
  //base: '/play-phonicscode/',
  base: '/',
})
