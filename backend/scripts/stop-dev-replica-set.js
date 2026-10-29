import mongoose from "mongoose"

import net from "node:net"

const uri = "mongodb://127.0.0.1:27018/admin?directConnection=true"

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

async function isPortClosed() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 27018 })

    socket.setTimeout(500)

    socket.once("connect", () => {
      socket.destroy()

      resolve(false)
    })

    socket.once("timeout", () => {
      socket.destroy()

      resolve(false)
    })

    socket.once("error", (error) => {
      resolve(error.code === "ECONNREFUSED")
    })
  })
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })

try {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 })

  if (
    hello.setName !== "autodeskDev" ||
    !hello.isWritablePrimary ||
    mongoose.connection.host !== "127.0.0.1" ||
    mongoose.connection.port !== 27018
  ) {
    throw new Error(
      "Refusing shutdown: port 27018 is not the expected autodeskDev primary.",
    )
  }

  try {
    await mongoose.connection.db.admin().command({ shutdown: 1 })
  } catch (error) {
    if (error.name !== "MongoNetworkError" && error.code !== 91) throw error
  }
} finally {
  await mongoose.disconnect()
}

const deadline = Date.now() + 15000

while (Date.now() < deadline) {
  if (await isPortClosed()) {
    console.info("The local autodeskDev MongoDB replica set has stopped.")

    process.exit(0)
  }

  await sleep(250)
}

throw new Error("MongoDB shutdown was requested, but port 27018 is still open.")
