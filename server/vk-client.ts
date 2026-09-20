import { IntegrationError, integrationError, integrationLog } from "@/server/integration-errors";

const VK_API_URL = "https://api.vk.com/method";
const VK_API_VERSION = "5.199";

export type VkPhoto = {
  sizes?: { url?: string; width?: number; height?: number }[];
};

export type VkMarketItem = {
  id: number;
  owner_id: number;
  title: string;
  description?: string;
  availability?: number;
  category?: { id?: number; name?: string; section?: { name?: string } };
  price?: { amount?: string; old_amount?: string; text?: string; currency?: { name?: string } };
  thumb_photo?: string;
  photos?: VkPhoto[];
  url?: string;
};

type VkResponse<T> = {
  response?: T;
  error?: { error_code?: number; error_msg?: string };
};

export class VkClient {
  private readonly groupId: string;
  private readonly token: string;

  constructor(env = process.env) {
    this.groupId = env.VK_GROUP_ID?.trim().replace(/^-/, "") ?? "";
    this.token = env.VK_ACCESS_TOKEN?.trim() ?? "";
  }

  get configured() {
    return Boolean(this.groupId && this.token);
  }

  get communityId() {
    return this.groupId;
  }

  async getMarketItems() {
    this.assertConfigured();
    const items: VkMarketItem[] = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const payload = await this.call<{ count: number; items: VkMarketItem[] }>("market.get", {
        owner_id: `-${this.groupId}`,
        count: "200",
        offset: String(offset),
        extended: "1",
      });
      total = payload.count;
      items.push(...payload.items);
      if (payload.items.length === 0) break;
      offset += payload.items.length;
    }

    return items;
  }

  async getUserName(userId: number | string | undefined) {
    if (!userId || !this.configured) return userId ? `ID ${userId}` : "Пользователь";
    const users = await this.call<{ first_name?: string; last_name?: string }[]>("users.get", { user_ids: String(userId) });
    const user = users[0];
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
    return name || `ID ${userId}`;
  }

  private async call<T>(method: string, params: Record<string, string>) {
    const started = Date.now();
    const url = new URL(`${VK_API_URL}/${method}`);
    Object.entries({ ...params, access_token: this.token, v: VK_API_VERSION }).forEach(([key, value]) => url.searchParams.set(key, value));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new IntegrationError(`HTTP_${response.status}`, `VK: API вернул HTTP ${response.status}.`);
      const payload = await response.json() as VkResponse<T>;
      if (payload.error) {
        const code = Number(payload.error.error_code) || 0;
        throw new IntegrationError(`VK_${code}`, `VK: ${[5, 7, 15, 27, 28].includes(code) ? "проверьте токен и права доступа к товарам" : "ошибка API"} (код ${code}).`);
      }
      if (!payload.response) throw new Error("VK API returned an empty response");
      integrationLog("vk", method, started);
      return payload.response;
    } catch (error) {
      integrationLog("vk", method, started, error);
      throw integrationError(error, "VK");
    } finally {
      clearTimeout(timeout);
    }
  }

  private assertConfigured() {
    if (!this.configured) throw new IntegrationError("NOT_CONFIGURED", "VK: токен или ID сообщества не настроен.");
  }
}

export function pickVkPhotoUrls(item: VkMarketItem) {
  const urls = (item.photos ?? [])
    .map((photo) => [...(photo.sizes ?? [])]
      .filter((size) => size.url)
      .sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))[0]?.url)
    .filter((url): url is string => Boolean(url));
  if (item.thumb_photo && !urls.includes(item.thumb_photo)) urls.unshift(item.thumb_photo);
  return urls;
}

export function parseVkPrice(price?: VkMarketItem["price"]) {
  const amount = Number(price?.amount ?? 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount / 100) : undefined;
}

export function parseVkOldPrice(price?: VkMarketItem["price"]) {
  const amount = Number(price?.old_amount ?? 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount / 100) : undefined;
}
