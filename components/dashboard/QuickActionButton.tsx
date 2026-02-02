import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  variant?: "default" | "ghost";
  colorScheme?: "primary" | "success" | "accent";
  onClick?: () => void;
}

export default function QuickActionButton({ 
  icon: Icon, 
  label, 
  variant = "ghost",
  colorScheme = "primary",
  onClick 
}: QuickActionButtonProps) {
  const colors = {
    primary: "hover:bg-primary/10 text-primary",
    success: "hover:bg-success/10 text-success",
    accent: "hover:bg-accent/10 text-accent"
  };

  if (variant === "default") {
    return (
      <Button 
        variant="default" 
        className="w-full justify-start gap-3 shadow-cyan bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
        onClick={onClick}
      >
        <Icon className="w-4 h-4" /> {label}
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      className={`w-full justify-start gap-3 text-foreground/80 ${colors[colorScheme]}`}
      onClick={onClick}
    >
      <Icon className={`w-4 h-4 ${colorScheme === 'primary' ? 'text-primary' : colorScheme === 'success' ? 'text-success' : 'text-accent'}`} /> 
      {label}
    </Button>
  );
}
