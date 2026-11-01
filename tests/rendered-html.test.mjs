import assert from "node:assert/strict";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const testDataDir = await mkdtemp(join(tmpdir(), "fasadof-tests-"));
process.env.FASADOF_DATA_DIR = testDataDir;
after(async () => {
  await rm(testDataDir, { recursive: true, force: true }).catch((error) => {
    if (process.platform === "win32" && ["EBUSY", "EPERM"].includes(error?.code)) return;
    throw error;
  });
});

async function loadWorker(seed = `${process.pid}-${Date.now()}`) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", seed);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

function workerContext(extra = {}) {
  return {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
    ...extra,
  };
}

function installAdminEnv(password = "StrongPassword123") {
  const previous = {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_NAME: process.env.ADMIN_NAME,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  };
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 210_000, 32, "sha256").toString("base64url");

  process.env.ADMIN_EMAIL = "manager@example.com";
  process.env.ADMIN_NAME = "Алексей";
  process.env.ADMIN_PASSWORD_HASH = `pbkdf2_sha256$210000$${salt.toString("base64url")}$${hash}`;
  process.env.ADMIN_SESSION_SECRET = randomBytes(32).toString("base64url");

  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

async function render(path = "/") {
  const worker = await loadWorker(`${process.pid}-${Date.now()}-${path}`);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    workerContext(),
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("integration failures return safe codes and diagnostics require login", async () => {
  const restoreAdmin = installAdminEnv();
  const keys = ["VK_GROUP_ID", "VK_ACCESS_TOKEN", "MAX_BOT_TOKEN", "MAX_MANAGER_CHAT_ID"];
  const previous = keys.map(key => process.env[key]);
  Object.assign(process.env, { VK_GROUP_ID: "123", VK_ACCESS_TOKEN: "secret-test-vk", MAX_BOT_TOKEN: "secret-test-max", MAX_MANAGER_CHAT_ID: "123" });
  const originalFetch = globalThis.fetch;
  try {
    const worker = await loadWorker("sanitized-errors");
    const call = (path, init = {}) => worker.fetch(new Request(`http://localhost${path}`, init), workerContext(), { waitUntil() {} });
    assert.equal((await call("/api/admin/integrations/status")).status, 403);
    const login = await call("/api/admin/login", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.220" }, body: JSON.stringify({ email: "manager@example.com", password: "StrongPassword123" }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie");
    globalThis.fetch = async () => { throw new TypeError("fetch failed secret-test-max", { cause: { code: "ECONNREFUSED" } }); };
    const max = await call("/api/admin/integrations/max/test", { method: "POST", headers: { cookie } });
    assert.equal(max.status, 502);
    const maxBody = await max.json();
    assert.equal(maxBody.code, "ECONNREFUSED");
    assert.doesNotMatch(JSON.stringify(maxBody), /fetch failed|secret-test/);
    globalThis.fetch = async () => Response.json({ error: { error_code: 5, error_msg: "secret-test-vk" } });
    const vk = await call("/api/admin/integrations/vk/sync", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ action: "preview" }) });
    assert.equal(vk.status, 502);
    const vkBody = await vk.json();
    assert.equal(vkBody.code, "VK_5");
    assert.doesNotMatch(JSON.stringify(vkBody), /secret-test/);
    const status = await call("/api/admin/integrations/status", { headers: { cookie } });
    assert.deepEqual(await status.json(), { database: "ok", vkConfigured: true, maxConfigured: true });
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
    restoreAdmin();
  }
});

test("server-renders the ФасадоФ home page", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /ФасадоФ/);
  assert.match(html, /Доставка/);
  assert.match(html, /Рассчитать проект/);
  assert.match(html, /Фасады под ваш интерьер/);
  assert.match(html, /Основные фасадные решения/);
  assert.match(html, /SupportChat|support-chat-launcher/);
  assert.doesNotMatch(html, /Chat2Desk/);
  assert.match(html, /8 903 850-24-04/);
  assert.match(html, /fasadof36@gmail.com/);
  assert.match(html, /Бесплатная доставка по Воронежу/);
  assert.match(html, /FAQPage/);
  assert.match(html, /Где можно посмотреть фасады и материалы вживую/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});

test("server-renders the full catalogue route", async () => {
  const response = await render("/catalog");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Каталог фасадов/);
  assert.match(html, /Каталог материалов/);
  assert.match(html, /Эмаль матовая/);
});

