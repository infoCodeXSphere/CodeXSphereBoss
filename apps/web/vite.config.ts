import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Lets the dev server call relative /api/* paths without CORS
      // friction while developing locally; production deploys hit the
      // real API origin directly (see lib/api.ts).
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
