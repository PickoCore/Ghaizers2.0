import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://optimizer.ghaa.my.id",
  integrations: [react()],
  compressHTML: true,
  build: {
    inlineStylesheets: "auto",
  },
  vite: {
    // Web Worker PNG (src/lib/pngWorker.js) dibundle sebagai ES module
    worker: { format: "es" },
  },
});
