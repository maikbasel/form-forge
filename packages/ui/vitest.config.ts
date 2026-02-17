import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@repo/ui": path.resolve(import.meta.dirname, "./src"),
      "@repo/api-spec": path.resolve(
        import.meta.dirname,
        "../../packages/api-spec"
      ),
    },
  },
});
