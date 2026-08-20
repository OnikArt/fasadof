import assert from "node:assert/strict";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import test from "node:test";

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

test("server-renders the ФасадоФ home page", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /ФасадоФ/);
  assert.match(html, /Доставка/);
  assert.match(html, /Рассчитать проект/);
  assert.match(html, /Сразу понятно, что можно заказать/);
  assert.match(html, /Основные фасадные решения/);
  assert.match(html, /Открыть чат/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});

test("server-renders the full catalogue route", async () => {
  const response = await render("/catalog");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Все материалы ФасадоФ/);
  assert.match(html, /Каталог материалов/);
  assert.match(html, /Эмаль матовая/);
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
  assert.match(await login.text(), /Вход менеджера/);

  const support = await render("/admin/support");
  assert.ok([302, 307, 308].includes(support.status));
  assert.match(support.headers.get("location") ?? "", /\/admin\/login/);
});

test("chat API stops AI after manager request", async () => {
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
  assert.equal(takeoverPayload.session.status, "WAITING_OPERATOR");

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
      new Request("http://localhost/api/admin/conversations?status=WAITING_OPERATOR", { headers: { cookie } }),
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

    const customerPoll = await worker.fetch(
      new Request(`http://localhost/api/chat?sessionId=${firstPayload.session.id}&customerToken=${firstPayload.session.customerToken}`),
      workerContext(),
      { waitUntil() {}, passThroughOnException() {} },
    );
    assert.equal(customerPoll.status, 200);
    const customerPayload = await customerPoll.json();
    assert.ok(customerPayload.messages.some((message) => message.role === "operator" && /эмали/.test(message.content)));
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
