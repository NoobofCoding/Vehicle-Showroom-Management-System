import assert from "node:assert/strict"

import { randomBytes, randomUUID } from "node:crypto"

import { rm, writeFile } from "node:fs/promises"

import bcrypt from "bcryptjs"

import {
  connectDatabase,
  disconnectDatabase,
} from "../backend/src/config/database.js"

import Customer from "../backend/src/models/Customer.js"

import Sale from "../backend/src/models/Sale.js"

import Setting from "../backend/src/models/Setting.js"

import StockAdjustment from "../backend/src/models/StockAdjustment.js"

import User from "../backend/src/models/User.js"

import Vehicle from "../backend/src/models/Vehicle.js"

import { getVehicleImageBucket } from "../backend/src/utils/vehicleImages.js"

const models = {
  users: User,

  customers: Customer,

  vehicles: Vehicle,

  sales: Sale,

  stockadjustments: StockAdjustment,

  settings: Setting,
}

function assertSafeUri(uri) {
  const parsed = new URL(uri)

  const database = decodeURIComponent(parsed.pathname.slice(1))

  assert.equal(database, "autodesk_e2e_test")

  assert.ok(
    ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),

    "E2E tests may connect only to loopback MongoDB.",
  )

  assert.equal(
    parsed.username,
    "",
    "E2E MongoDB URI must not contain credentials.",
  )

  assert.equal(
    parsed.password,
    "",
    "E2E MongoDB URI must not contain credentials.",
  )
}

export default async function globalSetup() {
  const uri = process.env.AUTODESK_E2E_MONGODB_URI

  const manifestPath = process.env.AUTODESK_E2E_MANIFEST_FILE

  assert.ok(uri, "AUTODESK_E2E_MONGODB_URI is required.")

  assert.ok(manifestPath, "Temporary E2E manifest path is required.")

  assertSafeUri(uri)

  const accountEmail = `e2e-${randomUUID()}@example.invalid`

  const accountPassword = randomBytes(32).toString("base64url")

  const runId = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()

  const manifest = {
    uri,

    accountEmail,

    accountPassword,

    runId,

    vehicleId: `E2E-VEH-${runId}`,

    customerId: "",

    customerName: '=QA, "North"',

    customerEmail: `customer-${runId.toLowerCase()}@example.invalid`,

    records: Object.fromEntries(
      Object.keys(models).map((collection) => [collection, []]),
    ),
  }

  await writeFile(manifestPath, JSON.stringify(manifest), { flag: "wx" })

  try {
    await connectDatabase(uri)

    const db = User.db.db

    const hello = await db.admin().command({ hello: 1 })

    assert.ok(hello.setName, "E2E MongoDB must be a replica set.")

    assert.ok(
      hello.isWritablePrimary,
      "E2E MongoDB must be a writable primary.",
    )

    for (const model of Object.values(models)) {
      assert.equal(
        await model.countDocuments(),

        0,

        `Refusing to run E2E tests against non-empty ${model.collection.name}.`,
      )
    }

    const imageBucket = getVehicleImageBucket()

    assert.equal(
      await imageBucket
        .find({})
        .toArray()
        .then((files) => files.length),
      0,
      "Refusing to run E2E tests against an image-populated test database.",
    )

    const user = await User.create({
      name: "AutoDesk E2E Manager",

      email: accountEmail,

      passwordHash: await bcrypt.hash(accountPassword, 12),

      role: "Manager",

      status: "Active",
    })

    manifest.records.users.push(user._id.toString())

    await writeFile(manifestPath, JSON.stringify(manifest))

    const settings = await Setting.create({
      key: "showroom",

      staffName: user.name,

      staffEmail: user.email,

      showroomName: "AutoDesk E2E Showroom",

      currency: "INR",

      lowStockThreshold: 2,

      emailAlerts: true,

      stockAlerts: true,
    })

    manifest.records.settings.push(settings._id.toString())

    await writeFile(manifestPath, JSON.stringify(manifest))
  } catch (error) {
    if (User.db.readyState === 1) await removeCreatedRecords(manifest)

    await rm(manifestPath, { force: true })

    throw error
  }

  await disconnectDatabase()
}

async function removeCreatedRecords(manifest) {
  if (User.db.readyState !== 1) await connectDatabase(manifest.uri)

  try {
    for (const collection of [
      "sales",

      "stockadjustments",

      "vehicles",

      "customers",

      "settings",

      "users",
    ]) {
      const ids = manifest.records[collection]

      if (!ids.length) continue

      await models[collection].deleteMany({ _id: { $in: ids } })

      assert.equal(
        await models[collection].countDocuments({ _id: { $in: ids } }),

        0,

        `Could not clean E2E records in ${collection}.`,
      )
    }
  } finally {
    await disconnectDatabase()
  }
}
