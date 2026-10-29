import Setting from "../models/Setting.js"

import { asyncHandler, httpError } from "../utils/asyncHandler.js"

const defaultSettings = (user) => ({
  key: "showroom",

  staffName: user.name,

  staffEmail: user.email,

  showroomName: "AutoDesk Showroom",

  currency: "INR",

  lowStockThreshold: 3,

  emailAlerts: true,

  stockAlerts: true,
})

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.findOneAndUpdate(
    { key: "showroom" },

    { $setOnInsert: defaultSettings(req.user) },

    { upsert: true, new: true, runValidators: true },
  )

  res.json({ success: true, data: settings })
})

export const saveSettings = asyncHandler(async (req, res) => {
  const allowed = [
    "staffName",
    "staffEmail",
    "showroomName",
    "lowStockThreshold",
    "emailAlerts",
    "stockAlerts",
  ]

  const updates = {}

  for (const field of allowed)
    if (req.body[field] !== undefined) updates[field] = req.body[field]

  if (req.body.currency !== undefined && req.body.currency !== "INR")
    throw httpError(400, "Only INR currency display is supported.")

  if (updates.staffEmail)
    updates.staffEmail = String(updates.staffEmail).trim().toLowerCase()

  let settings = await Setting.findOne({ key: "showroom" })

  if (!settings) settings = new Setting(defaultSettings(req.user))

  settings.set(updates)

  await settings.save()

  const userUpdates = {}

  if (updates.staffName) userUpdates.name = updates.staffName

  if (updates.staffEmail) userUpdates.email = updates.staffEmail

  if (Object.keys(userUpdates).length)
    await req.user.updateOne({ $set: userUpdates })

  res.json({ success: true, data: settings, message: "Settings saved." })
})
