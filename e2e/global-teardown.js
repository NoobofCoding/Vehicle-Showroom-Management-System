import assert from "node:assert/strict"

import { readFile, rm } from "node:fs/promises"

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

export default async function globalTeardown() {
  const manifestPath = process.env.AUTODESK_E2E_MANIFEST_FILE

  if (!manifestPath) return

  let manifest

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  } catch (error) {
    if (error.code === "ENOENT") return

    throw error
  }

  const database = new URL(manifest.uri)

  assert.equal(
    decodeURIComponent(database.pathname.slice(1)),

    "autodesk_e2e_test",

    "Refusing E2E cleanup outside the dedicated E2E database.",
  )

  assert.ok(
    ["127.0.0.1", "localhost", "::1"].includes(database.hostname),

    "Refusing E2E cleanup outside loopback MongoDB.",
  )

  await connectDatabase(manifest.uri)

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

      if (collection === "vehicles") {
        const vehicles = await Vehicle.find({ _id: { $in: ids } }).select(
          "imageId",
        )

        const bucket = getVehicleImageBucket()

        for (const vehicle of vehicles) {
          if (vehicle.imageId) await bucket.delete(vehicle.imageId)
        }
      }

      await models[collection].deleteMany({ _id: { $in: ids } })

      assert.equal(
        await models[collection].countDocuments({ _id: { $in: ids } }),

        0,

        `E2E cleanup left records in ${collection}.`,
      )
    }
  } finally {
    await disconnectDatabase()
  }

  await rm(manifestPath, { force: true })

  console.info("E2E test records were cleaned up from autodesk_e2e_test.")
}
