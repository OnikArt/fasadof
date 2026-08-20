export type ManagerSession = {
  email: string;
  name: string;
  role: "admin" | "operator";
  exp: number;
};

export type ManagerAuthEnv = {
  ADMIN_EMAIL?: string;
  ADMIN_NAME?: string;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SESSION_SECRET?: string;
};

export const MANAGER_SESSION_COOKIE = "fasadof_manager_session";
const HASH_SCHEME = "pbkdf2_sha256";
const SESSION_TTL_SECONDS = 60 * 60 * 10;

const encoder = new TextEncoder();

export function readManagerAuthEnv(): ManagerAuthEnv {
  return {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_NAME: process.env.ADMIN_NAME,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  };
}

export function isManagerAuthConfigured(env: ManagerAuthEnv) {
  return Boolean(env.ADMIN_EMAIL && env.ADMIN_PASSWORD_HASH && env.ADMIN_SESSION_SECRET);
}

export async function authenticateManager(email: string, password: string, env: ManagerAuthEnv) {
  if (!isManagerAuthConfigured(env)) return null;
  if (email.trim().toLowerCase() !== env.ADMIN_EMAIL?.trim().toLowerCase()) return null;

  const ok = await verifyPassword(password, env.ADMIN_PASSWORD_HASH ?? "");
  if (!ok) return null;

  return {
    email: env.ADMIN_EMAIL ?? email,
    name: env.ADMIN_NAME || "Менеджер",
    role: "admin" as const,
  };
}

export async function createManagerSession(
  manager: Omit<ManagerSession, "exp">,
  env: ManagerAuthEnv,
) {
  if (!env.ADMIN_SESSION_SECRET) throw new Error("ADMIN_SESSION_SECRET is not configured");

  const payload: ManagerSession = {
    ...manager,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadPart = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await hmac(payloadPart, env.ADMIN_SESSION_SECRET);
  return `${payloadPart}.${signature}`;
}

export async function verifyManagerSession(token: string | null | undefined, env: ManagerAuthEnv) {
  if (!token || !env.ADMIN_SESSION_SECRET) return null;

  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;

  const expected = await hmac(payloadPart, env.ADMIN_SESSION_SECRET);
  if (!constantEqual(signature, expected)) return null;

  let session: ManagerSession;
  try {
    session = JSON.parse(decoderDecode(base64UrlDecode(payloadPart))) as ManagerSession;
  } catch {
    return null;
  }

  if (!session.email || !session.name || !session.role || !session.exp) return null;
  if (session.exp <= Math.floor(Date.now() / 1000)) return null;
  return session;
}

export async function getManagerFromCookieHeader(cookieHeader: string | null, env = readManagerAuthEnv()) {
  return verifyManagerSession(readCookie(cookieHeader, MANAGER_SESSION_COOKIE), env);
}

export function serializeSessionCookie(token: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:";
  return [
    `${MANAGER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function serializeClearedSessionCookie(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:";
  return [
    `${MANAGER_SESSION_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

async function verifyPassword(password: string, encodedHash: string) {
  const [scheme, iterationsRaw, saltBase64, hashBase64] = encodedHash.split("$");
  if (scheme !== HASH_SCHEME || !iterationsRaw || !saltBase64 || !hashBase64) return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations < 100_000) return false;

  const salt = base64UrlDecode(saltBase64);
  const expected = base64UrlDecode(hashBase64);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    expected.byteLength * 8,
  );

  return constantEqualBytes(new Uint8Array(bits), expected);
}

async function hmac(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? null;
  if (!raw) return null;

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function base64UrlEncode(bytes: Uint8Array) {
  let value = "";
  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decoderDecode(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function constantEqual(a: string, b: string) {
  return constantEqualBytes(encoder.encode(a), encoder.encode(b));
}

function constantEqualBytes(a: Uint8Array, b: Uint8Array) {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let index = 0; index < a.byteLength; index += 1) {
    diff |= a[index] ^ b[index];
  }
  return diff === 0;
}
