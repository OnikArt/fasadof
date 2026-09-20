export class IntegrationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export function integrationError(error: unknown, provider: string) {
  if (error instanceof IntegrationError) return error;
  const details = error instanceof Error ? error as Error & { code?: string; cause?: { code?: string } } : undefined;
  const cause = details?.cause?.code ?? details?.code;
  const code = cause && /^[A-Z0-9_]{1,60}$/.test(cause) ? cause : error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "SERVER_ERROR";
  return new IntegrationError(code, `${provider}: сервис временно недоступен (${code}).`);
}

// Only fixed endpoints and normalized errors belong in integration logs.
export function integrationLog(provider: string, endpoint: string, started: number, error?: unknown) {
  const safe = error ? integrationError(error, provider) : undefined;
  const source = error instanceof Error
    ? error as Error & { syscall?: string; hostname?: string; address?: string; port?: number; cause?: { syscall?: string; hostname?: string; address?: string; port?: number } }
    : undefined;
  const diagnostic = source?.cause ?? source;
  console.info(`[${provider}]`, JSON.stringify({
    endpoint,
    status: safe ? "error" : "ok",
    code: safe?.code,
    timingMs: Date.now() - started,
    syscall: diagnostic?.syscall,
    hostname: diagnostic?.hostname,
    address: diagnostic?.address,
    port: diagnostic?.port,
  }));
}
