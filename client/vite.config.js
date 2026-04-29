import { defineConfig } from 'vite';

export default defineConfig({
  // Base path set kiya hai taaki files sahi se load hon
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Production mein minify karna better hai
    minify: 'esbuild' 
  },
  server: {
    port: 5173,
    open: true
    // Proxy ko production mein ignore kiya jata hai
  }
});