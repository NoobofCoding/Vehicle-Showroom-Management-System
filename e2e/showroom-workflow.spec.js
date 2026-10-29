import assert from "node:assert/strict"

import { readFile, writeFile } from "node:fs/promises"

import { deflateSync } from "node:zlib"

import { test, expect } from "@playwright/test"

import {
  connectDatabase,
  disconnectDatabase,
} from "../backend/src/config/database.js"

import Customer from "../backend/src/models/Customer.js"

import Sale from "../backend/src/models/Sale.js"

import StockAdjustment from "../backend/src/models/StockAdjustment.js"

import Vehicle from "../backend/src/models/Vehicle.js"

import User from "../backend/src/models/User.js"

const manifestPath = process.env.AUTODESK_E2E_MANIFEST_FILE

let manifest

function crc32(buffer) {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc ^= byte

    for (let bit = 0; bit < 8; bit += 1)
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }

  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const name = Buffer.from(type)
  const checksumInput = Buffer.concat([name, data])
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  name.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(checksumInput), 8 + data.length)
  return chunk
}

function onePixelPng(red, green, blue) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(1, 0)
  header.writeUInt32BE(1, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.from([0, red, green, blue, 255]))),
    pngChunk("IEND", Buffer.alloc(0)),
  ])
}

async function recordCreated(collection, model, filter) {
  const record = await model.findOne(filter).select("_id").lean()

  assert.ok(record, `Expected E2E-created ${collection} record to exist.`)

  const id = record._id.toString()

  if (!manifest.records[collection].includes(id)) {
    manifest.records[collection].push(id)

    await writeFile(manifestPath, JSON.stringify(manifest))
  }
}

