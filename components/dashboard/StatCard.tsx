import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  colorScheme?: "primary" | "success" | "accent";
}

export default function StatCard({ title, value, icon: Icon, colorScheme = "primary" }: StatCardProps) {
  const colors = {
    primary: "from-primary-500 to-medical-cyan",
    success: "from-success to-medical-teal",
    accent: "from-accent to-accent-light"
  };

  const shadowColors = {
    primary: "shadow-cyan",
    success: "shadow-green",
    accent: "shadow-orange"
  };

  const iconColors = {
    primary: "text-primary",
    success: "text-success",
    accent: "text-accent"
  };

  return (
    <div className={`card-medical p-6 hover:scale-105 transition-transform ${shadowColors[colorScheme]}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors[colorScheme]}`} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-foreground/70 mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${iconColors[colorScheme]}`} />
      </div>
    </div>
  );
}
