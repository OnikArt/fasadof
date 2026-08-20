import { buildKnowledgeBase } from "@/server/knowledge";

export type AIInput = {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

export interface AIProvider {
  generateReply(input: AIInput): Promise<string>;
}

class KnowledgeOnlyProvider implements AIProvider {
  async generateReply(input: AIInput) {
    const knowledge = buildKnowledgeBase();
    const message = input.message.toLowerCase();
    const matched = knowledge.products.find((product) => message.includes(product.name.toLowerCase()));

    if (matched) {
      return `${matched.name}: ${matched.price}. ${matched.description} Если нужно, передам задачу менеджеру для точного расчёта.`;
    }

    if (message.includes("достав")) {
      return `${knowledge.delivery}. Режим работы: ${knowledge.workingHours}.`;
    }

    if (message.includes("цен") || message.includes("стоим")) {
      return "Могу подсказать цены только по каталогу. Для точного расчёта лучше передать материал, площадь и телефон менеджеру.";
    }

    return "Точную информацию лучше уточнить у менеджера. Передать ваш вопрос?";
  }
}

class GeminiProvider implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async generateReply(input: AIInput) {
    const context = JSON.stringify(buildKnowledgeBase());
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Контекст бренда ФасадоФ: ${context}\n\nВопрос клиента: ${input.message}`,
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Gemini API unavailable");
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "Точную информацию лучше уточнить у менеджера. Передать ваш вопрос?";
  }
}

export function createAIProvider(env: { GEMINI_API_KEY?: string | undefined }): AIProvider {
  if (env.GEMINI_API_KEY) {
    return new GeminiProvider(env.GEMINI_API_KEY);
  }

  return new KnowledgeOnlyProvider();
}
