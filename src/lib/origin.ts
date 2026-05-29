export function publicOrigin(env: { PUBLIC_ORIGIN?: string }, requestUrl: string | URL): string {
  return normalizePublicOrigin(env.PUBLIC_ORIGIN) || new URL(requestUrl).origin;
}

export function publishEndpoint(origin: string): string {
  return `${origin}/v1/publish`;
}

function normalizePublicOrigin(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
}
