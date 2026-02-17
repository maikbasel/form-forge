import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    include: ["app/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@repo/ui": path.resolve(import.meta.dirname, "../../packages/ui/src"),
      "@repo/api-spec": path.resolve(
        import.meta.dirname,
        "../../packages/api-spec"
      ),
    },
  },
});
