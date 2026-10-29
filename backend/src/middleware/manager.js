import { httpError } from "../utils/asyncHandler.js"

export function requireManager(req, _res, next) {
  try {
    if (req.user?.role !== "Manager")
      throw httpError(403, "Manager access is required.")

    next()
  } catch (error) {
    next(error)
  }
}
