export async function localApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  let result: { data?: T; error?: string };
  try {
    result = await response.json() as { data?: T; error?: string };
  } catch {
    throw new Error(`Local request failed with status ${response.status}.`);
  }
  if (!response.ok) throw new Error(result.error || `Local request failed with status ${response.status}.`);
  return result.data as T;
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value);
}
