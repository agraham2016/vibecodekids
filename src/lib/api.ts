/**
 * API Client
 * 
 * Centralized HTTP client with automatic auth token handling,
 * error normalization, and type-safe responses.
 * 
 * Usage:
 *   import { api } from '../lib/api'
 *   const data = await api.get<UserData>('/api/auth/me')
 *   const result = await api.post('/api/auth/login', { username, password })
 */

let _authToken: string | null = null

/** Set the auth token for all subsequent requests. */
export function setAuthToken(token: string | null) {
  _authToken = token
  if (token) {
    localStorage.setItem('authToken', token)
  } else {
    localStorage.removeItem('authToken')
  }
}

/** Get the current auth token. */
export function getAuthToken(): string | null {
  if (!_authToken) {
    _authToken = localStorage.getItem('authToken')
  }
  return _authToken
}

/** Standard API error with status code. */
export class ApiError extends Error {
  status: number
  data: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/** Build headers with optional auth. */
function buildHeaders(custom?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...custom,
  }
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/** Core fetch wrapper. */
async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, options)

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError(response.statusText, response.status)
    }
    return {} as T
  }

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || `Request failed (${response.status})`,
      response.status,
      data
    )
  }

  return data as T
}

/** API client methods. */
export const api = {
  get<T = any>(url: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, {
      method: 'GET',
      headers: buildHeaders(headers),
    })
  },

  post<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, {
      method: 'POST',
      headers: buildHeaders(headers),
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  put<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, {
      method: 'PUT',
      headers: buildHeaders(headers),
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  delete<T = any>(url: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, {
      method: 'DELETE',
      headers: buildHeaders(headers),
    })
  },
}
