import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SupportAdmin } from "@/components/SupportAdmin";
import { getManagerFromCookieHeader } from "@/server/manager-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель",
  description: "Панель управления ФасадоФ для каталога, сотрудников и настроек.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminSupportPage() {
  const requestHeaders = await headers();
  const manager = await getManagerFromCookieHeader(requestHeaders.get("cookie"));

  if (!manager) redirect("/admin/login");

  return (
    <main className="admin-page">
      <SupportAdmin manager={{ id: manager.id ?? manager.email, name: manager.name, email: manager.email, role: manager.role }} />
    </main>
  );
}
