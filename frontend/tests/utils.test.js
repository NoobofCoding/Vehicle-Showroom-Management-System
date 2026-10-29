import assert from "node:assert/strict"

import test from "node:test"

import { apiRequest, ApiError } from "../src/services/api.js"

import { downloadCsv, serializeCsv } from "../src/utils/format.js"

test("API client sends JSON with credentials and encodes query values", async () => {
  const originalFetch = globalThis.fetch

  let capturedUrl

  let capturedOptions

  globalThis.fetch = async (url, options) => {
    capturedUrl = url

    capturedOptions = options

    return new Response(
      JSON.stringify({ success: true, data: { id: "VH-1" } }),
      {
        status: 200,

        headers: { "Content-Type": "application/json" },
      },
    )
  }

  try {
    const response = await apiRequest("/vehicles", {
      method: "POST",

      query: { search: "Tata Nexon", ignored: "" },

      body: { id: "VH-1" },
    })

    assert.deepEqual(response.data, { id: "VH-1" })

    assert.equal(new URL(capturedUrl).searchParams.get("search"), "Tata Nexon")

    assert.equal(new URL(capturedUrl).searchParams.has("ignored"), false)

    assert.equal(capturedOptions.credentials, "include")

    assert.equal(capturedOptions.method, "POST")

    assert.equal(capturedOptions.headers["Content-Type"], "application/json")

    assert.deepEqual(JSON.parse(capturedOptions.body), { id: "VH-1" })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("API client surfaces connection, unreadable response, and server errors", async () => {
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = async () => {
      throw new TypeError("connection refused")
    }

    await assert.rejects(apiRequest("/vehicles"), {
      name: "ApiError",

      status: 0,

      message: /Cannot reach the AutoDesk API/,
    })

    globalThis.fetch = async () =>
      new Response("not json", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      })

    await assert.rejects(apiRequest("/vehicles"), {
      name: "ApiError",

      status: 502,

      message: /unreadable response/,
    })

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          success: false,

          message: "Stock cannot be reduced below zero.",

          errors: [{ field: "change" }],
        }),

        { status: 409, headers: { "Content-Type": "application/json" } },
      )

    await assert.rejects(apiRequest("/stock-adjustments"), (error) => {
      assert.ok(error instanceof ApiError)

      assert.equal(error.status, 409)

      assert.equal(error.message, "Stock cannot be reduced below zero.")

      assert.deepEqual(error.errors, [{ field: "change" }])

      return true
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("CSV export escapes spreadsheet formulas and releases the generated URL", async () => {
  const originalDocument = globalThis.document

  const originalSetTimeout = globalThis.window

  const originalCreateObjectURL = URL.createObjectURL

  const originalRevokeObjectURL = URL.revokeObjectURL

  let blob

  let revokedUrl

  let clicked = false

  globalThis.document = {
    createElement: () => ({
      click() {
        clicked = true
      },
    }),
  }

  globalThis.window = {
    setTimeout(callback) {
      callback()
    },
  }

  URL.createObjectURL = (value) => {
    blob = value

    return "blob:autodesk-test"
  }

  URL.revokeObjectURL = (value) => {
    revokedUrl = value
  }

  try {
    downloadCsv("report.csv", [
      {
        customer: '=HYPERLINK("https://example.invalid","open")',
        amount: 12500,
      },

      { customer: "Safe record", amount: 0 },
    ])

    assert.equal(
      await blob.text(),

      '"customer","amount"\r\n"\'=HYPERLINK(""https://example.invalid"",""open"")","12500"\r\n"Safe record","0"',
    )

    assert.equal(clicked, true)

    assert.equal(revokedUrl, "blob:autodesk-test")
  } finally {
    globalThis.document = originalDocument

    globalThis.window = originalSetTimeout

    URL.createObjectURL = originalCreateObjectURL

    URL.revokeObjectURL = originalRevokeObjectURL
  }
})

test("CSV serialization quotes delimiters and escapes formula prefixes after whitespace", () => {
  assert.equal(
    serializeCsv([
      {
        Customer: 'QA, "North"\nSecond line',
        Amount: "₹35,00,000",
        Formula: "\t=SUM(1,1)",
      },
    ]),
    '"Customer","Amount","Formula"\r\n"QA, ""North""\nSecond line","₹35,00,000","\'\t=SUM(1,1)"',
  )
})
