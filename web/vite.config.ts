import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  // Fixed port: the API's CORS allow-list (WEB_ORIGIN) expects exactly this origin.
  server: { port: 5173, strictPort: true },
});
