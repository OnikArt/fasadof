import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export async function persistRemoteProductImages(input: { ownerId: number; itemId: number; urls: string[] }) {
  const stored: string[] = [];
  for (let index = 0; index < input.urls.length; index += 1) {
    const url = input.urls[index];
    if (!url.startsWith("https://")) continue;
    const filenameBase = `vk-${Math.abs(input.ownerId)}-${input.itemId}-${index}-${stableHash(url)}`;
    const existing = await findExisting(filenameBase);
    if (existing) {
      stored.push(`/api/media/vk/${existing}`);
      continue;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Image download failed with ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("VK image has an invalid size");
      const extension = extensionFor(response.headers.get("content-type"), url);
      const filename = `${filenameBase}.${extension}`;
      const directory = getVkMediaDirectory();
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, filename), bytes, { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST") throw error;
      });
      stored.push(`/api/media/vk/${filename}`);
    } finally {
      clearTimeout(timeout);
    }
  }
  return stored;
}

export async function readVkMedia(filename: string) {
  return readMediaFile(getVkMediaDirectory(), filename);
}

export async function persistUploadedProductImage(filename: string, bytes: Uint8Array) {
  const bucket = await getProductMediaBucket();
  if (bucket) {
    await bucket.put(productMediaKey(filename), bytes, { httpMetadata: { contentType: contentTypeFor(extname(filename)) } });
    return `/api/media/products/${filename}`;
  }
  const directory = getProductMediaDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });
  return `/api/media/products/${filename}`;
}

export async function readProductMedia(filename: string) {
  const bucket = await getProductMediaBucket();
  if (bucket) {
    const object = await bucket.get(productMediaKey(filename));
    if (!object) return null;
    return { bytes: new Uint8Array(await object.arrayBuffer()), contentType: contentTypeFor(extname(filename)) };
  }
  return readMediaFile(getProductMediaDirectory(), filename);
}

export async function deleteUploadedProductImage(url: string) {
  const prefix = "/api/media/products/";
  if (!url.startsWith(prefix)) return false;
  const filename = decodeURIComponent(url.slice(prefix.length));
  if (!/^[a-z0-9][a-z0-9._-]+$/i.test(filename)) return false;
  const bucket = await getProductMediaBucket();
  if (bucket) {
    await bucket.delete(productMediaKey(filename));
    return true;
  }
  const directory = getProductMediaDirectory();
  const path = resolve(directory, filename);
  if (!path.startsWith(`${resolve(directory)}/`) && !path.startsWith(`${resolve(directory)}\\`)) return false;
  try { await unlink(path); return true; } catch { return false; }
}

async function readMediaFile(directory: string, filename: string) {
  if (!/^[a-z0-9][a-z0-9._-]+$/i.test(filename)) return null;
  const path = resolve(directory, filename);
  if (!path.startsWith(`${resolve(directory)}\\`) && !path.startsWith(`${resolve(directory)}/`)) return null;
  try {
    return { bytes: await readFile(path), contentType: contentTypeFor(extname(filename)) };
  } catch {
    return null;
  }
}

function getVkMediaDirectory() {
  const dataDir = resolve(process.env.FASADOF_DATA_DIR || join(process.cwd(), ".data"));
  return join(dataDir, "media", "vk");
}

function getProductMediaDirectory() {
  const dataDir = resolve(process.env.FASADOF_DATA_DIR || join(process.cwd(), ".data"));
  return join(dataDir, "media", "products");
}

type ProductMediaBucket = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string): Promise<void>;
};

async function getProductMediaBucket(): Promise<ProductMediaBucket | undefined> {
  try {
    const cloudflareWorkers = "cloudflare:workers";
    const mod = await import(/* @vite-ignore */ cloudflareWorkers) as { env?: { MEDIA?: ProductMediaBucket } };
    return mod.env?.MEDIA;
  } catch {
    return undefined;
  }
}

function productMediaKey(filename: string) {
  return `products/${filename}`;
}

async function findExisting(filenameBase: string) {
  for (const extension of ["jpg", "png", "webp", "avif", "gif"]) {
    const filename = `${filenameBase}.${extension}`;
    try {
      await access(join(getVkMediaDirectory(), filename));
      return filename;
    } catch {
      // Continue through supported extensions.
    }
  }
  return null;
}

function extensionFor(contentType: string | null, url: string) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("avif")) return "avif";
  if (contentType?.includes("gif")) return "gif";
  const extension = extname(new URL(url).pathname).slice(1).toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(extension) ? extension.replace("jpeg", "jpg") : "jpg";
}

function contentTypeFor(extension: string) {
  return ({ ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif" } as Record<string, string>)[extension.toLowerCase()] || "image/jpeg";
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
