import { getManagerFromCookieHeader } from "@/server/manager-auth";

export async function GET(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return Response.json({ authenticated: false }, { status: 401 });

  return Response.json({
    authenticated: true,
    manager: {
      email: manager.email,
      name: manager.name,
      role: manager.role,
    },
  });
}
