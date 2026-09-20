import type { Product, ProductCategory } from "@/data/products";
import { persistRemoteProductImages } from "@/server/media-storage";
import { listProducts, saveProduct } from "@/server/products";
import { parseVkOldPrice, parseVkPrice, pickVkPhotoUrls, VkClient, type VkMarketItem } from "@/server/vk-client";

export type VkSyncStatus = "synced" | "create" | "enrich" | "difference" | "confirm" | "site_only" | "error";
export type VkSyncPriceStrategy = "preserve-site" | "use-vk";

export type VkSyncPreviewRow = {
  key: string;
  photo: string;
  siteProductId?: string;
  siteName: string;
  vkMarketItemId?: number;
  vkOwnerId?: number;
  vkName: string;
  sitePrice?: number;
  vkPrice?: number;
  score?: number;
  status: VkSyncStatus;
  action: string;
  missingFields: string[];
  candidates?: { id: string; name: string; score: number }[];
};

type ComparedRow = VkSyncPreviewRow & { site?: Product; vk?: VkMarketItem };

export async function buildVkSyncPreview() {
  const rows = await compareCatalogs();
  return {
    rows: rows.map(stripInternal),
    generatedAt: new Date().toISOString(),
    priceStrategy: "preserve-site" as const,
  };
}

export async function applyVkSync(input: {
  confirmations?: Record<string, string>;
  priceStrategy?: VkSyncPriceStrategy;
  manager: { email: string; name: string };
}) {
  const rows = await compareCatalogs();
  const strategy = input.priceStrategy === "use-vk" ? "use-vk" : "preserve-site";
  const summary = { created: 0, enriched: 0, updated: 0, unchanged: 0, review: 0, errors: 0, images: 0 };
  const errors: { key: string; message: string }[] = [];
  const allSiteProducts = await listProducts({ includeHidden: true, status: "all" });

  for (const row of rows) {
    if (!row.vk || row.status === "site_only") continue;
    try {
      let site = row.site;
      if (row.status === "confirm") {
        const selectedId = input.confirmations?.[String(row.vk.id)];
        if (!selectedId) {
          errors.push({ key: row.key, message: "Сопоставление требует подтверждения" });
          summary.errors += 1;
          summary.review += 1;
          continue;
        }
        if (selectedId !== "create") {
          site = allSiteProducts.find((product) => product.id === selectedId);
          if (!site) throw new Error("Выбранный товар сайта не найден");
        }
      }

      const photoUrls = pickVkPhotoUrls(row.vk);
      const needsPhotos = !site || !hasSiteImage(site) || !(site.gallery?.length);
      const storedImages = needsPhotos && photoUrls.length
        ? await persistRemoteProductImages({ ownerId: row.vk.owner_id, itemId: row.vk.id, urls: photoUrls })
        : [];
      summary.images += storedImages.length;
      const next = buildProductInput(site, row.vk, storedImages, strategy);
      await saveProduct(next, input.manager);

      if (!site) summary.created += 1;
      else if (row.missingFields.length > 0) summary.enriched += 1;
      else if (strategy === "use-vk" && pricesDiffer(site.priceFrom, parseVkPrice(row.vk.price))) summary.updated += 1;
      else summary.unchanged += 1;
    } catch (error) {
      summary.errors += 1;
      errors.push({ key: row.key, message: error instanceof Error ? error.message : "Ошибка синхронизации" });
    }
  }

  return { summary, errors, products: await listProducts({ includeHidden: true, status: "all" }) };
}

async function compareCatalogs(): Promise<ComparedRow[]> {
  const vk = new VkClient();
  if (!vk.configured) throw new Error("VK_GROUP_ID и VK_ACCESS_TOKEN не настроены");
  const [vkItems, siteProducts] = await Promise.all([
    vk.getMarketItems(),
    listProducts({ includeHidden: true, status: "all" }),
  ]);
  const rows: ComparedRow[] = [];
  const matchedSiteIds = new Set<string>();

  for (const item of vkItems) {
    const linked = siteProducts.find((product) => product.vkOwnerId === item.owner_id && product.vkMarketItemId === item.id);
    const exact = linked ?? siteProducts.find((product) => normalizeName(product.name) === normalizeName(item.title));
    if (exact) {
      matchedSiteIds.add(exact.id);
      rows.push(compareMatched(exact, item, linked ? 1 : 0.99));
      continue;
    }

    const candidates = siteProducts
      .map((product) => ({ product, score: similarity(product.name, item.title) }))
      .filter((candidate) => candidate.score >= 0.58)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    if (candidates[0]?.score >= 0.72) {
      rows.push({
        key: `vk:${item.owner_id}:${item.id}`,
        photo: pickVkPhotoUrls(item)[0] ?? "",
        siteProductId: candidates[0].product.id,
        siteName: candidates[0].product.name,
        vkMarketItemId: item.id,
        vkOwnerId: item.owner_id,
        vkName: item.title,
        sitePrice: candidates[0].product.priceFrom,
        vkPrice: parseVkPrice(item.price),
        score: candidates[0].score,
        status: "confirm",
        action: "Требуется подтверждение сопоставления",
        missingFields: missingFields(candidates[0].product, item),
        candidates: candidates.map(({ product, score }) => ({ id: product.id, name: product.name, score })),
        site: candidates[0].product,
        vk: item,
      });
      continue;
    }

    rows.push({
      key: `vk:${item.owner_id}:${item.id}`,
      photo: pickVkPhotoUrls(item)[0] ?? "",
      siteName: "—",
      vkMarketItemId: item.id,
      vkOwnerId: item.owner_id,
      vkName: item.title,
      vkPrice: parseVkPrice(item.price),
      status: "create",
      action: "Будет создан",
      missingFields: [],
      vk: item,
    });
  }

  for (const site of siteProducts) {
    if (matchedSiteIds.has(site.id)) continue;
    if (rows.some((row) => row.siteProductId === site.id)) continue;
    rows.push({
      key: `site:${site.id}`,
      photo: site.image,
      siteProductId: site.id,
      siteName: site.name,
      vkName: "—",
      sitePrice: site.priceFrom,
      status: "site_only",
      action: "Останется без изменений",
      missingFields: [],
      site,
    });
  }

  return rows;
}

