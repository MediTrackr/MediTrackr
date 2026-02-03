"use client";
import React, { useState, useEffect } from "react";
import { Bell, Search, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Profile {
  prefix: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export default function DashboardHeader() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("prefix, first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
    }
  }

  return (
    <header className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search invoices, claims, patients..."
            className="w-full bg-black/40 border border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Right side — notifications + profile */}
      <div className="flex items-center gap-4 ml-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all">
          <Bell className="w-5 h-5" />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-black">
              {notifications}
            </span>
          )}
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-white">
              {profile?.prefix} {profile?.last_name || "User"}
            </p>
            <p className="text-[9px] text-white/40 uppercase tracking-wider">
              Physician
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
