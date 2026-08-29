import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getManagerFromCookieHeader } from "@/server/manager-auth";

const MAX_IMAGE_BYTES = 1_800_000;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

export async function POST(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return Response.json({ error: "image file is required" }, { status: 400 });

  const extension = allowedTypes.get(file.type);
  if (!extension) return Response.json({ error: "unsupported image type" }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return Response.json({ error: "image must be less than 1.8 MB" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadsDir = join(process.cwd(), "public", "uploads", "products");
  const filename = `${Date.now()}-${safeName(file.name).replace(/\.[^.]+$/, "")}.${extension}`;

  try {
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, filename), bytes);
    return Response.json({ url: `/uploads/products/${filename}` }, { status: 201 });
  } catch {
    return Response.json({ error: "local upload storage is unavailable; use an image URL instead" }, { status: 501 });
  }
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9а-яё.-]+/gi, "-").replace(/^-+|-+$/g, "") || "product";
}
