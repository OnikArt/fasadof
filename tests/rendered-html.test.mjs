import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
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
  assert.match(html, /Ключевая коллекция/);
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

test("server-renders product pages with catalogue data", async () => {
  const response = await render("/catalog/enamel");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Эмаль матовая/);
  assert.match(html, /от 5/);
  assert.match(html, /Расчет материала/);
});

test("server-renders privacy route", async () => {
  const response = await render("/privacy");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Политика и согласие/);
});
