import assert from "node:assert/strict"

import { randomBytes, randomUUID } from "node:crypto"

import test from "node:test"

import bcrypt from "bcryptjs"

import mongoose from "mongoose"

import request from "supertest"

import Customer from "../src/models/Customer.js"

import Sale from "../src/models/Sale.js"

import Setting from "../src/models/Setting.js"

import StockAdjustment from "../src/models/StockAdjustment.js"

import User from "../src/models/User.js"

import Vehicle from "../src/models/Vehicle.js"

import { getVehicleImageBucket } from "../src/utils/vehicleImages.js"

import {
  connectDatabase,
  disconnectDatabase,
  transactionSupport,
} from "../src/config/database.js"

const uri = process.env.AUTODESK_TEST_MONGODB_URI

const testOnly = uri ? test : test.skip

const secret = randomBytes(32).toString("hex")

process.env.NODE_ENV = "test"

process.env.JWT_SECRET = secret

const { default: app } = await import("../src/app.js")

const models = [Sale, StockAdjustment, Vehicle, Customer, Setting, User]

const manifest = new Map(models.map((model) => [model, new Set()]))

function assertIsolatedTestUri(value) {
  const parsed = new URL(value)

  const database = decodeURIComponent(parsed.pathname.slice(1))

  assert.match(
    database,
    /^autodesk_test(?:_|$)/,
    "test URI must use a dedicated autodesk_test database",
  )

  assert.ok(
    ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),

    "integration tests are restricted to a local MongoDB instance",
  )

  assert.notEqual(
    database,
    "autodesk",
    "integration tests must not use the development database",
  )
}

async function track(model, filter) {
  const record = await model.findOne(filter).select("_id").lean()

  assert.ok(record, `expected created ${model.modelName} record to exist`)

  manifest.get(model).add(record._id)

  return record
}

async function cleanupCreatedRecords() {
  for (const model of models) {
    const ids = [...manifest.get(model)]

    if (!ids.length) continue

    if (model === Vehicle) {
      const vehicles = await Vehicle.find({ _id: { $in: ids } }).select(
        "imageId",
      )

      const bucket = getVehicleImageBucket()

      for (const vehicle of vehicles) {
        if (vehicle.imageId) await bucket.delete(vehicle.imageId)
      }
    }

    await model.deleteMany({ _id: { $in: ids } })

    const remaining = await model.countDocuments({ _id: { $in: ids } })

    assert.equal(
      remaining,
      0,
      `temporary ${model.modelName} records must be removed`,
    )
  }
}

