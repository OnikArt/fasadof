import { serializeClearedSessionCookie } from "@/server/manager-auth";

export async function POST(request: Request) {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": serializeClearedSessionCookie(request.url),
      },
    },
  );
}
