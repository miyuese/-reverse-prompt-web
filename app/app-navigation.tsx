"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems: Array<{ href: string; label: string }> = [
  { href: "/", label: "首页" },
  { href: "/generate", label: "生成页" },
  { href: "/models", label: "模型配置" },
  { href: "/assistants", label: "助手设计师" },
  { href: "/history", label: "历史页" },
  { href: "/favorites", label: "收藏页" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-wrap gap-3">
      {navItems.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "rounded-full border px-4 py-2 text-sm transition",
              active
                ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500 hover:text-white",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
