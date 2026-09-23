import {
  authenticateManager,
  createManagerSession,
  isManagerSessionConfigured,
  readManagerAuthEnv,
  serializeSessionCookie,
} from "@/server/manager-auth";
import { rateLimit } from "@/server/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "admin-login", 10, 60_000);
  if (limited) return limited;

  const env = readManagerAuthEnv();
  if (!isManagerSessionConfigured(env)) {
    return Response.json({ error: "ADMIN_SESSION_SECRET is not configured or is too short" }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!payload) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.email || !payload.password) {
    return Response.json({ error: "email and password are required" }, { status: 400 });
  }

  const manager = await authenticateManager(payload.email, payload.password, env);
  if (!manager) {
    return Response.json({ error: "Неверный email или пароль" }, { status: 401 });
  }

  const token = await createManagerSession(manager, env);
  return Response.json(
    { ok: true, manager },
    {
      headers: {
        "Set-Cookie": serializeSessionCookie(token, request.url, request.headers.get("x-forwarded-proto")),
      },
    },
  );
}
