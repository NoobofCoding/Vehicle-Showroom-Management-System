import mongoose from "mongoose"

const saleSchema = new mongoose.Schema(
  {
    saleId: {
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

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    saleDate: { type: Date, required: true, index: true },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },

    unitSellingPricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },

    discountPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
      default: 0,
    },

    totalAmountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },

    status: {
      type: String,
      enum: ["Completed", "Cancelled"],
      required: true,
      default: "Completed",
      index: true,
    },

    vehicleSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },

    customerSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: "sales" },
)

saleSchema.index({ saleDate: -1, status: 1 })

export default mongoose.model("Sale", saleSchema)
