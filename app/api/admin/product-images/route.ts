import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { persistUploadedProductImage } from "@/server/media-storage";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 24 * 1024 * 1024;
const MAX_UPLOAD_FILES = 10;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

export async function POST(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("Product image multipart parsing failed", error);
    return Response.json({ error: "Не удалось разобрать multipart/form-data" }, { status: 400 });
  }

  try {
    const files = [...form.getAll("images"), ...form.getAll("image")].filter((entry): entry is File => entry instanceof File);
    if (!files.length) return Response.json({ error: "Выберите файл изображения" }, { status: 400 });
    if (files.length > MAX_UPLOAD_FILES) return Response.json({ error: `За один раз можно загрузить не более ${MAX_UPLOAD_FILES} изображений` }, { status: 400 });
    if (files.reduce((total, file) => total + file.size, 0) > MAX_UPLOAD_BYTES) return Response.json({ error: "Общий размер файлов должен быть меньше 24 МБ" }, { status: 400 });

    const prepared = await Promise.all(files.map(async (file) => {
      const extension = allowedTypes.get(file.type);
      if (!extension) throw new UploadValidationError(`Файл «${file.name}»: поддерживаются JPG, PNG, WebP и AVIF`);
      if (!file.size) throw new UploadValidationError(`Файл «${file.name}» пуст`);
      if (file.size > MAX_IMAGE_BYTES) throw new UploadValidationError(`Файл «${file.name}» больше 12 МБ`);
      const bytes = new Uint8Array(await file.arrayBuffer());
      return { bytes, filename: `${safeStem(file.name)}-${await contentHash(bytes)}.${extension}` };
    }));

    const urls = await Promise.all(prepared.map(({ filename, bytes }) => persistUploadedProductImage(filename, bytes)));
    return Response.json({ url: urls[0], urls }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Product image upload failed", error);
    return Response.json({ error: "Хранилище изображений недоступно. Проверьте FASADOF_DATA_DIR и права записи." }, { status: 503 });
  }
}

class UploadValidationError extends Error {}

function safeStem(value: string) {
  return value.replace(/\.[^.]+$/, "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "product";
}

async function contentHash(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
