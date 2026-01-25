import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['browser-image-compression'],
  },
  build: {
    commonjsOptions: {
      include: [/browser-image-compression/, /node_modules/],
    },
  },
});
