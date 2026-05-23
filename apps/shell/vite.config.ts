import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

const WIDGET_PORTS: Record<string, number> = {
  'plex-widget':       3001,
  'lazuros-widget':    3002,
  'beigeboard-widget': 3003,
  'recipe-widget':     3004,
};

function remoteEntry(port: number) {
  return `http://localhost:${port}/assets/remoteEntry.js`;
}

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: Object.fromEntries(
        Object.entries(WIDGET_PORTS).map(([name, port]) => [name, remoteEntry(port)])
      ),
      shared: {
        react: { singleton: true, requiredVersion: '^18' },
        'react-dom': { singleton: true, requiredVersion: '^18' },
      },
    }),
  ],
  resolve: {
    alias: {
      '@hub/ui': '../../packages/ui/src',
      '@hub/types': '../../packages/types/src/index.ts',
    },
  },
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});
