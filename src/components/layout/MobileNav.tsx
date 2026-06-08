"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  UsersRound,
  Receipt,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Home",
  },
  {
    href: "/friends",
    icon: Users,
    label: "Friends",
  },
  {
    href: "/groups",
    icon: UsersRound,
    label: "Groups",
  },
  {
    href: "/expenses",
    icon: Receipt,
    label: "Expenses",
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="
        lg:hidden
        fixed
        bottom-0
        left-0
        right-0
        z-50
      "
      style={{
        background:
          "rgba(7,9,15,.92)",
        backdropFilter:
          "blur(18px)",
        borderTop:
          "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div
        className="
          grid
          grid-cols-4
          pb-[env(safe-area-inset-bottom)]
        "
      >
        {items.map(
          ({
            href,
            icon: Icon,
            label,
          }) => {
            const active =
              pathname === href ||
              pathname.startsWith(
                `${href}/`
              );

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  `
                  flex
                  flex-col
                  items-center
                  justify-center
                  py-3
                  text-xs
                  gap-1
                  `,
                  active
                    ? "text-indigo-400"
                    : "text-slate-500"
                )}
              >
                <Icon className="w-5 h-5" />

                <span>{label}</span>
              </Link>
            );
          }
        )}
      </div>
    </nav>
  );
}