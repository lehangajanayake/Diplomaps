import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { apiPlugin } from './server/vitePlugin';

// One command for everything: `npm run dev` serves the game and the /api handlers together.
export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 900 },
});
