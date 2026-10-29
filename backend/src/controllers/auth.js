import bcrypt from "bcryptjs"

import jwt from "jsonwebtoken"

import User from "../models/User.js"

import { asyncHandler, httpError } from "../utils/asyncHandler.js"

const cookieOptions = () => ({
  httpOnly: true,

  secure: process.env.NODE_ENV === "production",

  sameSite: "strict",

  path: "/",

  maxAge: 8 * 60 * 60 * 1000,
})

const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
})

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase()

  const password = String(req.body.password || "")

  if (!email || !password)
    throw httpError(400, "Email and password are required.")

  const user = await User.findOne({ email }).select("+passwordHash")

  if (
    !user ||
    user.status !== "Active" ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    throw httpError(401, "Email or password is incorrect.")
  }

  const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  })

  res.cookie("autodesk_session", token, cookieOptions())

  res.json({ success: true, data: publicUser(user), message: "Signed in." })
})

export const logout = (_req, res) => {
  res.clearCookie("autodesk_session", { ...cookieOptions(), maxAge: undefined })

  res.json({ success: true, data: null, message: "Signed out." })
}

export const currentUser = (req, res) => {
  res.json({ success: true, data: publicUser(req.user) })
}

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    throw httpError(400, "Current and new passwords are required.")
  }

  if (newPassword.length < 12 || newPassword.length > 200) {
    throw httpError(400, "New password must contain at least 12 characters.")
  }

  const user = await User.findById(req.user._id).select("+passwordHash")

  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw httpError(400, "Current password is incorrect.")
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12)

  user.passwordChangedAt = new Date()

  await user.save()

  res.clearCookie("autodesk_session", { ...cookieOptions(), maxAge: undefined })

  res.json({
    success: true,
    data: null,
    message: "Password updated. Sign in again with your new password.",
  })
})
