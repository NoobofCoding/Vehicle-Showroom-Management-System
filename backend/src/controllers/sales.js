import { randomUUID } from "node:crypto"

import mongoose from "mongoose"

import Customer from "../models/Customer.js"

import Sale from "../models/Sale.js"

import Vehicle from "../models/Vehicle.js"

import { transactionSupport } from "../config/database.js"

import { asyncHandler, httpError } from "../utils/asyncHandler.js"

import { paginated, presentSale, presentVehicle } from "../utils/presenters.js"

import { calculateTotalPaise, rupeesToPaise } from "../utils/money.js"

const businessId = () =>
  `SL-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`

function assertTransactions() {
  if (!transactionSupport) {
    throw httpError(
      503,
      "Sale operations require MongoDB transaction support. Configure a local replica set before recording or cancelling sales.",
    )
  }
}

function transactionError(error) {
  if (
    error.code === 20 ||
    /transaction numbers are only allowed|replica set/i.test(error.message)
  ) {
    return httpError(
      503,
      "MongoDB transaction support is unavailable. Configure a local replica set before changing sales or stock.",
    )
  }

  return error
}

export const listSales = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

  const limit = Math.min(
    500,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 100),
  )

  const filter = {}

  if (req.query.status && ["Completed", "Cancelled"].includes(req.query.status))
    filter.status = req.query.status

  if (req.query.search) {
    const search = new RegExp(
      String(req.query.search)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .slice(0, 100),
      "i",
    )

    const [vehicles, customers] = await Promise.all([
      Vehicle.find({
        $or: [{ vehicleId: search }, { brand: search }, { model: search }],
      })
        .select("_id")
        .lean(),

      Customer.find({ $or: [{ customerId: search }, { fullName: search }] })
        .select("_id")
        .lean(),
    ])

    filter.$or = [
      { saleId: search },

      { vehicle: { $in: vehicles.map(({ _id }) => _id) } },

      { customer: { $in: customers.map(({ _id }) => _id) } },
    ]
  }

  const from = req.query.from || req.query.startDate

  const to = req.query.to || req.query.endDate

  if (
    (from && Number.isNaN(Date.parse(from))) ||
    (to && Number.isNaN(Date.parse(to)))
  )
    throw httpError(400, "Date filters must be valid dates.")

  if (from && to && from > to)
    throw httpError(400, "The start date cannot be after the end date.")

  if (from || to) {
    filter.saleDate = {}

    if (from) filter.saleDate.$gte = new Date(`${from}T00:00:00.000Z`)

    if (to) filter.saleDate.$lte = new Date(`${to}T23:59:59.999Z`)
  }

  if (req.query.vehicle) {
    const vehicle = await Vehicle.findOne({
      vehicleId: req.query.vehicle,
    }).select("_id")

    if (!vehicle)
      return res.json({ success: true, data: paginated([], page, limit, 0) })

    filter.vehicle = vehicle._id
  }

  if (req.query.customer) {
    const customer = await Customer.findOne({
      customerId: req.query.customer,
    }).select("_id")

    if (!customer)
      return res.json({ success: true, data: paginated([], page, limit, 0) })

    filter.customer = customer._id
  }

  const [records, total] = await Promise.all([
    Sale.find(filter)
      .populate("vehicle")
      .populate("customer")
      .sort({ saleDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),

    Sale.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: paginated(records.map(presentSale), page, limit, total),
  })
})

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ saleId: req.params.id })
    .populate("vehicle")
    .populate("customer")

  if (!sale) throw httpError(404, "Sale not found.")

  res.json({ success: true, data: presentSale(sale) })
})

