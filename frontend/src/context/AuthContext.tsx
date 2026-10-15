import { createContext, useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import api from "../services/api"

interface User {
  google_id: string
  email: string
  nombre: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  setToken: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export { AuthContext }

const initialToken = localStorage.getItem("token")

function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(initialToken)
  const [loading, setLoading] = useState(() => !!initialToken)

  const setToken = useCallback((newToken: string) => {
    localStorage.setItem("token", newToken)
    setTokenState(newToken)
    setLoading(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    setTokenState(null)
    setUser(null)
    setLoading(false)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    if (!token) return

    let cancelled = false

    api
      .get("/auth/me")
      .then((res) => {
        if (!cancelled) setUser(res.data)
      })
      .catch(() => {
        if (!cancelled) logout()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, logout])

  return (
    <AuthContext.Provider value={{ user, token, loading, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthProvider }
export type { AuthContextType }
