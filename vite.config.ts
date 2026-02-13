
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || '')
    }
  },
  resolve: {
    alias: {
      'lucide-react': path.resolve(__dirname, 'shims/lucide-react.tsx'),
    }
  }
});
