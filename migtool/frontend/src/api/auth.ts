export type User = {
  id: number
  username: string
  email: string
  name: string
  created_at: string
}

export type LoginPayload = {
  username: string
  password: string
  remember?: boolean
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

function detailMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string }
    if (typeof first?.msg === 'string') return first.msg
  }
  return fallback
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? (data as { detail: unknown }).detail
        : null
    throw new ApiError(
      response.status,
      detailMessage(detail, response.statusText || 'Request failed'),
    )
  }

  return data as T
}

export function login(payload: LoginPayload): Promise<User> {
  return request<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.username,
      password: payload.password,
      remember: payload.remember ?? false,
    }),
  })
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' })
}

export function getMe(): Promise<User> {
  return request<User>('/auth/me')
}
