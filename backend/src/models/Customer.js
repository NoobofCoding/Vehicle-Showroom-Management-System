import mongoose from "mongoose"

const customerSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, trim: true, uppercase: true },

    fullName: { type: String, required: true, trim: true, maxlength: 120 },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[+\d][\d\s()-]{7,20}$/,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      match: /^(?:|[^\s@]+@[^\s@]+\.[^\s@]+)$/,
    },

    address: { type: String, trim: true, required: true, maxlength: 500 },

    status: {
      type: String,
      enum: ["Active", "Archived"],
      default: "Active",
      required: true,
    },
  },
  { timestamps: true, collection: "customers" },
)

customerSchema.index({ customerId: 1 }, { unique: true })

customerSchema.index({ fullName: 1 })

customerSchema.index({ phone: 1 })

export default mongoose.model("Customer", customerSchema)
