import { addChatRating } from "@/server/support-store";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    conversationId?: string;
    customerToken?: string;
    rating?: number;
    comment?: string;
  };

  if (!payload.conversationId || !payload.customerToken || !payload.rating) {
    return Response.json({ error: "conversationId, customerToken and rating are required" }, { status: 400 });
  }

  const result = await addChatRating({
    conversationId: payload.conversationId,
    customerToken: payload.customerToken,
    rating: payload.rating,
    comment: payload.comment,
  });

  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: result.reason === "rating already exists" ? 409 : 400 });
  }

  return Response.json({ ok: true, rating: result.rating }, { status: 201 });
}