test("server-renders contacts route with real business data", async () => {
  const response = await render("/contacts");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Связаться с ФасадоФ/);
  assert.match(html, /8 903 850-24-04/);
  assert.match(html, /fasadof36@gmail.com/);
  assert.match(html, /ул\. Машиностроителей/);
});

test("server-renders category SEO pages", async () => {
  const response = await render("/catalog/emal");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Мебельные фасады в эмали/);
  assert.match(html, /Эмаль матовая/);
});

test("server-renders product pages with catalogue data", async () => {
  const response = await render("/catalog/enamel");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Эмаль матовая/);
  assert.match(html, /от 5/);
  assert.match(html, /Расчет материала/);
});

test("server-renders admin login and protects support route", async () => {
  const login = await render("/admin/login");
  assert.equal(login.status, 200);
  assert.match(await login.text(), /Вход в админ-панель/);

  const support = await render("/admin/support");
  assert.ok([302, 307, 308].includes(support.status));
  assert.match(support.headers.get("location") ?? "", /\/admin\/login/);
});

test("chat API switches to manager queue after operator request", async () => {
  const worker = await loadWorker("chat-flow");
  const first = await worker.fetch(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Сколько стоит эмаль?", page: "/" }),
    }),
    workerContext(),
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(first.status, 200);
  const firstPayload = await first.json();
  assert.match(firstPayload.reply, /Эмаль|цен|каталог|менеджер/i);
  assert.ok(firstPayload.session.id);
  assert.ok(firstPayload.session.customerToken);

  const takeover = await worker.fetch(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "request_operator",
        sessionId: firstPayload.session.id,
        customerToken: firstPayload.session.customerToken,
      }),
    }),
    workerContext(),
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(takeover.status, 200);
  const takeoverPayload = await takeover.json();
  assert.equal(takeoverPayload.session.status, "WAITING_MANAGER");

  const after = await worker.fetch(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Ответьте менеджеру",
        sessionId: firstPayload.session.id,
        customerToken: firstPayload.session.customerToken,
      }),
    }),
    workerContext(),
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(after.status, 200);
  assert.match((await after.json()).reply, /менеджер/i);
});

