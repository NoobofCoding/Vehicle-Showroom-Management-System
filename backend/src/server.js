import "dotenv/config"

import http from "node:http"

import mongoose from "mongoose"

import app from "./app.js"

import { connectDatabase, disconnectDatabase } from "./config/database.js"

const required = ["MONGODB_URI", "JWT_SECRET"]

for (const name of required) {
  if (!process.env[name])
    throw new Error(`${name} must be configured before starting the API.`)
}

if (process.env.JWT_SECRET.length < 32)
  throw new Error("JWT_SECRET must be at least 32 characters.")

const server = http.createServer(app)

let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) return

  shuttingDown = true

  console.info(`${signal} received; closing the API.`)

  server.close(async () => {
    try {
      await disconnectDatabase()

      process.exit(0)
    } catch (error) {
      console.error(`Database shutdown failed: ${error.message}`)

      process.exit(1)
    }
  })

  setTimeout(() => process.exit(1), 10000).unref()
}

await connectDatabase()

await Promise.all(
  mongoose.modelNames().map((name) => mongoose.model(name).init()),
)

const port = Number(process.env.PORT || 5000)

server.listen(port, "127.0.0.1", () =>
  console.info(`AutoDesk API listening on http://127.0.0.1:${port}.`),
)

process.on("SIGINT", () => shutdown("SIGINT"))

process.on("SIGTERM", () => shutdown("SIGTERM"))
