import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { recordManagerHeartbeat } from "@/server/support-store";

export async function GET(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return Response.json({ authenticated: false }, { status: 401 });
  await recordManagerHeartbeat(manager);

  return Response.json({
    authenticated: true,
    manager: {
      email: manager.email,
      name: manager.name,
      role: manager.role,
    },
  });
}

export async function POST(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return Response.json({ authenticated: false }, { status: 401 });
  await recordManagerHeartbeat(manager);
  return Response.json({ ok: true });
}
