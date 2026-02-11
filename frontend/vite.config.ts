// https://vitejs.dev/config/
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function pathResolve(dir: string) {
  return resolve(__dirname, '.', dir)
}

export default defineConfig({
  plugins: [react()],
  envDir: './src/config',
  cacheDir: '.vite',
  build: {
    outDir: '../../dist/packages/frontend',
  },
  resolve: {
    alias: {
      '@': pathResolve('src'),
      '@frontend': pathResolve('src'),
      '@shared': pathResolve('../shared/src'),
    },
  },
})