test("admin auth API creates and clears a secure session", async () => {
  const password = "StrongPassword123";
  const restore = installAdminEnv(password);

  try {
    const worker = await loadWorker("admin-auth");
    const login = await worker.fetch(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "manager@example.com", password }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie") ?? "";
    assert.match(cookie, /fasadof_manager_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);

    const session = await worker.fetch(
      new Request("http://localhost/api/admin/session", { headers: { cookie } }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(session.status, 200);
    assert.equal((await session.json()).manager.name, "Алексей");

    const logout = await worker.fetch(
      new Request("http://localhost/api/admin/logout", { method: "POST", headers: { cookie } }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/);
  } finally {
    restore();
  }
});

test(".env.example documents active production variables", async () => {
  const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  for (const name of [
    "NEXT_PUBLIC_SITE_URL",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD_HASH",
    "ADMIN_SESSION_SECRET",
    "VK_GROUP_ID",
    "VK_ACCESS_TOKEN",
    "VK_CALLBACK_SECRET",
    "VK_CALLBACK_CONFIRMATION",
    "MAX_BOT_TOKEN",
    "MAX_MANAGER_CHAT_ID",
    "FASADOF_DATA_DIR",
    "PORT",
  ]) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"));
  }

  assert.doesNotMatch(envExample, /GEMINI|NEXT_PUBLIC_VK_PIXEL_ID/);
});

test("admin login API rate-limits repeated attempts", async () => {
  const worker = await loadWorker("admin-rate-limit");
  const attempts = [];
  for (let index = 0; index < 12; index += 1) {
    attempts.push(await worker.fetch(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.77" },
        body: JSON.stringify({ email: "wrong@example.com", password: "wrong-password" }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    ));
  }

  assert.equal(attempts.at(-1)?.status, 429);
});

test("lead API persists data and remains successful when MAX is unavailable", async () => {
  const previous = {
    MAX_BOT_TOKEN: process.env.MAX_BOT_TOKEN,
    MAX_MANAGER_CHAT_ID: process.env.MAX_MANAGER_CHAT_ID,
  };
  process.env.MAX_BOT_TOKEN = "test-token";
  process.env.MAX_MANAGER_CHAT_ID = "123456";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://platform-api2.max.ru/")) throw new Error("MAX unavailable in QA");
    return originalFetch(input, init);
  };

  try {
  const worker = await loadWorker("lead-phone");
  const lead = await worker.fetch(
    new Request("http://localhost/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Ирина",
        phone: "8 903 850 24 04",
        message: "Нужен расчет",
        product: "Фасады",
        material: "Эмаль",
        area: "7 м²",
        page: "/",
        attribution: {
          firstTouch: { source: "Direct" },
          lastTouch: { source: "Direct", utm_campaign: "" },
        },
        createdAt: new Date().toISOString(),
      }),
    }),
    workerContext(),
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(lead.status, 201);
  const payload = await lead.json();
  assert.equal(payload.integration.persisted, true);
  assert.equal(payload.integration.maxNotified, false);
  assert.match(payload.integration.note, /MAX временно недоступен/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("lead lifecycle protects active work, audits terminal deletion and keeps DB state when MAX fails", async () => {
  const password = "StrongPassword123";
  const restoreAdmin = installAdminEnv(password);
  const previousMax = {
    MAX_BOT_TOKEN: process.env.MAX_BOT_TOKEN,
    MAX_MANAGER_CHAT_ID: process.env.MAX_MANAGER_CHAT_ID,
  };
  process.env.MAX_BOT_TOKEN = "test-token";
  process.env.MAX_MANAGER_CHAT_ID = "123456";
  const originalFetch = globalThis.fetch;
  const { DatabaseSync } = await import("node:sqlite");
  const auditDatabase = new DatabaseSync(join(testDataDir, "fasadof.sqlite"));
  let deletionObservedAfterDb = false;

  try {
    const worker = await loadWorker("lead-lifecycle");
    const call = (path, init = {}) => worker.fetch(new Request(`http://localhost${path}`, init), workerContext(), { waitUntil() {} });
    const create = async (name, createdAt) => {
      const response = await call("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.230" },
        body: JSON.stringify({
          name,
          phone: "+7 903 850-24-04",
          email: `${name.toLowerCase()}@example.com`,
          message: "Lifecycle QA",
          product: "Фасады",
          material: "Эмаль",
          area: "5 м²",
          page: "/",
          attribution: { firstTouch: { source: "Direct" }, lastTouch: { source: "Direct" } },
          createdAt,
        }),
      });
      assert.equal(response.status, 201);
      return (await response.json()).integration.leadId;
    };

    const firstId = await create("Active", "2026-09-08T10:00:00.000Z");
    const secondId = await create("Rejected", "2026-09-08T10:01:00.000Z");
    const login = await call("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.231" },
      body: JSON.stringify({ email: "manager@example.com", password }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie") ?? "";
    const adminCall = (path, init = {}) => call(path, { ...init, headers: { ...(init.headers ?? {}), cookie } });

    assert.equal((await adminCall(`/api/admin/leads?id=${firstId}`, { method: "DELETE" })).status, 409);
    assert.equal((await adminCall("/api/admin/leads", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: firstId, status: "IN_PROGRESS" }) })).status, 200);
    assert.equal((await adminCall(`/api/admin/leads?id=${firstId}`, { method: "DELETE" })).status, 409);
    assert.equal((await adminCall("/api/admin/leads", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: firstId, status: "DONE" }) })).status, 200);

    globalThis.fetch = async (input, init) => {
      if (String(input).startsWith("https://platform-api2.max.ru/")) {
        if (String(init?.body).includes("удалена")) {
          const row = auditDatabase.prepare("SELECT deleted_at FROM leads WHERE id = ?").get(firstId);
          deletionObservedAfterDb = Boolean(row?.deleted_at);
        }
        throw new Error("MAX unavailable in lifecycle QA");
      }
      return originalFetch(input, init);
    };

    const deletedDone = await adminCall(`/api/admin/leads?id=${firstId}`, { method: "DELETE" });
    assert.equal(deletedDone.status, 200);
    assert.equal((await deletedDone.json()).maxNotified, false);
    assert.equal(deletionObservedAfterDb, true);

    assert.equal((await adminCall("/api/admin/leads", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: secondId, status: "REJECTED" }) })).status, 200);
    assert.equal((await adminCall(`/api/admin/leads?id=${secondId}`, { method: "DELETE" })).status, 200);

    const visible = await (await adminCall("/api/admin/leads")).json();
    assert.equal(visible.leads.some((lead) => lead.id === firstId || lead.id === secondId), false);
    const auditRows = auditDatabase.prepare("SELECT lead_id, actor_id, actor_name, actor_email, previous_status FROM lead_audit_events WHERE lead_id IN (?, ?) ORDER BY lead_id").all(firstId, secondId);
    assert.deepEqual(auditRows.map((row) => row.previous_status), ["DONE", "REJECTED"]);
    assert.ok(auditRows.every((row) => row.actor_id === "env-admin" && row.actor_name === "Алексей" && row.actor_email === "manager@example.com"));
  } finally {
    auditDatabase.close();
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previousMax)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    restoreAdmin();
  }
});

