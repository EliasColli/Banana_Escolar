import { BananaApi, type LoginResponse } from '@banana/api-client';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/v1';

let accessToken: string | null = null;
let refreshPromise: Promise<LoginResponse | null> | null = null;

export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

/** Renueva la sesión usando la cookie HttpOnly (web) sin pasar por el cliente principal. */
export function refreshSession(): Promise<LoginResponse | null> {
  if (!refreshPromise) {
    const hadSession = accessToken !== null;
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
    })
      .then(async (response) => {
        if (!response.ok) {
          if (hadSession) window.dispatchEvent(new Event('banana:session-expired'));
          return null;
        }
        const session = (await response.json()) as LoginResponse;
        setAccessToken(session.accessToken);
        return session;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export const api = new BananaApi({
  baseUrl: API_URL,
  getAccessToken,
  onUnauthorized: async () => {
    await refreshSession();
  },
});

/** Convierte una ruta `/v1/...` de la API en URL absoluta para <img>. */
export function assetUrl(path: string): string {
  const origin = new URL(API_URL).origin;
  return path.startsWith('http') ? path : `${origin}${path}`;
}
