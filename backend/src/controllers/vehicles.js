import Vehicle from "../models/Vehicle.js"

import Sale from "../models/Sale.js"

import StockAdjustment from "../models/StockAdjustment.js"

import { asyncHandler, httpError } from "../utils/asyncHandler.js"

import { paginated, presentVehicle } from "../utils/presenters.js"

import { rupeesToPaise } from "../utils/money.js"

import {
  getVehicleImageBucket,
  removeVehicleImageIfPresent,
  saveVehicleImage,
} from "../utils/vehicleImages.js"

const sortFields = new Set([
  "vehicleId",
  "brand",
  "model",
  "manufacturingYear",
  "listedPricePaise",
  "stockQuantity",
])

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function vehicleInput(body, creating = false) {
  const data = {}

  const copy = (from, to, transform = (value) => value) => {
    if (body[from] !== undefined) data[to] = transform(body[from])
  }

  copy("id", "vehicleId")

  copy("brand", "brand")

  copy("model", "model")

  copy("year", "manufacturingYear", Number)

  copy("category", "category")

  copy("fuel", "fuelType")

  copy("transmission", "transmission")

  copy("color", "color")

  copy("price", "listedPricePaise", rupeesToPaise)

  copy("stock", "stockQuantity", Number)

  copy("threshold", "lowStockThreshold", Number)

  copy("description", "description")

  if (!creating) copy("status", "status")

  return data
}

export const listVehicles = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

  const limit = Math.min(
    500,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 100),
  )

  const filter = {
    status: req.query.status === "Archived" ? "Archived" : "Active",
  }

  if (req.query.brand) filter.brand = req.query.brand

  if (req.query.category) filter.category = req.query.category

  if (req.query.year) {
    const year = Number(req.query.year)

    if (
      !Number.isInteger(year) ||
      year < 1886 ||
      year > new Date().getFullYear() + 1
    )
      throw httpError(400, "Manufacturing year filter is invalid.")

    filter.manufacturingYear = year
  }

  if (req.query.search) {
    const search = new RegExp(
      escapeRegex(String(req.query.search).slice(0, 100)),
      "i",
    )

    filter.$or = [{ vehicleId: search }, { brand: search }, { model: search }]
  }

  if (req.query.minPrice || req.query.maxPrice) {
    const minimum =
      req.query.minPrice === undefined ? undefined : Number(req.query.minPrice)

    const maximum =
      req.query.maxPrice === undefined ? undefined : Number(req.query.maxPrice)

    if (
      (minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0)) ||
      (maximum !== undefined && (!Number.isFinite(maximum) || maximum < 0)) ||
      (minimum !== undefined && maximum !== undefined && minimum > maximum)
    ) {
      throw httpError(
        400,
        "Price filters must be non-negative and the minimum cannot exceed the maximum.",
      )
    }

    filter.listedPricePaise = {}

    if (minimum !== undefined)
      filter.listedPricePaise.$gte = Math.round(minimum * 100)

    if (maximum !== undefined)
      filter.listedPricePaise.$lte = Math.round(maximum * 100)
  }

  if (req.query.stockStatus === "Low stock")
    filter.$expr = {
      $and: [
        { $gt: ["$stockQuantity", 0] },
        { $lte: ["$stockQuantity", "$lowStockThreshold"] },
      ],
    }

  if (req.query.stockStatus === "Out of stock") filter.stockQuantity = 0

  if (req.query.stockStatus === "In stock")
    filter.$expr = { $gt: ["$stockQuantity", "$lowStockThreshold"] }

  const sortBy = sortFields.has(req.query.sort) ? req.query.sort : "brand"

  const direction = req.query.order === "desc" ? -1 : 1

  const [records, total] = await Promise.all([
    Vehicle.find(filter)
      .sort({ [sortBy]: direction })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Vehicle.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: paginated(records.map(presentVehicle), page, limit, total),
  })
})

export const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = new Vehicle(vehicleInput(req.body, true))

  await vehicle.validate()

  let newImageId

  try {
    if (req.file) {
      newImageId = await saveVehicleImage(vehicle.vehicleId, req.file)
      vehicle.imageId = newImageId
    }

    await vehicle.save()
  } catch (error) {
    if (newImageId) await removeVehicleImageIfPresent(newImageId)

    throw error
  }

  res.status(201).json({
    success: true,
    data: presentVehicle(vehicle),
    message: "Vehicle created.",
  })
})

export const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({ vehicleId: req.params.id })

  if (!vehicle) throw httpError(404, "Vehicle not found.")

  res.json({ success: true, data: presentVehicle(vehicle) })
})

export const getVehicleImage = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOne({ vehicleId: req.params.id }).select(
    "imageId",
  )

  if (!vehicle || !vehicle.imageId)
    throw httpError(404, "Vehicle image not found.")

  const file = await getVehicleImageBucket()
    .find({ _id: vehicle.imageId })
    .next()

  if (!file) throw httpError(404, "Vehicle image not found.")

  res.set({
    "Content-Type": file.contentType,
    "Content-Length": String(file.length),
    "Cache-Control": "private, no-store",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
  })

  const stream = getVehicleImageBucket().openDownloadStream(vehicle.imageId)

  stream.once("error", (error) => {
    if (res.headersSent) {
      res.destroy(error)
      return
    }

    next(httpError(404, "Vehicle image not found."))
  })

  stream.pipe(res)
})

export const updateVehicle = asyncHandler(async (req, res) => {
  if (req.body.vehicleId !== undefined || req.body.id !== undefined)
    throw httpError(400, "Vehicle ID cannot be changed after creation.")

  if (req.file && ["true", true].includes(req.body.removeImage))
    throw httpError(
      400,
      "Choose an image or remove the current image, not both.",
    )

  const vehicle = await Vehicle.findOne({ vehicleId: req.params.id })

  if (!vehicle) throw httpError(404, "Vehicle not found.")

  const previousImageId = vehicle.imageId
  let newImageId

  vehicle.set(vehicleInput(req.body))

  try {
    if (req.file) {
      newImageId = await saveVehicleImage(vehicle.vehicleId, req.file)
      vehicle.imageId = newImageId
    } else if (["true", true].includes(req.body.removeImage)) {
      vehicle.imageId = null
    }

    await vehicle.save()
  } catch (error) {
    if (newImageId) await removeVehicleImageIfPresent(newImageId)

    throw error
  }

  let message = "Vehicle updated."

  if (
    previousImageId &&
    previousImageId.toString() !== vehicle.imageId?.toString()
  ) {
    try {
      await removeVehicleImageIfPresent(previousImageId)
    } catch (error) {
      console.error(`Old vehicle image cleanup failed: ${error.message}`)
      message = "Vehicle updated, but the previous image could not be removed."
    }
  }

  res.json({
    success: true,
    data: presentVehicle(vehicle),
    message,
  })
})

export const archiveVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({ vehicleId: req.params.id })

  if (!vehicle) throw httpError(404, "Vehicle not found.")

  const hasHistory =
    (await Sale.exists({ vehicle: vehicle._id })) ||
    (await StockAdjustment.exists({ vehicle: vehicle._id }))

  if (hasHistory) {
    vehicle.status = "Archived"

    await vehicle.save()

    return res.json({
      success: true,
      data: presentVehicle(vehicle),
      message: "Vehicle archived to preserve its history.",
    })
  }

  await vehicle.deleteOne()

  res.json({ success: true, data: null, message: "Vehicle deleted." })
})
