import { Router } from "express"

import { inventoryReport, salesReport } from "../controllers/dashboard.js"

const router = Router()

router.get("/sales", salesReport)

router.get("/inventory", inventoryReport)

export default router
