// ==========================================
// Central HTTP wrapper — robust error handling
// ==========================================

import type { ApiError } from '@/domain/types';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  `http://${window.location.hostname}:8000`;

/**
 * Wraps fetch with JSON parsing and normalized error handling.
 * Never throws raw errors — always returns ApiError shape on failure.
 */
export async function http<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  let response: Response;

  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    // Network error (no response at all)
    const err: ApiError = {
      status: 0,
      message: 'Impossible de contacter le serveur. Vérifie ta connexion.',
    };
    throw err;
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const err: ApiError = {
      status: response.status,
      message:
        typeof data === 'object' && data !== null && 'message' in data
          ? String((data as Record<string, unknown>).message)
          : typeof data === 'object' && data !== null && 'detail' in data
            ? String((data as Record<string, unknown>).detail)
            : `Erreur ${response.status}`,
      data: typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined,
    };
    throw err;
  }

  return data as T;
}
