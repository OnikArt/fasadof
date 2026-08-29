import assert from "node:assert/strict";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  assert.match(html, /Chat2Desk/);
  assert.match(html, /8 903 850-24-04/);
  assert.match(html, /fasadof36@gmail.com/);
  assert.match(html, /Бесплатная доставка по Воронежу/);
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

test(".env.example documents active production variables", async () => {
  const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  for (const name of [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_CHAT2DESK_WIDGET_TOKEN",
    "GIGACHAT_AUTH_KEY",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD_HASH",
    "ADMIN_SESSION_SECRET",
  ]) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"));
  }

  assert.doesNotMatch(envExample, /GEMINI|MAX_BOT|MAX_CHAT|NEXT_PUBLIC_VK_PIXEL_ID/);
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

test("lead API normalizes Russian phone and does not call external notifications", async () => {
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
  assert.equal(payload.integration.persisted, false);
  assert.equal(Object.hasOwn(payload.integration, "vk"), false);
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