testOnly(
  "isolated HTTP API workflow preserves inventory, sales, auth, and settings",

  async (t) => {
    assertIsolatedTestUri(uri)

    await connectDatabase(uri)

    try {
      assert.equal(
        transactionSupport,
        true,
        "test MongoDB must support transactions",
      )

      await Promise.all(
        mongoose.modelNames().map((name) => mongoose.model(name).init()),
      )

      for (const model of models) {
        assert.equal(
          await model.countDocuments(),

          0,

          `refusing to test against non-empty ${model.collection.name}`,
        )
      }

      const bucket = getVehicleImageBucket()

      assert.equal(
        await bucket
          .find({})
          .toArray()
          .then((files) => files.length),
        0,
      )

      const email = `qa-${randomUUID()}@example.invalid`

      const password = randomBytes(32).toString("base64url")

      const user = await User.create({
        name: "AutoDesk QA Manager",

        email,

        passwordHash: await bcrypt.hash(password, 12),

        role: "Manager",

        status: "Active",
      })

      manifest.get(User).add(user._id)

      const selectedForLogin = await User.findById(user._id).select(
        "+passwordHash",
      )

      assert.equal(selectedForLogin.email, email)

      assert.equal(selectedForLogin.role, "Manager")

      assert.equal(selectedForLogin.status, "Active")

      assert.notEqual(selectedForLogin.passwordHash, password)

      assert.equal(
        await bcrypt.compare(password, selectedForLogin.passwordHash),
        true,
      )

      assert.equal(
        (await User.findById(user._id).lean()).passwordHash,
        undefined,
      )

      const client = request.agent(app)

      await request(app).get("/api/users").expect(401)

      await client.get("/api/vehicles").expect(401)

      const unknownEmail = `missing-${randomUUID()}@example.invalid`

      await request(app)
        .post("/api/auth/login")
        .send({ email: unknownEmail, password })
        .expect(401)

      await client
        .post("/api/auth/login")
        .send({ email, password: "incorrect" })
        .expect(401)

      const login = await client
        .post("/api/auth/login")
        .send({ email: ` ${email.toUpperCase()} `, password })
        .expect(200)

      assert.deepEqual(Object.keys(login.body).sort(), [
        "data",
        "message",
        "success",
      ])

      assert.equal(login.body.success, true)

      assert.equal(login.body.data.email, email)

      assert.equal(login.body.data.role, "Manager")

      assert.equal("passwordHash" in login.body.data, false)

      assert.ok(
        login.headers["set-cookie"].some((cookie) =>
          cookie.startsWith("autodesk_session="),
        ),
      )

      assert.equal(
        (await client.get("/api/auth/me").expect(200)).body.data.id,
        user.id,
      )

      const userList = await client.get("/api/users").expect(200)

      assert.deepEqual(
        userList.body.data.map(({ email: listedEmail }) => listedEmail),
        [email],
      )

      assert.equal("passwordHash" in userList.body.data[0], false)

      const staffEmail = `  STAFF-${randomUUID()}@EXAMPLE.INVALID `

      const staffPassword = randomBytes(24).toString("base64url")

      const createdStaff = await client
        .post("/api/users")
        .send({
          name: "AutoDesk QA Staff",
          email: staffEmail,
          password: staffPassword,
        })
        .expect(201)

      assert.equal(
        createdStaff.body.data.email,
        staffEmail.trim().toLowerCase(),
      )

      assert.equal(createdStaff.body.data.role, "Staff")

      assert.equal("passwordHash" in createdStaff.body.data, false)

      const staff = await track(User, { email: createdStaff.body.data.email })

      const savedStaff = await User.findById(staff._id).select("+passwordHash")

      assert.notEqual(savedStaff.passwordHash, staffPassword)

      assert.equal(
        await bcrypt.compare(staffPassword, savedStaff.passwordHash),
        true,
      )

      await client
        .post("/api/users")
        .send({
          name: "Duplicate QA Staff",
          email: staffEmail.trim().toLowerCase(),
          password: staffPassword,
        })
        .expect(409)

      await client
        .post("/api/users")
        .send({
          name: "Unauthorized Manager",
          email: `unauthorized-${randomUUID()}@example.invalid`,
          password: staffPassword,
          role: "Manager",
        })
        .expect(400)

      const staffClient = request.agent(app)

      await staffClient
        .post("/api/auth/login")
        .send({ email: staffEmail.trim(), password: staffPassword })
        .expect(200)

      await staffClient.get("/api/vehicles").expect(200)

      await staffClient.get("/api/users").expect(403)

      await staffClient
        .post("/api/users")
        .send({
          name: "Elevated QA User",
          email: `elevated-${randomUUID()}@example.invalid`,
          password: staffPassword,
        })
        .expect(403)

      await request(app)

        .get("/api/vehicles")

        .set("Origin", "https://not-the-showroom.example")

        .expect(403)

      const firstVehicle = {
        id: "TEST-AUTODESK-VEH-001",

        brand: "Tata",

        model: "Nexon QA",

        year: 2025,

        category: "SUV",

        fuel: "Petrol",

        transmission: "Manual",

        color: "QA Silver",

        price: 20000,

        stock: 5,

        threshold: 1,

        description: "Temporary isolated API test record",
      }

      const secondVehicle = {
        ...firstVehicle,

        id: "TEST-AUTODESK-VEH-002",

        brand: "Hyundai",

        model: "Creta QA",

        price: 30000,

        stock: 2,
      }

      const createdVehicle = await client

        .post("/api/vehicles")

        .send(firstVehicle)

        .expect(201)

      assert.equal(createdVehicle.body.data.stock, 5)

      await track(Vehicle, { vehicleId: firstVehicle.id })

      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
        "base64",
      )

      const uploadedImage = await client
        .patch(`/api/vehicles/${firstVehicle.id}`)
        .attach("image", png, {
          filename: "vehicle.png",
          contentType: "image/png",
        })
        .expect(200)

      assert.ok(uploadedImage.body.data.imageUrl)

      const imageRecord = await Vehicle.findOne({
        vehicleId: firstVehicle.id,
      }).select("+imageId")

      assert.ok(imageRecord.imageId)

      const downloadedImage = await client
        .get(uploadedImage.body.data.imageUrl)
        .expect(200)
        .expect("Content-Type", "image/png")

      assert.equal(downloadedImage.body.equals(png), true)

      await client
        .patch(`/api/vehicles/${firstVehicle.id}`)
        .attach("image", Buffer.from("invalid image"), {
          filename: "invalid.png",
          contentType: "image/png",
        })
        .expect(400)

      assert.equal(
        (
          await Vehicle.findOne({ vehicleId: firstVehicle.id }).select(
            "+imageId",
          )
        ).imageId.toString(),
        imageRecord.imageId.toString(),
      )

      await client
        .patch(`/api/vehicles/${firstVehicle.id}`)
        .attach("image", Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]), {
          filename: "oversized.png",
          contentType: "image/png",
        })
        .expect(413)

      const updatedImage = await client
        .patch(`/api/vehicles/${firstVehicle.id}`)
        .attach("image", png, {
          filename: "replacement.png",
          contentType: "image/png",
        })
        .expect(200)

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id })).stockQuantity,
        5,
      )

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id }))
          .listedPricePaise,
        2000000,
      )

      assert.equal(
        (
          await client.get(updatedImage.body.data.imageUrl).expect(200)
        ).body.equals(png),
        true,
      )

      const withoutImage = await client
        .patch(`/api/vehicles/${firstVehicle.id}`)
        .field("removeImage", "true")
        .expect(200)

      assert.equal(withoutImage.body.data.imageUrl, null)

      await client.get(`/api/vehicles/${firstVehicle.id}/image`).expect(404)

      assert.equal((await bucket.find({}).toArray()).length, 0)

      await client.post("/api/vehicles").send(firstVehicle).expect(409)

      await client.post("/api/vehicles").send(secondVehicle).expect(201)

      await track(Vehicle, { vehicleId: secondVehicle.id })

      for (const field of [firstVehicle.id, "Tata", "Nexon QA"]) {
        const found = await client

          .get("/api/vehicles")

          .query({ search: field })

          .expect(200)

        assert.ok(
          found.body.data.items.some((item) => item.id === firstVehicle.id),
        )
      }

      await client

        .post("/api/vehicles")

        .send({ ...firstVehicle, id: "TEST-AUTODESK-VEH-INVALID", year: 1800 })

        .expect(400)

      const updatedVehicle = await client

        .patch(`/api/vehicles/${firstVehicle.id}`)

        .send({ price: 21000, color: "QA Copper" })

        .expect(200)

      assert.equal(updatedVehicle.body.data.price, 21000)

      const persistedVehicle = await Vehicle.findOne({
        vehicleId: firstVehicle.id,
      }).lean()

      assert.equal(persistedVehicle.listedPricePaise, 2100000)

      assert.equal(persistedVehicle.color, "QA Copper")

      assert.equal(
        (await client.get(`/api/vehicles/${firstVehicle.id}`).expect(200)).body
          .data.price,

        21000,
      )

      const firstCustomer = {
        id: "TEST-AUTODESK-CUST-001",

        name: "AutoDesk QA Customer One",

        phone: "+91 98765 43210",

        email: "customer-one@example.invalid",

        address: "Temporary QA Address",
      }

      const secondCustomer = {
        ...firstCustomer,

        id: "TEST-AUTODESK-CUST-002",

        name: "AutoDesk QA Customer Two",

        phone: "+91 98765 43211",

        email: "customer-two@example.invalid",
      }

      await client.post("/api/customers").send(firstCustomer).expect(201)

      await track(Customer, { customerId: firstCustomer.id })

      await client.post("/api/customers").send(secondCustomer).expect(201)

      await track(Customer, { customerId: secondCustomer.id })

      await client.post("/api/customers").send(firstCustomer).expect(409)

      await client

        .post("/api/customers")

        .send({
          ...firstCustomer,
          id: "TEST-AUTODESK-CUST-INVALID",
          phone: "bad",
        })

        .expect(400)

      await client

        .patch(`/api/customers/${firstCustomer.id}`)

        .send({ name: "AutoDesk QA Customer Updated" })

        .expect(200)

      assert.equal(
        (await client.get(`/api/customers/${firstCustomer.id}`).expect(200))
          .body.data.name,

        "AutoDesk QA Customer Updated",
      )

      const salePayload = {
        vehicleId: firstVehicle.id,

        customerId: firstCustomer.id,

        quantity: 2,

        unitPrice: 10000,

        discount: 1000,

        date: "2026-10-29",
      }

      const saleResponse = await client
        .post("/api/sales")
        .send(salePayload)
        .expect(201)

      const sale = saleResponse.body.data.sale

      assert.equal(sale.amount, 19000)

      assert.equal(sale.unitPrice, 10000)

      assert.equal(sale.quantity, 2)

      assert.equal(sale.vehicleSnapshot.color, "QA Copper")

      assert.equal(
        sale.customerSnapshot.fullName,
        "AutoDesk QA Customer Updated",
      )

      await track(Sale, { saleId: sale.id })

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id })).stockQuantity,
        3,
      )

      assert.equal(
        (await Sale.findOne({ saleId: sale.id })).totalAmountPaise,
        1900000,
      )

      await client

        .post("/api/sales")

        .send({ ...salePayload, quantity: 4 })

        .expect(409)

      await client

        .post("/api/sales")

        .send({ ...salePayload, quantity: 0 })

        .expect(400)

      await client

        .post("/api/sales")

        .send({ ...salePayload, vehicleId: "TEST-AUTODESK-VEH-MISSING" })

        .expect(404)

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id })).stockQuantity,
        3,
      )

      assert.equal(
        await Sale.countDocuments({ vehicleSnapshot: { $exists: true } }),
        1,
      )

      const concurrentPayload = { ...salePayload, quantity: 2, discount: 0 }

      const concurrentResponses = await Promise.all([
        client.post("/api/sales").send(concurrentPayload),

        client.post("/api/sales").send(concurrentPayload),
      ])

      assert.deepEqual(
        concurrentResponses.map((response) => response.status).sort(),

        [201, 409],
      )

      const concurrentSale = concurrentResponses.find(
        (response) => response.status === 201,
      ).body.data.sale

      await track(Sale, { saleId: concurrentSale.id })

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id })).stockQuantity,
        1,
      )

      const completedReport = await client
        .get("/api/reports/sales?status=Completed")
        .expect(200)

      assert.equal(completedReport.body.data.length, 2)

      assert.equal(
        completedReport.body.data.reduce(
          (total, item) => total + item.amount,
          0,
        ),

        39000,
      )

      const dashboardBeforeCancel = await client
        .get("/api/dashboard/summary")
        .expect(200)

      assert.equal(dashboardBeforeCancel.body.data.completedSalesCount, 2)

      assert.equal(dashboardBeforeCancel.body.data.revenuePaise, 3900000)

      await client

        .patch(`/api/customers/${firstCustomer.id}`)

        .send({ name: "AutoDesk QA Customer After Sale" })

        .expect(200)

      const historicalSale = await client
        .get(`/api/sales/${sale.id}`)
        .expect(200)

      assert.equal(
        historicalSale.body.data.customerSnapshot.fullName,
        "AutoDesk QA Customer Updated",
      )

      await client.post(`/api/sales/${sale.id}/cancel`).expect(200)

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id })).stockQuantity,
        3,
      )

      await client.post(`/api/sales/${sale.id}/cancel`).expect(409)

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id })).stockQuantity,
        3,
      )

      await client.post(`/api/sales/${concurrentSale.id}/cancel`).expect(200)

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id })).stockQuantity,
        5,
      )

      const dashboardAfterCancel = await client
        .get("/api/dashboard/summary")
        .expect(200)

      assert.equal(dashboardAfterCancel.body.data.completedSalesCount, 0)

      assert.equal(dashboardAfterCancel.body.data.revenuePaise, 0)

      assert.equal(dashboardAfterCancel.body.data.inventoryUnits, 7)

      assert.equal(
        (await client.get("/api/reports/sales?status=Completed").expect(200))
          .body.data.length,

        0,
      )

      assert.equal(
        (
          await client
            .get(
              "/api/reports/sales?status=Cancelled&from=2026-10-29&to=2026-10-29",
            )
            .expect(200)
        ).body.data.length,

        2,
      )

      const adjustment = await client

        .post("/api/stock-adjustments")

        .send({
          vehicleId: firstVehicle.id,
          change: 1,
          reason: "QA delivery receipt",
        })

        .expect(201)

      assert.equal(adjustment.body.data.adjustment.previous, 5)

      assert.equal(adjustment.body.data.adjustment.change, 1)

      assert.equal(adjustment.body.data.adjustment.current, 6)

      await track(StockAdjustment, {
        adjustmentId: adjustment.body.data.adjustment.id,
      })

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id })).stockQuantity,
        6,
      )

      await client

        .post("/api/stock-adjustments")

        .send({
          vehicleId: firstVehicle.id,
          change: -7,
          reason: "Invalid QA reduction",
        })

        .expect(409)

      assert.equal(await StockAdjustment.countDocuments(), 1)

      assert.equal(
        (await Vehicle.findOne({ vehicleId: firstVehicle.id })).stockQuantity,
        6,
      )

      const settings = await client

        .put("/api/settings")

        .send({
          staffName: "AutoDesk QA Manager Updated",

          staffEmail: email,

          showroomName: "AutoDesk QA Showroom",

          currency: "INR",

          lowStockThreshold: 4,

          emailAlerts: false,

          stockAlerts: true,
        })

        .expect(200)

      manifest
        .get(Setting)
        .add(new mongoose.Types.ObjectId(settings.body.data._id))

      const persistedSettings = await client.get("/api/settings").expect(200)

      assert.equal(
        persistedSettings.body.data.showroomName,
        "AutoDesk QA Showroom",
      )

      assert.equal(persistedSettings.body.data.lowStockThreshold, 4)

      assert.equal(
        (await client.get("/api/auth/me").expect(200)).body.data.name,
        "AutoDesk QA Manager Updated",
      )

      const archived = await client
        .delete(`/api/customers/${firstCustomer.id}`)
        .expect(200)

      assert.equal(archived.body.data.status, "Archived")

      assert.equal(
        (await client.get(`/api/sales/${sale.id}`).expect(200)).body.data
          .customerSnapshot.fullName,

        "AutoDesk QA Customer Updated",
      )

      await client.post("/api/auth/logout").expect(200)

      await client.get("/api/vehicles").expect(401)

      t.diagnostic(
        `Created isolated records: vehicles=${firstVehicle.id},${secondVehicle.id}; customers=${firstCustomer.id},${secondCustomer.id}; sales=${sale.id},${concurrentSale.id}; adjustment=${adjustment.body.data.adjustment.id}; settings=${settings.body.data._id}; user=${user._id}`,
      )
    } finally {
      try {
        await cleanupCreatedRecords()
      } finally {
        await disconnectDatabase()
      }
    }
  },

  { skip: !uri },
)
