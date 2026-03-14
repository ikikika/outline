import { request } from './client'

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

export { ApiError } from './client'
