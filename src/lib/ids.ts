const ID_BYTES = 12;
const TOKEN_BYTES = 32;

export function makePageId(): string {
  return randomHex(ID_BYTES);
}

export function makeUserId(): string {
  return `usr_${randomHex(ID_BYTES)}`;
}

export function makeIdentityId(): string {
  return `ident_${randomHex(ID_BYTES)}`;
}

export function makeSessionId(): string {
  return `sess_${randomHex(ID_BYTES)}`;
}

export function makeAgentId(): string {
  return `agent_${randomHex(ID_BYTES)}`;
}

export function randomToken(): string {
  return randomHex(TOKEN_BYTES);
}

export function randomVerifier(): string {
  return randomHex(TOKEN_BYTES);
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(ID_BYTES);
  const sized = length === ID_BYTES ? bytes : new Uint8Array(length);
  crypto.getRandomValues(sized);
  return [...sized].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function objectKeyForPage(id: string): string {
  return `pages/${id}.bin`;
}

export function isSafeId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}
