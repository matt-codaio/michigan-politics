import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localDataPlugin } from "./vite/local-data-plugin";

export default defineConfig({
  plugins: [react(), localDataPlugin()],
  server: {
    port: 5173,
  },
});
