import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SupportAdmin } from "@/components/SupportAdmin";
import { getManagerFromCookieHeader } from "@/server/manager-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support admin",
  description: "Панель поддержки ФасадоФ для очереди диалогов, human takeover и ответов менеджеров.",
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
      <SupportAdmin managerName={manager.name} />
    </main>
  );
}
