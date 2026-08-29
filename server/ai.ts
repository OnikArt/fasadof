import { buildKnowledgeBase } from "@/server/knowledge";

export type AIInput = {
  message: string;
  history?: { role: "user" | "assistant" | "operator" | "system"; content: string }[];
};

export type AIResponse = {
  reply: string;
  provider: string;
};

export interface AIProvider {
  sendMessage(input: AIInput): Promise<AIResponse>;
}

export type AIEnv = {
  AI_PROVIDER?: string;
  GIGACHAT_AUTH_KEY?: string;
  GIGACHAT_SCOPE?: string;
  GIGACHAT_MODEL?: string;
  GIGACHAT_BASE_URL?: string;
  GIGACHAT_AUTH_URL?: string;
  GIGACHAT_TIMEOUT_MS?: string;
};

type TokenCache = {
  accessToken: string;
  expiresAt: number;
} | null;

let gigachatTokenCache: TokenCache = null;

class KnowledgeOnlyProvider implements AIProvider {
  async sendMessage(input: AIInput) {
    const knowledge = buildKnowledgeBase();
    const message = input.message.toLowerCase();
    const matched = knowledge.products.find((product) => message.includes(product.name.toLowerCase()) || message.includes(product.material.toLowerCase()));

    if (matched) {
      return {
        provider: "knowledge",
        reply: `${matched.name}: ${matched.price}. ${matched.description} Если нужно, передам задачу менеджеру для точного расчёта.`,
      };
    }

    if (message.includes("достав")) {
      if (message.includes("москв") || message.includes("друг") || message.includes("регион")) {
        return {
          provider: "knowledge",
          reply: "Бесплатная доставка действует по Воронежу. Условия доставки в другой город нужно уточнить у менеджера.",
        };
      }
      return {
        provider: "knowledge",
        reply: `${knowledge.delivery}. ${knowledge.deliveryScope} Режим работы менеджеров: ${knowledge.workingHours}.`,
      };
    }

    if (message.includes("цен") || message.includes("стоим") || message.includes("сколько")) {
      return {
        provider: "knowledge",
        reply: "Могу подсказать цены только по каталогу. Для точного расчёта лучше передать материал, площадь и телефон менеджеру.",
      };
    }

    return {
      provider: "knowledge",
      reply: "Точную информацию уточнит менеджер. Передать ему ваш вопрос?",
    };
  }
}

class GigaChatProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly authUrl: string;
  private readonly scope: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly env: Required<Pick<AIEnv, "GIGACHAT_AUTH_KEY">> & AIEnv) {
    this.baseUrl = (env.GIGACHAT_BASE_URL || "https://api.giga.chat").replace(/\/$/, "");
    this.authUrl = env.GIGACHAT_AUTH_URL || `${this.baseUrl}/api/v2/oauth`;
    this.scope = env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS";
    this.model = env.GIGACHAT_MODEL || "GigaChat";
    this.timeoutMs = Number(env.GIGACHAT_TIMEOUT_MS || 12_000);
  }

  async sendMessage(input: AIInput) {
    const token = await this.getAccessToken();
    const knowledge = buildKnowledgeBase();
    const response = await fetch(`${this.baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "Ты помощник российского бренда ФасадоФ. Отвечай кратко и по-русски.",
              "Используй только предоставленные данные. Не придумывай цены, сроки, наличие, гарантию или характеристики.",
              "Если ответа нет, скажи: Точную информацию уточнит менеджер. Передать ему ваш вопрос?",
              `Контекст: ${JSON.stringify(knowledge)}`,
            ].join("\n"),
          },
          ...(input.history ?? [])
            .filter((message) => message.role === "user" || message.role === "assistant")
            .slice(-8)
            .map((message) => ({ role: message.role, content: message.content })),
          { role: "user", content: input.message },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`GigaChat API unavailable: ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return {
      provider: "gigachat",
      reply: payload.choices?.[0]?.message?.content || "Точную информацию уточнит менеджер. Передать ему ваш вопрос?",
    };
  }

  private async getAccessToken() {
    const now = Date.now();
    if (gigachatTokenCache && gigachatTokenCache.expiresAt - 60_000 > now) {
      return gigachatTokenCache.accessToken;
    }

    const response = await fetch(this.authUrl, {
      method: "POST",
      headers: {
        authorization: `Basic ${this.env.GIGACHAT_AUTH_KEY}`,
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        RqUID: crypto.randomUUID(),
      },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: new URLSearchParams({ scope: this.scope }).toString(),
    });

    if (!response.ok) {
      throw new Error(`GigaChat OAuth unavailable: ${response.status}`);
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_at?: number;
      expires_in?: number;
    };

    if (!payload.access_token) throw new Error("GigaChat OAuth response has no access_token");

    const expiresAt = payload.expires_at
      ? normalizeExpiresAt(payload.expires_at)
      : Date.now() + (payload.expires_in ?? 1_700) * 1000;

    gigachatTokenCache = {
      accessToken: payload.access_token,
      expiresAt,
    };
    return payload.access_token;
  }
}

export function createAIProvider(env: AIEnv): AIProvider {
  const provider = (env.AI_PROVIDER || "gigachat").toLowerCase();

  if (provider === "gigachat" && env.GIGACHAT_AUTH_KEY) {
    return new GigaChatProvider({ ...env, GIGACHAT_AUTH_KEY: env.GIGACHAT_AUTH_KEY });
  }

  return new KnowledgeOnlyProvider();
}

function normalizeExpiresAt(value: number) {
  return value > 10_000_000_000 ? value : value * 1000;
}
