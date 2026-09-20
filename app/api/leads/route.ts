import { normalizeLeadPayload, validateLead, type LeadPayload } from "@/server/leads";
import { persistLead } from "@/server/lead-store";
import { notifyLeadInMax } from "@/server/notifications";
import { rateLimit } from "@/server/rate-limit";
import { integrationLog } from "@/server/integration-errors";

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const limited = rateLimit(request, "lead", 8, 60_000);
    if (limited) return limited;

    const payload = (await request.json().catch(() => null)) as Partial<LeadPayload> | null;
    if (!payload) {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const errors = validateLead(payload);

    if (Object.keys(errors).length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    const lead = normalizeLeadPayload(payload as LeadPayload);
    const persisted = await persistLead(lead);
    if (!persisted.persisted) {
      integrationLog("lead", "/api/leads", started, new Error("storage unavailable"));
      return Response.json({ error: "Заявка не сохранена. Повторите отправку." }, { status: 503 });
    }
    const max = await notifyLeadInMax(lead, persisted.id);
    integrationLog("lead", "/api/leads", started);

    return Response.json(
      {
        ok: true,
        integration: {
          persisted: persisted.persisted,
          leadId: persisted.id,
          maxNotified: max.sent,
          note: max.sent ? "Заявка сохранена и отправлена в MAX." : "Заявка сохранена. MAX временно недоступен.",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    integrationLog("lead", "/api/leads", started, error);
    return Response.json({ error: "Не удалось сохранить заявку. Позвоните нам или повторите попытку." }, { status: 500 });
  }
}
