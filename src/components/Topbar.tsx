"use client";

import { signOut } from "next-auth/react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sidebar } from "@/components/Sidebar";

export function Topbar({ email }: { email: string }) {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const wasMobileMenuOpen = useRef(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    if (!mobileMenuOpen) return;

    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen && wasMobileMenuOpen.current) {
      menuButtonRef.current?.focus();
    }
    wasMobileMenuOpen.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 lg:px-8">
      <div className="min-w-0 text-sm font-bold text-slate-500 dark:text-slate-400">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-controls="mobile-navigation"
          aria-expanded={mobileMenuOpen}
          className="mr-2 inline-flex rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 md:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <span className="max-[375px]:hidden">Precision growing workspace</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-black">{email.split("@")[0]}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Farm Operator
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-600 text-sm font-black text-white">
          {email.substring(0, 2).toUpperCase()}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:hover:bg-rose-950/20"
        >
          Logout
        </button>
      </div>
      {mobileMenuOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 md:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-950/40"
            onClick={closeMobileMenu}
          />
          <div
            ref={mobileDrawerRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[calc(100vw-2rem)] overflow-hidden bg-white shadow-2xl dark:bg-slate-950"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeMobileMenu}
              aria-label="Close navigation menu"
              className="absolute right-3 top-3 z-10 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <Sidebar onNavigate={closeMobileMenu} />
          </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
