import test from "node:test"

import assert from "node:assert/strict"

import { calculateTotalPaise, rupeesToPaise } from "../src/utils/money.js"

test("rupees convert to exact integer paise", () => {
  assert.equal(rupeesToPaise(12500), 1250000)

  assert.equal(rupeesToPaise(99.95), 9995)

  assert.throws(() => rupeesToPaise(Number.NaN), RangeError)
})

test("sale totals are calculated in integer paise", () => {
  assert.equal(calculateTotalPaise(2, 1250000, 100000), 2400000)

  assert.throws(() => calculateTotalPaise(0, 10000, 0), RangeError)

  assert.throws(() => calculateTotalPaise(1, 10000, 10000), RangeError)
})
