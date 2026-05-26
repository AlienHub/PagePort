const ID_BYTES = 12;

export function makePageId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function objectKeyForPage(id: string): string {
  return `pages/${id}.bin`;
}

export function isSafeId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}
