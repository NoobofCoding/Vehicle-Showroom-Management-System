import Customer from "../models/Customer.js"

import Sale from "../models/Sale.js"

import { asyncHandler, httpError } from "../utils/asyncHandler.js"

import { paginated, presentCustomer } from "../utils/presenters.js"

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function customerInput(body) {
  const data = {}

  for (const [source, target] of [
    ["id", "customerId"],
    ["customerId", "customerId"],
    ["name", "fullName"],
    ["fullName", "fullName"],
    ["phone", "phone"],
    ["email", "email"],
    ["address", "address"],
    ["status", "status"],
  ]) {
    if (body[source] !== undefined) data[target] = body[source]
  }

  return data
}

export const listCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

  const limit = Math.min(
    500,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 100),
  )

  const filter = {
    status: req.query.status === "Archived" ? "Archived" : "Active",
  }

  if (req.query.search) {
    const search = new RegExp(
      escapeRegex(String(req.query.search).slice(0, 100)),
      "i",
    )

    filter.$or = [
      { customerId: search },
      { fullName: search },
      { phone: search },
    ]
  }

  const [records, total] = await Promise.all([
    Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Customer.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: paginated(records.map(presentCustomer), page, limit, total),
  })
})

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create(customerInput(req.body))

  res.status(201).json({
    success: true,
    data: presentCustomer(customer),
    message: "Customer created.",
  })
})

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ customerId: req.params.id })

  if (!customer) throw httpError(404, "Customer not found.")

  res.json({ success: true, data: presentCustomer(customer) })
})

export const updateCustomer = asyncHandler(async (req, res) => {
  if (req.body.customerId !== undefined || req.body.id !== undefined)
    throw httpError(400, "Customer ID cannot be changed after creation.")

  const customer = await Customer.findOneAndUpdate(
    { customerId: req.params.id },

    customerInput(req.body),

    { new: true, runValidators: true },
  )

  if (!customer) throw httpError(404, "Customer not found.")

  res.json({
    success: true,
    data: presentCustomer(customer),
    message: "Customer updated.",
  })
})

export const archiveCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ customerId: req.params.id })

  if (!customer) throw httpError(404, "Customer not found.")

  if (await Sale.exists({ customer: customer._id })) {
    customer.status = "Archived"

    await customer.save()

    return res.json({
      success: true,
      data: presentCustomer(customer),
      message: "Customer archived to preserve sales history.",
    })
  }

  await customer.deleteOne()

  res.json({ success: true, data: null, message: "Customer deleted." })
})
