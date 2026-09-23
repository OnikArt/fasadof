"use client";
import { apiErrorMessage } from "@/features/api-error";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ProductImageUploader } from "@/components/ProductImageUploader";
import { formatPrice, productCategories, type Product, type ProductCategory } from "@/data/products";

type View = "dashboard" | "dialogs" | "commands" | "products" | "leads" | "employees" | "analytics" | "settings";
type ChatStatus = "NEW" | "WAITING_MANAGER" | "IN_PROGRESS" | "CLOSED";
type AdminConversation = { id: string; status: ChatStatus; page: string; source: string; operatorId: string | null; operatorName: string | null; archivedAt: string | null; canReply: boolean; canClose: boolean; createdAt: string; updatedAt: string };
type AdminChatMessage = { id: string; role: "user" | "assistant" | "operator" | "system"; content: string; authorName: string | null; createdAt: string };
type CategoryRecord = { slug: string; name: string; description: string };
type ProductStatus = "published" | "hidden" | "archived";
type LeadStatus = "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";
type VkSyncStatus = "synced" | "create" | "enrich" | "difference" | "confirm" | "site_only" | "error";

type VkSyncRow = {
  key: string;
  photo: string;
  siteProductId?: string;
  siteName: string;
  vkMarketItemId?: number;
  vkName: string;
  sitePrice?: number;
  vkPrice?: number;
  score?: number;
  status: VkSyncStatus;
  action: string;
  missingFields: string[];
  candidates?: { id: string; name: string; score: number }[];
};

type AdminManager = {
  id?: string;
  name: string;
  email: string;
  role: string;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  averageRating: number | null;
  ratingCount: number;
  dialogCount: number;
  availability: "ONLINE" | "BUSY" | "OFFLINE";
};

type ChatRating = {
  id: string;
  conversationId: string;
  rating: number;
  comment: string;
  employeeId: string | null;
  createdAt: string;
};

type ChatCommand = { id: string; name: string; command: string; response: string; enabled: boolean };

type AdminLead = {
  id: number;
  name: string;
  phone: string;
  email: string;
  message: string;
  product: string;
  material: string;
  area: string;
  page: string;
  source: string;
  status: LeadStatus;
  createdAt: string;
};

type AdminProduct = Product & {
  status?: ProductStatus;
  pricePrefix?: string;
  fullDescription?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type ProductFormState = {
  id: string;
  slug: string;
  category: ProductCategory;
  material: string;
  name: string;
  shortName: string;
  description: string;
  fullDescription: string;
  priceFrom: string;
  pricePrefix: string;
  priceUnit: string;
  priceOnRequest: boolean;
  image: string;
  texture: string;
  gallery: string;
  features: string;
  application: string;
  popular: boolean;
  status: ProductStatus;
};

const productStatuses: { value: ProductStatus | "all"; label: string }[] = [
  { value: "all", label: "Все статусы" },
  { value: "published", label: "Опубликованы" },
  { value: "hidden", label: "Скрыты" },
  { value: "archived", label: "Архив" },
];

const leadStatuses: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "Новая" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "DONE", label: "Завершена" },
  { value: "REJECTED", label: "Отклонена" },
];

