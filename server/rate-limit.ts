type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const store = globalThis as typeof globalThis & { __fasadofRateLimit?: Map<string, RateLimitBucket> };

function buckets() {
  if (!store.__fasadofRateLimit) store.__fasadofRateLimit = new Map();
  return store.__fasadofRateLimit;
}

export function rateLimit(request: Request, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const ip = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "local";
  const id = `${key}:${ip}`;
  const current = buckets().get(id);

  if (!current || current.resetAt <= now) {
    buckets().set(id, { count: 1, resetAt: now + windowMs });
    return null;
  }

  current.count += 1;
  if (current.count <= limit) return null;

  return Response.json(
    { error: "Слишком много запросов. Попробуйте немного позже." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)),
      },
    },
  );
}
