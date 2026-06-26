import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://optimizer.ghaa.my.id",
  integrations: [
    react(),
    sitemap({
      changefreq: "weekly",
      priority: 0.9,
      lastmod: new Date(),
    }),
  ],
  compressHTML: true,
  build: {
    inlineStylesheets: "auto",
  },
});
