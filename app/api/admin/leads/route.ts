import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { listLeads, updateLeadStatus, type LeadStatus } from "@/server/lead-store";

const statuses = new Set<LeadStatus>(["NEW", "IN_PROGRESS", "DONE"]);

async function requireManager(request: Request) {
  return getManagerFromCookieHeader(request.headers.get("cookie"));
}

export async function GET(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  return Response.json({ leads: await listLeads() });
}

export async function PATCH(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const payload = (await request.json().catch(() => null)) as { id?: number; status?: LeadStatus } | null;
  if (!payload?.id || !payload.status || !statuses.has(payload.status)) {
    return Response.json({ error: "Invalid lead status payload" }, { status: 400 });
  }

  const lead = await updateLeadStatus(payload.id, payload.status);
  if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

  return Response.json({ lead, leads: await listLeads() });
}
