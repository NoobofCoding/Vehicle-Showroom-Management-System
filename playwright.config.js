import { randomBytes, randomUUID } from "node:crypto"

import { defineConfig, devices } from "@playwright/test"

const apiPort = 5001

const frontendPort = 5174

const apiUrl = `http://127.0.0.1:${apiPort}`

const frontendUrl = `http://127.0.0.1:${frontendPort}`

const testUri = process.env.AUTODESK_E2E_MONGODB_URI

const jwtSecret = randomBytes(32).toString("hex")

if (!testUri)
  throw new Error(
    "Set AUTODESK_E2E_MONGODB_URI to a local autodesk_e2e_test replica-set database.",
  )

process.env.AUTODESK_E2E_MANIFEST_FILE ??= `${process.env.TEMP ?? process.env.TMP}\\autodesk-e2e-${randomUUID()}.json`

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: false,

  forbidOnly: Boolean(process.env.CI),

  retries: 0,

  workers: 1,

  reporter: "list",

  globalSetup: "./e2e/global-setup.js",

  globalTeardown: "./e2e/global-teardown.js",

  timeout: 120000,

  expect: { timeout: 15000 },

  use: {
    baseURL: frontendUrl,

    trace: "retain-on-failure",

    screenshot: "only-on-failure",

    ...devices["Desktop Chrome"],
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      command: "node backend/src/server.js",

      url: `${apiUrl}/api/health`,

      reuseExistingServer: false,

      timeout: 60000,

      env: {
        MONGODB_URI: testUri,

        JWT_SECRET: jwtSecret,

        NODE_ENV: "development",

        PORT: String(apiPort),

        FRONTEND_URL: frontendUrl,
      },
    },
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort",
      cwd: "frontend",
      url: frontendUrl,

      reuseExistingServer: false,

      timeout: 60000,

      env: {
        VITE_API_BASE_URL: `${apiUrl}/api`,
      },
    },
  ],
})
