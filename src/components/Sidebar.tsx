"use client";

import {
  BarChart3,
  Bell,
  Droplets,
  Flower2,
  LayoutDashboard,
  Microscope,
  Package,
  Satellite,
  Settings,
  Sprout,
  Trees,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/gardens", label: "Gardens", icon: Trees },
  { to: "/pots", label: "Pots", icon: Package },
  { to: "/plants", label: "Plants", icon: Flower2 },
  { to: "/disease-detection", label: "Disease AI", icon: Microscope },
  { to: "/irrigation", label: "Irrigation", icon: Droplets },
  { to: "/sensors", label: "Sensors", icon: Satellite },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-16 items-center px-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 font-black text-slate-950 dark:text-white"
        >
          <span className="rounded-lg bg-emerald-600 p-2 text-white">
            <Sprout size={20} />
          </span>
          SmartAgriAI
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                active
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
