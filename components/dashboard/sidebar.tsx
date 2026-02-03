"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Wallet,
  TrendingUp,
  Settings,
  LogOut,
  Receipt,
  Building2,
  Globe,
  Shield,
  Plane,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScanText, FilePlus, Users, Eye, CreditCard, UserPlus, Printer, QrCode, ChevronDown } from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Payments", href: "/payments", icon: DollarSign },
      { label: "Expenses", href: "/expenses", icon: Wallet },
      { label: "Budget", href: "/budget", icon: TrendingUp },
    ],
  },
  {
    title: "Claims",
    items: [
      { label: "RAMQ", href: "/claims/ramq", icon: Receipt },
      { label: "Federal", href: "/claims/federal", icon: Shield },
      { label: "Out-of-Province", href: "/claims/out-of-province", icon: Globe },
      { label: "Diplomatic", href: "/claims/diplomatic", icon: Plane },
      { label: "Private Insurance", href: "/claims/insurance", icon: Building2 },
    ],
  },
] as const;

export default function Sidebar() {
 const [isManagementOpen, setIsManagementOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
   <div className="lg:col-span-1 space-y-4">
      <div className="card-medical p-4 shadow-cyan space-y-2">
        <h3 className="text-xs font-bold text-primary/50 uppercase tracking-widest mb-4">Quick Actions</h3>
        <Button variant="default" className="w-full justify-start gap-3 shadow-cyan bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
          <ScanText className="w-4 h-4" /> Scan Receipt (OCR)
        </Button>
      </div>
    <aside className="lg:col-span-1 space-y-6">
      {/* Navigation Sections */}
      {NAV_SECTIONS.map((section) => (
        <nav key={section.title} className="card-medical p-4 space-y-2">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-white/40 px-3 mb-3">
            {section.title}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200 group relative overflow-hidden
                    ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}

                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? "text-primary" : ""
                    }`}
                  />
                  <span className="flex-1 truncate">{item.label}</span>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-primary/20 text-primary rounded-md border border-primary/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      ))}

      {/* Bottom actions */}
      <div className="card-medical p-4 space-y-2">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
