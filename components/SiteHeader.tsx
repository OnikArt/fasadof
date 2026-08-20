"use client";

import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    document.body.classList.toggle("menu-lock", open);
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
        <a className="brand" href="/" onClick={closeMenu}>ФАСАДОФ</a>
        <nav className="desktop-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <a href={item.href} key={item.href}>{item.label}</a>
          ))}
        </nav>
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
          <span>{open ? "Закрыть" : "Меню"}</span>
        </button>
      </div>

      <div className={open ? "mobile-menu open" : "mobile-menu"} id="mobile-menu" aria-hidden={!open}>
        <div className="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Меню сайта">
          <div className="mobile-menu-top">
            <a href="/" onClick={closeMenu}>ФАСАДОФ</a>
            <button ref={closeRef} onClick={closeMenu} type="button" aria-label="Закрыть меню">X</button>
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
            <span>{BUSINESS.workingHoursShort}</span>
            <strong>{BUSINESS.freeDelivery}</strong>
          </div>
        </div>
      </div>
    </header>
  );
}
