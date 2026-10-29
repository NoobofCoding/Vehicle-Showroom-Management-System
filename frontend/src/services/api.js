const baseUrl =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000/api"

export const apiUrl = (path) => new URL(path, `${baseUrl}/`).toString()

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message)

    this.name = "ApiError"

    this.status = status

    this.errors = errors
  }
}

export async function apiRequest(path, { method = "GET", body, query } = {}) {
  const url = new URL(`${baseUrl}${path}`)

  const isFormData = body instanceof FormData

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== "" && value !== undefined && value !== null)
        url.searchParams.set(key, String(value))
    }
  }

  let response

  try {
    response = await fetch(url, {
      method,

      credentials: "include",

      headers:
        body === undefined || isFormData
          ? undefined
          : { "Content-Type": "application/json" },

      body: body === undefined || isFormData ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      "Cannot reach the AutoDesk API. Check that the backend is running and try again.",
      0,
    )
  }

  let result

  try {
    result = await response.json()
  } catch {
    throw new ApiError(
      "The API returned an unreadable response.",
      response.status,
    )
  }

  if (!response.ok || !result.success) {
    throw new ApiError(
      result.message || "The request could not be completed.",
      response.status,
      result.errors,
    )
  }

  return result
}
