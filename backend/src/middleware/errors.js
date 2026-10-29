export function notFound(_req, res) {
  res
    .status(404)
    .json({ success: false, message: "API route not found.", errors: [] })
}

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error)

  if (error.name === "MulterError") {
    const tooLarge = error.code === "LIMIT_FILE_SIZE"

    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge
        ? "Vehicle image must be 5 MB or smaller."
        : "Vehicle image upload request is invalid.",
      errors: [],
    })
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,

      message: "Please correct the submitted fields.",

      errors: Object.values(error.errors).map(({ path, message }) => ({
        field: path,
        message,
      })),
    })
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "identifier"

    return res.status(409).json({
      success: false,
      message: `${field} is already in use.`,
      errors: [{ field }],
    })
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "The requested record identifier is invalid.",
      errors: [],
    })
  }

  if (error instanceof RangeError || error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message:
        error.type === "entity.parse.failed"
          ? "The request body contains invalid JSON."
          : error.message,
      errors: [],
    })
  }

  const status = error.status || 500

  if (status >= 500) console.error(error.message)

  return res.status(status).json({
    success: false,

    message:
      status >= 500 && process.env.NODE_ENV === "production"
        ? "An unexpected server error occurred."
        : error.message,

    errors: error.errors || [],
  })
}
