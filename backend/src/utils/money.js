export function rupeesToPaise(value) {
  const rupees = Number(value)

  if (!Number.isFinite(rupees) || rupees < 0)
    throw new RangeError("Amount must be a non-negative number.")

  const paise = Math.round(rupees * 100)

  if (!Number.isSafeInteger(paise))
    throw new RangeError("Amount is outside the supported range.")

  return paise
}

export function calculateTotalPaise(quantity, unitPricePaise, discountPaise) {
  if (!Number.isInteger(quantity) || quantity < 1)
    throw new RangeError("Quantity must be a positive whole number.")

  if (!Number.isSafeInteger(unitPricePaise) || unitPricePaise < 1)
    throw new RangeError("Unit price must be greater than zero.")

  if (!Number.isSafeInteger(discountPaise) || discountPaise < 0)
    throw new RangeError("Discount must be non-negative.")

  const total = quantity * unitPricePaise - discountPaise

  if (!Number.isSafeInteger(total) || total < 1)
    throw new RangeError("Final amount must be greater than zero.")

  return total
}
