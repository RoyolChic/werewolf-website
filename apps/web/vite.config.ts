import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/werewolf-website/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
  },
});
