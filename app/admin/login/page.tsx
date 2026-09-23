import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getManagerFromCookieHeader, isManagerSessionConfigured, readManagerAuthEnv } from "@/server/manager-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход в админ-панель",
  description: "Защищённый вход в админ-панель ФасадоФ.",
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
        <p className="eyebrow">ФасадоФ</p>
        <h1>Вход в админ-панель</h1>
        <p>
          Доступ защищён server-side session cookie. Первый менеджер создаётся через `npm run admin:create`,
          затем значения добавляются в production env.
        </p>
        {!isManagerSessionConfigured(env) && (
          <div className="admin-warning" role="alert">
            Сессии не настроены. Добавьте ADMIN_SESSION_SECRET длиной не менее 32 символов.
          </div>
        )}
      </div>
      <AdminLoginForm />
    </main>
  );
}
