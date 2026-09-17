import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'runtime-dist',
    emptyOutDir: true,
    copyPublicDir: false,
    sourcemap: false,
    license: { fileName: 'THIRD-PARTY-LICENSES.txt' },
    lib: { entry: 'src/apartment-runtime.tsx', formats: ['es'], fileName: 'apartment-runtime', cssFileName: 'apartment-runtime' },
  },
})
