import { defineConfig } from 'vite';
// OneDrive on Windows may hold a previous output directory open. Avoid directory
// removal; Vite still overwrites the current entrypoint and hashed asset files.
export default defineConfig({
  // Keep import.meta.url relative to the package's worker files in development.
  optimizeDeps: { exclude: ['three-mesh-bvh/worker'] },
  build: { emptyOutDir: false, chunkSizeWarningLimit: 800 },
});
