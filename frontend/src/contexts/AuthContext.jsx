import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { apiRequest } from "../services/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await apiRequest("/auth/me")

      setUser(data)
    } catch (error) {
      if (error.status !== 401 && error.status !== 0)
        console.error(error.message)

      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    apiRequest("/auth/me")
      .then(({ data }) => {
        if (active) setUser(data)
      })
      .catch((error) => {
        if (error.status !== 401 && error.status !== 0)
          console.error(error.message)

        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const value = useMemo(
    () => ({
      user,

      loading,

      async login(credentials) {
        const { data } = await apiRequest("/auth/login", {
          method: "POST",
          body: credentials,
        })

        setUser(data)

        return data
      },

      async logout() {
        await apiRequest("/auth/logout", { method: "POST" })

        setUser(null)
      },

      refreshUser,
    }),
    [user, loading, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
