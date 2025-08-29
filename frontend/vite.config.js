import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],  // enables JSX + React Fast Refresh
  server: { port: 5173 } // dev server port
});
