import { Router } from "express"

import { recentSales, summary } from "../controllers/dashboard.js"

const router = Router()

router.get("/summary", summary)

router.get("/recent-sales", recentSales)

export default router
