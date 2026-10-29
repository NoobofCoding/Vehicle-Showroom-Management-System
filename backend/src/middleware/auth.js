import jwt from "jsonwebtoken"

import User from "../models/User.js"

import { asyncHandler, httpError } from "../utils/asyncHandler.js"

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.autodesk_session

  if (!token) throw httpError(401, "Sign in to continue.")

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(payload.sub).select("+passwordChangedAt")

    if (!user || user.status !== "Active")
      throw httpError(401, "Your staff session is no longer active.")

    if (
      user.passwordChangedAt &&
      payload.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      throw httpError(401, "Your password has changed. Sign in again.")
    }

    req.user = user

    next()
  } catch (error) {
    if (error.status) throw error

    throw httpError(401, "Your session has expired. Sign in again.")
  }
})
