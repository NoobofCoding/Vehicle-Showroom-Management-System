import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { apiRequest } from "./api"

import { useAuth } from "../contexts/AuthContext"

const StoreContext = createContext(null)

async function loadCollection(path) {
  const items = []

  let page = 1

  let pages = 1

  do {
    const { data } = await apiRequest(path, { query: { limit: 500, page } })

    items.push(...data.items)

    pages = data.pages

    page += 1
  } while (page <= pages)

  return items
}

export function StoreProvider({ children }) {
  const { user, loading: authLoading } = useAuth()

  const [state, setState] = useState({
    vehicles: [],

    customers: [],

    sales: [],

    adjustments: [],

    settings: null,

    loading: true,

    error: null,
  })

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const [vehicles, customers, sales, adjustments, settingsResponse] =
        await Promise.all([
          loadCollection("/vehicles"),

          loadCollection("/customers"),

          loadCollection("/sales"),

          loadCollection("/stock-adjustments"),

          apiRequest("/settings"),
        ])

      setState((current) => ({
        ...current,

        vehicles,

        customers,

        sales,

        adjustments,

        settings: settingsResponse.data,

        loading: false,

        error: null,
      }))
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }))
    }
  }, [])

  useEffect(() => {
    if (user && !authLoading) refresh()

    if (!user && !authLoading)
      setState((current) => ({
        ...current,
        vehicles: [],
        customers: [],
        sales: [],
        adjustments: [],
        settings: null,
        loading: false,
        error: null,
      }))
  }, [user, authLoading, refresh])

  const api = useMemo(
    () => ({
      ...state,

      refresh,

      async saveVehicle(vehicle, originalId) {
        const { imageFile, removeImage, ...vehicleFields } = vehicle

        const body = {
          ...(!originalId ? { id: vehicle.id } : {}),

          brand: vehicleFields.brand,

          model: vehicleFields.model,

          year: vehicleFields.year,

          category: vehicleFields.category,

          fuel: vehicleFields.fuel,

          transmission: vehicleFields.transmission,

          color: vehicleFields.color,

          price: vehicleFields.price,

          stock: vehicleFields.stock,

          threshold: vehicleFields.threshold,

          description: vehicleFields.description,
        }

        const requestBody = imageFile || removeImage ? new FormData() : body

        if (requestBody instanceof FormData) {
          for (const [key, value] of Object.entries(body))
            requestBody.append(key, String(value))

          if (imageFile) requestBody.append("image", imageFile)

          if (removeImage) requestBody.append("removeImage", "true")
        }

        await apiRequest(
          originalId
            ? `/vehicles/${encodeURIComponent(originalId)}`
            : "/vehicles",
          {
            method: originalId ? "PATCH" : "POST",

            body: requestBody,
          },
        )

        await refresh()
      },

      async removeVehicle(id) {
        await apiRequest(`/vehicles/${encodeURIComponent(id)}`, {
          method: "DELETE",
        })

        await refresh()
      },

      async saveCustomer(customer, originalId) {
        const body = {
          ...(!originalId ? { id: customer.id } : {}),

          name: customer.name,

          phone: customer.phone,

          email: customer.email,

          address: customer.address,

          status: customer.status,
        }

        await apiRequest(
          originalId
            ? `/customers/${encodeURIComponent(originalId)}`
            : "/customers",
          {
            method: originalId ? "PATCH" : "POST",

            body,
          },
        )

        await refresh()
      },

      async removeCustomer(id) {
        await apiRequest(`/customers/${encodeURIComponent(id)}`, {
          method: "DELETE",
        })

        await refresh()
      },

      async recordSale(sale) {
        const { data } = await apiRequest("/sales", {
          method: "POST",
          body: sale,
        })

        await refresh()

        return data.sale
      },

      async cancelSale(id) {
        await apiRequest(`/sales/${encodeURIComponent(id)}/cancel`, {
          method: "POST",
        })

        await refresh()
      },

      async adjustStock(vehicleId, change, reason) {
        const { data } = await apiRequest("/stock-adjustments", {
          method: "POST",

          body: { vehicleId, change, reason },
        })

        await refresh()

        return data.adjustment
      },

      async saveSettings(settings) {
        const { data } = await apiRequest("/settings", {
          method: "PUT",
          body: settings,
        })

        setState((current) => ({ ...current, settings: data }))

        return data
      },
    }),
    [state, refresh],
  )

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
