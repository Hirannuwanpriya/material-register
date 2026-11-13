import type { Config } from "@react-router/dev/config";

// SPA mode: the build is static files, and all data comes from the tRPC API.
export default {
  ssr: false,
} satisfies Config;
