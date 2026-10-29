import { Router } from "express"

import { rateLimit } from "express-rate-limit"

import {
  changePassword,
  currentUser,
  login,
  logout,
} from "../controllers/auth.js"

import { authenticate } from "../middleware/auth.js"

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 10,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many sign-in attempts. Try again later.",
    errors: [],
  },
})

router.post("/login", loginLimiter, login)

router.post("/logout", logout)

router.get("/me", authenticate, currentUser)

router.patch("/password", authenticate, changePassword)

export default router
