import { notifyMax } from "@/server/max";
import { validateLead, type LeadPayload } from "@/server/leads";

type ServerEnv = {
  MAX_BOT_TOKEN?: string;
  MAX_CHAT_ID?: string;
};

function readServerEnv(): ServerEnv {
  return {
    MAX_BOT_TOKEN: process.env.MAX_BOT_TOKEN,
    MAX_CHAT_ID: process.env.MAX_CHAT_ID,
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<LeadPayload>;
    const errors = validateLead(payload);

    if (Object.keys(errors).length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    const lead = payload as LeadPayload;
    const max = await notifyMax(
      {
        name: lead.name,
        phone: lead.phone,
        material: lead.material,
        area: lead.area,
        message: lead.message,
        page: lead.page,
        source: lead.attribution.lastTouch.source,
        campaign: lead.attribution.lastTouch.utm_campaign,
      },
      readServerEnv(),
    );

    return Response.json(
      {
        ok: true,
        integration: {
          persisted: false,
          max,
          note: "Подключите D1/Postgres/CRM для постоянного хранения заявок.",
        },
      },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "Lead API unavailable" }, { status: 500 });
  }
}
