"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

export function ProductImageUploader({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);

  async function upload(files: FileList | File[]) {
    const selected = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!selected.length) return;
    const previews = selected.map((file) => URL.createObjectURL(file));
    setLocalPreviews(previews);
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      selected.forEach((file) => form.append("images", file));
      const response = await fetch("/api/admin/product-images", { method: "POST", credentials: "include", body: form });
      const payload = await readUploadResponse(response);
      if (!response.ok) throw new Error(payload.error || uploadHttpError(response.status));
      const urls = payload.urls ?? (payload.url ? [payload.url] : []);
      if (urls.length !== selected.length) throw new Error("Сервер вернул неполный список изображений");
      onChange(Array.from(new Set([...urls, ...images])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка загрузки");
    } finally {
      previews.forEach((url) => URL.revokeObjectURL(url));
      setLocalPreviews([]);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="product-image-uploader">
      <div className={`image-dropzone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && void upload(event.target.files)} />
        <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? "Загружаем…" : "Выбрать изображения"}</button>
        <span>или перетащите сюда · JPG, PNG, WebP, AVIF до 12 МБ</span>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      {localPreviews.length > 0 && <div className="uploaded-image-grid pending" aria-label="Предпросмотр выбранных изображений">
        {localPreviews.map((url, index) => <article key={url}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Выбранное изображение ${index + 1}`} /><strong>Загрузка…</strong>
        </article>)}
      </div>}
      {images.length > 0 && <div className="uploaded-image-grid">
        {images.map((url, index) => <article key={`${url}-${index}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Предпросмотр ${index + 1}`} />
          <strong>{index === 0 ? "Обложка" : `${String(index + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}`}</strong>
          <div><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Переместить левее">←</button><button type="button" disabled={index === images.length - 1} onClick={() => move(index, 1)} aria-label="Переместить правее">→</button><button type="button" onClick={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))}>Удалить</button></div>
        </article>)}
      </div>}
    </div>
  );
}

async function readUploadResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!contentType.toLowerCase().includes("application/json")) {
    if (response.status === 413) throw new Error(uploadHttpError(response.status));
    const detail = text.trim().replace(/\s+/g, " ").slice(0, 180);
    if (contentType.toLowerCase().includes("text/html")) throw new Error(`Сервер вернул HTML вместо JSON (HTTP ${response.status})`);
    throw new Error(detail || uploadHttpError(response.status));
  }
  try {
    return JSON.parse(text) as { url?: string; urls?: string[]; error?: string };
  } catch {
    throw new Error("Сервер вернул некорректный JSON");
  }
}

function uploadHttpError(status: number) {
  if (status === 401 || status === 403) return "Сессия администратора истекла. Войдите снова";
  if (status === 413) return "Файлы превышают допустимый размер запроса";
  return `Загрузка не выполнена (HTTP ${status})`;
}
