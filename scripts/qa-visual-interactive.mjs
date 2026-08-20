import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "qa", "visual-interactive");
const userDataDir = join(process.cwd(), "qa", `chrome-profile-${Date.now()}`);
const port = 9533 + Math.floor(Math.random() * 300);

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

  const report = {
    visualStates: [],
    clicks: [],
  };

  await captureState(cdp, report, {
    name: "desktop-hero-1366x768",
    route: "/",
    width: 1366,
    height: 768,
  });

  await captureState(cdp, report, {
    name: "production-cards-1440x900",
    route: "/",
    width: 1440,
    height: 900,
    before: () => evaluate(cdp, "document.querySelector('#production')?.scrollIntoView({ block: 'start', behavior: 'instant' })"),
  });

  await captureState(cdp, report, {
    name: "mobile-menu-390x844",
    route: "/",
    width: 390,
    height: 844,
    before: async () => {
      await click(cdp, ".menu-button");
      await wait(cdp, 250);
    },
  });

  await captureState(cdp, report, {
    name: "mobile-chat-390x844",
    route: "/",
    width: 390,
    height: 844,
    before: async () => {
      await click(cdp, ".chat-toggle");
      await wait(cdp, 250);
    },
  });

  await runClickAudit(cdp, report);

  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    visualStates: report.visualStates.map((item) => ({
      name: item.name,
      overflowX: item.metrics.overflowX,
      offenders: item.metrics.offenders.length,
      textOverflows: item.metrics.textOverflows.length,
      screenshot: item.screenshot,
    })),
    clicks: report.clicks,
  }, null, 2));

  const failedVisual = report.visualStates.filter((item) => item.metrics.overflowX || item.metrics.offenders.length || item.metrics.textOverflows.length);
  const failedClicks = report.clicks.filter((item) => !item.fixed);
  if (failedVisual.length || failedClicks.length) {
    process.exitCode = 1;
  }
} finally {
  chrome.kill();
  await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
}

async function captureState(cdp, report, state) {
  await setViewport(cdp, state.width, state.height);
  await navigate(cdp, state.route);
  if (state.before) await state.before();
  await wait(cdp, 450);

  const metrics = await collectMetrics(cdp);
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshotPath = join(outDir, `${state.name}.png`);
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  report.visualStates.push({
    ...state,
    before: undefined,
    screenshot: screenshotPath,
    metrics,
  });
}

async function runClickAudit(cdp, report) {
  const desktopNav = [
    { selector: ".desktop-nav a:nth-of-type(1)", expected: "opens /catalog", validate: () => location.pathname === "/catalog" },
    { selector: ".desktop-nav a:nth-of-type(2)", expected: "scrolls to #materials", validate: () => location.hash === "#materials" },
    { selector: ".desktop-nav a:nth-of-type(3)", expected: "scrolls to #production", validate: () => location.hash === "#production" },
    { selector: ".desktop-nav a:nth-of-type(4)", expected: "scrolls to #delivery", validate: () => location.hash === "#delivery" },
    { selector: ".desktop-nav a:nth-of-type(5)", expected: "scrolls to #contacts", validate: () => location.hash === "#contacts" },
    { selector: ".header-cta", expected: "scrolls to #order", validate: () => location.hash === "#order" },
    { selector: ".hero-actions .btn.primary", expected: "scrolls to #order", validate: () => location.hash === "#order" },
    { selector: ".hero-actions .btn.ghost", expected: "opens /catalog", validate: () => location.pathname === "/catalog" },
  ];

  await setViewport(cdp, 1366, 768);
  for (const item of desktopNav) {
    await navigate(cdp, "/");
    await clickAndRecord(cdp, report, item);
  }

  await navigate(cdp, "/");
  await clickAndRecord(cdp, report, {
    selector: ".category-card",
    expected: "opens product detail",
    validate: () => location.pathname.startsWith("/catalog/") && location.pathname !== "/catalog",
  });

  await navigate(cdp, "/catalog");
  await clickAndRecord(cdp, report, {
    selector: ".product-card a",
    expected: "opens product detail from catalog card",
    validate: () => location.pathname.startsWith("/catalog/") && location.pathname !== "/catalog",
  });

  await navigate(cdp, "/catalog/enamel");
  await clickAndRecord(cdp, report, {
    selector: ".product-info .btn.primary",
    expected: "scrolls to product-order form",
    validate: () => location.hash === "#product-order",
  });

  await navigate(cdp, "/#order");
  await clickAndRecord(cdp, report, {
    selector: ".lead-form .choice",
    expected: "selects a lead option",
    validate: () => document.querySelector(".lead-form .choice.active") != null,
  });
  await clickAndRecord(cdp, report, {
    selector: ".lead-form .btn.primary",
    expected: "moves lead form to next step",
    validate: () => document.querySelector(".lead-form legend")?.textContent?.includes("Материал") === true,
  });

  await setViewport(cdp, 390, 844);
  const mobileNav = [
    { selector: ".mobile-menu nav a:nth-of-type(1)", expected: "mobile opens /catalog", validate: () => location.pathname === "/catalog" },
    { selector: ".mobile-menu nav a:nth-of-type(2)", expected: "mobile scrolls to #materials", validate: () => location.hash === "#materials" },
    { selector: ".mobile-menu nav a:nth-of-type(3)", expected: "mobile scrolls to #production", validate: () => location.hash === "#production" },
    { selector: ".mobile-menu nav a:nth-of-type(4)", expected: "mobile scrolls to #delivery", validate: () => location.hash === "#delivery" },
    { selector: ".mobile-menu nav a:nth-of-type(5)", expected: "mobile scrolls to #contacts", validate: () => location.hash === "#contacts" },
    { selector: ".mobile-menu-cta", expected: "mobile CTA scrolls to #order", validate: () => location.hash === "#order" },
  ];

  for (const item of mobileNav) {
    await navigate(cdp, "/");
    await click(cdp, ".menu-button");
    await wait(cdp, 150);
    await clickAndRecord(cdp, report, item);
  }

  await navigate(cdp, "/");
  await clickAndRecord(cdp, report, {
    selector: ".chat-toggle",
    expected: "opens chat",
    validate: () => document.querySelector(".chat-panel") != null,
  });
  await clickAndRecord(cdp, report, {
    selector: ".quick-actions button:nth-of-type(1)",
    expected: "quick action sends message",
    validate: () => Array.from(document.querySelectorAll(".chat-history p")).some((item) => item.textContent?.includes("Подобрать фасад")),
  });

  const footerLinks = [
    { selector: ".site-footer a:nth-of-type(1)", expected: "opens privacy", validate: () => location.pathname === "/privacy" },
    { selector: ".site-footer a:nth-of-type(2)", expected: "opens admin login", validate: () => location.pathname === "/admin/login" },
    { selector: ".site-footer a:nth-of-type(3)", expected: "opens protected support admin", validate: () => location.pathname === "/admin/login" || location.pathname === "/admin/support" },
  ];

  await setViewport(cdp, 1366, 900);
  for (const item of footerLinks) {
    await navigate(cdp, "/");
    await evaluate(cdp, "document.querySelector('.site-footer')?.scrollIntoView({ block: 'center' })");
    await wait(cdp, 150);
    await clickAndRecord(cdp, report, item);
  }
}

