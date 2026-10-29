import mongoose from "mongoose"

import { GridFSBucket } from "mongodb"

import { httpError } from "./asyncHandler.js"

export const MAX_VEHICLE_IMAGE_BYTES = 5 * 1024 * 1024

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export function getVehicleImageBucket() {
  if (mongoose.connection.readyState !== 1)
    throw new Error("MongoDB must be connected to access vehicle images.")

  return new GridFSBucket(mongoose.connection.db, {
    bucketName: "vehicleImages",
  })
}

function matchesImageSignature(file) {
  const { buffer, mimetype } = file

  if (mimetype === "image/jpeg")
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    )

  if (mimetype === "image/png")
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    )

  if (mimetype === "image/webp")
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    )

  return false
}

export async function saveVehicleImage(vehicleId, file) {
  if (!file || !allowedTypes.has(file.mimetype) || !matchesImageSignature(file))
    throw httpError(400, "Upload a valid JPEG, PNG, or WebP image.")

  const bucket = getVehicleImageBucket()

  const upload = bucket.openUploadStream(`${vehicleId}-${Date.now()}`, {
    contentType: file.mimetype,

    metadata: { vehicleId },
  })

  await new Promise((resolve, reject) => {
    upload.once("error", reject)

    upload.once("finish", resolve)

    upload.end(file.buffer)
  })

  return upload.id
}

export async function deleteVehicleImage(imageId) {
  if (!imageId) return

  await getVehicleImageBucket().delete(imageId)
}

export async function removeVehicleImageIfPresent(imageId) {
  if (!imageId) return

  try {
    await deleteVehicleImage(imageId)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
}
