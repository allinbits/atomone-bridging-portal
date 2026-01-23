import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    include: ["src/**/*.{test,spec}.ts"],
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
