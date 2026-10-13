/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/vetnova-demo/',
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/setupTests.ts'] },
});
