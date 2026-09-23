import { deleteProduct, getProductById, listProducts, saveProduct, setProductStatus, type ProductInput, type ProductStatus } from "@/server/products";
import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { notifyAdminActionInMax } from "@/server/notifications";
import { deleteUploadedProductImage } from "@/server/media-storage";

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

  const current = await getProductById(id);
  const deleted = await deleteProduct(id);
  if (!deleted) return Response.json({ error: "product not found" }, { status: 404 });

  const products = await listProducts({ includeHidden: true, status: "all" });
  await deleteUnusedProductImages(productImages(current), products);

  await notifyAdminActionInMax({ title: "Товар удалён", employee: manager.name });
  return Response.json({ ok: true, products });
}

async function upsertProduct(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const payload = (await request.json().catch(() => null)) as ProductInput | null;
  if (!payload) return Response.json({ error: "Invalid JSON payload" }, { status: 400 });

  try {
    const previous = payload.id ? await getProductById(payload.id) : null;
    const product = await saveProduct(payload, { email: manager.email, name: manager.name });
    const retained = new Set(productImages(product));
    const products = await listProducts({ includeHidden: true, status: "all" });
    await deleteUnusedProductImages(productImages(previous).filter((url) => !retained.has(url)), products);
    await notifyAdminActionInMax({ title: payload.id ? "Товар изменён" : "Товар создан", subject: product.name, employee: manager.name });
    return Response.json({ product, products }, { status: payload.id ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "product validation failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

function productImages(product: { image?: string; gallery?: string[] } | null) {
  return product ? [product.image, ...(product.gallery ?? [])].filter((value): value is string => Boolean(value?.startsWith("/api/media/products/"))) : [];
}

async function deleteUnusedProductImages(urls: string[], products: Array<{ image?: string; gallery?: string[] }>) {
  const referenced = new Set(products.flatMap((product) => productImages(product)));
  await Promise.all(urls.filter((url) => !referenced.has(url)).map(deleteUploadedProductImage));
}
