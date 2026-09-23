import { deleteCategory, listCategories, saveCategory } from "@/server/categories";
import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { notifyAdminActionInMax } from "@/server/notifications";

async function admin(request: Request) { const value = await getManagerFromCookieHeader(request.headers.get("cookie")); return value && (value.role === "ADMIN" || value.role === "admin") ? value : null; }
export async function GET(request: Request) { if (!await admin(request)) return Response.json({ error: "Forbidden" }, { status: 403 }); return Response.json({ categories: await listCategories() }); }
export async function POST(request: Request) { return save(request); }
export async function PATCH(request: Request) { return save(request); }
async function save(request: Request) {
  const manager = await admin(request); if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });
  const payload = await request.json() as { originalSlug?: string; slug: string; name: string; description?: string };
  try { const categories = await saveCategory(payload); await notifyAdminActionInMax({ title: payload.originalSlug ? "Категория изменена" : "Категория создана", subject: payload.name, employee: manager.name }); return Response.json({ categories }); }
  catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "Invalid category" }, { status: 400 }); }
}
export async function DELETE(request: Request) {
  const manager = await admin(request); if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });
  const slug = new URL(request.url).searchParams.get("slug"); if (!slug) return Response.json({ error: "slug is required" }, { status: 400 });
  try { const categories = await deleteCategory(slug); await notifyAdminActionInMax({ title: "Категория удалена", subject: slug, employee: manager.name }); return Response.json({ categories }); }
  catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "Category delete failed" }, { status: 409 }); }
}
