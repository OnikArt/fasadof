import { listChatRatings } from "@/server/support-store";
import { getManagerFromCookieHeader } from "@/server/manager-auth";

async function requireAdmin(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return null;
  return manager.role === "ADMIN" || manager.role === "admin" ? manager : null;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const rating = Number(url.searchParams.get("rating") || "");
  const employeeId = url.searchParams.get("employeeId") || undefined;
  const ratings = await listChatRatings({
    rating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    employeeId,
  });

  return Response.json({ ratings });
}
