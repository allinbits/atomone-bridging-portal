import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "~": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    include: [
      "src/**/*.{test,spec}.ts",
      "tests/unit/**/*.{test,spec}.ts"
    ],
    environment: "happy-dom",
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.ts"],
      reporter: [
        "text",
        "json",
        "json-summary"
      ],
      thresholds: {
        lines: 50,
        branches: 50,
        functions: 50,
        statements: 50
      }
    }
  }
});
