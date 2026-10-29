import bcrypt from "bcryptjs"

import User from "../models/User.js"

import { asyncHandler, httpError } from "../utils/asyncHandler.js"

const emailPattern = /^\S+@\S+\.\S+$/

function publicUser(user) {
  return {
    id: user._id.toString(),

    name: user.name,

    email: user.email,

    role: user.role,

    status: user.status,

    createdAt: user.createdAt,
  }
}

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({})

    .select("name email role status createdAt")

    .sort({ name: 1, email: 1 })

    .lean()

  res.json({ success: true, data: users.map(publicUser) })
})

export const createUser = asyncHandler(async (req, res) => {
  const allowedFields = new Set(["name", "email", "password"])

  if (
    !req.body ||
    Object.keys(req.body).some((field) => !allowedFields.has(field))
  ) {
    throw httpError(400, "Only name, email, and password may be provided.")
  }

  const name = typeof req.body.name === "string" ? req.body.name.trim() : ""

  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : ""

  const password = req.body.password

  if (!name || name.length > 120)
    throw httpError(400, "Name is required and must be at most 120 characters.")

  if (!emailPattern.test(email) || email.length > 254)
    throw httpError(400, "Enter a valid email address.")

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 200
  )
    throw httpError(400, "Password must contain 12 to 200 characters.")

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await User.create({
    name,

    email,

    passwordHash,

    role: "Staff",

    status: "Active",
  })

  res.status(201).json({
    success: true,

    data: publicUser(user),

    message: "Staff account created.",
  })
})
