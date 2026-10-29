import js from "@eslint/js"

import globals from "globals"

import react from "eslint-plugin-react"

import reactHooks from "eslint-plugin-react-hooks"

const browserFiles = [
  "frontend/src/**/*.{js,jsx}",

  "frontend/tests/**/*.js",

  "frontend/vite.config.js",

  "e2e/**/*.js",
]

const nodeFiles = [
  "backend/src/**/*.js",

  "backend/tests/**/*.js",

  "backend/scripts/**/*.js",

  "scripts/**/*.js",

  "playwright.config.js",
]

export default [
  {
    ignores: [
      "**/node_modules/**",

      "**/dist/**",

      "**/build/**",

      "**/playwright-report/**",

      "**/test-results/**",

      "**/.env",

      "**/.env.*",
    ],
  },

  {
    ...js.configs.recommended,

    files: [...browserFiles, ...nodeFiles],
  },

  {
    files: browserFiles,

    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },

      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
    },

    plugins: { react, "react-hooks": reactHooks },

    settings: { react: { version: "detect" } },

    rules: {
      "react/jsx-uses-vars": "error",

      "react/no-unknown-property": "error",

      ...reactHooks.configs.flat.recommended.rules,
    },
  },

  {
    files: nodeFiles,
    languageOptions: {
      globals: { ...globals.node, ...globals.es2021 },
      sourceType: "module",
    },
  },
  {
    files: ["e2e/**/*.js"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 },
    },
  },
]
