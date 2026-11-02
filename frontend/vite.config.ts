import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // /api で始まるリクエストを backend に回す。画面と API を同じオリジン（URL の頭）に見せられる
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
