import { Router } from "express"

import { createUser, listUsers } from "../controllers/users.js"

import { authenticate } from "../middleware/auth.js"

import { requireManager } from "../middleware/manager.js"

const router = Router()

router.use(authenticate, requireManager)

router.get("/", listUsers)

router.post("/", createUser)

export default router
