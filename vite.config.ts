import { defineConfig } from "@lovable.dev/vite-tanstack-config";
export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  vite: { server: { watch: { usePolling: true, interval: 1000, ignored: ["**/node_modules.icloud-backup/**"] } } },
});
