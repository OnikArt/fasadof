import { spawn } from "node:child_process";

const executable = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "vite";
const args = process.platform === "win32" ? ["/d", "/s", "/c", "vite", "build"] : ["build"];

const child = spawn(executable, args, {
  env: {
    ...process.env,
    NITRO_PRESET: process.env.NITRO_PRESET || "vercel",
    VERCEL: process.env.VERCEL || "1",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }

  process.exit(code ?? 0);
});
