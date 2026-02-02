import { LucideIcon } from "lucide-react";

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  colorScheme?: "primary" | "accent";
  onClick?: () => void;
}

export default function ActionCard({ 
  icon: Icon, 
  title, 
  description, 
  colorScheme = "primary",
  onClick 
}: ActionCardProps) {
  const colors = {
    primary: "shadow-cyan hover:border-primary/40",
    accent: "shadow-orange hover:border-accent/40"
  };

  const iconColors = {
    primary: "text-primary",
    accent: "text-accent"
  };

  return (
    <div 
      className={`card-medical p-6 flex items-center gap-4 cursor-pointer transition-all ${colors[colorScheme]}`}
      onClick={onClick}
    >
      <Icon className={`w-8 h-8 ${iconColors[colorScheme]}`} />
      <div>
        <h4 className="font-bold text-sm">{title}</h4>
        <p className="text-[10px] opacity-50">{description}</p>
      </div>
    </div>
  );
}