export const createSale = asyncHandler(async (req, res) => {
  assertTransactions()

  const quantity = Number(req.body.quantity)

  let unitSellingPricePaise

  let discountPaise

  try {
    unitSellingPricePaise = rupeesToPaise(req.body.unitPrice)

    discountPaise = rupeesToPaise(req.body.discount || 0)
  } catch (error) {
    throw httpError(400, error.message)
  }

  const saleDate = new Date(
    `${req.body.date || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
  )

  if (!Number.isInteger(quantity) || quantity < 1)
    throw httpError(400, "Quantity must be a positive whole number.")

  if (!Number.isSafeInteger(unitSellingPricePaise) || unitSellingPricePaise < 1)
    throw httpError(400, "Unit selling price must be greater than zero.")

  if (!Number.isSafeInteger(discountPaise) || discountPaise < 0)
    throw httpError(400, "Discount must be a non-negative amount.")

  if (Number.isNaN(saleDate.valueOf()))
    throw httpError(400, "Sale date is invalid.")

  let totalAmountPaise

  try {
    totalAmountPaise = calculateTotalPaise(
      quantity,
      unitSellingPricePaise,
      discountPaise,
    )
  } catch (error) {
    throw httpError(400, error.message)
  }

  const session = await mongoose.startSession()

  let saved

  try {
    await session.withTransaction(async () => {
      const vehicle = await Vehicle.findOne({
        vehicleId: req.body.vehicleId,
        status: "Active",
      }).session(session)

      const customer = await Customer.findOne({
        customerId: req.body.customerId,
        status: "Active",
      }).session(session)

      if (!vehicle)
        throw httpError(404, "An active vehicle record is required.")

      if (!customer)
        throw httpError(404, "An active customer record is required.")

      const updatedVehicle = await Vehicle.findOneAndUpdate(
        {
          _id: vehicle._id,
          status: "Active",
          stockQuantity: { $gte: quantity },
        },

        { $inc: { stockQuantity: -quantity } },

        { new: true, session },
      )

      if (!updatedVehicle)
        throw httpError(
          409,
          "There is not enough available stock for this sale.",
        )

      const [sale] = await Sale.create(
        [
          {
            saleId: businessId(),

            vehicle: vehicle._id,

            customer: customer._id,

            saleDate,

            quantity,

            unitSellingPricePaise,

            discountPaise,

            totalAmountPaise,

            status: "Completed",

            vehicleSnapshot: {
              vehicleId: vehicle.vehicleId,

              brand: vehicle.brand,

              model: vehicle.model,

              manufacturingYear: vehicle.manufacturingYear,

              category: vehicle.category,

              fuelType: vehicle.fuelType,

              transmission: vehicle.transmission,

              color: vehicle.color,

              listedPricePaise: vehicle.listedPricePaise,
            },

            customerSnapshot: {
              customerId: customer.customerId,

              fullName: customer.fullName,

              phone: customer.phone,

              email: customer.email,

              address: customer.address,
            },
          },
        ],
        { session },
      )

      saved = {
        sale: presentSale({
          ...sale.toObject(),
          vehicle: updatedVehicle.toObject(),
          customer: customer.toObject(),
        }),

        vehicle: presentVehicle(updatedVehicle),
      }
    })
  } catch (error) {
    throw transactionError(error)
  } finally {
    await session.endSession()
  }

  res.status(201).json({
    success: true,
    data: saved,
    message: "Sale recorded and stock updated.",
  })
})

export const cancelSale = asyncHandler(async (req, res) => {
  assertTransactions()

  const session = await mongoose.startSession()

  let saved

  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findOne({ saleId: req.params.id }).session(
        session,
      )

      if (!sale) throw httpError(404, "Sale not found.")

      if (sale.status === "Cancelled")
        throw httpError(409, "This sale has already been cancelled.")

      const result = await Sale.updateOne(
        { _id: sale._id, status: "Completed" },
        { $set: { status: "Cancelled" } },
        { session },
      )

      if (result.modifiedCount !== 1)
        throw httpError(409, "This sale has already been cancelled.")

      const vehicle = await Vehicle.findByIdAndUpdate(
        sale.vehicle,
        { $inc: { stockQuantity: sale.quantity } },
        { new: true, session },
      )

      if (!vehicle)
        throw httpError(
          409,
          "The vehicle record is unavailable; cancellation was not applied.",
        )

      sale.status = "Cancelled"

      saved = { sale: presentSale(sale), vehicle: presentVehicle(vehicle) }
    })
  } catch (error) {
    throw transactionError(error)
  } finally {
    await session.endSession()
  }

  res.json({
    success: true,
    data: saved,
    message: "Sale cancelled and stock restored.",
  })
})
