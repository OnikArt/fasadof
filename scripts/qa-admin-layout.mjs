import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3007";
const outDir = join(process.cwd(), "qa", "admin-layout");
const userDataDir = join(process.cwd(), "qa", `chrome-admin-${Date.now()}`);
const port = 12_733 + Math.floor(Math.random() * 1200);

await mkdir(outDir, { recursive: true });

const env = await readDotEnv();
const secret = process.env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET;
if (!secret) throw new Error("ADMIN_SESSION_SECRET is required for admin layout QA");
const adminEmail = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || "qa-admin@example.com";

const token = createSessionToken({
  id: "qa-admin",
  email: adminEmail,
  name: process.env.ADMIN_NAME || env.ADMIN_NAME || "QA Admin",
  role: "ADMIN",
  exp: Math.floor(Date.now() / 1000) + 60 * 60,
}, secret);

class CdpClient {
  id = 0;
  pending = new Map();

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
  await waitForJson(`http://127.0.0.1:${port}/json/version`, 10_000);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Network.setCookie", {
    name: "fasadof_manager_session",
    value: token,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });

  const viewports = [
    [1280, 720],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
    [600, 960],
    [720, 1024],
    [768, 1024],
    [800, 1280],
    [820, 1180],
    [834, 1194],
    [1024, 768],
    [320, 568],
    [360, 800],
    [375, 812],
    [390, 844],
    [414, 896],
    [430, 932],
  ];
  const report = [];

  for (const [width, height] of viewports) {
    await setViewport(cdp, width, height);
    await navigate(cdp, `${baseUrl}/admin/support`);
    await wait(cdp, 600);
    if (width >= 1024) {
      await click(cdp, ".admin-view-tabs button:nth-of-type(2)");
      await wait(cdp, 300);
    }
    let drawer = null;
    let mobileProducts = null;
    if (width < 769) {
      await click(cdp, ".admin-mobile-topbar button");
      await wait(cdp, 240);
      const opened = await evaluate(cdp, `(() => {
        const sidebar = document.querySelector(".support-sidebar");
        const rect = sidebar?.getBoundingClientRect();
        return Boolean(rect && Math.round(rect.left) >= -1 && rect.width > 200);
      })()`);
      await click(cdp, ".admin-drawer-close");
      await wait(cdp, 240);
      const closed = await evaluate(cdp, `(() => {
        const sidebar = document.querySelector(".support-sidebar");
        const rect = sidebar?.getBoundingClientRect();
        return Boolean(rect && Math.round(rect.right) <= 1);
      })()`);
      drawer = { opened, closed };

      await click(cdp, ".admin-mobile-topbar button");
      await wait(cdp, 200);
      await click(cdp, ".admin-view-tabs button:nth-of-type(2)");
      await wait(cdp, 500);
      mobileProducts = await evaluate(cdp, `(() => {
        const add = document.querySelector(".product-admin-panel header .btn");
        const filters = document.querySelector(".product-admin-filters");
        const first = document.querySelector(".product-admin-card");
        const addRect = add?.getBoundingClientRect();
        const filtersRect = filters?.getBoundingClientRect();
        const firstRect = first?.getBoundingClientRect();
        return {
          hasAdd: Boolean(add),
          hasFilters: Boolean(filters),
          hasFirstProduct: Boolean(first),
          addBeforeFilters: Boolean(addRect && filtersRect && addRect.bottom <= filtersRect.top + 1),
          filtersBeforeFirst: Boolean(filtersRect && firstRect && filtersRect.bottom <= firstRect.top + 1),
          firstVisible: Boolean(firstRect && firstRect.top >= 0 && firstRect.left >= 0 && firstRect.right <= window.innerWidth + 1),
        };
      })()`);
    }
    const metrics = await evaluate(cdp, getAdminMetricsSource());
    const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const screenshotPath = join(outDir, `admin-${width}x${height}.png`);
    await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
    report.push({ width, height, screenshot: screenshotPath, drawer, mobileProducts, ...metrics });
  }

  const drawerNames = ["Иван", "Александр", "Александр Сергеевич", "Очень длинное имя пользователя"];
  const drawerNameReport = [];
  for (const name of drawerNames) {
    await cdp.send("Network.setCookie", {
      name: "fasadof_manager_session",
      value: createSessionToken({
        id: "qa-admin",
        email: adminEmail,
        name,
        role: "ADMIN",
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      }, secret),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
    await setViewport(cdp, 360, 640);
    await navigate(cdp, `${baseUrl}/admin/support`);
    await wait(cdp, 500);
    await click(cdp, ".admin-mobile-topbar button");
    await wait(cdp, 240);
    const drawerMetrics = await evaluate(cdp, `(() => {
      const profile = document.querySelector(".admin-mobile-profile");
      const nav = document.querySelector(".admin-view-tabs");
      const close = document.querySelector(".admin-drawer-close");
      const actions = document.querySelector(".admin-sidebar-actions");
      const sidebar = document.querySelector(".support-sidebar");
      const profileRect = profile?.getBoundingClientRect();
      const navRect = nav?.getBoundingClientRect();
      const closeRect = close?.getBoundingClientRect();
      const actionsRect = actions?.getBoundingClientRect();
      const sidebarRect = sidebar?.getBoundingClientRect();
      return {
        name: ${JSON.stringify(name)},
        profileBeforeNav: Boolean(profileRect && navRect && profileRect.bottom <= navRect.top + 1),
        closeBeforeProfile: Boolean(closeRect && profileRect && closeRect.bottom <= profileRect.top + 32),
        navBeforeActions: Boolean(navRect && actionsRect && navRect.bottom <= actionsRect.top + 1),
        nameFitsDrawer: Boolean(profileRect && sidebarRect && profileRect.left >= sidebarRect.left && profileRect.right <= sidebarRect.right + 1),
        actionsVisible: Boolean(actionsRect && actionsRect.bottom <= window.innerHeight + 1),
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    })()`);
    const safeName = name.replace(/\s+/g, "-").toLowerCase();
    const drawerScreenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const drawerScreenshotPath = join(outDir, `drawer-${safeName}.png`);
    await writeFile(drawerScreenshotPath, Buffer.from(drawerScreenshot.data, "base64"));
    drawerNameReport.push({ ...drawerMetrics, screenshot: drawerScreenshotPath });
  }

  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  await writeFile(join(outDir, "drawer-names.json"), JSON.stringify(drawerNameReport, null, 2));
  console.log(JSON.stringify(report.map((item) => ({
    width: item.width,
    height: item.height,
    route: item.route,
    overflowX: item.overflowX,
    bodyScrolls: item.bodyScrolls,
    adminTop: item.adminTop,
    adminHeight: item.adminHeight,
    adminFitsViewport: item.adminFitsViewport,
    drawer: item.drawer,
    mobileProducts: item.mobileProducts,
    hasInternalScrollContainers: item.hasInternalScrollContainers,
    boxes: item.boxes,
    exceptions: item.exceptions,
  })), null, 2));
  console.log(JSON.stringify({ drawerNameReport }, null, 2));

  const failures = report.filter((item) => {
    const desktop = item.width >= 1024;
    const mobile = item.width < 769;
    return item.overflowX
      || item.exceptions
      || (desktop && (!item.adminFitsViewport || item.bodyScrolls || !item.hasInternalScrollContainers))
      || (mobile && (!item.drawer?.opened || !item.drawer?.closed))
      || (mobile && (!item.mobileProducts?.hasAdd || !item.mobileProducts?.hasFilters || !item.mobileProducts?.hasFirstProduct || !item.mobileProducts?.addBeforeFilters || !item.mobileProducts?.filtersBeforeFirst || !item.mobileProducts?.firstVisible));
  });
  const drawerNameFailures = drawerNameReport.filter((item) => !item.profileBeforeNav || !item.closeBeforeProfile || !item.navBeforeActions || !item.nameFitsDrawer || !item.actionsVisible || item.overflowX);
  if (failures.length || drawerNameFailures.length) process.exitCode = 1;
} finally {
  chrome.kill();
  await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
}

function getAdminMetricsSource() {
  return `(() => {
  const admin = document.querySelector(".support-admin");
  const body = document.body;
  const html = document.documentElement;
  const boxes = [".support-sidebar", ".conversation-list", ".conversation-panel", ".admin-wide-panel", ".product-admin-list", ".product-editor"]
    .map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { selector, height: Math.round(rect.height), scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, overflowY: getComputedStyle(element).overflowY };
    })
    .filter(Boolean);
  const rect = admin?.getBoundingClientRect();
  return {
    route: location.pathname,
    overflowX: html.scrollWidth > window.innerWidth + 1,
    bodyScrolls: body.scrollHeight > window.innerHeight + 1 && getComputedStyle(body).overflowY !== "hidden",
    adminTop: rect ? Math.round(rect.top) : null,
    adminHeight: rect ? Math.round(rect.height) : null,
    adminFitsViewport: rect ? Math.abs(rect.height - window.innerHeight) <= 2 && Math.round(rect.top) === 0 : false,
    hasInternalScrollContainers: boxes.some((box) => box.scrollHeight >= box.clientHeight && ["auto", "scroll", "hidden"].includes(box.overflowY)),
    boxes,
    exceptions: 0,
  };
})()`;
}

async function readDotEnv() {
  try {
    const text = await readFile(join(process.cwd(), ".env"), "utf8");
    return Object.fromEntries(text.split(/\r?\n/).map((line) => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) return null;
      return [match[1], match[2].replace(/^["']|["']$/g, "")];
    }).filter(Boolean));
  } catch {
    return {};
  }
}

function createSessionToken(payload, secret) {
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payloadPart).digest("base64url");
  return `${payloadPart}.${signature}`;
}

async function navigate(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await wait(cdp, 700);
}

async function setViewport(cdp, width, height) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
}

async function click(cdp, selector) {
  const rect = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`);
  if (!rect) return;
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", buttons: 0, clickCount: 1 });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime exception");
  return result.result.value;
}

async function wait(cdp, delay) {
  await new Promise((resolve) => setTimeout(resolve, delay));
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
