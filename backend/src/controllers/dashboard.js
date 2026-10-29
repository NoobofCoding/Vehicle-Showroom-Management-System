import Sale from "../models/Sale.js"

import Vehicle from "../models/Vehicle.js"

import { asyncHandler } from "../utils/asyncHandler.js"

import { presentSale, presentVehicle } from "../utils/presenters.js"

export const summary = asyncHandler(async (_req, res) => {
  const [vehicles, sales] = await Promise.all([
    Vehicle.find({ status: "Active" }).lean(),

    Sale.find({ status: "Completed" }).lean(),
  ])

  const inventoryUnits = vehicles.reduce(
    (sum, vehicle) => sum + vehicle.stockQuantity,
    0,
  )

  res.json({
    success: true,

    data: {
      inventoryUnits,

      vehicleRecords: vehicles.length,

      completedSaleUnits: sales.reduce((sum, sale) => sum + sale.quantity, 0),

      completedSalesCount: sales.length,

      revenuePaise: sales.reduce((sum, sale) => sum + sale.totalAmountPaise, 0),

      lowStockVehicles: vehicles
        .filter((vehicle) => vehicle.stockQuantity <= vehicle.lowStockThreshold)
        .map(presentVehicle),
    },
  })
})

export const recentSales = asyncHandler(async (req, res) => {
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 5),
  )

  const records = await Sale.find()
    .populate("vehicle")
    .populate("customer")
    .sort({ saleDate: -1 })
    .limit(limit)

  res.json({ success: true, data: records.map(presentSale) })
})

export const salesReport = asyncHandler(async (req, res) => {
  const filter = {}

  if (req.query.status && ["Completed", "Cancelled"].includes(req.query.status))
    filter.status = req.query.status

  const from = req.query.from

  const to = req.query.to

  if (
    (from && Number.isNaN(Date.parse(from))) ||
    (to && Number.isNaN(Date.parse(to)))
  ) {
    return res.status(400).json({
      success: false,
      message: "Date filters must be valid dates.",
      errors: [],
    })
  }

  if (from || to) {
    filter.saleDate = {}

    if (from) filter.saleDate.$gte = new Date(`${from}T00:00:00.000Z`)

    if (to) filter.saleDate.$lte = new Date(`${to}T23:59:59.999Z`)
  }

  if (req.query.brand) {
    const vehicles = await Vehicle.find({ brand: req.query.brand })
      .select("_id")
      .lean()

    filter.vehicle = { $in: vehicles.map(({ _id }) => _id) }
  }

  const sales = (
    await Sale.find(filter)
      .populate("vehicle")
      .populate("customer")
      .sort({ saleDate: 1 })
  ).map(presentSale)

  res.json({ success: true, data: sales })
})

export const inventoryReport = asyncHandler(async (_req, res) => {
  const vehicles = (
    await Vehicle.find({ status: "Active" }).sort({ brand: 1, model: 1 })
  ).map(presentVehicle)

  res.json({ success: true, data: vehicles })
})

export const dashboardData = { summary, recentSales }

export const reportData = { salesReport, inventoryReport }