function compareMatched(site: Product, vk: VkMarketItem, score: number): ComparedRow {
  const missing = missingFields(site, vk);
  const priceDifference = pricesDiffer(site.priceFrom, parseVkPrice(vk.price));
  const status: VkSyncStatus = missing.length ? "enrich" : priceDifference ? "difference" : "synced";
  return {
    key: `vk:${vk.owner_id}:${vk.id}`,
    photo: pickVkPhotoUrls(vk)[0] ?? site.image,
    siteProductId: site.id,
    siteName: site.name,
    vkMarketItemId: vk.id,
    vkOwnerId: vk.owner_id,
    vkName: vk.title,
    sitePrice: site.priceFrom,
    vkPrice: parseVkPrice(vk.price),
    score,
    status,
    action: status === "enrich" ? `Будет дополнен: ${missing.join(", ")}` : status === "difference" ? "Цена различается" : "Уже синхронизирован",
    missingFields: missing,
    site,
    vk,
  };
}

function buildProductInput(site: Product | undefined, vk: VkMarketItem, storedImages: string[], strategy: VkSyncPriceStrategy) {
  const vkPrice = parseVkPrice(vk.price);
  const useVkPrice = !site || strategy === "use-vk" || !site.priceFrom;
  const existingGallery = site?.gallery ?? [];
  const image = hasSiteImage(site) ? site!.image : storedImages[0] || "texture-custom";
  const galleryFromVk = image === storedImages[0] ? storedImages.slice(1) : storedImages;
  return {
    id: site?.id,
    slug: site?.slug || `vk-${vk.id}-${slugify(vk.title)}`,
    category: site?.category ?? inferCategory(vk),
    material: site?.material || vk.category?.name || "Материал VK",
    name: site?.name || vk.title,
    shortName: site?.shortName,
    description: site?.description?.trim() || vk.description?.trim() || "Товар из каталога VK.",
    fullDescription: site?.fullDescription?.trim() || vk.description?.trim() || site?.description || "Товар из каталога VK.",
    priceFrom: useVkPrice ? vkPrice : site?.priceFrom,
    oldPrice: parseVkOldPrice(vk.price) ?? site?.oldPrice,
    pricePrefix: site?.pricePrefix || "от",
    priceUnit: site?.priceUnit || "шт.",
    priceOnRequest: useVkPrice ? !vkPrice : Boolean(site?.priceOnRequest),
    image,
    texture: site?.texture || "custom",
    gallery: existingGallery.length ? existingGallery : galleryFromVk,
    features: site?.features ?? [],
    application: site?.application,
    popular: site?.popular ?? false,
    status: site?.status ?? (vk.availability === 0 || vk.availability == null ? "published" : "hidden"),
    vkOwnerId: vk.owner_id,
    vkMarketItemId: vk.id,
    vkUrl: vk.url || `https://vk.com/market/product/${vk.owner_id}_${vk.id}`,
    vkSyncedAt: new Date().toISOString(),
  };
}

function missingFields(site: Product, vk: VkMarketItem) {
  const missing: string[] = [];
  if (!site.description?.trim() && vk.description?.trim()) missing.push("описание");
  if (!hasSiteImage(site) && pickVkPhotoUrls(vk).length) missing.push("изображение");
  if (!(site.gallery?.length) && pickVkPhotoUrls(vk).length > 1) missing.push("галерея");
  if (!site.vkMarketItemId) missing.push("связь VK");
  return missing;
}

function hasSiteImage(site?: Product) {
  return Boolean(site?.image && site.image !== "texture-custom" && site.image !== "custom");
}

function inferCategory(item: VkMarketItem): ProductCategory {
  const text = `${item.title} ${item.description ?? ""} ${item.category?.name ?? ""}`.toLowerCase();
  return /столеш|рабочая поверхность|countertop/.test(text) ? "countertops" : "facades";
}

function pricesDiffer(site?: number, vk?: number) {
  return Boolean(site && vk && site !== vk);
}

function normalizeName(value: string) {
  return value.toLowerCase().replaceAll("ё", "е").replace(/[^a-zа-я0-9]+/gi, " ").trim().replace(/\s+/g, " ");
}

function similarity(left: string, right: string) {
  const a = new Set(normalizeName(left).split(" ").filter(Boolean));
  const b = new Set(normalizeName(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let common = 0;
  a.forEach((token) => { if (b.has(token)) common += 1; });
  return (2 * common) / (a.size + b.size);
}

function slugify(value: string) {
  const transliterated = value.toLowerCase().split("").map((letter) => transliteration[letter] ?? letter).join("");
  return transliterated.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "product";
}

const transliteration: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function stripInternal(row: ComparedRow): VkSyncPreviewRow {
  const { site: _site, vk: _vk, ...publicRow } = row;
  void _site;
  void _vk;
  return publicRow;
}
