import { Router } from "express"

import {
  archiveVehicle,
  createVehicle,
  getVehicle,
  getVehicleImage,
  listVehicles,
  updateVehicle,
} from "../controllers/vehicles.js"

import { vehicleImageUpload } from "../middleware/vehicleImageUpload.js"

const router = Router()

router.get("/", listVehicles)

router.post("/", vehicleImageUpload, createVehicle)

router.get("/:id/image", getVehicleImage)

router.get("/:id", getVehicle)

router.patch("/:id", vehicleImageUpload, updateVehicle)

router.delete("/:id", archiveVehicle)

export default router
