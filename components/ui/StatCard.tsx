"use client";
import React from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  className = "",
  trend,
}: StatCardProps) {
  return (
    <div
      className={`card-medical p-6 border-l-4 border-primary relative overflow-hidden group hover:border-primary/60 transition-all ${className}`}
    >
      {/* Background glow effect */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[9px] uppercase font-bold tracking-widest text-white/40 mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-white mb-1">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p
              className={`text-xs font-medium ${
                trend.isPositive ? "text-green-400" : "text-red-400"
              }`}
            >
              {trend.isPositive ? "↗" : "↘"} {trend.value}
            </p>
          )}
        </div>

        {/* Icon */}
        <div className="flex-shrink-0 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
