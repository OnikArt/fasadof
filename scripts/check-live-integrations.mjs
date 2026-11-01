import { constants, existsSync, readFileSync } from "node:fs";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { join, resolve } from "node:path";

const env = { ...readDotEnv(), ...process.env };
const sendMax = process.argv.includes("--send-max");
const report = {
  checkedAt: new Date().toISOString(),
  runtime: { node: process.version, platform: process.platform, systemCa: process.env.NODE_USE_SYSTEM_CA === "1" || process.execArgv.includes("--use-system-ca") },
  storage: await checkStorage(env),
  dns: await checkDns(),
  max: await checkMax(env, sendMax),
  vk: await checkVk(env),
};

console.log(JSON.stringify(report, null, 2));
if (report.max.result === "FAILED" || report.vk.result === "FAILED") process.exitCode = 1;

async function checkMax(values, shouldSend) {
  const token = values.MAX_BOT_TOKEN?.trim();
  if (!token) return { configured: false, result: "NOT_TESTED", reason: "MAX_BOT_TOKEN is empty" };

  const headers = { authorization: token };
  const me = await requestJson("https://platform-api2.max.ru/me", { headers });
  const subscriptions = await requestJson("https://platform-api2.max.ru/subscriptions", { headers });
  const updates = await requestJson("https://platform-api2.max.ru/updates?limit=100&timeout=0", { headers });
  const updateItems = Array.isArray(updates.data?.updates) ? updates.data.updates : [];
  const candidates = uniqueChatCandidates(updateItems);

  const delivery = shouldSend && me.ok
    ? await sendMaxAcceptance(token, values.MAX_CHAT_ID?.trim() || values.MAX_MANAGER_CHAT_ID?.trim())
    : { requested: shouldSend, result: "NOT_APPLICABLE", reason: shouldSend ? "MAX auth failed or chat ID is empty" : "Use --send-max for one explicit test delivery" };
  return {
    configured: true,
    result: me.ok ? "SUCCESS" : "FAILED",
    me: {
      httpStatus: me.status,
      userId: me.ok ? me.data?.user_id ?? null : null,
      username: me.ok ? me.data?.username ?? null : null,
      name: me.ok ? me.data?.first_name ?? me.data?.name ?? null : null,
      error: me.ok ? null : me.error,
    },
    subscriptions: {
      httpStatus: subscriptions.status,
      count: Array.isArray(subscriptions.data?.subscriptions) ? subscriptions.data.subscriptions.length : 0,
      error: subscriptions.ok ? null : subscriptions.error,
    },
    updates: {
      httpStatus: updates.status,
      count: updateItems.length,
      candidates,
      error: updates.ok ? null : updates.error,
    },
    managerChatConfigured: Boolean(values.MAX_CHAT_ID?.trim() || values.MAX_MANAGER_CHAT_ID?.trim()),
    delivery,
  };
}

async function sendMaxAcceptance(token, chatId) {
  if (!chatId) return { requested: true, result: "FAILED", reason: "MAX_CHAT_ID is empty" };
  const url = new URL("https://platform-api2.max.ru/messages");
  url.searchParams.set("chat_id", chatId);
  const response = await requestJson(url, {
    method: "POST",
    headers: { authorization: token, "content-type": "application/json" },
    body: JSON.stringify({ text: `Тест уведомлений ФасадоФ\n\nИсточник: Layero\nСтатус: интеграция MAX работает\nВремя: ${new Date().toISOString()}`, notify: true }),
  });
  const messageId = response.data?.message?.body?.mid ?? response.data?.message?.id ?? null;
  return { requested: true, result: response.ok ? "SUCCESS" : "FAILED", httpStatus: response.status, accepted: response.ok, messageId, error: response.error };
}

async function checkStorage(values) {
  const dataDir = resolve(values.FASADOF_DATA_DIR || join(process.cwd(), ".data"));
  const probe = join(dataDir, `.fasadof-write-${process.pid}.tmp`);
  let write = { result: "FAILED", code: "UNKNOWN" };
  try {
    await mkdir(dataDir, { recursive: true });
    await access(dataDir, constants.R_OK | constants.W_OK);
    await writeFile(probe, "ok", { flag: "wx" });
    await unlink(probe);
    write = { result: "SUCCESS", code: null };
  } catch (error) {
    await unlink(probe).catch(() => undefined);
    write = { result: "FAILED", code: safeCode(error) };
  }
  const database = await checkDatabase(join(dataDir, "fasadof.sqlite"));
  return { configured: Boolean(values.FASADOF_DATA_DIR), dataDir, write, database };
}

async function checkDatabase(path) {
  if (!existsSync(path)) return { result: "NOT_APPLICABLE", reason: "fasadof.sqlite does not exist yet" };
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(path, { readOnly: true });
    const row = db.prepare("SELECT 1 AS ok").get();
    db.close();
    return { result: row?.ok === 1 ? "SUCCESS" : "FAILED" };
  } catch (error) {
    return { result: "FAILED", code: safeCode(error) };
  }
}

