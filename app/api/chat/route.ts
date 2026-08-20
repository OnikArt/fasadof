import { createAIProvider } from "@/server/ai";

type ServerEnv = {
  GEMINI_API_KEY?: string;
};

function readServerEnv(): ServerEnv {
  return {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      message?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!payload.message?.trim()) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    const provider = createAIProvider(readServerEnv());
    const reply = await provider.generateReply({
      message: payload.message,
      history: payload.history,
    });

    return Response.json({ reply });
  } catch {
    return Response.json(
      { reply: "Точную информацию лучше уточнить у менеджера. Передать ваш вопрос?" },
      { status: 503 },
    );
  }
}
