import { Router } from "express"

import {
  cancelSale,
  createSale,
  getSale,
  listSales,
} from "../controllers/sales.js"

const router = Router()

router.route("/").get(listSales).post(createSale)

router.get("/:id", getSale)

router.post("/:id/cancel", cancelSale)

export default router
