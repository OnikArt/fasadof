import {
  authenticateManager,
  createManagerSession,
  isManagerAuthConfigured,
  readManagerAuthEnv,
  serializeSessionCookie,
} from "@/server/manager-auth";

export async function POST(request: Request) {
  const env = readManagerAuthEnv();
  if (!isManagerAuthConfigured(env)) {
    return Response.json({ error: "Manager auth is not configured" }, { status: 503 });
  }

  const payload = (await request.json()) as { email?: string; password?: string };
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
        "Set-Cookie": serializeSessionCookie(token, request.url),
      },
    },
  );
}
