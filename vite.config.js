import { defineConfig } from 'vite';
// OneDrive on Windows may hold a previous output directory open. Avoid directory
// removal; Vite still overwrites the current entrypoint and hashed asset files.
export default defineConfig({build:{emptyOutDir:false,chunkSizeWarningLimit:800}});
