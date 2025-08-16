import { defineConfig } from "vite"
import { resolve } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Main popup entry point
        main: resolve(__dirname, "index.html"),
        // Content script entry point
        content: resolve(__dirname, "src/content.js"),
        // Injected script for page context
        inject: resolve(__dirname, "src/inject.js"),
        // Juris library for content script
        juris: resolve(__dirname, "node_modules/juris/juris.js"),
        twind: resolve(__dirname, "src/twind.js")
      },
      output: {
        // Ensure content script, inject script, and juris are output with correct names
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "content") return "content.js"
          if (chunkInfo.name === "inject") return "inject.js"
          if (chunkInfo.name === "juris") return "juris.js"
          if (chunkInfo.name === "twind") return "twind.js"
          return "[name]-[hash].js"
        },
        // Keep chunks separate for browser extension
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "[name]-[hash][extname]"
      }
    },
    // Don't minify for easier debugging (optional)
    minify: false,
    // Ensure source maps for debugging
    sourcemap: true
  },
  // Copy public folder contents to dist
  publicDir: "public"
})
