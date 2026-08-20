import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getManagerFromCookieHeader, isManagerAuthConfigured, readManagerAuthEnv } from "@/server/manager-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход менеджера",
  description: "Защищённый вход менеджера ФасадоФ.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage() {
  const requestHeaders = await headers();
  const env = readManagerAuthEnv();
  const manager = await getManagerFromCookieHeader(requestHeaders.get("cookie"), env);

  if (manager) redirect("/admin/support");

  return (
    <main className="admin-login-page section">
      <div className="admin-login-copy">
        <p className="eyebrow">ФасадоФ support</p>
        <h1>Вход менеджера</h1>
        <p>
          Доступ защищён server-side session cookie. Первый менеджер создаётся через `npm run admin:create`,
          затем значения добавляются в production env.
        </p>
        {!isManagerAuthConfigured(env) && (
          <div className="admin-warning" role="alert">
            Manager auth не настроен. Добавьте ADMIN_EMAIL, ADMIN_PASSWORD_HASH и ADMIN_SESSION_SECRET.
          </div>
        )}
      </div>
      <AdminLoginForm />
    </main>
  );
}
