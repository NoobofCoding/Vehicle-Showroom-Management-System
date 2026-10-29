import "dotenv/config"

import express from "express"

import cors from "cors"

import helmet from "helmet"

import cookieParser from "cookie-parser"

import { authenticate } from "./middleware/auth.js"

import { errorHandler, notFound } from "./middleware/errors.js"

import authRoutes from "./routes/auth.js"

import customerRoutes from "./routes/customers.js"

import dashboardRoutes from "./routes/dashboard.js"

import reportRoutes from "./routes/reports.js"

import saleRoutes from "./routes/sales.js"

import settingRoutes from "./routes/settings.js"

import stockAdjustmentRoutes from "./routes/stockAdjustments.js"

import vehicleRoutes from "./routes/vehicles.js"

import userRoutes from "./routes/users.js"

import mongoose from "mongoose"

import { transactionSupport } from "./config/database.js"

const app = express()

app.disable("x-powered-by")

app.use(helmet())

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",

    credentials: true,
  }),
)

app.use(express.json({ limit: "1mb" }))

app.use(cookieParser())

app.use("/api", (req, res, next) => {
  const origin = req.get("Origin")

  if (
    origin &&
    origin !== (process.env.FRONTEND_URL || "http://localhost:5173")
  ) {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed.",
      errors: [],
    })
  }

  next()
})

if (process.env.NODE_ENV !== "test") {
  const morgan = (await import("morgan")).default

  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))
}

app.get("/api/health", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1

  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,

    data: {
      api: "running",

      database: databaseReady ? "connected" : "disconnected",

      transactions: transactionSupport ? "supported" : "unsupported",

      databaseName: databaseReady ? mongoose.connection.name : null,
    },
  })
})

app.use("/api/auth", authRoutes)

app.use("/api/users", userRoutes)

app.use("/api", authenticate)

app.use("/api/vehicles", vehicleRoutes)

app.use("/api/customers", customerRoutes)

app.use("/api/sales", saleRoutes)

app.use("/api/stock-adjustments", stockAdjustmentRoutes)

app.use("/api/dashboard", dashboardRoutes)

app.use("/api/reports", reportRoutes)

app.use("/api/settings", settingRoutes)

app.use(notFound)

app.use(errorHandler)

export default app
