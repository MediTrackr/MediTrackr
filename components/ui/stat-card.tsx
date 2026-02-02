"use client";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  className?: string;
}

export default function StatCard({ title, value, icon: Icon, className }: StatCardProps) {
  return (
    <div className={`card-medical p-6 hover:scale-[1.02] transition-transform ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm opacity-70 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <Icon className="w-8 h-8 opacity-80" />
      </div>
    </div>
  );
}
