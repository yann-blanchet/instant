import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "browser-image-compression": "browser-image-compression/dist/browser-image-compression.js",
    },
  },
});
