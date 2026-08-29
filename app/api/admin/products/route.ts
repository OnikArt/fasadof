import { deleteProduct, listProducts, saveProduct, setProductStatus, type ProductInput, type ProductStatus } from "@/server/products";
import { getManagerFromCookieHeader } from "@/server/manager-auth";

async function requireManager(request: Request) {
  return getManagerFromCookieHeader(request.headers.get("cookie"));
}

function isAdmin(role: string) {
  return role === "ADMIN" || role === "admin";
}

export async function GET(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as ProductStatus | "all" | null;
  const products = await listProducts({
    includeHidden: true,
    status: status && ["published", "hidden", "archived", "all"].includes(status) ? status : "all",
  });

  return Response.json({ products });
}

export async function POST(request: Request) {
  return upsertProduct(request);
}

export async function PATCH(request: Request) {
  return upsertProduct(request);
}

export async function DELETE(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "product id is required" }, { status: 400 });

  if (!isAdmin(manager.role)) {
    const archived = await setProductStatus(id, "archived", { email: manager.email, name: manager.name });
    if (!archived) return Response.json({ error: "product not found" }, { status: 404 });
    return Response.json({ product: archived, products: await listProducts({ includeHidden: true, status: "all" }) });
  }

  const deleted = await deleteProduct(id);
  if (!deleted) return Response.json({ error: "product not found" }, { status: 404 });

  return Response.json({ ok: true, products: await listProducts({ includeHidden: true, status: "all" }) });
}

async function upsertProduct(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const payload = (await request.json().catch(() => null)) as ProductInput | null;
  if (!payload) return Response.json({ error: "Invalid JSON payload" }, { status: 400 });

  try {
    const product = await saveProduct(payload, { email: manager.email, name: manager.name });
    return Response.json({ product, products: await listProducts({ includeHidden: true, status: "all" }) }, { status: payload.id ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "product validation failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
