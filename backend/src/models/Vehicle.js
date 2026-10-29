import mongoose from "mongoose"

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, required: true, trim: true, uppercase: true },

    brand: { type: String, required: true, trim: true },

    model: { type: String, required: true, trim: true },

    manufacturingYear: {
      type: Number,
      required: true,
      min: 1886,
      max: new Date().getFullYear() + 1,
      validate: Number.isSafeInteger,
    },

    category: { type: String, required: true, trim: true },

    fuelType: {
      type: String,
      required: true,
      enum: ["Petrol", "Diesel", "Hybrid", "Electric", "CNG"],
    },

    transmission: {
      type: String,
      required: true,
      enum: ["Manual", "Automatic"],
    },

    color: { type: String, required: true, trim: true },

    listedPricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },

    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },

    lowStockThreshold: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
      default: 2,
    },

    description: { type: String, trim: true, default: "" },

    imageId: { type: mongoose.Schema.Types.ObjectId, default: null },

    status: {
      type: String,
      enum: ["Active", "Archived"],
      default: "Active",
      required: true,
    },
  },
  { timestamps: true, collection: "vehicles" },
)

vehicleSchema.index({ vehicleId: 1 }, { unique: true })

vehicleSchema.index({ status: 1, brand: 1, category: 1, manufacturingYear: 1 })

vehicleSchema.index({ brand: 1, model: 1 })

export default mongoose.model("Vehicle", vehicleSchema)