async function checkDns() {
  const entries = {};
  for (const hostname of ["api.vk.com", "platform-api2.max.ru"]) {
    try {
      const result = await lookup(hostname);
      entries[hostname] = { result: "SUCCESS", family: result.family };
    } catch (error) {
      entries[hostname] = { result: "FAILED", code: safeCode(error) };
    }
  }
  return entries;
}

async function checkVk(values) {
  const token = values.VK_ACCESS_TOKEN?.trim();
  const groupId = values.VK_GROUP_ID?.trim().replace(/^-/, "");
  if (!token || !groupId) {
    return { configured: false, result: "NOT_TESTED", groupId: groupId || null, reason: "VK_ACCESS_TOKEN or VK_GROUP_ID is empty" };
  }

  const items = [];
  let offset = 0;
  let total = Infinity;
  let lastStatus = 0;
  while (offset < total) {
    const url = new URL("https://api.vk.com/method/market.get");
    for (const [key, value] of Object.entries({ owner_id: `-${groupId}`, count: "200", offset: String(offset), extended: "1", access_token: token, v: "5.199" })) {
      url.searchParams.set(key, value);
    }
    const page = await requestJson(url, {});
    lastStatus = page.status;
    if (!page.ok || page.data?.error) {
      return {
        configured: true,
        result: "FAILED",
        groupId,
        apiVersion: "5.199",
        method: "market.get",
        httpStatus: page.status,
        apiErrorCode: page.data?.error?.error_code ?? null,
        error: page.data?.error?.error_msg ?? page.error,
        productCount: items.length,
      };
    }
    const pageItems = Array.isArray(page.data?.response?.items) ? page.data.response.items : [];
    total = Number(page.data?.response?.count ?? 0);
    items.push(...pageItems);
    if (!pageItems.length) break;
    offset += pageItems.length;
  }

  return {
    configured: true,
    result: "SUCCESS",
    groupId,
    apiVersion: "5.199",
    method: "market.get",
    httpStatus: lastStatus,
    productCount: items.length,
    pages: Math.ceil(items.length / 200),
  };
}

function uniqueChatCandidates(updates) {
  const values = new Map();
  for (const update of updates) {
    const chatId = findNumber(update, "chat_id");
    if (chatId == null) continue;
    const chatType = findString(update, "chat_type");
    const isChannel = findBoolean(update, "is_channel");
    const key = String(chatId);
    values.set(key, {
      chatId: key,
      updateType: typeof update?.update_type === "string" ? update.update_type : null,
      chatType,
      isChannel,
      matchesDotMessage: findString(update, "text") === ".",
      classification: chatType === "dialog"
        ? "personal"
        : chatType === "chat" || (update?.update_type === "bot_added" && isChannel === false)
          ? "group_candidate"
          : isChannel === true
            ? "channel"
            : "unknown",
    });
  }
  return [...values.values()];
}

function findNumber(value, key) {
  if (!value || typeof value !== "object") return null;
  if (typeof value[key] === "number") return value[key];
  for (const nested of Object.values(value)) {
    const found = findNumber(nested, key);
    if (found != null) return found;
  }
  return null;
}

function findString(value, key) {
  if (!value || typeof value !== "object") return null;
  if (typeof value[key] === "string") return value[key];
  for (const nested of Object.values(value)) {
    const found = findString(nested, key);
    if (found != null) return found;
  }
  return null;
}

function findBoolean(value, key) {
  if (!value || typeof value !== "object") return null;
  if (typeof value[key] === "boolean") return value[key];
  for (const nested of Object.values(value)) {
    const found = findBoolean(nested, key);
    if (found != null) return found;
  }
  return null;
}

async function requestJson(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, data, error: response.ok ? null : safeError(data, response.status) };
  } catch (error) {
    const cause = error?.cause ?? error;
    return { ok: false, status: 0, data: null, error: safeCode(error), diagnostic: { syscall: safeToken(cause?.syscall), hostname: safeHost(cause?.hostname), port: Number.isInteger(cause?.port) ? cause.port : null } };
  } finally {
    clearTimeout(timeout);
  }
}

function safeCode(error) {
  const code = error?.cause?.code ?? error?.code;
  return typeof code === "string" && /^[A-Z0-9_]{1,60}$/.test(code) ? code : error?.name === "AbortError" ? "TIMEOUT" : "NETWORK_UNAVAILABLE";
}

function safeToken(value) {
  return typeof value === "string" && /^[a-z0-9_ -]{1,60}$/i.test(value) ? value : null;
}

function safeHost(value) {
  return typeof value === "string" && /^[a-z0-9.-]{1,253}$/i.test(value) ? value : null;
}

function safeError(data, status) {
  const message = data?.message ?? data?.error?.error_msg;
  return typeof message === "string" ? message.slice(0, 240) : `HTTP ${status}`;
}

function readDotEnv() {
  if (!existsSync(".env")) return {};
  return Object.fromEntries(
    readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        return [key, value];
      }),
  );
}
