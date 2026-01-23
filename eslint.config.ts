import stylistic from "@stylistic/eslint-plugin";
import pluginVitest from "@vitest/eslint-plugin";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import { globalIgnores } from "eslint/config";
import pluginPlaywright from "eslint-plugin-playwright";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import pluginVue from "eslint-plugin-vue";

/*
 * To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
 * import { configureVueProject } from '@vue/eslint-config-typescript'
 * configureVueProject({ scriptLangs: ['ts', 'tsx'] })
 * More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup
 */

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"]
  },

  globalIgnores([
    "**/dist/**",
    "**/dist-ssr/**",
    "**/coverage/**"
  ]),

  {
    plugins: {
      "@stylistic": stylistic
    }
  },
  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ["src/**/__tests__/*"]
  },

  {
    ...pluginPlaywright.configs["flat/recommended"],
    files: ["e2e/**/*.{test,spec}.{js,ts,jsx,tsx}"]
  },

  stylistic.configs["all"],
  {
    rules: {
      "@stylistic/padded-blocks": [
        "error",
        "never"
      ],
      "@stylistic/indent": [
        "error",
        2
      ],
      "@stylistic/quote-props": [
        "error",
        "as-needed"
      ],
      "@stylistic/block-spacing": [
        "error",
        "always"
      ],
      "@stylistic/object-curly-spacing": [
        "error",
        "always"
      ],
      "@stylistic/semi": [
        "error",
        "always"
      ],
      "@stylistic/quotes": [
        "error",
        "double"
      ],
      "@stylistic/comma-spacing": [
        "error",
        { before: false,
          after: true }
      ],
      "no-unused-vars": "off",
      "vue/block-lang": "off",
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-unused-vars": [
        "error", // or "error"
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "max-lines": [
        "warn",
        { max: 500,
          skipBlankLines: true,
          skipComments: true }
      ],
      "max-lines-per-function": [
        "warn",
        { max: 200,
          skipBlankLines: true,
          skipComments: true }
      ]
    }
  },
  {
    plugins: {
      "simple-import-sort": simpleImportSort
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error"
    }
  }
);
