# AI chat: GigaChat

Основной production provider для ФасадоФ — GigaChat. Это убирает зависимость посетителей из России от VPN: браузер обращается только к `/api/chat`, а сервер уже работает с AI provider.

## Архитектура

Browser → `POST /api/chat` → `AIProvider` → `GigaChatProvider` → `https://api.giga.chat`

Frontend не хранит и не отправляет секреты GigaChat.

## Environment variables

```env
AI_PROVIDER=gigachat
GIGACHAT_AUTH_KEY=
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat
GIGACHAT_BASE_URL=https://api.giga.chat
GIGACHAT_AUTH_URL=
GIGACHAT_TIMEOUT_MS=12000
```

`GIGACHAT_AUTH_URL` можно оставить пустым, если OAuth endpoint совпадает с базовым URL проекта. Если в кабинете GigaChat указан отдельный OAuth URL, задайте его явно.

## Access token

`GIGACHAT_AUTH_KEY` используется только сервером. Backend получает временный access token, кэширует его в runtime memory и обновляет перед истечением. Новый OAuth token не запрашивается на каждое сообщение.

## Knowledge base

AI получает только данные из:

- `config/business.ts`;
- `data/products.ts`;
- `data/faq.ts`.

Если данных нет, помощник отвечает: `Точную информацию уточнит менеджер. Передать ему ваш вопрос?`

## Смена provider

Provider выбирается через `AI_PROVIDER`. Сейчас поддержаны:

- `gigachat` — production default;
- `gemini` — fallback при наличии `GEMINI_API_KEY`;
- knowledge fallback — local/test режим без внешнего AI.

## Troubleshooting

- `503` от `/api/chat`: проверьте `GIGACHAT_AUTH_KEY`, `GIGACHAT_SCOPE`, timeout и доступ сервера к `https://api.giga.chat`.
- Нет русских ответов: проверьте model и system prompt.
- AI отвечает после запроса менеджера: проверьте статус conversation, он должен быть `WAITING_OPERATOR` или `OPERATOR`.
