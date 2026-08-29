import { normalizeLeadPayload, validateLead, type LeadPayload } from "@/server/leads";
import { persistLead } from "@/server/lead-store";
import { rateLimit } from "@/server/rate-limit";

export async function POST(request: Request) {
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

    return Response.json(
      {
        ok: true,
        integration: {
          persisted: persisted.persisted,
          note: persisted.persisted ? "Заявка сохранена." : "D1 недоступен: заявка обработана без постоянного хранения.",
        },
      },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "Lead API unavailable" }, { status: 500 });
  }
}
