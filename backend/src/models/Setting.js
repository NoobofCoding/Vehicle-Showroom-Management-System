import mongoose from "mongoose"

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "showroom" },

    staffName: {
      type: String,
      required: true,
      default: "Showroom Manager",
      trim: true,
    },

    staffEmail: {
      type: String,
      required: true,
      default: "",
      trim: true,
      lowercase: true,
    },

    showroomName: {
      type: String,
      required: true,
      default: "AutoDesk Showroom",
      trim: true,
    },

    currency: { type: String, enum: ["INR"], default: "INR", required: true },

    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 3,
      validate: Number.isSafeInteger,
    },

    emailAlerts: { type: Boolean, default: true },

    stockAlerts: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "settings" },
)

export default mongoose.model("Setting", settingSchema)
