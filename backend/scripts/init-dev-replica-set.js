import "dotenv/config"

import mongoose from "mongoose"

const replicaSetName = "autodeskDev"

const source = process.env.MONGODB_URI

if (!source) throw new Error("Set MONGODB_URI before initializing MongoDB.")

const configured = new URL(source)

if (!["127.0.0.1", "localhost", "::1"].includes(configured.hostname)) {
  throw new Error(
    "Replica-set initialization is restricted to loopback MongoDB.",
  )
}

const port = configured.port || "27017"

if (
  port !== "27018" ||
  decodeURIComponent(configured.pathname.slice(1)) !== "autodesk_dev"
) {
  throw new Error(
    "The legacy development replica-set initializer is restricted to port 27018 and database autodesk_dev.",
  )
}

const bootstrapUri = `mongodb://127.0.0.1:${port}/admin?directConnection=true`

try {
  await mongoose.connect(bootstrapUri, { serverSelectionTimeoutMS: 5000 })

  const admin = mongoose.connection.db.admin()

  const hello = await admin.command({ hello: 1 })

  if (hello.setName && hello.setName !== replicaSetName) {
    throw new Error(
      `MongoDB already belongs to replica set "${hello.setName}", not "${replicaSetName}".`,
    )
  }

  if (!hello.setName) {
    try {
      await admin.command({
        replSetInitiate: {
          _id: replicaSetName,

          members: [{ _id: 0, host: `127.0.0.1:${port}` }],
        },
      })
    } catch (error) {
      if (error.code !== 23 && error.codeName !== "AlreadyInitialized")
        throw error
    }
  }

  const deadline = Date.now() + 30000

  let primary = false

  while (Date.now() < deadline) {
    const status = await admin.command({ hello: 1 })

    if (status.setName && status.isWritablePrimary) {
      if (status.setName !== replicaSetName)
        throw new Error(`Unexpected replica set "${status.setName}".`)

      primary = true

      break
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  if (!primary)
    throw new Error("MongoDB did not elect a writable replica-set primary.")

  console.info(
    `Local MongoDB replica set "${replicaSetName}" is ready on 127.0.0.1:${port}.`,
  )
} finally {
  await mongoose.disconnect()
}
