import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    globals: false,
    include: ['src/**/*.test.ts'],
  },
})
