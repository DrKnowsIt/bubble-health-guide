/**
 * PHI Protection — client-side cryptography helpers.
 *
 * Threat model:
 *   - Server (us) MUST NOT be able to read identifiers / PHI at rest.
 *   - Only the user's browser, with their password OR recovery phrase,
 *     can derive the data key that unlocks ciphertext.
 *
 * Primitives:
 *   - AES-GCM-256 for symmetric content encryption (IV per record).
 *   - PBKDF2-SHA256, 600k iterations, to derive a wrapping key from
 *     the user's password or recovery phrase.
 *   - The data key itself is random 256 bits, wrapped twice (once
 *     under password, once under recovery phrase) and stored in
 *     `user_encryption_keys`.
 *
 * The raw `dataKey` lives only in memory. Never persist it, never
 * send it to the server, never log it.
 */

const PBKDF2_ITERS = 600_000;
const KEY_LEN_BITS = 256;
const IV_LEN_BYTES = 12;
const SALT_LEN_BYTES = 16;

// --------- base64 helpers (URL-safe is fine, but use standard b64
// to match Postgres TEXT columns) ---------
export const b64 = {
  encode(bytes: ArrayBuffer | Uint8Array): string {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = "";
    for (let i = 0; i < view.byteLength; i++) s += String.fromCharCode(view[i]);
    return btoa(s);
  },
  decode(s: string): Uint8Array {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};

// --------- key derivation ---------
async function importPasswordKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
}

async function deriveWrappingKey(
  secret: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERS,
): Promise<CryptoKey> {
  const baseKey = await importPasswordKey(secret);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: KEY_LEN_BITS },
    false,
    ["wrapKey", "unwrapKey", "encrypt", "decrypt"],
  );
}

// --------- data key lifecycle ---------
export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_LEN_BITS },
    true,
    ["encrypt", "decrypt"],
  );
}

export interface WrappedKeyBlob {
  wrapped: string;       // base64
  iv: string;            // base64
  salt: string;          // base64
  iterations: number;
}

export async function wrapDataKey(
  dataKey: CryptoKey,
  secret: string,
): Promise<WrappedKeyBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN_BYTES));
  const wrappingKey = await deriveWrappingKey(secret, salt);
  const wrapped = await crypto.subtle.wrapKey("raw", dataKey, wrappingKey, {
    name: "AES-GCM",
    iv,
  });
  return {
    wrapped: b64.encode(wrapped),
    iv: b64.encode(iv),
    salt: b64.encode(salt),
    iterations: PBKDF2_ITERS,
  };
}

export async function unwrapDataKey(
  blob: WrappedKeyBlob,
  secret: string,
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(
    secret,
    b64.decode(blob.salt),
    blob.iterations,
  );
  return crypto.subtle.unwrapKey(
    "raw",
    b64.decode(blob.wrapped),
    wrappingKey,
    { name: "AES-GCM", iv: b64.decode(blob.iv) },
    { name: "AES-GCM", length: KEY_LEN_BITS },
    true,
    ["encrypt", "decrypt"],
  );
}

// --------- field-level encrypt/decrypt ---------
export interface Ciphertext {
  ciphertext: string; // base64
  iv: string;         // base64
}

export async function encryptJson<T>(value: T, dataKey: CryptoKey): Promise<Ciphertext> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, dataKey, plaintext);
  return { ciphertext: b64.encode(ct), iv: b64.encode(iv) };
}

export async function decryptJson<T>(blob: Ciphertext, dataKey: CryptoKey): Promise<T> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64.decode(blob.iv) },
    dataKey,
    b64.decode(blob.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

export async function encryptText(value: string, dataKey: CryptoKey): Promise<Ciphertext> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN_BYTES));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    dataKey,
    new TextEncoder().encode(value),
  );
  return { ciphertext: b64.encode(ct), iv: b64.encode(iv) };
}

export async function decryptText(blob: Ciphertext, dataKey: CryptoKey): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64.decode(blob.iv) },
    dataKey,
    b64.decode(blob.ciphertext),
  );
  return new TextDecoder().decode(pt);
}

// --------- bytes (for files) ---------
export async function encryptBytes(bytes: ArrayBuffer, dataKey: CryptoKey): Promise<{
  ciphertext: ArrayBuffer;
  iv: string;
}> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN_BYTES));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, dataKey, bytes);
  return { ciphertext: ct, iv: b64.encode(iv) };
}

export async function decryptBytes(
  ciphertext: ArrayBuffer,
  iv: string,
  dataKey: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64.decode(iv) },
    dataKey,
    ciphertext,
  );
}

// --------- per-file random key (for chunked uploads) ---------
export async function generateFileKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: KEY_LEN_BITS }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportRawKey(k: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", k);
  return b64.encode(raw);
}

export async function importRawKey(b64key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    b64.decode(b64key),
    { name: "AES-GCM", length: KEY_LEN_BITS },
    true,
    ["encrypt", "decrypt"],
  );
}

/** Wrap a per-file key under the user's data key, so the file key
 *  itself is stored as ciphertext alongside the file metadata. */
export async function wrapFileKey(
  fileKey: CryptoKey,
  dataKey: CryptoKey,
): Promise<Ciphertext> {
  const raw = await crypto.subtle.exportKey("raw", fileKey);
  return encryptText(b64.encode(raw), dataKey);
}

export async function unwrapFileKey(
  wrapped: Ciphertext,
  dataKey: CryptoKey,
): Promise<CryptoKey> {
  const b64key = await decryptText(wrapped, dataKey);
  return importRawKey(b64key);
}
