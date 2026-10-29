import { Router } from "express"

import { getSettings, saveSettings } from "../controllers/settings.js"

const router = Router()

router.route("/").get(getSettings).put(saveSettings)

export default router