export function SupportAdmin({ manager }: { manager: AdminManager }) {
  const isAdmin = manager.role === "ADMIN" || manager.role === "admin";
  const [view, setView] = useState<View>("dashboard");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productForm, setProductForm] = useState<ProductFormState>(() => emptyProductForm());
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState<ProductCategory | "all">("all");
  const [productStatus, setProductStatus] = useState<ProductStatus | "all">("all");
  const [vkSyncRows, setVkSyncRows] = useState<VkSyncRow[] | null>(null);
  const [vkConfirmations, setVkConfirmations] = useState<Record<string, string>>({});
  const [vkPriceStrategy, setVkPriceStrategy] = useState<"preserve-site" | "use-vk">("preserve-site");
  const [integrationStatus, setIntegrationStatus] = useState("");
  const [integrationBusy, setIntegrationBusy] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatus | "ALL">("ALL");
  const [leadPendingDelete, setLeadPendingDelete] = useState<AdminLead | null>(null);
  const [leadNotice, setLeadNotice] = useState("");
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null);
  const [ratings, setRatings] = useState<ChatRating[]>([]);
  const [ratingFilter, setRatingFilter] = useState<number | "ALL">("ALL");
  const [employeeForm, setEmployeeForm] = useState({ name: "", email: "", password: "", role: "MANAGER" as "ADMIN" | "MANAGER" });
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [conversationStatus, setConversationStatus] = useState<ChatStatus | "ALL">("ALL");
  const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<AdminChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const conversationRequestRef = useRef(0);
  const [showArchivedDialogs, setShowArchivedDialogs] = useState(false);
  const [commands, setCommands] = useState<ChatCommand[]>([]);
  const [commandForm, setCommandForm] = useState({ id: "", name: "", command: "", response: "", enabled: true });
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [categoryForm, setCategoryForm] = useState({ originalSlug: "", slug: "", name: "", description: "" });

  const publishedCount = products.filter((product) => (product.status ?? "published") === "published").length;
  const hiddenCount = products.filter((product) => product.status === "hidden").length;
  const archivedCount = products.filter((product) => product.status === "archived").length;
  const newLeadCount = leads.filter((lead) => lead.status === "NEW").length;
  const waitingDialogCount = conversations.filter((item) => item.status === "WAITING_MANAGER").length;
  const filteredLeads = useMemo(
    () => leadStatusFilter === "ALL" ? leads : leads.filter((lead) => lead.status === leadStatusFilter),
    [leadStatusFilter, leads],
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !query || [product.name, product.slug, product.material, product.description].some((value) => value?.toLowerCase().includes(query));
      const matchesCategory = productCategory === "all" || product.category === productCategory;
      const matchesStatus = productStatus === "all" || (product.status ?? "published") === productStatus;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [productCategory, productSearch, productStatus, products]);

  const loadProducts = useCallback(async () => {
    const response = await fetch("/api/admin/products?status=all", { credentials: "include" });
    if (!response.ok) return;
    const payload = (await response.json()) as { products: AdminProduct[] };
    setProducts(payload.products);
  }, []);

  const loadCategories = useCallback(async () => {
    const response = await fetch("/api/admin/categories", { credentials: "include" });
    if (!response.ok) return;
    const payload = await response.json() as { categories: CategoryRecord[] };
    setCategories(payload.categories);
  }, []);

  const loadEmployees = useCallback(async () => {
    const response = await fetch("/api/admin/employees", { credentials: "include" });
    if (!response.ok) return;
    const payload = (await response.json()) as { employees: Employee[] };
    setEmployees(payload.employees);
  }, []);

  const loadLeads = useCallback(async () => {
    const response = await fetch("/api/admin/leads", { credentials: "include" });
    if (!response.ok) return;
    const payload = (await response.json()) as { leads: AdminLead[] };
    setLeads(payload.leads);
  }, []);

  const loadRatings = useCallback(async () => {
    const params = new URLSearchParams();
    if (ratingFilter !== "ALL") params.set("rating", String(ratingFilter));
    const response = await fetch(`/api/admin/chat-ratings?${params.toString()}`, { credentials: "include" });
    if (!response.ok) return;
    const payload = (await response.json()) as { ratings: ChatRating[] };
    setRatings(payload.ratings);
  }, [ratingFilter]);

  const loadConversations = useCallback(async (sessionId?: string) => {
    const requestId = ++conversationRequestRef.current;
    const params = new URLSearchParams({ status: conversationStatus, archived: showArchivedDialogs ? "1" : "0" });
    if (sessionId) params.set("sessionId", sessionId);
    const response = await fetch(`/api/admin/conversations?${params}`, { credentials: "include", cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { conversations: AdminConversation[]; session: AdminConversation | null; messages: AdminChatMessage[] };
    if (requestId !== conversationRequestRef.current) return;
    setConversations(payload.conversations);
    setSelectedConversation(payload.session);
    setConversationMessages(payload.messages);
  }, [conversationStatus, showArchivedDialogs]);

  const loadCommands = useCallback(async () => {
    const response = await fetch("/api/admin/chat-commands", { credentials: "include" });
    if (!response.ok) return;
    setCommands(((await response.json()) as { commands: ChatCommand[] }).commands);
  }, []);

  useEffect(() => {
    if (!["dashboard", "products", "analytics"].includes(view)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProducts();
    if (isAdmin && view === "products") void loadCategories();
  }, [isAdmin, loadCategories, loadProducts, view]);

  useEffect(() => {
    if (!["dashboard", "leads"].includes(view)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLeads();
  }, [loadLeads, view]);

  useEffect(() => {
    if (!isAdmin || view !== "employees") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEmployees();
    const timer = window.setInterval(loadEmployees, 20_000);
    return () => window.clearInterval(timer);
  }, [isAdmin, loadEmployees, view]);

  useEffect(() => {
    if (!isAdmin || view !== "analytics") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRatings();
  }, [isAdmin, loadRatings, view]);

  useEffect(() => {
    if (!isAdmin || view !== "commands") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCommands();
  }, [isAdmin, loadCommands, view]);

  useEffect(() => {
    if (view !== "dialogs") return;
    void loadConversations(selectedConversation?.id);
    const timer = window.setInterval(() => void loadConversations(selectedConversation?.id), 5_000);
    return () => window.clearInterval(timer);
  }, [loadConversations, selectedConversation?.id, view]);

  useEffect(() => {
    async function heartbeat() {
      await fetch("/api/admin/session", { method: "POST", credentials: "include" }).catch(() => undefined);
    }

    void heartbeat();
    const interval = window.setInterval(heartbeat, 20_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (leadPendingDelete && !dialog.open) dialog.showModal();
    if (!leadPendingDelete && dialog.open) dialog.close();
  }, [leadPendingDelete]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    window.location.assign("/admin/login");
  }

  function selectView(nextView: View) {
    if (nextView !== "dialogs") conversationRequestRef.current += 1;
    setView(nextView);
    setDrawerOpen(false);
  }

  async function saveEmployee(payload: Record<string, unknown>) {
    setError("");
    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Employee action failed");
      const data = (await response.json()) as { employees: Employee[] };
      setEmployees(data.employees);
      setEmployeeForm({ name: "", email: "", password: "", role: "MANAGER" });
    } catch {
      setError("Не удалось сохранить сотрудника.");
    }
  }

  async function conversationAction(action: "take" | "reply" | "close" | "clear" | "archive" | "delete") {
    if (!selectedConversation) return;
    if (action === "clear" && !window.confirm("Удалить историю?\nЭто действие нельзя отменить.")) return;
    if (action === "delete" && !window.confirm("Удалить диалог полностью?\nЭто действие нельзя отменить.")) return;
    setError("");
    try {
      const response = await fetch("/api/admin/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, sessionId: selectedConversation.id, message: reply }),
      });
      const payload = await readJsonResponse<{ conversations?: AdminConversation[]; session?: AdminConversation | null; messages?: AdminChatMessage[]; error?: string }>(response);
      if (!response.ok || !payload.conversations || !payload.messages) throw new Error(payload.error || `HTTP ${response.status}`);
      conversationRequestRef.current += 1;
      setConversations(payload.conversations);
      setSelectedConversation(payload.session ?? null);
      setConversationMessages(payload.messages);
      if (action === "reply") setReply("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить диалог.");
    }
  }

  async function saveCommand(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/chat-commands", { method: commandForm.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify(commandForm) });
    const payload = await response.json() as { commands?: ChatCommand[]; error?: string };
    if (!response.ok || !payload.commands) { setError(payload.error || "Не удалось сохранить команду."); return; }
    setCommands(payload.commands); setCommandForm({ id: "", name: "", command: "", response: "", enabled: true });
  }

  async function saveCommandDirect(command: ChatCommand) {
    const response = await fetch("/api/admin/chat-commands", { method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify(command) });
    const payload = await response.json() as { commands?: ChatCommand[]; error?: string };
    if (!response.ok || !payload.commands) { setError(payload.error || "Не удалось изменить команду."); return; }
    setCommands(payload.commands);
  }

  async function removeCommand(id: string) {
    if (!window.confirm("Удалить команду?")) return;
    const response = await fetch(`/api/admin/chat-commands?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
    if (response.ok) setCommands(((await response.json()) as { commands: ChatCommand[] }).commands);
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/categories", { method: categoryForm.originalSlug ? "PATCH" : "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify(categoryForm) });
    const payload = await response.json() as { categories?: CategoryRecord[]; error?: string };
    if (!response.ok || !payload.categories) { setError(payload.error || "Не удалось сохранить категорию."); return; }
    setCategories(payload.categories); setCategoryForm({ originalSlug: "", slug: "", name: "", description: "" });
  }

  async function removeCategory(slug: string) {
    const response = await fetch(`/api/admin/categories?slug=${encodeURIComponent(slug)}`, { method: "DELETE", credentials: "include" });
    const payload = await response.json() as { categories?: CategoryRecord[]; error?: string };
    if (!response.ok || !payload.categories) { setError(payload.error || "Не удалось удалить категорию."); return; }
    setCategories(payload.categories);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/admin/products", {
        method: productForm.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formToProductPayload(productForm)),
      });
      if (!response.ok) throw new Error("Product save failed");
      const payload = (await response.json()) as { products: AdminProduct[] };
      setProducts(payload.products);
      setProductForm(emptyProductForm());
    } catch {
      setError("Не удалось сохранить товар. Проверьте обязательные поля.");
    }
  }

  async function productAction(product: AdminProduct, action: "hide" | "publish" | "archive" | "delete") {
    setError("");
    const nextStatus = action === "hide" ? "hidden" : action === "publish" ? "published" : action === "archive" ? "archived" : null;
    try {
      const response = action === "delete"
        ? await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE", credentials: "include" })
        : await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...product, status: nextStatus }),
        });
      if (!response.ok) throw new Error("Product action failed");
      const payload = (await response.json()) as { products: AdminProduct[] };
      setProducts(payload.products);
    } catch {
      setError("Действие с товаром не выполнено.");
    }
  }

  async function updateLead(id: number, status: LeadStatus) {
    setError("");
    setLeadNotice("");
    try {
      const response = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error("Lead status update failed");
      const payload = (await response.json()) as { leads: AdminLead[] };
      setLeads(payload.leads);
    } catch {
      setError("Не удалось изменить статус заявки.");
    }
  }

  async function deleteLead() {
    if (!leadPendingDelete) return;
    setError("");
    setLeadNotice("");
    try {
      const response = await fetch(`/api/admin/leads?id=${leadPendingDelete.id}`, { method: "DELETE", credentials: "include" });
      const payload = (await response.json()) as { leads?: AdminLead[]; maxNotified?: boolean; error?: string };
      if (!response.ok || !payload.leads) throw new Error(payload.error || "Lead delete failed");
      setLeads(payload.leads);
      setLeadPendingDelete(null);
      setLeadNotice(payload.maxNotified
        ? `Заявка #${leadPendingDelete.id} удалена. Уведомление отправлено в MAX.`
        : `Заявка #${leadPendingDelete.id} удалена. MAX временно недоступен, история сохранена.`);
    } catch (deleteError) {
      setError(apiErrorMessage(deleteError, "Не удалось удалить заявку."));
    }
  }

  async function previewVkSync() {
    setError("");
    setIntegrationStatus("");
    setIntegrationBusy(true);
    try {
      const response = await fetch("/api/admin/integrations/vk/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "preview" }),
      });
      const payload = await response.json() as { rows?: VkSyncRow[]; error?: string };
      if (!response.ok || !payload.rows) throw new Error(payload.error || "VK preview failed");
      setVkSyncRows(payload.rows);
      setVkConfirmations({});
      setIntegrationStatus(`Сравнение готово: ${payload.rows.length} строк.`);
    } catch (error) {
      setError(apiErrorMessage(error, "Не удалось получить каталог VK."));
    } finally {
      setIntegrationBusy(false);
    }
  }

  async function applyVkCatalogSync() {
    setError("");
    setIntegrationStatus("");
    setIntegrationBusy(true);
    try {
      const response = await fetch("/api/admin/integrations/vk/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "apply", confirmations: vkConfirmations, priceStrategy: vkPriceStrategy }),
      });
      const payload = await response.json() as {
        products?: AdminProduct[];
        summary?: { created: number; enriched: number; updated: number; unchanged: number; review: number; errors: number; images: number };
        maxNotified?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.summary) throw new Error(payload.error || "VK sync failed");
      if (payload.products) setProducts(payload.products);
      const value = payload.summary;
      setIntegrationStatus(`✅ Синхронизация завершена. Создано: ${value.created}. Дополнено: ${value.enriched}. Обновлено: ${value.updated}. Без изменений: ${value.unchanged}. Требуют проверки: ${value.review}. Ошибок: ${value.errors}. Изображений: ${value.images}.`);
      setVkSyncRows(null);
    } catch (error) {
      setError(apiErrorMessage(error, "Синхронизация VK не выполнена."));
    } finally {
      setIntegrationBusy(false);
    }
  }

  async function testMaxConnection() {
    setError("");
    setIntegrationStatus("");
    setIntegrationBusy(true);
    try {
      const response = await fetch("/api/admin/integrations/max/test", { method: "POST", credentials: "include" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "MAX test failed");
      setIntegrationStatus("Тестовое сообщение отправлено в MAX.");
    } catch (error) {
      setError(apiErrorMessage(error, "Не удалось отправить тестовое сообщение MAX."));
    } finally {
      setIntegrationBusy(false);
    }
  }

  return (
    <div className="support-admin">
      <header className="admin-mobile-topbar">
        <button type="button" aria-label="Открыть меню админ-панели" onClick={() => setDrawerOpen(true)}>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <BrandLogo compact />
        <span>{manager.name}</span>
      </header>
      <button
        className={drawerOpen ? "admin-drawer-backdrop open" : "admin-drawer-backdrop"}
        type="button"
        aria-label="Закрыть меню админ-панели"
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={drawerOpen ? "support-sidebar open" : "support-sidebar"}>
        <button className="admin-drawer-close" type="button" aria-label="Закрыть меню админ-панели" onClick={() => setDrawerOpen(false)}>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="support-sidebar-brand">
          <BrandLogo compact />
          <div className="admin-mobile-profile">
            <p className="eyebrow">Менеджер</p>
            <h1>{manager.name}</h1>
            <span>{manager.role}</span>
          </div>
        </div>
        <div className="admin-view-tabs admin-mobile-nav" role="tablist" aria-label="Разделы админки">
          <button className={view === "dashboard" ? "active" : ""} onClick={() => selectView("dashboard")} type="button">Dashboard</button>
          <button className={view === "dialogs" ? "active" : ""} onClick={() => selectView("dialogs")} type="button"><span>Диалоги</span>{waitingDialogCount > 0 && <b>{waitingDialogCount}</b>}</button>
          {isAdmin && <button className={view === "commands" ? "active" : ""} onClick={() => selectView("commands")} type="button">Команды чата</button>}
          <button className={view === "products" ? "active" : ""} onClick={() => selectView("products")} type="button">Товары</button>
          <button className={view === "leads" ? "active" : ""} onClick={() => selectView("leads")} type="button">
            <span>Заявки</span>
            {newLeadCount > 0 && <b>{newLeadCount}</b>}
          </button>
          {isAdmin && <button className={view === "employees" ? "active" : ""} onClick={() => selectView("employees")} type="button">Сотрудники</button>}
          {isAdmin && <button className={view === "analytics" ? "active" : ""} onClick={() => selectView("analytics")} type="button">Аналитика</button>}
          {isAdmin && <button className={view === "settings" ? "active" : ""} onClick={() => selectView("settings")} type="button">Настройки</button>}
        </div>
        <div className="admin-sidebar-actions">
          <a className="btn secondary" href="/" target="_blank" rel="noopener noreferrer">Открыть сайт</a>
          <button className="btn secondary" onClick={logout} type="button">Выйти из аккаунта</button>
        </div>
      </aside>

      {view === "dashboard" && (
        <section className="admin-wide-panel" aria-label="Dashboard">
          <header>
            <div>
              <p className="eyebrow">Обзор</p>
              <h2>Dashboard</h2>
            </div>
          </header>
          <div className="admin-metric-grid">
            <article><span>Товаров</span><strong>{products.length}</strong></article>
            <article><span>Опубликованы</span><strong>{publishedCount}</strong></article>
            <article><span>Новые заявки</span><strong>{newLeadCount}</strong></article>
            <article><span>Скрыты</span><strong>{hiddenCount}</strong></article>
            <article><span>Архив</span><strong>{archivedCount}</strong></article>
          </div>
          <div className="empty-state"><strong>Все обращения собраны в одной панели.</strong><p>Откройте «Диалоги», чтобы взять обращение, ответить или закрыть его.</p></div>
        </section>
      )}

      {view === "dialogs" && (
        <section className="admin-wide-panel dialogs-panel" aria-label="Диалоги">
          <header><div><p className="eyebrow">Поддержка</p><h2>Диалоги</h2></div><span className="operator-presence">● Вы в сети</span></header>
          <div className="dialog-status-filter">
            {(["ALL", "WAITING_MANAGER", "IN_PROGRESS", "NEW", "CLOSED"] as const).map((status) => <button className={conversationStatus === status ? "active" : ""} type="button" key={status} onClick={() => setConversationStatus(status)}>{chatStatusLabel(status)}</button>)}
            <button className={showArchivedDialogs ? "active" : ""} type="button" onClick={() => setShowArchivedDialogs((value) => !value)}>Архив</button>
          </div>
          <div className="dialog-admin-layout">
            <aside className="dialog-list">
              {conversations.length === 0 && <p>Диалогов в этом статусе нет.</p>}
              {conversations.map((item) => <button className={selectedConversation?.id === item.id ? "active" : ""} type="button" key={item.id} onClick={() => void loadConversations(item.id)}><span><b>{chatStatusLabel(item.status)}</b><time>{formatDate(item.updatedAt)}</time></span><small>{item.operatorName ? `Отвечает: ${item.operatorName}` : item.page || "/"}</small></button>)}
            </aside>
            <div className="dialog-thread">
              {!selectedConversation ? <div className="empty-state"><strong>Выберите диалог</strong></div> : <>
                <div className="dialog-thread-head"><div><strong>{chatStatusLabel(selectedConversation.status)}</strong><span>{selectedConversation.operatorName ? `Сотрудник: ${selectedConversation.operatorName}` : "Не назначен"}</span></div><div>{selectedConversation.status !== "CLOSED" && selectedConversation.status !== "IN_PROGRESS" && <button type="button" onClick={() => void conversationAction("take")}>Взять диалог</button>}{selectedConversation.canClose && <button type="button" onClick={() => void conversationAction("close")}>Закрыть диалог</button>}<button type="button" onClick={() => void conversationAction("clear")}>Очистить историю</button><button type="button" onClick={() => void conversationAction("archive")}>Архивировать</button>{isAdmin && <button type="button" onClick={() => void conversationAction("delete")}>Удалить</button>}</div></div>
                <div className="dialog-messages">{conversationMessages.map((item) => <article className={item.role} key={item.id}><small>{item.authorName || chatRoleLabel(item.role)}</small><p>{item.content}</p><time>{formatDate(item.createdAt)}</time></article>)}</div>
                {selectedConversation.canReply && <form className="dialog-reply" onSubmit={(event) => { event.preventDefault(); if (reply.trim()) void conversationAction("reply"); }}><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Ответ клиенту" /><button className="btn primary" disabled={!reply.trim()} type="submit">Отправить</button></form>}
              </>}
            </div>
          </div>
        </section>
      )}

      {view === "commands" && isAdmin && (
        <section className="admin-wide-panel" aria-label="Команды чата">
          <header><div><p className="eyebrow">Автоответы</p><h2>Команды чата</h2></div></header>
          <div className="product-admin-layout">
            <div className="product-admin-list command-list">
              {commands.map((item) => <article className="product-admin-card" key={item.id}><div><h3>{item.command}</h3><p>{item.name}</p><span>{item.response}</span><small>{item.enabled ? "Включена" : "Выключена"}</small></div><div className="product-admin-actions"><button type="button" onClick={() => setCommandForm(item)}>Изменить</button><button type="button" onClick={() => void saveCommandDirect({ ...item, enabled: !item.enabled })}>{item.enabled ? "Выключить" : "Включить"}</button><button type="button" onClick={() => void removeCommand(item.id)}>Удалить</button></div></article>)}
            </div>
            <form className="product-editor" onSubmit={saveCommand}>
              <label>Название команды<input value={commandForm.name} onChange={(event) => setCommandForm((current) => ({ ...current, name: event.target.value }))} placeholder="Приветствие" /></label>
              <label>Команда<input value={commandForm.command} onChange={(event) => setCommandForm((current) => ({ ...current, command: event.target.value }))} placeholder="/прив" /></label>
              <label className="span-2">Ответ<textarea value={commandForm.response} onChange={(event) => setCommandForm((current) => ({ ...current, response: event.target.value }))} /></label>
              <label className="checkbox-row"><input type="checkbox" checked={commandForm.enabled} onChange={(event) => setCommandForm((current) => ({ ...current, enabled: event.target.checked }))} /> Включена</label>
              <div className="product-editor-actions"><button className="btn primary" type="submit">Сохранить</button><button className="btn secondary" type="button" onClick={() => setCommandForm({ id: "", name: "", command: "", response: "", enabled: true })}>Очистить</button></div>
            </form>
          </div>
        </section>
      )}

      {view === "leads" && (
        <section className="admin-wide-panel leads-admin-panel" aria-label="Заявки">
          <header>
            <div>
              <p className="eyebrow">CRM</p>
              <h2>Заявки</h2>
            </div>
          </header>
          <div className="lead-status-filter" aria-label="Фильтр заявок по статусу">
            <button className={leadStatusFilter === "ALL" ? "active" : ""} onClick={() => setLeadStatusFilter("ALL")} type="button">Все</button>
            {leadStatuses.map((item) => (
              <button className={leadStatusFilter === item.value ? "active" : ""} key={item.value} onClick={() => setLeadStatusFilter(item.value)} type="button">
                {item.label}
              </button>
            ))}
          </div>
          {leadNotice && <p className="admin-lead-notice" role="status">{leadNotice}</p>}
          <div className="lead-admin-list">
            {filteredLeads.length === 0 && (
              <div className="empty-state">
                <strong>Пока нет заявок.</strong>
                <p>После отправки формы сайта заявки появятся здесь. MAX-уведомления отключены до модерации.</p>
              </div>
            )}
            {filteredLeads.map((lead) => (
              <article className="lead-admin-card" key={lead.id}>
                <div className="lead-admin-main">
                  <p className="eyebrow">#{lead.id} · {statusLabel(lead.status)}</p>
                  <h3>{lead.name}</h3>
                  <p><a href={`tel:${lead.phone}`}>{lead.phone}</a>{lead.email ? ` · ${lead.email}` : ""}</p>
                  <p>{lead.product || "Без товара"} · {lead.material || "Материал не указан"}{lead.area ? ` · ${lead.area}` : ""}</p>
                  {lead.message && <p>{lead.message}</p>}
                  <small>{lead.source || "Direct"} · {lead.page || "/"} · {formatDate(lead.createdAt)}</small>
                  <a className="lead-details-link" href={`/admin/leads/${lead.id}`}>Подробнее →</a>
                </div>
                <div className="lead-admin-actions">
                  {leadStatuses.map((item) => (
                    <button
                      className={lead.status === item.value ? "active" : ""}
                      key={item.value}
                      onClick={() => void updateLead(lead.id, item.value)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    className="lead-delete-button"
                    disabled={lead.status !== "DONE" && lead.status !== "REJECTED"}
                    onClick={() => setLeadPendingDelete(lead)}
                    title={lead.status === "DONE" || lead.status === "REJECTED" ? "Удалить заявку" : "Сначала завершите или отклоните заявку"}
                    type="button"
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === "products" && (
        <section className="admin-wide-panel product-admin-panel" aria-label="Товары">
          <header>
            <div>
              <p className="eyebrow">Каталог</p>
              <h2>Товары</h2>
            </div>
            <div className="admin-header-actions">
              <button className="btn primary" type="button" onClick={() => setProductForm(emptyProductForm())}>+ Добавить товар</button>
              <button className="btn secondary" disabled={integrationBusy} type="button" onClick={() => void previewVkSync()}>
                {integrationBusy ? "Сверяем..." : "Синхронизировать с VK"}
              </button>
            </div>
          </header>
          {isAdmin && <details className="category-manager">
            <summary>Управление категориями</summary>
            <div className="category-manager-layout">
              <div>{categories.map((category) => <article key={category.slug}><div><strong>{category.name}</strong><span>{category.slug}</span><p>{category.description}</p></div><div><button type="button" onClick={() => setCategoryForm({ originalSlug: category.slug, slug: category.slug, name: category.name, description: category.description })}>Изменить</button><button type="button" onClick={() => void removeCategory(category.slug)}>Удалить</button></div></article>)}</div>
              <form onSubmit={saveCategory}><input required disabled={Boolean(categoryForm.originalSlug)} placeholder="Slug" value={categoryForm.slug} onChange={(event) => setCategoryForm((value) => ({ ...value, slug: event.target.value }))} /><input required placeholder="Название" value={categoryForm.name} onChange={(event) => setCategoryForm((value) => ({ ...value, name: event.target.value }))} /><textarea placeholder="Описание" value={categoryForm.description} onChange={(event) => setCategoryForm((value) => ({ ...value, description: event.target.value }))} /><button className="btn primary" type="submit">Сохранить категорию</button></form>
            </div>
          </details>}
          {vkSyncRows && (
            <section className="vk-sync-preview" aria-label="Предпросмотр синхронизации VK">
              <div className="vk-sync-toolbar">
                <div>
                  <strong>Предпросмотр VK</strong>
                  <span>Ничего не записано. Проверьте совпадения и стратегию цены.</span>
                </div>
                <label>
                  Цена
                  <select value={vkPriceStrategy} onChange={(event) => setVkPriceStrategy(event.target.value as "preserve-site" | "use-vk")}>
                    <option value="preserve-site">Сохранить цену сайта</option>
                    <option value="use-vk">Принять цену VK</option>
                  </select>
                </label>
                <button className="btn primary" disabled={integrationBusy} type="button" onClick={() => void applyVkCatalogSync()}>
                  Применить синхронизацию
                </button>
              </div>
              <div className="vk-sync-list">
                <div className="vk-sync-row vk-sync-head" aria-hidden="true">
                  <span>Фото</span><span>Название сайта</span><span>Название VK</span><span>Цена сайта</span><span>Цена VK</span><span>Статус</span><span>Действие</span>
                </div>
                {vkSyncRows.map((row) => (
                  <article className={`vk-sync-row status-${row.status}`} key={row.key}>
                    <div className="vk-sync-photo" data-label="Фото">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {row.photo ? <img src={row.photo} alt="" loading="lazy" /> : <span>—</span>}
                    </div>
                    <span data-label="Название сайта">{row.siteName}</span>
                    <span data-label="Название VK">{row.vkName}</span>
                    <span data-label="Цена сайта">{formatSyncPrice(row.sitePrice)}</span>
                    <span data-label="Цена VK">{formatSyncPrice(row.vkPrice)}</span>
                    <strong data-label="Статус">{syncStatusLabel(row.status)}</strong>
                    <div data-label="Действие">
                      {row.status === "confirm" && row.vkMarketItemId ? (
                        <select
                          aria-label={`Сопоставление для ${row.vkName}`}
                          value={vkConfirmations[String(row.vkMarketItemId)] ?? ""}
                          onChange={(event) => setVkConfirmations((current) => ({ ...current, [String(row.vkMarketItemId)]: event.target.value }))}
                        >
                          <option value="">Выберите товар</option>
                          {row.candidates?.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} ({Math.round(candidate.score * 100)}%)</option>)}
                          <option value="create">Создать новую карточку</option>
                        </select>
                      ) : <span>{row.action}</span>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          {integrationStatus && <p className="admin-integration-status" role="status">{integrationStatus}</p>}
          <div className="product-admin-layout">
            <div className="product-admin-list">
              <div className="product-admin-filters">
                <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Поиск по товарам" />
                <select value={productCategory} onChange={(event) => setProductCategory(event.target.value as ProductCategory | "all")}>
                  <option value="all">Все категории</option>
                  {(categories.length ? categories.map((item) => [item.slug, item.name] as const) : Object.entries(productCategories)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select value={productStatus} onChange={(event) => setProductStatus(event.target.value as ProductStatus | "all")}>
                  {productStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div className="product-admin-cards">
                {filteredProducts.map((product) => (
                  <article className="product-admin-card" key={product.id}>
                    <div className="product-admin-thumb" aria-hidden="true" />
                    <div>
                      <h3>{product.name}</h3>
                      <p>{categories.find((item) => item.slug === product.category)?.name || productCategories[product.category] || product.category} · {product.material}</p>
                      <span>{formatPrice(product)} · {product.status ?? "published"}</span>
                      <small>Изменён: {product.updatedBy ?? "seed"} · {formatDate(product.updatedAt)}</small>
                    </div>
                    <div className="product-admin-actions">
                      <button type="button" onClick={() => setProductForm(productToForm(product))}>Редактировать</button>
                      <button type="button" onClick={() => void productAction(product, (product.status ?? "published") === "published" ? "hide" : "publish")}>
                        {(product.status ?? "published") === "published" ? "Скрыть" : "Опубликовать"}
                      </button>
                      <button type="button" onClick={() => void productAction(product, isAdmin ? "delete" : "archive")}>{isAdmin ? "Удалить" : "В архив"}</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <form className="product-editor" onSubmit={saveProduct}>
              <label>Название<input value={productForm.name} onChange={(event) => updateProductForm({ name: event.target.value })} /></label>
              <label>Slug<input value={productForm.slug} onChange={(event) => updateProductForm({ slug: event.target.value })} /></label>
              <label>Категория<select value={productForm.category} onChange={(event) => updateProductForm({ category: event.target.value as ProductCategory })}>{(categories.length ? categories.map((item) => [item.slug, item.name] as const) : Object.entries(productCategories)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Материал<input value={productForm.material} onChange={(event) => updateProductForm({ material: event.target.value })} /></label>
              <label>Короткое имя<input value={productForm.shortName} onChange={(event) => updateProductForm({ shortName: event.target.value })} /></label>
              <label>Статус<select value={productForm.status} onChange={(event) => updateProductForm({ status: event.target.value as ProductStatus })}>{productStatuses.filter((item) => item.value !== "all").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="span-2">Краткое описание<textarea value={productForm.description} onChange={(event) => updateProductForm({ description: event.target.value })} /></label>
              <label className="span-2">Полное описание<textarea value={productForm.fullDescription} onChange={(event) => updateProductForm({ fullDescription: event.target.value })} /></label>
              <label>Префикс цены<input value={productForm.pricePrefix} onChange={(event) => updateProductForm({ pricePrefix: event.target.value })} /></label>
              <label>Цена<input value={productForm.priceFrom} onChange={(event) => updateProductForm({ priceFrom: event.target.value })} /></label>
              <label>Единица<input value={productForm.priceUnit} onChange={(event) => updateProductForm({ priceUnit: event.target.value })} /></label>
              <label>Texture<input value={productForm.texture} onChange={(event) => updateProductForm({ texture: event.target.value })} /></label>
              <div className="span-2"><span className="editor-field-title">Изображения товара</span><ProductImageUploader images={[productForm.image, ...splitLines(productForm.gallery)].filter((url) => url.startsWith("/") || url.startsWith("http"))} onChange={(images) => updateProductForm({ image: images[0] || "texture-custom", gallery: images.slice(1).join("\n") })} /></div>
              <label className="span-2">Features<textarea value={productForm.features} onChange={(event) => updateProductForm({ features: event.target.value })} /></label>
              <label className="span-2">Application<textarea value={productForm.application} onChange={(event) => updateProductForm({ application: event.target.value })} /></label>
              <label className="checkbox-row"><input type="checkbox" checked={productForm.priceOnRequest} onChange={(event) => updateProductForm({ priceOnRequest: event.target.checked })} /> Цена по запросу</label>
              <label className="checkbox-row"><input type="checkbox" checked={productForm.popular} onChange={(event) => updateProductForm({ popular: event.target.checked })} /> Популярный</label>
              <div className="product-editor-actions">
                <button className="btn primary" type="submit">Сохранить</button>
                <button className="btn secondary" type="button" onClick={() => setProductForm(emptyProductForm())}>Очистить</button>
              </div>
            </form>
          </div>
        </section>
      )}

      {view === "employees" && isAdmin && (
        <section className="admin-wide-panel" aria-label="Сотрудники">
          <header><div><p className="eyebrow">Команда</p><h2>Сотрудники</h2></div></header>
          <form className="employee-form" onSubmit={(event) => { event.preventDefault(); void saveEmployee(employeeForm); }}>
            <input value={employeeForm.name} onChange={(event) => setEmployeeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Имя" />
            <input value={employeeForm.email} onChange={(event) => setEmployeeForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email / логин" />
            <input value={employeeForm.password} onChange={(event) => setEmployeeForm((current) => ({ ...current, password: event.target.value }))} placeholder="Пароль от 12 символов" type="password" />
            <select value={employeeForm.role} onChange={(event) => setEmployeeForm((current) => ({ ...current, role: event.target.value as "ADMIN" | "MANAGER" }))}>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button className="btn primary" type="submit">Добавить сотрудника</button>
          </form>
          <div className="employee-list">
            {employees.map((employee) => (
              <article className="employee-card" key={employee.id}>
                <div><strong>{employee.name}</strong><span>{employee.email}</span><small>Создан: {employee.createdAt || "env admin"}</small></div>
                <div className="employee-stats">
                  <span>{employee.role}</span><span>{employee.isActive ? "Активен" : "Отключен"}</span><span>{employee.availability === "ONLINE" ? "🟢 В сети" : employee.availability === "BUSY" ? "🟡 Занят" : "⚪ Не в сети"}</span><span>Средняя оценка: {employee.averageRating?.toFixed(1) ?? "нет"}</span><span>Диалогов: {employee.dialogCount}</span><span>Оценок: {employee.ratingCount}</span>
                </div>
                {employee.id !== "env-admin" && employee.id !== manager.id && (
                  <div className="employee-actions">
                    <button type="button" onClick={() => void saveEmployee({ id: employee.id, isActive: !employee.isActive })}>{employee.isActive ? "Отключить" : "Восстановить"}</button>
                    <button type="button" onClick={() => { const password = window.prompt("Новый пароль минимум 12 символов"); if (password) void saveEmployee({ id: employee.id, password }); }}>Сбросить пароль</button>
                    <button type="button" onClick={() => void saveEmployee({ id: employee.id, role: employee.role === "ADMIN" ? "MANAGER" : "ADMIN" })}>Сделать {employee.role === "ADMIN" ? "MANAGER" : "ADMIN"}</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {view === "analytics" && isAdmin && (
        <section className="admin-wide-panel" aria-label="Аналитика">
          <header><div><p className="eyebrow">ADMIN only</p><h2>Аналитика</h2></div></header>
          <div className="admin-metric-grid">
            <article><span>Товаров</span><strong>{products.length}</strong></article>
            <article><span>Оценок</span><strong>{ratings.length}</strong></article>
            <article><span>MAX / VK / карты</span><strong>через events</strong></article>
          </div>
          <div className="rating-filter" aria-label="Фильтр по оценке">
            {(["ALL", 5, 4, 3, 2, 1] as const).map((value) => <button className={ratingFilter === value ? "active" : ""} key={value} onClick={() => setRatingFilter(value)} type="button">{value === "ALL" ? "Все" : `${value} ★`}</button>)}
          </div>
          <div className="rating-list">
            {ratings.map((item) => <article className="rating-card" key={item.id}><strong>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</strong><span>{item.comment || "Без комментария"}</span><small>{item.employeeId || "Не назначен"}</small><time>{new Date(item.createdAt).toLocaleString("ru-RU")}</time></article>)}
          </div>
        </section>
      )}

      {view === "settings" && isAdmin && (
        <section className="admin-wide-panel" aria-label="Настройки">
          <header><div><p className="eyebrow">Интеграции</p><h2>Настройки</h2></div></header>
          <div className="admin-settings-grid">
            <article><strong>Чат ФасадоФ</strong><span>Собственный чат работает через базу данных и раздел «Диалоги».</span></article>
            <article>
              <strong>MAX</strong>
              <span>Серверные уведомления используют `MAX_BOT_TOKEN` и `MAX_MANAGER_CHAT_ID`.</span>
              <button className="btn secondary" disabled={integrationBusy} onClick={() => void testMaxConnection()} type="button">Отправить тестовое сообщение</button>
            </article>
            <article><strong>VK</strong><span>Callback URL: `https://fasadof36.ru/api/integrations/vk/callback`.</span></article>
            <article><strong>Метрика</strong><span>VK pixel удалён, остаётся Яндекс Метрика по counter id.</span></article>
          </div>
          {integrationStatus && <p className="admin-integration-status" role="status">{integrationStatus}</p>}
        </section>
      )}

      <dialog
        className="admin-confirm-dialog"
        ref={deleteDialogRef}
        onCancel={(event) => { event.preventDefault(); setLeadPendingDelete(null); }}
      >
        <div className="admin-confirm-content">
          <p className="eyebrow">Подтверждение</p>
          <h2>Удалить завершённую заявку?</h2>
          <p>Заявка исчезнет из рабочего списка. Запись о сотруднике и действии останется в журнале аудита.</p>
          <div>
            <button className="btn secondary" onClick={() => setLeadPendingDelete(null)} type="button">Отмена</button>
            <button className="btn primary" onClick={() => void deleteLead()} type="button">Удалить заявку</button>
          </div>
        </div>
      </dialog>

      {error && <p className="field-error admin-floating-error" role="alert">{error}</p>}
    </div>
  );

  function updateProductForm(patch: Partial<ProductFormState>) {
    setProductForm((current) => ({ ...current, ...patch }));
  }
}

function emptyProductForm(): ProductFormState {
  return {
    id: "",
    slug: "",
    category: "facades",
    material: "",
    name: "",
    shortName: "",
    description: "",
    fullDescription: "",
    priceFrom: "",
    pricePrefix: "от",
    priceUnit: "м²",
    priceOnRequest: false,
    image: "texture-custom",
    texture: "custom",
    gallery: "",
    features: "",
    application: "",
    popular: false,
    status: "published",
  };
}

function productToForm(product: AdminProduct): ProductFormState {
  return {
    id: product.id,
    slug: product.slug,
    category: product.category,
    material: product.material,
    name: product.name,
    shortName: product.shortName ?? "",
    description: product.description,
    fullDescription: product.fullDescription ?? product.description,
    priceFrom: product.priceFrom ? String(product.priceFrom) : "",
    pricePrefix: product.pricePrefix ?? "от",
    priceUnit: product.priceUnit ?? "",
    priceOnRequest: Boolean(product.priceOnRequest),
    image: product.image,
    texture: product.texture,
    gallery: (product.gallery ?? []).join("\n"),
    features: (product.features ?? []).join("\n"),
    application: product.application ?? "",
    popular: Boolean(product.popular),
    status: product.status ?? "published",
  };
}

function formToProductPayload(form: ProductFormState) {
  return {
    id: form.id || undefined,
    slug: form.slug,
    category: form.category,
    material: form.material,
    name: form.name,
    shortName: form.shortName || undefined,
    description: form.description,
    fullDescription: form.fullDescription || form.description,
    priceFrom: form.priceFrom ? Number(form.priceFrom.replace(/\s+/g, "")) : null,
    pricePrefix: form.pricePrefix || "от",
    priceUnit: form.priceUnit || undefined,
    priceOnRequest: form.priceOnRequest,
    image: form.image,
    texture: form.texture,
    gallery: splitLines(form.gallery),
    features: splitLines(form.features),
    application: form.application || undefined,
    popular: form.popular,
    status: form.status,
  };
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(text.trim().replace(/\s+/g, " ").slice(0, 180) || `HTTP ${response.status}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Сервер вернул некорректный JSON");
  }
}

function formatDate(value?: string) {
  if (!value) return "нет даты";
  return new Date(value).toLocaleString("ru-RU");
}

function statusLabel(status: LeadStatus) {
  return leadStatuses.find((item) => item.value === status)?.label ?? "Новая";
}

function formatSyncPrice(value?: number) {
  return value ? `${value.toLocaleString("ru-RU")} ₽` : "—";
}

function syncStatusLabel(status: VkSyncStatus) {
  return ({
    synced: "✓ Уже синхронизирован",
    create: "+ Будет создан",
    enrich: "↓ Будет дополнен",
    difference: "~ Найдено расхождение",
    confirm: "? Требуется подтверждение",
    site_only: "• Только на сайте",
    error: "! Ошибка",
  } as Record<VkSyncStatus, string>)[status];
}

function chatStatusLabel(status: ChatStatus | "ALL") {
  return ({ ALL: "Все", NEW: "Новый", WAITING_MANAGER: "Ожидает менеджера", IN_PROGRESS: "В работе", CLOSED: "Закрыт" } as const)[status];
}

function chatRoleLabel(role: AdminChatMessage["role"]) {
  return ({ user: "Клиент", assistant: "Помощник", operator: "Сотрудник", system: "Система" } as const)[role];
}
