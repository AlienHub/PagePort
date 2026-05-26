const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type EncryptionResult = {
  ciphertext: Uint8Array;
  salt: string;
  iv: string;
  iterations: number;
};

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

export async function encryptHtml(html: string, password: string, iterations: number): Promise<EncryptionResult> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(password, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(html));
  return {
    ciphertext: new Uint8Array(ciphertext),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    iterations
  };
}

export async function decryptHtml(
  ciphertext: ArrayBuffer,
  password: string,
  saltBase64: string,
  ivBase64: string,
  iterations: number
): Promise<string> {
  const salt = base64ToBytes(saltBase64);
  const iv = base64ToBytes(ivBase64);
  const key = await deriveAesKey(password, salt, iterations);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return decoder.decode(plaintext);
}

export function configuredIterations(env: { PBKDF2_ITERATIONS?: string }): number {
  const parsed = Number(env.PBKDF2_ITERATIONS);
  if (!Number.isInteger(parsed) || parsed < 1) return 100_000;
  return Math.min(parsed, 100_000);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function deriveAesKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
