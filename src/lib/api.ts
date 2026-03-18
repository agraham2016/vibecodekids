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

let _authToken: string | null = null;

/** Set the auth token for all subsequent requests. */
export function setAuthToken(token: string | null) {
  _authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

/** Get the current auth token. */
export function getAuthToken(): string | null {
  if (!_authToken) {
    _authToken = localStorage.getItem('authToken');
  }
  return _authToken;
}

/** Standard API error with status code. */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Build headers with optional auth. */
function buildHeaders(custom?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...custom,
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Core fetch wrapper. */
async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, options);

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError(response.statusText, response.status);
    }
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error || data.message || `Request failed (${response.status})`, response.status, data);
  }

  return data as T;
}

/** API client methods. */
export const api = {
  get<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, {
      method: 'GET',
      headers: buildHeaders(headers),
      cache: 'no-store', // Prevent showing wrong user's cached data
    });
  },

  post<T = unknown>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, {
      method: 'POST',
      headers: buildHeaders(headers),
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T = unknown>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, {
      method: 'PUT',
      headers: buildHeaders(headers),
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, {
      method: 'DELETE',
      headers: buildHeaders(headers),
    });
  },

  async postSSE<T = unknown>(
    url: string,
    body: unknown,
    onStatus: (status: { stage: string; message: string }) => void,
  ): Promise<T> {
    const headers = buildHeaders({ Accept: 'text/event-stream' });
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new ApiError(
          (typeof data.error === 'string' && data.error) ||
            (typeof data.message === 'string' && data.message) ||
            `Request failed (${response.status})`,
          response.status,
          data,
        );
      }
      return data as T;
    }

    if (!response.ok && !response.body) {
      throw new ApiError(response.statusText, response.status);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: T | undefined;
    let sseError: string | undefined;

    for (;;) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        let eventType = 'message';
        let data = '';
        for (const line of part.split('\n')) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim();
          else if (line.startsWith('data: ')) data += line.slice(6);
          else if (line.startsWith('data:')) data += line.slice(5);
        }
        if (!data) continue;

        if (eventType === 'status') {
          try {
            onStatus(JSON.parse(data));
          } catch {
            /* malformed status — skip */
          }
        } else if (eventType === 'result') {
          result = JSON.parse(data) as T;
        } else if (eventType === 'error') {
          const parsed = JSON.parse(data);
          sseError = parsed.error || 'Generation failed';
        }
      }

      if (done) break;
    }

    if (sseError) throw new ApiError(sseError, 500);
    if (!result) throw new ApiError('Stream ended without a result', 500);
    return result;
  },
};
