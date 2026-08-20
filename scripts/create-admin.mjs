import { pbkdf2Sync, randomBytes } from "node:crypto";

const [, , email, password, ...nameParts] = process.argv;
const name = nameParts.join(" ") || "Менеджер";
const iterations = 210_000;

if (!email || !password) {
  console.error("Usage: npm run admin:create -- manager@example.com strong-password \"Имя менеджера\"");
  process.exit(1);
}

if (password.length < 12) {
  console.error("Password must contain at least 12 characters.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

console.log("ADMIN_EMAIL=" + email.trim().toLowerCase());
console.log("ADMIN_NAME=" + name);
console.log(`ADMIN_PASSWORD_HASH=pbkdf2_sha256$${iterations}$${base64Url(salt)}$${base64Url(hash)}`);
console.log("ADMIN_SESSION_SECRET=" + randomBytes(32).toString("base64url"));
