import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "icon-64x64.png",
        "icon-192x192.png",
        "icon-512x512.png",
        "icon-512x512-maskable.png",
      ],
      manifest: {
        name: "Atlas QMS",
        short_name: "Atlas QMS",
        description: "Sistema de Gestão da Qualidade para obras de construção",
        theme_color: "#192F48",
        background_color: "#192F48",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        categories: ["business", "productivity"],
        screenshots: [
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "narrow",
            label: "Atlas QMS",
          },
        ],
        shortcuts: [
          {
            name: "Não Conformidades",
            short_name: "NCs",
            url: "/non-conformities",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Inspecções PPI",
            short_name: "PPI",
            url: "/ppi",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Planeamento",
            short_name: "Planeamento",
            url: "/planning",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/api/, /^\/rest/, /^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // PDF — só carrega quando o utilizador exporta
          "vendor-pdf": ["jspdf", "html2canvas"],
          // Gráficos — só carrega no tab Tendências do dashboard
          "vendor-charts": ["recharts"],
          // React core — sempre necessário
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI base — sempre necessário
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
          ],
          // i18n
          "vendor-i18n": ["i18next", "react-i18next"],
        },
      },
    },
    // Aviso acima de 1MB (chunks individuais)
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query", "i18next", "react-i18next"],
  },
}));
