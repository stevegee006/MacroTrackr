let apiUrl: string | null = null;

function deriveApiUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:4000/api/v1';
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  // If running on a custom domain, assume api. subdomain
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//api.${hostname}/api/v1`;
  }
  return 'http://localhost:4000/api/v1';
}

async function getApiUrl(): Promise<string> {
  if (apiUrl) return apiUrl;
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const config = await res.json();
      if (config.apiUrl) {
        apiUrl = config.apiUrl;
        return apiUrl;
      }
    }
  } catch {
    // fallback below
  }
  apiUrl = deriveApiUrl();
  return apiUrl;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const baseUrl = await getApiUrl();
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data.data.accessToken;
    setAccessToken(token);
    return token;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = await getApiUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // If 401, try refreshing the token
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new ApiError(res.status, body.error?.code || 'ERROR', body.error?.message || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
