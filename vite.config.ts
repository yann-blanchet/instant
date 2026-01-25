import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  ssr: {
    noExternal: ['browser-image-compression'],
  },
  optimizeDeps: {
    include: ['browser-image-compression'],
  },
});
