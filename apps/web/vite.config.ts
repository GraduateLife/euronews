import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Env files (.env, .env.local) live at the monorepo root, as documented in
  // the README — by default Vite would only read them from apps/web/.
  envDir: "../..",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
