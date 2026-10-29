import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },

    email: { type: String, required: true, trim: true, lowercase: true },

    passwordHash: { type: String, required: true, select: false },

    passwordChangedAt: { type: Date, default: null, select: false },

    role: {
      type: String,
      enum: ["Manager", "Staff"],
      default: "Staff",
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Disabled"],
      default: "Active",
      required: true,
    },
  },
  { timestamps: true, collection: "users" },
)

userSchema.index({ email: 1 }, { unique: true })

export default mongoose.model("User", userSchema)
