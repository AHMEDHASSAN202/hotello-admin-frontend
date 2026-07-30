import { tokenStore } from './auth';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Absolute URL for API-served assets (e.g. `/files/...` storage keys). */
export function assetUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Parsed error body — e.g. 409 payloads carry `violations` details. */
    public readonly details?: unknown,
    /**
     * Stable machine-readable error code (Epic 07, Story 7.4 AC3). The frontend
     * maps this to a translated string so raw English never leaks into the UI.
     */
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<boolean> | null = null;

/** Single-flight silent refresh; concurrent 401s share one attempt. */
function tryRefresh(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const refreshToken = tokenStore.refresh();
      if (!refreshToken) return false;
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      tokenStore.set(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function parseError(
  res: Response,
): Promise<{ message: string; details?: unknown; code?: string }> {
  try {
    const body = await res.json();
    const code = typeof body?.code === 'string' ? body.code : undefined;
    const message = body?.message;
    if (Array.isArray(message))
      return { message: message.join('. '), details: body, code };
    if (typeof message === 'string') return { message, details: body, code };
  } catch {
    // fall through
  }
  return { message: `Request failed (${res.status})` };
}

/**
 * The only way to talk to the backend. Adds the bearer header, parses JSON
 * errors, and retries ONCE after a silent token refresh on 401 — then hard
 * logout. Never call raw fetch from screens.
 */
export async function api<T>(
  path: string,
  init: RequestInit = {},
  allowRetry = true,
): Promise<T> {
  const token = tokenStore.access();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && allowRetry && tokenStore.refresh()) {
    if (await tryRefresh()) {
      return api<T>(path, init, false);
    }
    tokenStore.clear();
    window.location.href = '/login';
    throw new ApiError(401, 'Session expired', undefined, 'SESSION_EXPIRED');
  }

  if (!res.ok) {
    const { message, details, code } = await parseError(res);
    throw new ApiError(res.status, message, details, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Multipart upload variant of api<T>() — same auth/refresh/error handling,
 * but lets the browser set the multipart boundary header itself.
 */
export async function apiUpload<T>(
  path: string,
  body: FormData,
  allowRetry = true,
): Promise<T> {
  const token = tokenStore.access();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (res.status === 401 && allowRetry && tokenStore.refresh()) {
    if (await tryRefresh()) {
      return apiUpload<T>(path, body, false);
    }
    tokenStore.clear();
    window.location.href = '/login';
    throw new ApiError(401, 'Session expired', undefined, 'SESSION_EXPIRED');
  }

  if (!res.ok) {
    const { message, details, code } = await parseError(res);
    throw new ApiError(res.status, message, details, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
