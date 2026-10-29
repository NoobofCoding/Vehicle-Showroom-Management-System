import { Router } from "express"

import {
  createAdjustment,
  listAdjustments,
} from "../controllers/stockAdjustments.js"

const router = Router()

router.route("/").get(listAdjustments).post(createAdjustment)

export default router
