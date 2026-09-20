export function apiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) return "Не удалось связаться с сервером. Проверьте соединение и повторите попытку.";
  if (error instanceof SyntaxError) return "Сервер вернул некорректный ответ. Проверьте состояние сервиса.";
  return error instanceof Error ? error.message : fallback;
}
