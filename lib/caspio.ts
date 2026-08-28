type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function normalizeBaseUrl(value: string): string {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/$/, "");
}

export async function getCaspioAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requiredEnv("CASPIO_CLIENT_ID"),
    client_secret: requiredEnv("CASPIO_CLIENT_SECRET")
  });

  const response = await fetch(requiredEnv("CASPIO_TOKEN_URL"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`Caspio authentication failed: ${response.status}`);

  const data = (await response.json()) as TokenResponse;
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

export async function caspioFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const integrationUrl = normalizeBaseUrl(requiredEnv("CASPIO_INTEGRATION_URL"));
  const token = await getCaspioAccessToken();
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  const response = await fetch(`${integrationUrl}/integrations/rest/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...init.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Caspio v4 request failed: ${response.status} ${details}`);
  }

  return response.json() as Promise<T>;
}
