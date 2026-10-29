import "dotenv/config"

import readline from "node:readline"

import bcrypt from "bcryptjs"

import { connectDatabase, disconnectDatabase } from "../src/config/database.js"

import User from "../src/models/User.js"

function ask(prompt) {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    terminal.question(prompt, (answer) => {
      terminal.close()

      resolve(answer.trim())
    }),
  )
}

function askPassword() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error(
      "Run this command in an interactive terminal to enter the initial staff password.",
    )
  }

  process.stdout.write("Staff password (minimum 12 characters): ")

  process.stdin.setRawMode(true)

  process.stdin.resume()

  return new Promise((resolve, reject) => {
    let password = ""

    const finish = (error) => {
      process.stdin.setRawMode(false)

      process.stdin.pause()

      process.stdin.removeListener("data", onData)

      process.stdout.write("\n")

      if (error) reject(error)
      else resolve(password)
    }

    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === "\u0003")
          return finish(new Error("Account setup cancelled."))

        if (character === "\r" || character === "\n") return finish()

        if (character === "\u0008" || character === "\u007f")
          password = password.slice(0, -1)
        else if (character >= " ") password += character
      }
    }

    process.stdin.on("data", onData)
  })
}

const name = (process.argv[2] || (await ask("Staff name: "))).trim()

const email = (process.argv[3] || (await ask("Staff email: ")))
  .trim()
  .toLowerCase()

if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
  throw new Error("Provide a name and valid email address.")
}

await connectDatabase()

try {
  if (await User.exists({ email })) {
    throw new Error(
      "A staff account with that email already exists. This command does not change existing accounts.",
    )
  }

  const password = await askPassword()

  if (password.length < 12) {
    throw new Error("Staff password must contain at least 12 characters.")
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: "Manager",
    status: "Active",
  })

  console.info(`Created showroom manager account for ${user.email}.`)
} finally {
  await disconnectDatabase()
}
