import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Component QA without RELAY's backend plugins or API routes. Open the interaction-motion fixture.
export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [react(), tailwind()],
  server: { host: '127.0.0.1', port: 5187, strictPort: true },
});
