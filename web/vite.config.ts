/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Commit desplegado, visible en el pie de la aplicación (verificación posterior del despliegue)
    __GIT_COMMIT__: JSON.stringify(
      process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT ?? 'local',
    ),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    reporters: ['default', 'junit'],
    outputFile: { junit: './reports/junit-web.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});
