const MAX_API_URL = "https://platform-api2.max.ru";

export type MaxBotEnv = {
  MAX_BOT_TOKEN?: string;
  MAX_MANAGER_CHAT_ID?: string;
};

export class MaxBotClient {
  private readonly token: string;
  private readonly chatId: string;

  constructor(env: MaxBotEnv = process.env as MaxBotEnv) {
    this.token = env.MAX_BOT_TOKEN?.trim() ?? "";
    this.chatId = env.MAX_MANAGER_CHAT_ID?.trim() ?? "";
  }

  get configured() {
    return Boolean(this.token && this.chatId);
  }

  async sendText(text: string) {
    if (!this.configured) throw new Error("MAX_BOT_TOKEN or MAX_MANAGER_CHAT_ID is not configured");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7_000);
    try {
      const url = new URL("/messages", MAX_API_URL);
      url.searchParams.set("chat_id", this.chatId);
      url.searchParams.set("disable_link_preview", "false");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: this.token,
          "content-type": "application/json",
        },
        body: JSON.stringify({ text: text.slice(0, 4000), notify: true }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`MAX API ${response.status}: ${detail.slice(0, 300)}`);
      }

      return response.json().catch(() => ({ ok: true }));
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createMaxBotClient(env: MaxBotEnv = process.env as MaxBotEnv) {
  return new MaxBotClient(env);
}
