import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { getLead, listLeads, softDeleteLead, updateLeadStatus, type LeadStatus } from "@/server/lead-store";
import { notifyLeadDeletionInMax } from "@/server/notifications";

const statuses = new Set<LeadStatus>(["NEW", "IN_PROGRESS", "DONE", "REJECTED"]);

async function requireManager(request: Request) {
  return getManagerFromCookieHeader(request.headers.get("cookie"));
}

export async function GET(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (Number.isInteger(id) && id > 0) {
    const lead = await getLead(id);
    return lead ? Response.json({ lead }) : Response.json({ error: "Lead not found" }, { status: 404 });
  }
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

export async function DELETE(request: Request) {
  const manager = await requireManager(request);
  if (!manager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Invalid lead id" }, { status: 400 });

  const deleted = await softDeleteLead(id, {
    id: manager.id ?? manager.email,
    name: manager.name,
    email: manager.email,
  });
  if (deleted.result === "not-found") return Response.json({ error: "Lead not found" }, { status: 404 });
  if (deleted.result === "not-terminal") {
    return Response.json({ error: "Завершите или отклоните заявку перед удалением" }, { status: 409 });
  }
  if (deleted.result !== "deleted") return Response.json({ error: "Lead storage unavailable" }, { status: 503 });

  const notification = await notifyLeadDeletionInMax({
    leadId: id,
    previousStatus: deleted.audit.previousStatus,
    employeeName: manager.name,
    deletedAt: deleted.audit.createdAt,
  });

  return Response.json({ ok: true, audit: deleted.audit, maxNotified: notification.sent, leads: await listLeads() });
}
