import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const apiPort = process.env.PORT ?? "8080"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/events": {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true,
        timeout: 0,
      },
      "/health": {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
})
