import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Same "@/..." alias as tsconfig, so route handlers can be imported in tests.
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { environment: "node" },
});
