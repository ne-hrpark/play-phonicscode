import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// mode(dev/build)에 따라 base를 자동으로 설정
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/play-phonicscode/' : '/',
}));
