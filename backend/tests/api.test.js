import test from "node:test"

import assert from "node:assert/strict"

import request from "supertest"

import { createSale } from "../src/controllers/sales.js"

import { createAdjustment } from "../src/controllers/stockAdjustments.js"

process.env.NODE_ENV = "test"

const { default: app } = await import("../src/app.js")

test("health endpoint distinguishes a disconnected database from a running API", async () => {
  const response = await request(app).get("/api/health").expect(503)

  assert.equal(response.body.data.api, "running")

  assert.equal(response.body.data.database, "disconnected")
})

test("persistent resource routes require a staff session", async () => {
  await request(app).get("/api/vehicles").expect(401)

  await request(app).post("/api/sales").send({}).expect(401)
})

test("transaction-dependent write controllers reject standalone MongoDB before touching records", async () => {
  for (const controller of [createSale, createAdjustment]) {
    const error = await new Promise((resolve) =>
      controller({ body: {} }, {}, resolve),
    )

    assert.equal(error.status, 503)

    assert.match(error.message, /transaction support/i)
  }
})
