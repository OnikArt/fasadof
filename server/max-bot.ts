import { IntegrationError, integrationError, integrationLog } from "@/server/integration-errors";

const MAX_API_URL = "https://platform-api2.max.ru";

export type MaxBotEnv = {
  MAX_BOT_TOKEN?: string;
  MAX_CHAT_ID?: string;
  MAX_MANAGER_CHAT_ID?: string;
};

export type MaxMessageOptions = {
  linkButton?: { text: string; url: string };
};

export class MaxBotClient {
  private readonly token: string;
  private readonly chatId: string;

  constructor(env: MaxBotEnv = process.env as MaxBotEnv) {
    this.token = env.MAX_BOT_TOKEN?.trim() ?? "";
    this.chatId = env.MAX_CHAT_ID?.trim() || env.MAX_MANAGER_CHAT_ID?.trim() || "";
  }

  get configured() {
    return Boolean(this.token && this.chatId);
  }

  async sendText(text: string, options: MaxMessageOptions = {}) {
    if (!this.configured) throw new IntegrationError("NOT_CONFIGURED", "MAX: токен или ID чата не настроен.");
    const started = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const url = new URL("/messages", MAX_API_URL);
      url.searchParams.set("chat_id", this.chatId);
      url.searchParams.set("disable_link_preview", "false");
      const body: Record<string, unknown> = { text: text.slice(0, 4000), notify: true };
      if (options.linkButton) {
        body.attachments = [{
          type: "inline_keyboard",
          payload: {
            buttons: [[{
              type: "link",
              text: options.linkButton.text,
              url: options.linkButton.url,
            }]],
          },
        }];
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: this.token,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new IntegrationError(`HTTP_${response.status}`, `MAX: ${response.status === 401 || response.status === 403 ? "ошибка авторизации" : response.status === 400 || response.status === 404 ? "проверьте ID чата и доступ бота" : "API недоступен"} (HTTP ${response.status}).`);
      }

      const payload = await response.json().catch(() => null) as { message?: { body?: { mid?: string }; id?: string } } | null;
      if (!payload) throw new IntegrationError("INVALID_RESPONSE", "MAX: API вернул ответ не в формате JSON.");
      integrationLog("max", "/messages", started);
      return payload;
    } catch (error) {
      integrationLog("max", "/messages", started, error);
      throw integrationError(error, "MAX");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createMaxBotClient(env: MaxBotEnv = process.env as MaxBotEnv) {
  return new MaxBotClient(env);
}
