"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { Profile } from "@/types";

interface HeaderProps {
  title: string;
  subtitle?: string;
  profile: Profile | null;
}

export function Header({
  title,
  subtitle,
  profile,
}: HeaderProps) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!profile) return;

    fetchInvitations();

    // Setup realtime subscription for instant notifications!
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${profile.id}`,
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchInvitations() {
    const { data } = await supabase
      .from('friendships')
      .select('*, requester:profiles!friendships_requester_id_fkey(*)')
      .eq('addressee_id', profile?.id)
      .eq('status', 'pending');
    
    if (data) {
      setInvitations(data);
    }
  }

  async function handleRequest(friendshipId: string, action: 'accepted' | 'rejected') {
    const { error } = await supabase
      .from('friendships')
      .update({ status: action })
      .eq('id', friendshipId);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(action === 'accepted' ? 'Friend request accepted!' : 'Request declined');
    fetchInvitations();
    setShowDropdown(false); // Optionally close dropdown, or leave open if multiple
  }

  return (
    <header
      className="sticky top-0 z-30 px-6 py-4 animate-fade-in"
      style={{
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">
            Pages / {title}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {subtitle ? subtitle : title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="
                w-10 h-10 rounded-xl flex items-center justify-center
                bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10
                hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-slate-500 dark:text-slate-300
              "
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="
                relative
                w-10
                h-10
                rounded-xl
                flex
                items-center
                justify-center
                bg-white/5
                border
                border-white/10
                hover:bg-white/10
                transition-all
              "
              aria-label="Notifications"
            >
              <Bell className={`w-4 h-4 ${invitations.length > 0 ? 'text-indigo-400' : 'text-slate-300'}`} />
              {invitations.length > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showDropdown && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-[#0d111c]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="font-bold text-slate-200">Notifications</h3>
                  {invitations.length > 0 && (
                    <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      {invitations.length} New
                    </span>
                  )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {invitations.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      No pending invitations
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-start gap-3">
                            <Avatar src={inv.requester.avatar_url} name={inv.requester.full_name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 leading-tight mb-3">
                                <span className="font-bold text-white">{inv.requester.full_name}</span> sent you a friend request
                              </p>
                              <div className="flex gap-2">
                                <Button variant="success" size="sm" className="h-8 px-0 flex-1 text-xs" onClick={() => handleRequest(inv.id, 'accepted')}>
                                  Accept
                                </Button>
                                <Button variant="danger" size="sm" className="h-8 px-0 flex-1 text-xs" onClick={() => handleRequest(inv.id, 'rejected')}>
                                  Decline
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Link href="/profile">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name}
              size="sm"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}