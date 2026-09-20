"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { BUSINESS } from "@/config/business";
import { analytics } from "@/features/analytics/analytics";

const navItems = [
  { href: "/catalog", label: "Каталог" },
  { href: "/#materials", label: "Материалы" },
  { href: "/#production", label: "Производство" },
  { href: "/#delivery", label: "Доставка" },
  { href: "/#contacts", label: "Контакты" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    document.body.classList.toggle("menu-lock", open);
    if (open && !menuRef.current?.open) menuRef.current?.showModal();
    if (!open && menuRef.current?.open) menuRef.current.close();
    if (open) closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !open) return;

      const focusable = Array.from(document.querySelectorAll<HTMLElement>(".mobile-menu a, .mobile-menu button"))
        .filter((element) => !element.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("menu-lock");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="site-header">
      <div className="header-shell">
        <a className="brand" href="/" onClick={closeMenu} aria-label="ФасадоФ - на главную">
          <BrandLogo compact />
        </a>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <a href={item.href} key={item.href}>{item.label}</a>
          ))}
        </nav>
        <a className="header-phone" href={BUSINESS.phone.href} aria-label={`Позвонить в ФасадоФ: ${BUSINESS.phone.display}`}>
          <span className="header-phone-number">{BUSINESS.phone.display}</span>
          <span className="header-phone-short">Позвонить</span>
        </a>
        <a className="header-cta" href="/#order" onClick={() => analytics.track("cta_click", { place: "header", action: "lead" })}>
          Рассчитать
        </a>
        <button
          aria-controls="mobile-menu"
          aria-expanded={open}
          className="menu-button"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="menu-button-icon" aria-hidden="true">
            {open ? (
              <svg viewBox="0 0 24 24" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </span>
          <span className="visually-hidden">{open ? "Закрыть меню" : "Открыть меню"}</span>
        </button>
      </div>

      <dialog ref={menuRef} className={open ? "mobile-menu open" : "mobile-menu"} id="mobile-menu" aria-label="Меню сайта" onCancel={closeMenu}>
        <div className="mobile-menu-panel">
          <div className="mobile-menu-top">
            <a href="/" onClick={closeMenu} aria-label="ФасадоФ - на главную">
              <BrandLogo compact />
            </a>
            <button ref={closeRef} onClick={closeMenu} type="button" aria-label="Закрыть меню">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <nav aria-label="Мобильная навигация">
            {navItems.map((item, index) => (
              <a href={item.href} key={item.href} onClick={closeMenu}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <a className="mobile-menu-cta" href="/#order" onClick={closeMenu}>Рассчитать проект</a>
          <div className="mobile-menu-meta">
            <a className="mobile-menu-phone" href={BUSINESS.phone.href} aria-label={`Позвонить в ФасадоФ: ${BUSINESS.phone.display}`}>
              <span>Позвонить</span>
              <strong>{BUSINESS.phone.display}</strong>
            </a>
            <span>{BUSINESS.workingHoursShort}</span>
            <strong>{BUSINESS.freeDelivery}</strong>
          </div>
        </div>
      </dialog>
    </header>
  );
}
