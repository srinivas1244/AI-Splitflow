import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AIChatButton } from "@/components/chat/AIChatButton";
import { Toaster } from "react-hot-toast";

import type { Profile } from "@/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    profile = data;
  }

  return (
    <div className="app-shell">
      <Sidebar profile={profile} />

      <main className="app-main">
        {children}
      </main>

      <MobileNav />

      <AIChatButton />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "rgba(15,20,40,0.92)",
            color: "#f8fafc",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            backdropFilter: "blur(18px)",
            boxShadow: "0 20px 40px rgba(0,0,0,.45)",
          },
        }}
      />
    </div>
  );
}