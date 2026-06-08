"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  UsersRound,
  Receipt,
  Settings,
  LogOut,
  Zap,
  UserCircle
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

import toast from "react-hot-toast";

import type { Profile } from "@/types";

const navItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
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

interface SidebarProps {
  profile: Profile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    try {
      await supabase.auth.signOut();

      toast.success("Signed out successfully");

      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Unable to logout");
    }
  }

  return (
    <aside
      className="hidden lg:flex flex-col relative z-10 my-4 ml-4 rounded-[2rem] overflow-hidden shadow-2xl"
      style={{
        width: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
        background: "#1a1a1a",
        height: "calc(100vh - 32px)",
      }}
    >
      <div className="flex flex-col h-full p-4">
        {/* Logo */}

        <Link
          href="/dashboard"
          className="flex items-center gap-3 mb-10 mt-2 px-4"
        >
          <div>
            <div className="font-bold text-xl text-white tracking-tight">
              SplitFlow
            </div>
          </div>
        </Link>

        {/* Main Nav */}

        <nav className="flex-1 px-2">

          <div className="space-y-1">
            {navItems.map(
              ({
                href,
                icon: Icon,
                label,
              }) => {
                const isActive =
                  pathname === href ||
                  pathname.startsWith(
                    `${href}/`
                  );

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "sidebar-link",
                      isActive &&
                      "active"
                    )}
                  >
                    <Icon className="w-4 h-4" />

                    <span>{label}</span>
                  </Link>
                );
              }
            )}
          </div>
        </nav>

        {/* Account */}

        <div className="border-t border-white/5 pt-4 px-2 space-y-1">

          <Link
            href="/profile"
            className={cn(
              "sidebar-link",
              pathname === "/profile" &&
              "active"
            )}
          >
            <UserCircle className="w-4 h-4" />
            Profile
          </Link>

          <Link
            href="/settings"
            className={cn(
              "sidebar-link",
              pathname === "/settings" &&
              "active"
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>

          <button
            onClick={handleLogout}
            className="
              sidebar-link
              w-full
              mt-3
              text-rose-400
              hover:bg-rose-500/10
            "
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}