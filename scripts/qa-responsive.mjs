import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "qa", "responsive");
const userDataDir = join(process.cwd(), "qa", `chrome-profile-${Date.now()}`);
const port = 9333 + Math.floor(Math.random() * 300);

const checks = [
  ...[320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920].map((width) => ({ route: "/", width, height: width < 768 ? 920 : 1100 })),
  { route: "/catalog", width: 390, height: 1200 },
  { route: "/catalog", width: 1440, height: 1100 },
  { route: "/catalog/enamel", width: 390, height: 1200 },
  { route: "/catalog/enamel", width: 1440, height: 1100 },
  { route: "/admin/login", width: 390, height: 900 },
  { route: "/admin/login", width: 768, height: 900 },
];

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

  waitFor(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        remove();
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      const remove = this.on(method, (params) => {
        clearTimeout(timer);
        remove();
        resolve(params);
      });
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) ?? new Set();
    handlers.add(handler);
    this.handlers.set(method, handlers);
    return () => handlers.delete(handler);
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
  await cdp.send("Network.enable");

  const report = [];
  for (const check of checks) {
    const failures = [];
    const exceptions = [];
    const removeNetwork = cdp.on("Network.loadingFailed", (event) => failures.push(event));
    const removeException = cdp.on("Runtime.exceptionThrown", (event) => exceptions.push(event.exceptionDetails?.text || "runtime exception"));

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: check.width,
      height: check.height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const loaded = cdp.waitFor("Page.loadEventFired", 15_000);
    await cdp.send("Page.navigate", { url: `${baseUrl}${check.route}` });
    await loaded.catch(() => undefined);
    await cdp.send("Runtime.evaluate", {
      expression: "new Promise((resolve) => setTimeout(resolve, 450))",
      awaitPromise: true,
    });

    const metrics = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const width = window.innerWidth;
        const doc = document.documentElement;
        const selectors = [".site-header", ".hero-section", ".hero-brand", ".hero-visual", ".hero-copy", ".hero-facts", ".product-grid", ".product-card", ".material-explorer", ".lead-form", ".chat-widget", ".catalog-toolbar", ".product-detail-hero"];
        const boxes = selectors.map((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { selector, left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) };
        }).filter(Boolean);
        const offenders = Array.from(document.querySelectorAll("body *")).map((el) => {
          const rect = el.getBoundingClientRect();
          const className = typeof el.className === "string" ? el.className : "";
          return { tag: el.tagName, className, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
        }).filter((item) => item.width > 0 && (item.left < -1 || item.right > width + 1)).slice(0, 12);
        return { route: location.pathname, width, height: window.innerHeight, scrollWidth: doc.scrollWidth, overflowX: doc.scrollWidth > width + 1, boxes, offenders };
      })()`,
    });

    const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const safeRoute = check.route === "/" ? "home" : check.route.replaceAll("/", "_").replace(/^_/, "");
    const screenshotPath = join(outDir, `${safeRoute}-${check.width}.png`);
    await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

    removeNetwork();
    removeException();
    report.push({
      route: check.route,
      width: check.width,
      screenshot: screenshotPath,
      metrics: metrics.result.value,
      networkFailures: failures.map((failure) => ({ errorText: failure.errorText, type: failure.type })),
      exceptions,
    });
  }

  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  nodeReport(report);
} finally {
  chrome.kill();
  await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
}

function nodeReport(report) {
  const summary = report.map((item) => ({
    route: item.route,
    width: item.width,
    overflowX: item.metrics.overflowX,
    scrollWidth: item.metrics.scrollWidth,
    offenders: item.metrics.offenders.length,
    networkFailures: item.networkFailures.length,
    exceptions: item.exceptions.length,
  }));
  console.log(JSON.stringify(summary, null, 2));
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
