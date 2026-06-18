"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Settings,
  Sparkles,
  LayoutDashboard,
  Radar,
} from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Tracker", icon: Briefcase },
  { href: "/optimizer", label: "AI Optimizer", icon: Sparkles },
  { href: "/settings", label: "Preferences", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800 min-h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Radar className="text-indigo-400 w-6 h-6" />
          <span className="text-lg font-bold text-white tracking-tight">
            JobPilot
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Job Tracker &amp; AI Loop</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-600">v1.0.0 – MVP</p>
      </div>
    </aside>
  );
}
