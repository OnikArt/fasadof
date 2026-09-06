import { readVkMedia } from "@/server/media-storage";

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  const media = await readVkMedia(filename);
  if (!media) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": media.contentType,
      "x-content-type-options": "nosniff",
    },
  });
}
