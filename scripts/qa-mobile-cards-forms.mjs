import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "qa", "mobile-cards-forms");
const userDataDir = join(process.cwd(), "qa", `chrome-profile-${Date.now()}`);
const port = 9633 + Math.floor(Math.random() * 300);
const widths = [320, 360, 375, 390, 430];
const routes = ["/", "/catalog", "/catalog/eva-dsp", "/catalog/acrylic-stone"];

class CdpClient {
  id = 0;
  pending = new Map();
  handlers = new Map();

  constructor(url) {
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (message) => {
      const payload = JSON.parse(message.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { resolve, reject } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) reject(new Error(payload.error.message));
        else resolve(payload.result);
        return;
      }
      if (payload.method && this.handlers.has(payload.method)) {
        for (const handler of this.handlers.get(payload.method)) handler(payload.params ?? {});
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
}

await mkdir(outDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=old",
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--disable-dev-shm-usage",
  "--no-sandbox",
  "--hide-scrollbars",
  "--no-first-run",
  "--disable-extensions",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

chrome.stderr.on("data", () => {});

try {
  const version = await waitForJson(`http://127.0.0.1:${port}/json/version`, 10_000);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const cdp = new CdpClient(target.webSocketDebuggerUrl || version.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const report = [];
  for (const width of widths) {
    for (const route of routes) {
      await setViewport(cdp, width);
      await navigate(cdp, `${baseUrl}${route}`);
      const metrics = await evaluate(cdp, pageMetricsExpression());
      report.push({ width, route, ...metrics });
      const safeRoute = route === "/" ? "home" : route.replaceAll("/", "_").replace(/^_/, "");
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await writeFile(join(outDir, `${safeRoute}-${width}.png`), Buffer.from(screenshot.data, "base64"));
    }

    await setViewport(cdp, width);
    await navigate(cdp, `${baseUrl}/`);
    const formSteps = [];
    for (let step = 0; step < 4; step += 1) {
      await evaluate(cdp, `document.querySelector(".lead-form")?.scrollIntoView({ block: "center" })`);
      await evaluate(cdp, "new Promise((resolve) => setTimeout(resolve, 200))");
      formSteps.push(await evaluate(cdp, formMetricsExpression(step)));
      if (step < 3) {
        await evaluate(cdp, `document.querySelector(".lead-form .btn.primary")?.click()`);
        await evaluate(cdp, "new Promise((resolve) => setTimeout(resolve, 250))");
      }
    }
    report.push({ width, route: "/#lead-form-steps", formSteps });
  }

  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  const failures = report.flatMap((item) => collectFailures(item));
  console.log(JSON.stringify({ checkedWidths: widths, failures, reportPath: join(outDir, "report.json") }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
} finally {
  chrome.kill();
  await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
}

async function setViewport(cdp, width) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 980,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

async function navigate(cdp, url) {
  const loaded = waitForLoad(cdp, 15_000);
  await cdp.send("Page.navigate", { url });
  await loaded.catch(() => undefined);
  await evaluate(cdp, "new Promise((resolve) => setTimeout(resolve, 450))");
}

async function waitForLoad(cdp, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const handlers = cdp.handlers.get("Page.loadEventFired") ?? new Set();
    const handler = () => {
      clearTimeout(timer);
      handlers.delete(handler);
      resolve();
    };
    handlers.add(handler);
    cdp.handlers.set("Page.loadEventFired", handlers);
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result.value;
}

function pageMetricsExpression() {
  return `(() => {
    const width = window.innerWidth;
    const doc = document.documentElement;
    const cardIssues = Array.from(document.querySelectorAll(".product-card")).map((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const children = Array.from(card.querySelectorAll("h3, p, strong, span, .card-footer, a")).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          text: (el.textContent || "").trim().slice(0, 80),
          tag: el.tagName,
          className: typeof el.className === "string" ? el.className : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          outsideCard: rect.left < cardRect.left - 1 || rect.right > cardRect.right + 1,
          outsideViewport: rect.left < -1 || rect.right > width + 1,
        };
      }).filter((item) => item.outsideCard || item.outsideViewport);
      return { index, cardWidth: Math.round(cardRect.width), issues: children };
    }).filter((item) => item.issues.length > 0);
    return {
      scrollWidth: doc.scrollWidth,
      overflowX: doc.scrollWidth > width + 1,
      cardIssues,
    };
  })()`;
}

function formMetricsExpression(step) {
  return `(() => {
    const form = document.querySelector(".lead-form");
    if (!form) return { step: ${step}, missing: true };
    const legend = form.querySelector("legend");
    const fieldset = form.querySelector("fieldset");
    const firstControl = fieldset?.querySelector(".choice-grid, label");
    const action = fieldset?.querySelector(".btn.primary");
    const legendRect = legend?.getBoundingClientRect();
    const firstRect = firstControl?.getBoundingClientRect();
    const actionRect = action?.getBoundingClientRect();
    const previousRect = action?.previousElementSibling?.getBoundingClientRect();
    return {
      step: ${step},
      headingToOptions: legendRect && firstRect ? Math.round(firstRect.top - legendRect.bottom) : null,
      optionsToAction: previousRect && actionRect ? Math.round(actionRect.top - previousRect.bottom) : null,
      actionRight: actionRect ? Math.round(actionRect.right) : null,
      viewport: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  })()`;
}

function collectFailures(item) {
  const failures = [];
  if (item.overflowX) failures.push({ width: item.width, route: item.route, reason: "page horizontal overflow", scrollWidth: item.scrollWidth });
  for (const card of item.cardIssues ?? []) failures.push({ width: item.width, route: item.route, reason: "product card content overflow", card });
  for (const step of item.formSteps ?? []) {
    if (step.overflowX) failures.push({ width: item.width, route: item.route, step: step.step, reason: "form horizontal overflow" });
    if (step.headingToOptions !== null && step.headingToOptions < 20) failures.push({ width: item.width, route: item.route, step: step.step, reason: "heading/options gap too small", gap: step.headingToOptions });
    if (step.optionsToAction !== null && step.optionsToAction < 24) failures.push({ width: item.width, route: item.route, step: step.step, reason: "options/action gap too small", gap: step.optionsToAction });
    if (step.actionRight !== null && step.actionRight > step.viewport + 1) failures.push({ width: item.width, route: item.route, step: step.step, reason: "form action leaves viewport", actionRight: step.actionRight });
  }
  return failures;
}

async function waitForJson(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
