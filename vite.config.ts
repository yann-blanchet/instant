import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "browser-image-compression": path.resolve(__dirname, "node_modules/browser-image-compression/dist/browser-image-compression.js"),
    },
  },
});