test("authenticated staff can complete and audit the showroom workflow", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000)

  manifest = JSON.parse(await readFile(manifestPath, "utf8"))

  await connectDatabase(manifest.uri)

  await page.setViewportSize({ width: 1440, height: 1100 })

  await page.addInitScript(() => {
    window.__autodeskPrintRequested = false

    window.print = () => {
      window.__autodeskPrintRequested = true
    }
  })

  try {
    await page.goto("/")

    await expect(page).toHaveURL(/\/login$/)

    await page.getByLabel("Email address").fill(manifest.accountEmail)

    const rejectedLoginPromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/login") &&
        response.request().method() === "POST",
    )

    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill("incorrect-test-password")

    await page.getByRole("button", { name: "Sign In" }).click()

    const rejectedLogin = await rejectedLoginPromise

    assert.equal(rejectedLogin.status(), 401)

    await expect(page.getByRole("alert")).toContainText(
      "Email or password is incorrect.",
    )

    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(manifest.accountPassword)

    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/login") &&
        response.request().method() === "POST",
    )

    await page.getByRole("button", { name: "Sign In" }).click()

    const loginResponse = await loginResponsePromise

    assert.equal(loginResponse.status(), 200)

    const loginBody = await loginResponse.json()

    assert.equal(loginBody.success, true)

    assert.equal(loginBody.data.email, manifest.accountEmail)

    assert.equal("passwordHash" in loginBody.data, false)

    const requestBody = loginResponse.request().postDataJSON()

    assert.deepEqual(Object.keys(requestBody).sort(), ["email", "password"])

    assert.equal(requestBody.email, manifest.accountEmail)

    assert.equal(typeof requestBody.password, "string")

    assert.ok(requestBody.password.length > 0)

    const sessionCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === "autodesk_session",
    )

    assert.equal(sessionCookie?.httpOnly, true)

    assert.equal(typeof sessionCookie?.value, "string")

    assert.ok(sessionCookie.value.length > 0)

    await expect(page).toHaveURL(/\/$/)

    await expect(page.locator("h1", { hasText: "Dashboard" })).toBeVisible()

    await page.reload()

    await expect(page).toHaveURL(/\/$/)

    await expect(page.locator("h1", { hasText: "Dashboard" })).toBeVisible()

    await page.getByRole("link", { name: "Vehicle Inventory" }).click()

    await page.getByRole("link", { name: "Add Vehicle" }).click()

    await page.getByLabel("Vehicle ID *").fill(manifest.vehicleId)

    await page.getByLabel("Brand *").fill("Honda")

    await page.getByLabel("Model *").fill("E2E Civic")

    await page.getByLabel("Manufacturing year *").fill("2025")

    await page.getByLabel("Color *").fill("Silver")

    await page.getByLabel("Listed price (₹) *").fill("1750000")

    await page.getByLabel("Stock quantity *").fill("5")

    await page.getByLabel("Low-stock threshold *").fill("2")

    const png = onePixelPng(190, 75, 64)
    const replacementPng = onePixelPng(53, 91, 75)

    await page.getByLabel("Vehicle Image").setInputFiles({
      name: "e2e-vehicle.png",
      mimeType: "image/png",
      buffer: png,
    })

    await expect(
      page.getByRole("img", { name: "Vehicle image preview" }),
    ).toBeVisible()

    const vehicleResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/vehicles") &&
        response.request().method() === "POST",
    )

    await page.getByRole("button", { name: "Save Vehicle" }).click()

    await vehicleResponsePromise

    await recordCreated("vehicles", Vehicle, { vehicleId: manifest.vehicleId })

    const uploadedVehicle = await Vehicle.findOne({
      vehicleId: manifest.vehicleId,
    })

    assert.ok(uploadedVehicle.imageId)

    await expect(
      page.getByText(manifest.vehicleId, { exact: true }),
    ).toBeVisible()

    await page.getByLabel("Search ID, brand, or model").fill(manifest.vehicleId)

    await expect(
      page.getByText(manifest.vehicleId, { exact: true }),
    ).toBeVisible()

    await page.getByRole("link", { name: "Edit E2E Civic" }).click()

    await page.getByLabel("Color *").fill("Graphite")

    await page.getByLabel("Vehicle Image").setInputFiles({
      name: "e2e-vehicle-replacement.png",
      mimeType: "image/png",
      buffer: replacementPng,
    })

    const updatedVehicleResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/vehicles/${manifest.vehicleId}`) &&
        response.request().method() === "PATCH",
    )

    await page.getByRole("button", { name: "Save Vehicle" }).click()

    const updatedVehicleResponse = await updatedVehicleResponsePromise

    assert.equal(updatedVehicleResponse.status(), 200)

    const updatedVehicleBody = await updatedVehicleResponse.json()

    assert.ok(updatedVehicleBody.data.imageUrl)

    await expect(page.getByText("Graphite", { exact: true })).toBeVisible()

    await page.reload()

    await expect(page.getByText("Graphite", { exact: true })).toBeVisible()

    const persistedVehicle = await Vehicle.findOne({
      vehicleId: manifest.vehicleId,
    })

    assert.ok(persistedVehicle.imageId)

    let imageRequestFailure = null
    let imageResponseDetails = null

    page.on("requestfailed", (request) => {
      if (
        request.url().includes("/api/vehicles/") &&
        request.url().includes("/image")
      ) {
        imageRequestFailure = request.failure()?.errorText || "unknown failure"
      }
    })

    page.on("response", (response) => {
      if (
        response.url().includes("/api/vehicles/") &&
        response.url().includes("/image")
      ) {
        imageResponseDetails = {
          status: response.status(),
          headers: response.headers(),
        }
      }
    })

    await page.getByRole("link", { name: "View E2E Civic" }).click()

    const vehicleImage = page.getByRole("img", { name: "Honda E2E Civic" })

    await expect(vehicleImage).toBeVisible()

    assert.ok(
      imageResponseDetails,
      `Image request failure: ${imageRequestFailure || "no request"}`,
    )

    assert.equal(
      imageRequestFailure,
      null,
      `Image request failed: ${imageRequestFailure}`,
    )

    assert.equal(
      imageResponseDetails.status,
      200,
      JSON.stringify(imageResponseDetails),
    )

    const imageSource = await vehicleImage.evaluate((image) => image.src)

    const imageRequest = await page.evaluate(async (src) => {
      const response = await fetch(src, { credentials: "include" })
      const blob = await response.blob()
      const decoded = await createImageBitmap(blob)

      return {
        status: response.status,
        contentType: response.headers.get("content-type"),
        width: decoded.width,
        height: decoded.height,
      }
    }, imageSource)

    assert.equal(imageRequest.status, 200)

    assert.equal(imageRequest.contentType, "image/png")

    assert.deepEqual([imageRequest.width, imageRequest.height], [1, 1])

    await expect
      .poll(() => vehicleImage.evaluate((image) => image.naturalWidth))
      .toBeGreaterThan(0)

    const persistedImageUrl = await Vehicle.findOne({
      vehicleId: manifest.vehicleId,
    }).then((vehicle) => `/api/vehicles/${vehicle.vehicleId}/image`)

    const imageResponse = await page.evaluate(async (path) => {
      const response = await fetch(`http://127.0.0.1:5001${path}`, {
        credentials: "include",
      })

      return {
        status: response.status,
        contentType: response.headers.get("content-type"),
        bytes: [...new Uint8Array(await response.arrayBuffer())],
      }
    }, persistedImageUrl)

    assert.equal(imageResponse.status, 200)

    assert.equal(imageResponse.contentType, "image/png")

    assert.deepEqual(Buffer.from(imageResponse.bytes), replacementPng)

    await page.getByRole("link", { name: "Edit Vehicle" }).click()

    await page.getByRole("button", { name: "Remove current image" }).click()

    await page.getByRole("button", { name: "Save Vehicle" }).click()

    assert.equal(
      (await Vehicle.findOne({ vehicleId: manifest.vehicleId })).imageId,
      null,
    )

    await page.getByRole("link", { name: "View E2E Civic" }).click()

    await expect(page.locator(".vehicle-placeholder")).toBeVisible()

    await expect(
      page.getByRole("img", { name: "Honda E2E Civic" }),
    ).toHaveCount(0)

    assert.equal(
      (await Vehicle.findOne({ vehicleId: manifest.vehicleId })).color,

      "Graphite",
    )

    const replacedVehicle = await Vehicle.findOne({
      vehicleId: manifest.vehicleId,
    })

    assert.equal(replacedVehicle.stockQuantity, 5)

    assert.equal(replacedVehicle.listedPricePaise, 175000000)

    assert.equal(replacedVehicle.imageId, null)

    await page.getByRole("link", { name: "Customers", exact: true }).click()

    await page.getByRole("link", { name: "Add Customer" }).click()

    await page.getByLabel("Full name *").fill(manifest.customerName)

    await page.getByLabel("Phone number *").fill("9000000001")

    await page.getByLabel("Email address *").fill(manifest.customerEmail)

    await page
      .getByLabel("Address *", { exact: true })
      .fill("E2E Address, Unit 1")

    const customerResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/customers") &&
        response.request().method() === "POST",
    )

    await page.getByRole("button", { name: "Save Customer" }).click()

    await customerResponsePromise

    const customerRow = page.getByRole("row").filter({
      hasText: manifest.customerEmail,
    })

    await expect(customerRow).toBeVisible()

    manifest.customerId = (
      await customerRow.locator("td").nth(0).innerText()
    ).trim()

    await writeFile(manifestPath, JSON.stringify(manifest))

    await recordCreated("customers", Customer, {
      customerId: manifest.customerId,
    })

    await page.goto("/sales/new")

    await page.getByLabel("Vehicle *").selectOption(manifest.vehicleId)

    await page.getByLabel("Customer *").selectOption(manifest.customerId)

    await page.getByLabel("Quantity *").fill("2")

    await page.getByLabel("Unit selling price (₹) *").fill("1750000")

    const saleResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/sales") &&
        response.request().method() === "POST",
    )

    await page.getByRole("button", { name: "Confirm Sale" }).click()

    const saleResponse = await saleResponsePromise

    assert.equal(saleResponse.status(), 201)

    const saleId = (await saleResponse.json()).data.sale.id

    await recordCreated("sales", Sale, { saleId })

    await page.getByRole("link", { name: "Sales", exact: true }).click()

    const completedRow = page.getByRole("row").filter({
      hasText: manifest.customerName,
    })

    await expect(completedRow).toContainText("Completed")

    await expect(completedRow).toContainText("₹35,00,000")

    const saleDate = (
      await completedRow.locator("td").nth(1).innerText()
    ).trim()

    await page.goto("/vehicles")

    const stockAfterSale = page.getByRole("row").filter({
      hasText: manifest.vehicleId,
    })

    await expect(stockAfterSale.locator("td").nth(5)).toHaveText("3")

    await page.goto("/sales/new")

    await page.getByLabel("Vehicle *").selectOption(manifest.vehicleId)

    await page.getByLabel("Customer *").selectOption(manifest.customerId)

    await page.getByLabel("Quantity *").fill("4")

    await page.getByLabel("Unit selling price (₹) *").fill("1750000")

    await page.getByRole("button", { name: "Confirm Sale" }).click()

    await expect(page.getByRole("alert")).toContainText(
      "Only 3 unit(s) are available.",
    )

    assert.equal(
      (await Vehicle.findOne({ vehicleId: manifest.vehicleId })).stockQuantity,

      3,
    )

    await page.goto(`/sales/${saleId}`)

    await expect(page.locator(".invoice")).toContainText(saleId)

    await expect(page.locator(".invoice")).toContainText("₹35,00,000")

    await page.getByRole("button", { name: "Print Invoice" }).click()

    expect(await page.evaluate(() => window.__autodeskPrintRequested)).toBe(
      true,
    )

    await page.emulateMedia({ media: "print" })

    expect(
      await page
        .locator(".sidebar")
        .evaluate((element) => getComputedStyle(element).display),
    ).toBe("none")

    expect(
      await page
        .locator(".invoice")
        .evaluate((element) => getComputedStyle(element).display),
    ).not.toBe("none")

    await page.emulateMedia({ media: "screen" })

    await page.goto("/sales")

    const cancelButton = page.getByRole("button", {
      name: `Cancel sale ${saleId}`,
    })

    await cancelButton.click()

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel Sale" })
      .click()

    const cancelledRow = page.getByRole("row").filter({ hasText: saleId })

    await expect(cancelledRow).toContainText("Cancelled")

    expect(
      await page.evaluate(async (id) => {
        const response = await fetch(
          `http://127.0.0.1:5001/api/sales/${id}/cancel`,
          {
            method: "POST",

            credentials: "include",

            headers: { "Content-Type": "application/json" },

            body: "{}",
          },
        )

        return response.status
      }, saleId),
    ).toBe(409)

    await page.goto("/vehicles")

    const restoredVehicle = page.getByRole("row").filter({
      hasText: manifest.vehicleId,
    })

    await expect(restoredVehicle.locator("td").nth(5)).toHaveText("5")

    await page.goto("/stock-adjustments")

    await page.getByLabel("Vehicle *").selectOption(manifest.vehicleId)

    await page.getByLabel("Quantity change *").fill("1")

    await page.getByLabel("Reason *").fill("E2E received inventory")

    await page.getByRole("button", { name: "Review Adjustment" }).click()

    const adjustmentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/stock-adjustments") &&
        response.request().method() === "POST",
    )

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save Adjustment" })
      .click()

    const adjustmentResponse = await adjustmentResponsePromise

    assert.equal(adjustmentResponse.status(), 201)

    const adjustmentId = (await adjustmentResponse.json()).data.adjustment.id

    await recordCreated("stockadjustments", StockAdjustment, {
      adjustmentId,
    })

    const adjustmentRow = page.getByRole("row").filter({
      hasText: "E2E received inventory",
    })

    await expect(adjustmentRow).toContainText("+1")

    await expect(adjustmentRow).toContainText("6")

    await expect(adjustmentRow.locator("td").nth(2)).toHaveText("5")

    await expect(adjustmentRow.locator("td").nth(4)).toHaveText("6")

    await page.getByLabel("Vehicle *").selectOption(manifest.vehicleId)

    await page.getByLabel("Quantity change *").fill("-7")

    await page.getByLabel("Reason *").fill("E2E negative stock rejection")

    await page.getByRole("button", { name: "Review Adjustment" }).click()

    await expect(page.getByRole("alert")).toContainText(
      "does not reduce stock below zero",
    )

    assert.equal(
      (await Vehicle.findOne({ vehicleId: manifest.vehicleId })).stockQuantity,

      6,
    )

    await page.goto("/")

    await expect(
      page
        .locator(".metric-card")
        .filter({ hasText: "Inventory units" })
        .locator("strong"),
    ).toHaveText("6")

    await expect(
      page
        .locator(".metric-card")
        .filter({ hasText: "Completed sales" })
        .locator("strong")
        .first(),
    ).toHaveText("0")

    await expect(
      page
        .locator(".metric-card")
        .filter({ hasText: "Gross sales revenue" })
        .locator("strong")
        .first(),
    ).toHaveText("₹0")

    await page.goto("/reports")

    await expect(page.locator("main")).toContainText(
      "No completed sales match these filters.",
    )

    const reports = await page.locator("main").innerText()

    expect(reports).toContain("₹0")

    expect(reports).toContain("No completed sales match these filters.")

    await page
      .getByLabel("Sales status")
      .selectOption({ label: "All statuses" })

    const downloadPromise = page.waitForEvent("download")

    await page.getByRole("button", { name: "Export CSV" }).click()

    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe("autodesk-sales-report.csv")

    const stream = await download.createReadStream()

    const chunks = []

    for await (const chunk of stream) chunks.push(chunk)

    const csv = Buffer.concat(chunks).toString("utf8")

    expect(csv.split("\r\n")[0]).toBe(
      '"Sale ID","Date","Vehicle","Customer","Quantity","Amount (INR)","Status"',
    )

    expect(csv).toContain(`"${saleId}","${saleDate}"`)

    expect(csv).toContain('"E2E Civic"')

    expect(csv).toContain(`"'${manifest.customerName.replaceAll('"', '""')}"`)

    expect(csv).toContain('"₹35,00,000"')

    expect(csv).toContain('"Cancelled"')

    await page.goto("/settings")

    await expect(page.getByLabel("Showroom name")).toHaveValue(
      "AutoDesk E2E Showroom",
    )

    await page.getByLabel("Default low-stock threshold").fill("-1")

    await page.getByRole("button", { name: "Save Changes" }).click()

    expect(
      await page
        .getByLabel("Default low-stock threshold")
        .evaluate((input) => input.validity.valid),
    ).toBe(false)

    await page.getByLabel("Default low-stock threshold").fill("2")

    await page.getByLabel("Showroom name").fill("AutoDesk Reliability QA")

    const settingsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/settings") &&
        response.request().method() === "PUT",
    )

    await page.getByRole("button", { name: "Save Changes" }).click()

    expect((await settingsResponsePromise).status()).toBe(200)

    await page.reload()

    await expect(page.getByLabel("Showroom name")).toHaveValue(
      "AutoDesk Reliability QA",
    )

    const settingsResponse = await page.evaluate(async () => {
      const response = await fetch("http://127.0.0.1:5001/api/settings", {
        credentials: "include",
      })

      return response.json()
    })

    expect(settingsResponse.data.showroomName).toBe("AutoDesk Reliability QA")

    await page.getByRole("link", { name: "User Management" }).click()

    await expect(
      page.locator("h1", { hasText: "User Management" }),
    ).toBeVisible()

    const staffEmail = `e2e-staff-${manifest.runId.toLowerCase()}@example.invalid`

    const staffPassword = "E2E-Staff-Access-2026!"

    await page.getByLabel("Full name").fill("AutoDesk E2E Staff")

    await page.getByLabel("Email address").fill(staffEmail)

    await page.getByLabel("Initial password").fill(staffPassword)

    const createStaffResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/users") &&
        response.request().method() === "POST",
    )

    await page.getByRole("button", { name: "Create Staff Account" }).click()

    const createStaffResponse = await createStaffResponsePromise

    assert.equal(createStaffResponse.status(), 201)

    const createdStaff = (await createStaffResponse.json()).data

    assert.equal(createdStaff.role, "Staff")

    assert.equal("passwordHash" in createdStaff, false)

    await recordCreated("users", User, { email: staffEmail })

    await expect(page.getByText(staffEmail, { exact: true })).toBeVisible()

    const staffContext = await browser.newContext({
      baseURL: "http://127.0.0.1:5174",
    })

    try {
      const staffPage = await staffContext.newPage()

      await staffPage.goto("/")

      await expect(staffPage).toHaveURL(/\/login$/)

      await staffPage.getByLabel("Email address").fill(staffEmail)

      await staffPage
        .getByRole("textbox", { name: "Password", exact: true })
        .fill(staffPassword)

      const staffLoginPromise = staffPage.waitForResponse(
        (response) =>
          response.url().endsWith("/api/auth/login") &&
          response.request().method() === "POST",
      )

      await staffPage.getByRole("button", { name: "Sign In" }).click()

      assert.equal((await staffLoginPromise).status(), 200)

      await expect(
        staffPage.locator("h1", { hasText: "Dashboard" }),
      ).toBeVisible()

      await expect(
        staffPage.getByRole("link", { name: "User Management" }),
      ).toHaveCount(0)

      await staffPage.goto("/vehicles")

      await expect(
        staffPage.locator("h1", { hasText: "Vehicle Inventory" }),
      ).toBeVisible()

      await staffPage.goto("/users")

      await expect(staffPage).toHaveURL(/\/$/)

      const staffUserListStatus = await staffPage.evaluate(async () => {
        const response = await fetch("http://127.0.0.1:5001/api/users", {
          credentials: "include",
        })

        return response.status
      })

      assert.equal(staffUserListStatus, 403)

      const staffCreateUserStatus = await staffPage.evaluate(async () => {
        const response = await fetch("http://127.0.0.1:5001/api/users", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Forbidden E2E Manager",
            email: "forbidden-e2e-manager@example.invalid",
            password: "E2E-Forbidden-Password-2026!",
            role: "Manager",
          }),
        })

        return response.status
      })

      assert.equal(staffCreateUserStatus, 403)
    } finally {
      await staffContext.close()
    }

    await expect(
      page.getByRole("heading", { name: "Showroom users" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Logout" }).click()

    await expect(page).toHaveURL(/\/login$/)

    await page.goto("/vehicles")

    await expect(page).toHaveURL(/\/login$/)

    const unauthenticated = await page.evaluate(async () => {
      const response = await fetch("http://127.0.0.1:5001/api/auth/me", {
        credentials: "include",
      })

      return response.status
    })

    expect(unauthenticated).toBe(401)
  } finally {
    await disconnectDatabase()
  }
})
