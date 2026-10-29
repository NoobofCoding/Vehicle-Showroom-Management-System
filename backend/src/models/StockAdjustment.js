import mongoose from "mongoose"

const adjustmentSchema = new mongoose.Schema(
  {
    adjustmentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },

    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },

    quantityChange: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => Number.isSafeInteger(value) && value !== 0,
        message: "Quantity change must be a non-zero safe integer.",
      },
    },

    newQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },

    staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "stockadjustments" },
)

adjustmentSchema.index({ createdAt: -1 })

export default mongoose.model("StockAdjustment", adjustmentSchema)