async function clickAndRecord(cdp, report, item) {
  let fixed = false;
  let actual = "";
  try {
    await click(cdp, item.selector);
    await wait(cdp, 650);
    fixed = await evaluate(cdp, `(${item.validate.toString()})()`);
    actual = await evaluate(cdp, "location.pathname + location.hash");
  } catch (error) {
    actual = error instanceof Error ? error.message : String(error);
  }
  report.clicks.push({ element: item.selector, expected: item.expected, actual, fixed });
}

async function click(cdp, selector) {
  await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    return true;
  })()`);
  await wait(cdp, 80);
  const rect = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`);
  if (!rect) throw new Error(`Element not found or not visible: ${selector}`);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", buttons: 0, clickCount: 1 });
}

async function collectMetrics(cdp) {
  return evaluate(cdp, `(() => {
    const width = window.innerWidth;
    const doc = document.documentElement;
    const skip = (element) => Boolean(element.closest('.quick-actions'));
    const offenders = Array.from(document.querySelectorAll('body *'))
      .filter((element) => !skip(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const className = typeof element.className === 'string' ? element.className : '';
        return { tag: element.tagName, className, text: element.textContent?.trim().slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
      })
      .filter((item) => item.width > 0 && (item.left < -1 || item.right > width + 1))
      .slice(0, 20);
    const textOverflows = Array.from(document.querySelectorAll('.capability-card h3, .product-card h3, .product-card p, .card-footer strong, .mobile-menu a, .mobile-menu strong, .mobile-menu span, .chat-panel p, .chat-panel strong, .chat-panel small, .chat-panel input, .chat-panel button'))
      .filter((element) => !skip(element))
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 80), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }))
      .slice(0, 20);
    return {
      route: location.pathname,
      hash: location.hash,
      width,
      height: window.innerHeight,
      scrollWidth: doc.scrollWidth,
      overflowX: doc.scrollWidth > width + 1,
      offenders,
      textOverflows,
    };
  })()`);
}

async function navigate(cdp, route) {
  const loaded = cdp.waitFor("Page.loadEventFired", 15_000);
  await cdp.send("Page.navigate", { url: `${baseUrl}${route}` });
  await loaded.catch(() => undefined);
  await evaluate(cdp, "document.documentElement.style.scrollBehavior = 'auto'; document.body.style.scrollBehavior = 'auto'");
  await wait(cdp, 500);
}

async function setViewport(cdp, width, height) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime exception");
  }
  return result.result.value;
}

async function wait(cdp, delay) {
  await evaluate(cdp, `new Promise((resolve) => setTimeout(resolve, ${delay}))`);
}

async function waitForJson(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Keep waiting for Chrome.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
