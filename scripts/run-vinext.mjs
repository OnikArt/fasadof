import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const command = process.argv[2] ?? "dev";
const env = { ...readDotEnv(), ...process.env };
const maxCaPath = resolve("certs/russian_trusted_root_ca_pem.crt");
if (!env.NODE_EXTRA_CA_CERTS && existsSync(maxCaPath)) env.NODE_EXTRA_CA_CERTS = maxCaPath;
const args = [command];
const executable = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "vinext";

if (env.PORT && ["dev", "start", "preview"].includes(command)) {
  args.push("--port", env.PORT);
}
if (["start", "preview"].includes(command)) args.push("--host", "0.0.0.0");

const child = spawn(executable, process.platform === "win32" ? ["/d", "/s", "/c", "vinext", ...args] : args, {
  env: {
    ...env,
    NODE_USE_SYSTEM_CA: env.NODE_USE_SYSTEM_CA || "1",
    WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }

  process.exit(code ?? 0);
});

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
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        value = value.replaceAll("\\$", "$");
        return [key, value];
      }),
  );
}
