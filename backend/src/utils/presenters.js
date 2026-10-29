export const toRupees = (paise) => paise / 100

export function presentVehicle(vehicle) {
  if (!vehicle) return null

  const value =
    typeof vehicle.toObject === "function" ? vehicle.toObject() : vehicle

  return {
    id: value.vehicleId,

    vehicleId: value.vehicleId,

    brand: value.brand,

    model: value.model,

    year: value.manufacturingYear,

    manufacturingYear: value.manufacturingYear,

    category: value.category,

    fuel: value.fuelType,

    fuelType: value.fuelType,

    transmission: value.transmission,

    color: value.color,

    price: toRupees(value.listedPricePaise),

    listedPricePaise: value.listedPricePaise,

    stock: value.stockQuantity,

    stockQuantity: value.stockQuantity,

    threshold: value.lowStockThreshold,

    lowStockThreshold: value.lowStockThreshold,

    description: value.description,

    imageUrl: value.imageId
      ? `/api/vehicles/${encodeURIComponent(value.vehicleId)}/image?v=${value.imageId.toString()}`
      : null,

    status: value.status,

    createdAt: value.createdAt,

    updatedAt: value.updatedAt,
  }
}

export function presentCustomer(customer) {
  if (!customer) return null

  const value =
    typeof customer.toObject === "function" ? customer.toObject() : customer

  return {
    id: value.customerId,

    customerId: value.customerId,

    name: value.fullName,

    fullName: value.fullName,

    phone: value.phone,

    email: value.email,

    address: value.address,

    registered: value.createdAt
      ? value.createdAt.toISOString().slice(0, 10)
      : "",

    status: value.status,

    createdAt: value.createdAt,

    updatedAt: value.updatedAt,
  }
}

export function presentSale(sale) {
  if (!sale) return null

  const value = typeof sale.toObject === "function" ? sale.toObject() : sale

  const vehicle =
    value.vehicle &&
    typeof value.vehicle === "object" &&
    value.vehicle.vehicleId
      ? value.vehicle
      : value.vehicleSnapshot

  const customer =
    value.customer &&
    typeof value.customer === "object" &&
    value.customer.customerId
      ? value.customer
      : value.customerSnapshot

  return {
    id: value.saleId,

    saleId: value.saleId,

    date: value.saleDate.toISOString().slice(0, 10),

    saleDate: value.saleDate,

    customerId: customer.customerId,

    vehicleId: vehicle.vehicleId,

    quantity: value.quantity,

    unitPrice: toRupees(value.unitSellingPricePaise),

    discount: toRupees(value.discountPaise),

    amount: toRupees(value.totalAmountPaise),

    status: value.status,

    vehicleSnapshot: value.vehicleSnapshot,

    customerSnapshot: value.customerSnapshot,

    vehicle,

    customer,

    createdAt: value.createdAt,

    updatedAt: value.updatedAt,
  }
}

export function presentAdjustment(adjustment) {
  if (!adjustment) return null

  const value =
    typeof adjustment.toObject === "function"
      ? adjustment.toObject()
      : adjustment

  const vehicle =
    value.vehicle && typeof value.vehicle === "object"
      ? value.vehicle
      : { vehicleId: value.vehicleId }

  return {
    id: value.adjustmentId,

    adjustmentId: value.adjustmentId,

    vehicleId: vehicle.vehicleId,

    previous: value.previousQuantity,

    change: value.quantityChange,

    current: value.newQuantity,

    reason: value.reason,

    staff: value.staff?.name || "Showroom staff",

    date: value.createdAt.toISOString().slice(0, 10),
  }
}

export function paginated(items, page, limit, total) {
  return { items, page, limit, total, pages: Math.ceil(total / limit) }
}
