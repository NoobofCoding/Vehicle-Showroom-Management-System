import mongoose from "mongoose"

export let transactionSupport = false

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error("MONGODB_URI is not configured.")

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })

    const hello = await mongoose.connection.db.admin().command({ hello: 1 })

    transactionSupport = Boolean(hello.setName || hello.msg === "isdbgrid")

    console.info(`MongoDB connected to database "${mongoose.connection.name}".`)

    if (!transactionSupport) {
      console.warn(
        "MongoDB is running as a standalone server. Multi-document transactions are unavailable; sale and adjustment writes will be rejected.",
      )
    }
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`)

    throw error
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}
