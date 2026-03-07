import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ApiError,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  type User,
} from '../api/auth'

export type AuthUser = User & {
  initials: string
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string, remember: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function toAuthUser(user: User): AuthUser {
  return {
    ...user,
    initials: initialsFromName(user.name) || user.username.slice(0, 2).toUpperCase(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const me = await getMe()
        if (!cancelled) setUser(toAuthUser(me))
      } catch (err) {
        if (!cancelled) {
          if (!(err instanceof ApiError && err.status === 401)) {
            console.error('Failed to restore session', err)
          }
          setUser(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (username: string, password: string, remember: boolean) => {
      const trimmed = username.trim()
      if (!trimmed || !password) {
        throw new Error('Username and password are required')
      }
      const next = await loginRequest({
        username: trimmed,
        password,
        remember,
      })
      setUser(toAuthUser(next))
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
