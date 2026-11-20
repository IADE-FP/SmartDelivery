const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

type Tokens = { access_token: string; refresh_token: string; expires_in: number };
export type SessionUser = { id: string; email: string; role: "COMPANY" | "DRIVER" | "ADMIN"; status: string; profile?: { id: string; name?: string; full_name?: string } };

const storage = () => localStorage.getItem("smartDeliveryTokens") ? localStorage : sessionStorage;
export const saveTokens = (tokens: Tokens, remember: boolean) => {
  localStorage.removeItem("smartDeliveryTokens"); sessionStorage.removeItem("smartDeliveryTokens");
  (remember ? localStorage : sessionStorage).setItem("smartDeliveryTokens", JSON.stringify(tokens));
};
export const clearTokens = () => { localStorage.removeItem("smartDeliveryTokens"); sessionStorage.removeItem("smartDeliveryTokens"); };
const readTokens = (): Tokens | null => { try { return JSON.parse(storage().getItem("smartDeliveryTokens") || "null"); } catch { return null; } };

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const tokens = readTokens();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(tokens ? { Authorization: `Bearer ${tokens.access_token}` } : {}), ...init.headers },
  });
  if (response.status === 401 && retry && tokens?.refresh_token && path !== "/auth/refresh") {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: tokens.refresh_token }) });
    if (refreshed.ok) { saveTokens(await refreshed.json(), storage() === localStorage); return request<T>(path, init, false); }
    clearTokens();
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail = data?.detail;
    throw new Error(typeof detail === "string" ? detail : "Não foi possível concluir o pedido.");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const login = async (email: string, password: string, remember: boolean) => {
  const tokens = await api.post<Tokens>("/auth/login", { email, password });
  saveTokens(tokens, remember);
  return api.get<SessionUser>("/auth/me");
};

export const logout = async () => {
  const tokens = readTokens();
  try { if (tokens?.refresh_token) await api.post("/auth/logout", { refresh_token: tokens.refresh_token }); }
  catch { /* Keep local logout available when the API is temporarily offline. */ }
  finally { clearTokens(); }
};
