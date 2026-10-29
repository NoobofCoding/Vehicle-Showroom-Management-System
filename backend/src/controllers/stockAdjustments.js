import mongoose from "mongoose"

import { randomUUID } from "node:crypto"

import { transactionSupport } from "../config/database.js"

import StockAdjustment from "../models/StockAdjustment.js"

import Vehicle from "../models/Vehicle.js"

import { asyncHandler, httpError } from "../utils/asyncHandler.js"

import {
  paginated,
  presentAdjustment,
  presentVehicle,
} from "../utils/presenters.js"

const adjustmentId = () =>
  `AD-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`

export const listAdjustments = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

  const limit = Math.min(
    500,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 100),
  )

  const [records, total] = await Promise.all([
    StockAdjustment.find()
      .populate("vehicle")
      .populate("staff", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),

    StockAdjustment.countDocuments(),
  ])

  res.json({
    success: true,
    data: paginated(records.map(presentAdjustment), page, limit, total),
  })
})

export const createAdjustment = asyncHandler(async (req, res) => {
  if (!transactionSupport)
    throw httpError(
      503,
      "Stock adjustments require MongoDB transaction support. Configure a local replica set before changing stock.",
    )

  const change = Number(req.body.change)

  if (!Number.isInteger(change) || change === 0)
    throw httpError(400, "Quantity change must be a non-zero whole number.")

  if (typeof req.body.reason !== "string" || req.body.reason.trim().length < 3)
    throw httpError(400, "Provide a reason of at least three characters.")

  const session = await mongoose.startSession()

  let saved

  try {
    await session.withTransaction(async () => {
      const vehicle = await Vehicle.findOne({
        vehicleId: req.body.vehicleId,
        status: "Active",
      }).session(session)

      if (!vehicle) throw httpError(404, "Active vehicle not found.")

      const next = vehicle.stockQuantity + change

      if (next < 0) throw httpError(409, "Stock cannot be reduced below zero.")

      const updated = await Vehicle.findOneAndUpdate(
        { _id: vehicle._id, stockQuantity: { $gte: Math.max(-change, 0) } },

        { $inc: { stockQuantity: change } },

        { new: true, session },
      )

      if (!updated)
        throw httpError(
          409,
          "Stock changed before this adjustment could be applied. Refresh and retry.",
        )

      const [adjustment] = await StockAdjustment.create(
        [
          {
            adjustmentId: adjustmentId(),

            vehicle: vehicle._id,

            previousQuantity: vehicle.stockQuantity,

            quantityChange: change,

            newQuantity: updated.stockQuantity,

            reason: req.body.reason.trim(),

            staff: req.user._id,
          },
        ],
        { session },
      )

      saved = {
        adjustment: presentAdjustment({
          ...adjustment.toObject(),
          vehicle: updated.toObject(),
          staff: req.user.toObject(),
        }),
        vehicle: presentVehicle(updated),
      }
    })
  } catch (error) {
    if (
      error.code === 20 ||
      /transaction numbers are only allowed|replica set/i.test(error.message)
    ) {
      throw httpError(
        503,
        "MongoDB transaction support is unavailable. Configure a local replica set before changing stock.",
      )
    }

    throw error
  } finally {
    await session.endSession()
  }

  res
    .status(201)
    .json({ success: true, data: saved, message: "Stock adjustment saved." })
})
