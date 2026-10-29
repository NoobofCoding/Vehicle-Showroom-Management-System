import test from "node:test"

import assert from "node:assert/strict"

import Vehicle from "../src/models/Vehicle.js"

import Customer from "../src/models/Customer.js"

import Sale from "../src/models/Sale.js"

import StockAdjustment from "../src/models/StockAdjustment.js"

import User from "../src/models/User.js"

import Setting from "../src/models/Setting.js"

test("vehicle schema accepts valid stock records and rejects negative stock", async () => {
  const valid = new Vehicle({
    vehicleId: "VH-TEST-1",
    brand: "Tata",
    model: "Nexon",
    manufacturingYear: 2025,

    category: "SUV",
    fuelType: "Petrol",
    transmission: "Manual",
    color: "Grey",

    listedPricePaise: 10000000,
    stockQuantity: 5,
    lowStockThreshold: 2,
  })

  await valid.validate()

  await assert.rejects(
    new Vehicle({ ...valid.toObject(), stockQuantity: -1 }).validate(),
    /stockQuantity/,
  )
  await assert.rejects(
    new Vehicle({
      ...valid.toObject(),
      stockQuantity: Number.MAX_SAFE_INTEGER + 1,
    }).validate(),
    /stockQuantity/,
  )
  await assert.rejects(
    new Vehicle({
      ...valid.toObject(),
      listedPricePaise: Number.MAX_SAFE_INTEGER + 1,
    }).validate(),
    /listedPricePaise/,
  )
})

test("customer schema requires valid contact data", async () => {
  await assert.rejects(
    new Customer({
      customerId: "CU-1",
      fullName: "Example",
      phone: "bad",
      address: "Somewhere",
    }).validate(),
    /phone/,
  )
})

test("sale schema enforces positive quantity and snapshots", async () => {
  const values = {
    saleId: "SL-1",
    vehicle: "507f1f77bcf86cd799439011",
    customer: "507f1f77bcf86cd799439012",

    saleDate: new Date(),
    quantity: 1,
    unitSellingPricePaise: 10000,
    discountPaise: 0,

    totalAmountPaise: 10000,
    vehicleSnapshot: { vehicleId: "VH-1" },
    customerSnapshot: { customerId: "CU-1" },
  }

  await new Sale(values).validate()

  await assert.rejects(
    new Sale({ ...values, quantity: 0 }).validate(),
    /quantity/,
  )
  await assert.rejects(
    new Sale({ ...values, quantity: Number.MAX_SAFE_INTEGER + 1 }).validate(),
    /quantity/,
  )
  await assert.rejects(
    new Sale({
      ...values,
      unitSellingPricePaise: Number.MAX_SAFE_INTEGER + 1,
    }).validate(),
    /unitSellingPricePaise/,
  )
})

test("stock adjustments reject zero changes", async () => {
  await assert.rejects(
    new StockAdjustment({
      adjustmentId: "AD-1",
      vehicle: "507f1f77bcf86cd799439011",

      previousQuantity: 4,
      quantityChange: 0,
      newQuantity: 4,
      reason: "Audit correction",
    }).validate(),
    /quantityChange/,
  )
  await assert.rejects(
    new StockAdjustment({
      adjustmentId: "AD-2",
      vehicle: "507f1f77bcf86cd799439011",
      previousQuantity: 4,
      quantityChange: Number.MAX_SAFE_INTEGER + 1,
      newQuantity: 4,
      reason: "Audit correction",
    }).validate(),
    /quantityChange/,
  )
})

test("staff and showroom settings schemas use explicit roles and INR currency", async () => {
  await assert.rejects(
    new User({
      name: "Staff",
      email: "staff@example.com",
      passwordHash: "hash",
      role: "Owner",
    }).validate(),
    /role/,
  )

  await assert.rejects(new Setting({ currency: "USD" }).validate(), /currency/)
})
