import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  appType: "spa",
  server: {
    host: "0.0.0.0",
    port: 5173,

    proxy: {
      "/v2": {
        target: "http://nakama:7350",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  define: {
    global: "window",
  },
});