test("important JSON APIs reject malformed payloads with 400", async () => {
  const password = "StrongPassword123";
  const restore = installAdminEnv(password);

  try {
    const worker = await loadWorker("malformed-json");
    const badJson = "{bad";
    const lead = await worker.fetch(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: badJson,
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    const login = await worker.fetch(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: badJson,
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    const validLogin = await worker.fetch(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "manager@example.com", password }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    const cookie = validLogin.headers.get("set-cookie") ?? "";
    const product = await worker.fetch(
      new Request("http://localhost/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: badJson,
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );

    assert.equal(lead.status, 400);
    assert.equal(login.status, 400);
    assert.equal(product.status, 400);
  } finally {
    restore();
  }
});

test("support admin can take over and reply to a waiting conversation", async () => {
  const password = "StrongPassword123";
  const restore = installAdminEnv(password);

  try {
    const worker = await loadWorker("support-e2e");
    const first = await worker.fetch(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Нужен расчет", page: "/catalog/enamel" }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    const firstPayload = await first.json();

    await worker.fetch(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "request_operator",
          sessionId: firstPayload.session.id,
          customerToken: firstPayload.session.customerToken,
        }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );

    const login = await worker.fetch(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "manager@example.com", password }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    const cookie = login.headers.get("set-cookie") ?? "";

    const queue = await worker.fetch(
      new Request("http://localhost/api/admin/conversations?status=WAITING_MANAGER", { headers: { cookie } }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(queue.status, 200);
    const queuePayload = await queue.json();
    assert.equal(queuePayload.conversations[0].id, firstPayload.session.id);

    const reply = await worker.fetch(
      new Request("http://localhost/api/admin/conversations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          action: "reply",
          sessionId: firstPayload.session.id,
          message: "Здравствуйте, вижу ваш запрос по эмали.",
        }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(reply.status, 200);
    const replyPayload = await reply.json();
    assert.equal(replyPayload.session.canReply, true);

    const repeatedTake = await worker.fetch(
      new Request("http://localhost/api/admin/conversations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ action: "take", sessionId: firstPayload.session.id }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(repeatedTake.status, 200);

    await worker.fetch(new Request("http://localhost/api/admin/products?status=all", { headers: { cookie } }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    const afterNavigation = await worker.fetch(new Request(`http://localhost/api/admin/conversations?sessionId=${firstPayload.session.id}`, { headers: { cookie } }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(afterNavigation.status, 200);
    assert.equal((await afterNavigation.json()).session.canReply, true);

    const relogin = await worker.fetch(new Request("http://localhost/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "manager@example.com", password }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    const restored = await worker.fetch(new Request(`http://localhost/api/admin/conversations?sessionId=${firstPayload.session.id}`, { headers: { cookie: relogin.headers.get("set-cookie") ?? "" } }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).session.canReply, true);

    const customerPoll = await worker.fetch(
      new Request(`http://localhost/api/chat?sessionId=${firstPayload.session.id}&customerToken=${firstPayload.session.customerToken}`),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(customerPoll.status, 200);
    const customerPayload = await customerPoll.json();
    assert.equal(customerPayload.session.status, "IN_PROGRESS");
    assert.equal(customerPayload.messages.filter((message) => /подключился к диалогу/.test(message.content)).length, 1);
    assert.ok(customerPayload.messages.some((message) => message.role === "operator" && /эмали/.test(message.content)));
  } finally {
    restore();
  }
});

test("admin can create employees and managers cannot manage employees", async () => {
  const password = "StrongPassword123";
  const employeePassword = "ManagerPassword123";
  const restore = installAdminEnv(password);

  try {
    const worker = await loadWorker("employees-rbac");
    const adminLogin = await worker.fetch(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "manager@example.com", password }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    const adminCookie = adminLogin.headers.get("set-cookie") ?? "";

    const created = await worker.fetch(
      new Request("http://localhost/api/admin/employees", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: adminCookie },
        body: JSON.stringify({
          name: "Мария",
          email: "maria@example.com",
          password: employeePassword,
          role: "MANAGER",
        }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(created.status, 201);
    const createdPayload = await created.json();
    assert.equal(createdPayload.employee.role, "MANAGER");

    const managerLogin = await worker.fetch(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "maria@example.com", password: employeePassword }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(managerLogin.status, 200);
    const managerCookie = managerLogin.headers.get("set-cookie") ?? "";

    const forbidden = await worker.fetch(
      new Request("http://localhost/api/admin/employees", { headers: { cookie: managerCookie } }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(forbidden.status, 403);
  } finally {
    restore();
  }
});

test("closed support dialog accepts one rating and exposes it to admin", async () => {
  const password = "StrongPassword123";
  const restore = installAdminEnv(password);

  try {
    const worker = await loadWorker("chat-rating");
    const first = await worker.fetch(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Хочу фасады", page: "/" }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    const firstPayload = await first.json();

    await worker.fetch(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "request_operator",
          sessionId: firstPayload.session.id,
          customerToken: firstPayload.session.customerToken,
        }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );

    const login = await worker.fetch(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "manager@example.com", password }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    const cookie = login.headers.get("set-cookie") ?? "";

    await worker.fetch(
      new Request("http://localhost/api/admin/conversations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ action: "take", sessionId: firstPayload.session.id }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );

    const closed = await worker.fetch(
      new Request("http://localhost/api/admin/conversations", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ action: "close", sessionId: firstPayload.session.id }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(closed.status, 200);
    const closedPayload = await closed.json();
    assert.equal(closedPayload.session.status, "CLOSED");
    assert.equal(closedPayload.session.canReply, false);
    assert.equal(closedPayload.session.canClose, false);

    const customerAfterClose = await worker.fetch(
      new Request(`http://localhost/api/chat?sessionId=${firstPayload.session.id}&customerToken=${firstPayload.session.customerToken}`),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    const customerAfterClosePayload = await customerAfterClose.json();
    assert.equal(customerAfterClosePayload.session.status, "CLOSED");
    assert.ok(customerAfterClosePayload.messages.some((message) => /Оцените консультацию/.test(message.content)));

    const rated = await worker.fetch(
      new Request("http://localhost/api/chat/rating", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: firstPayload.session.id,
          customerToken: firstPayload.session.customerToken,
          rating: 5,
          comment: "Отлично ответили",
        }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(rated.status, 201);

    const duplicate = await worker.fetch(
      new Request("http://localhost/api/chat/rating", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: firstPayload.session.id,
          customerToken: firstPayload.session.customerToken,
          rating: 4,
        }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(duplicate.status, 409);

    const adminRatings = await worker.fetch(
      new Request("http://localhost/api/admin/chat-ratings", { headers: { cookie } }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(adminRatings.status, 200);
    const adminPayload = await adminRatings.json();
    assert.equal(adminPayload.ratings[0].rating, 5);
    assert.equal(adminPayload.ratings[0].employeeId, "manager@example.com");
    assert.match(adminPayload.ratings[0].comment, /Отлично/);
  } finally {
    restore();
  }
});

test("server-renders privacy route", async () => {
  const response = await render("/privacy");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Политика и согласие/);
});

test("admin-managed chat commands answer without code changes", async () => {
  const password = "StrongPassword123";
  const restore = installAdminEnv(password);
  try {
    const worker = await loadWorker("chat-commands");
    const login = await worker.fetch(new Request("http://localhost/api/admin/login", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.232" }, body: JSON.stringify({ email: "manager@example.com", password }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie") ?? "";
    const created = await worker.fetch(new Request("http://localhost/api/admin/chat-commands", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ name: "Адрес", command: "/адрес", response: "Мы на улице Машиностроителей, 3.", enabled: true }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(created.status, 201);
    const command = (await created.json()).commands.find((item) => item.command === "/адрес");
    assert.ok(command);

    const chat = await worker.fetch(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "/адрес", page: "/" }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(chat.status, 200);
    assert.equal((await chat.json()).reply, "Мы на улице Машиностроителей, 3.");

    const disabled = await worker.fetch(new Request("http://localhost/api/admin/chat-commands", { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ ...command, enabled: false }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(disabled.status, 200);
    const removed = await worker.fetch(new Request(`http://localhost/api/admin/chat-commands?id=${command.id}`, { method: "DELETE", headers: { cookie } }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(removed.status, 200);
  } finally {
    restore();
  }
});

test("admin can clear, archive and delete a conversation", async () => {
  const password = "StrongPassword123";
  const restore = installAdminEnv(password);
  try {
    const worker = await loadWorker("chat-maintenance");
    const chat = await worker.fetch(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "Тестовый диалог", page: "/" }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    const session = (await chat.json()).session;
    const login = await worker.fetch(new Request("http://localhost/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "manager@example.com", password }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    const cookie = login.headers.get("set-cookie") ?? "";
    const action = (name) => worker.fetch(new Request("http://localhost/api/admin/conversations", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ action: name, sessionId: session.id }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal((await action("clear")).status, 200);
    assert.deepEqual((await (await worker.fetch(new Request(`http://localhost/api/admin/conversations?sessionId=${session.id}`, { headers: { cookie } }), workerContext(), { waitUntil() {}, passThroughOnException() {} })).json()).messages, []);
    assert.equal((await action("archive")).status, 200);
    const active = await (await worker.fetch(new Request("http://localhost/api/admin/conversations", { headers: { cookie } }), workerContext(), { waitUntil() {}, passThroughOnException() {} })).json();
    assert.equal(active.conversations.some((item) => item.id === session.id), false);
    const archived = await (await worker.fetch(new Request("http://localhost/api/admin/conversations?archived=1", { headers: { cookie } }), workerContext(), { waitUntil() {}, passThroughOnException() {} })).json();
    assert.equal(archived.conversations.some((item) => item.id === session.id), true);
    assert.equal((await action("delete")).status, 200);
    const afterDelete = await (await worker.fetch(new Request("http://localhost/api/admin/conversations?archived=1", { headers: { cookie } }), workerContext(), { waitUntil() {}, passThroughOnException() {} })).json();
    assert.equal(afterDelete.conversations.some((item) => item.id === session.id), false);
  } finally {
    restore();
  }
});

test("product image upload is served and removed after product edit", async () => {
  const password = "StrongPassword123";
  const restore = installAdminEnv(password);
  try {
    const worker = await loadWorker("product-image-pipeline");
    const login = await worker.fetch(new Request("http://localhost/api/admin/login", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.233" }, body: JSON.stringify({ email: "manager@example.com", password }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie") ?? "";
    const originalBytes = await readFile(join(process.cwd(), "public/images/hero/fasadof-scene-1983.webp"));
    const galleryBytes = await readFile(join(process.cwd(), "public/images/hero/fasadof-scene-1280.webp"));
    const form = new FormData();
    form.append("images", new File([originalBytes], "качественный-фасад.webp", { type: "image/webp" }));
    form.append("images", new File([galleryBytes], "галерея.webp", { type: "image/webp" }));
    const upload = await worker.fetch(new Request("http://localhost/api/admin/product-images", { method: "POST", headers: { cookie }, body: form }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(upload.status, 201);
    const uploadPayload = await upload.json();
    assert.equal(uploadPayload.urls.length, 2);
    const [imageUrl, galleryUrl] = uploadPayload.urls;
    assert.equal(uploadPayload.url, imageUrl);
    assert.match(imageUrl, /^\/api\/media\/products\/product-[a-f0-9]{24}\.webp$/);
    const media = await worker.fetch(new Request(`http://localhost${imageUrl}`), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(media.status, 200);
    assert.equal(media.headers.get("content-type"), "image/webp");
    assert.deepEqual(Buffer.from(await media.arrayBuffer()), originalBytes);
    const galleryMedia = await worker.fetch(new Request(`http://localhost${galleryUrl}`), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(galleryMedia.status, 200);
    assert.deepEqual(Buffer.from(await galleryMedia.arrayBuffer()), galleryBytes);

    const secondForm = new FormData();
    secondForm.set("image", new File([originalBytes], "тот-же-файл.webp", { type: "image/webp" }));
    const repeatedUpload = await worker.fetch(new Request("http://localhost/api/admin/product-images", { method: "POST", headers: { cookie }, body: secondForm }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(repeatedUpload.status, 201);
    assert.equal((await repeatedUpload.json()).url, imageUrl);

    const create = await worker.fetch(new Request("http://localhost/api/admin/products", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ slug: "qa-upload", category: "facades", material: "QA", name: "QA upload", description: "Проверка загрузки", image: imageUrl, texture: "custom", gallery: [galleryUrl], features: [], status: "published" }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(create.status, 201);
    const product = (await create.json()).product;
    assert.equal(product.image, imageUrl);
    assert.deepEqual(product.gallery, [galleryUrl]);
    const catalogueHtml = await (await worker.fetch(new Request("http://localhost/catalog"), workerContext(), { waitUntil() {}, passThroughOnException() {} })).text();
    assert.match(catalogueHtml, new RegExp(imageUrl.replaceAll("/", "\\/")));
    const detailHtml = await (await worker.fetch(new Request("http://localhost/catalog/qa-upload"), workerContext(), { waitUntil() {}, passThroughOnException() {} })).text();
    assert.match(detailHtml, new RegExp(imageUrl.replaceAll("/", "\\/")));
    assert.match(detailHtml, new RegExp(galleryUrl.replaceAll("/", "\\/")));
    const update = await worker.fetch(new Request("http://localhost/api/admin/products", { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ ...product, image: "texture-custom", gallery: [] }) }), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(update.status, 200);
    const removed = await worker.fetch(new Request(`http://localhost${imageUrl}`), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(removed.status, 404);
    const removedGallery = await worker.fetch(new Request(`http://localhost${galleryUrl}`), workerContext(), { waitUntil() {}, passThroughOnException() {} });
    assert.equal(removedGallery.status, 404);
  } finally {
    restore();
  }
});

test("MAX, VK callback and VK catalogue sync work without duplicates", async () => {
  const password = "StrongPassword123";
  const restoreAdmin = installAdminEnv(password);
  const integrationKeys = [
    "VK_GROUP_ID",
    "VK_ACCESS_TOKEN",
    "VK_CALLBACK_SECRET",
    "VK_CALLBACK_CONFIRMATION",
    "MAX_BOT_TOKEN",
    "MAX_MANAGER_CHAT_ID",
  ];
  const previous = Object.fromEntries(integrationKeys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    VK_GROUP_ID: "12345",
    VK_ACCESS_TOKEN: "vk-test-token",
    VK_CALLBACK_SECRET: "vk-test-secret",
    VK_CALLBACK_CONFIRMATION: "vk-confirmation-code",
    MAX_BOT_TOKEN: "max-test-token",
    MAX_MANAGER_CHAT_ID: "987654",
  });

  const maxMessages = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "platform-api2.max.ru") {
      assert.equal(init?.headers?.authorization, "max-test-token");
      assert.equal(url.searchParams.get("chat_id"), "987654");
      maxMessages.push(JSON.parse(String(init?.body ?? "{}")));
      return Response.json({ message: { body: { mid: `max-${maxMessages.length}` } } });
    }
    if (url.hostname === "api.vk.com" && url.pathname.endsWith("/users.get")) {
      return Response.json({ response: [{ first_name: "Иван", last_name: "Петров" }] });
    }
    if (url.hostname === "api.vk.com" && url.pathname.endsWith("/market.get")) {
      const photos = (id) => [{ sizes: [{ url: `https://vk-cdn.example/${id}-1.png`, width: 1200, height: 900 }] }, { sizes: [{ url: `https://vk-cdn.example/${id}-2.png`, width: 900, height: 700 }] }];
      return Response.json({
        response: {
          count: 2,
          items: [
            {
              id: 101,
              owner_id: -12345,
              title: "Эмаль матовая / глянцевая",
              description: "Описание эмалевых фасадов из VK",
              availability: 0,
              category: { name: "Мебельные фасады" },
              price: { amount: "999900", old_amount: "1099900" },
              photos: photos(101),
            },
            {
              id: 202,
              owner_id: -12345,
              title: "Новая фасадная панель",
              description: "Новая карточка, созданная из VK",
              availability: 0,
              category: { name: "Мебельные фасады" },
              price: { amount: "1234500", old_amount: "1500000" },
              photos: photos(202),
            },
          ],
        },
      });
    }
    if (url.hostname === "vk-cdn.example") {
      return new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), { headers: { "content-type": "image/png" } });
    }
    return originalFetch(input, init);
  };

  try {
    const worker = await loadWorker("vk-max-integrations");
    const login = await worker.fetch(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.201" },
        body: JSON.stringify({ email: "manager@example.com", password }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie") ?? "";

    const maxTest = await worker.fetch(
      new Request("http://localhost/api/admin/integrations/max/test", { method: "POST", headers: { cookie } }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(maxTest.status, 200);
    assert.match(maxMessages[0].text, /Тест уведомлений ФасадоФ/);

    const lead = await worker.fetch(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.202" },
        body: JSON.stringify({
          name: "Проверка MAX",
          phone: "+7 903 850-24-04",
          email: "lead@example.com",
          message: "Тест единой цепочки",
          product: "Фасады",
          material: "Эмаль",
          area: "5 м²",
          page: "/catalog/enamel",
          attribution: {
            firstTouch: { source: "VK", utm_source: "vk", utm_medium: "social", utm_campaign: "qa" },
            lastTouch: { source: "VK", utm_source: "vk", utm_medium: "social", utm_campaign: "qa" },
          },
          createdAt: new Date().toISOString(),
        }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(lead.status, 201);
    const leadPayload = await lead.json();
    assert.equal(leadPayload.integration.persisted, true);
    assert.equal(leadPayload.integration.maxNotified, true);
    assert.ok(leadPayload.integration.leadId > 0);
    const leadMessage = maxMessages.find((message) => /Новая заявка с сайта/.test(message.text));
    assert.doesNotMatch(leadMessage.text, /Заявка #\d+/);
    assert.match(leadMessage.text, /👤 Клиент:/);
    assert.match(leadMessage.text, /lead@example\.com/);
    assert.match(leadMessage.text, /UTM: source=vk, medium=social, campaign=qa/);
    assert.equal(leadMessage.attachments[0].payload.buttons[0][0].url, "https://fasadof36.ru/admin/support");

    const confirmation = await worker.fetch(
      new Request("http://localhost/api/integrations/vk/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "confirmation", group_id: 12345, secret: "vk-test-secret" }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(await confirmation.text(), "vk-confirmation-code");

    const vkEvent = {
      type: "message_new",
      group_id: 12345,
      event_id: "event-unique-1",
      secret: "vk-test-secret",
      object: { message: { from_id: 42, peer_id: 42, text: "Нужен расчёт фасадов" } },
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const callback = await worker.fetch(
        new Request("http://localhost/api/integrations/vk/callback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(vkEvent),
        }),
        workerContext(),
        { waitUntil() {}, passThroughOnException() {} },
      );
      assert.equal(callback.status, 200);
      assert.equal(await callback.text(), "ok");
    }
    assert.equal(maxMessages.filter((message) => /Новое сообщение VK/.test(message.text)).length, 1);

    const preview = await worker.fetch(
      new Request("http://localhost/api/admin/integrations/vk/sync", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ action: "preview" }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(preview.status, 200);
    const previewPayload = await preview.json();
    assert.ok(previewPayload.rows.some((row) => row.status === "enrich" && row.vkMarketItemId === 101));
    assert.ok(previewPayload.rows.some((row) => row.status === "create" && row.vkMarketItemId === 202));
    assert.ok(previewPayload.rows.some((row) => row.status === "site_only"));

    const apply = await worker.fetch(
      new Request("http://localhost/api/admin/integrations/vk/sync", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ action: "apply", priceStrategy: "preserve-site" }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(apply.status, 200);
    const applied = await apply.json();
    assert.equal(applied.summary.created, 1);
    assert.equal(applied.summary.enriched, 1);
    assert.equal(applied.summary.errors, 0);
    assert.equal(applied.summary.images, 4);
    assert.equal(applied.summary.review, 0);
    assert.equal(applied.maxNotified, true);
    assert.ok(maxMessages.some((message) => /Каталог ФасадоФ синхронизирован/.test(message.text)));

    const products = await worker.fetch(
      new Request("http://localhost/api/admin/products", { headers: { cookie } }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    ).then((response) => response.json());
    const enamel = products.products.find((product) => product.slug === "enamel");
    const created = products.products.find((product) => product.vkMarketItemId === 202);
    assert.equal(enamel.priceFrom, 5800, "site price must be preserved by default");
    assert.equal(enamel.vkMarketItemId, 101);
    assert.equal(created.priceFrom, 12345);
    assert.equal(created.oldPrice, 15000);
    assert.match(created.image, /^\/api\/media\/vk\//);
    assert.equal(created.gallery.length, 1);

    const media = await worker.fetch(
      new Request(`http://localhost${created.image}`),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(media.status, 200);
    assert.equal(media.headers.get("content-type"), "image/png");

    const secondApply = await worker.fetch(
      new Request("http://localhost/api/admin/integrations/vk/sync", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ action: "apply", priceStrategy: "preserve-site" }),
      }),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(secondApply.status, 200);
    const repeated = await secondApply.json();
    assert.equal(repeated.summary.created, 0);
    assert.equal(repeated.summary.errors, 0);
    assert.equal(repeated.summary.images, 0);
    assert.equal(repeated.products.filter((product) => product.vkMarketItemId === 202).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreAdmin();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
