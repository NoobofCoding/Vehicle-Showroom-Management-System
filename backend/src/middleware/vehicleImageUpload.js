import multer from "multer"

import { MAX_VEHICLE_IMAGE_BYTES } from "../utils/vehicleImages.js"

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export const vehicleImageUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_VEHICLE_IMAGE_BYTES,

    files: 1,

    fields: 30,

    parts: 31,
  },

  fileFilter(_req, file, callback) {
    if (!supportedTypes.has(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, or WebP image.")

      error.status = 400

      callback(error)

      return
    }

    callback(null, true)
  },
}).single("image")
