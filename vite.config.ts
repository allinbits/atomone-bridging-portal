import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true, // can also be 'build', 'dev', or false
        global: true,
        process: true
      }
    }),
    vue(),
    vueDevTools()
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(
        "./src",
        import.meta.url
      )),
      "~": fileURLToPath(new URL(
        "./src",
        import.meta.url
      ))
    }
  },
  define: { __INTLIFY_JIT_COMPILATION__: true }
});
