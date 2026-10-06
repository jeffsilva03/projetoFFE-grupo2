import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  define: mode === 'integracao' ? { 'process.env.NODE_ENV': JSON.stringify('production') } : {},
  server: { host: '0.0.0.0', port: 8081, strictPort: true, cors: true },
  build: mode === 'integracao' ? {
    outDir: 'dist-integracao',
    lib: { entry: 'src/microfrontend.tsx', formats: ['es'], fileName: () => 'painel-ihm.js', cssFileName: 'painel-ihm' },
    sourcemap: true,
  } : { outDir: 'dist' },
}));
