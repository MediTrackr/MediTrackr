import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="card-medical rounded-lg p-8 hover:scale-105 transition-transform duration-300 flex items-center justify-center group relative">
      <Icon className="w-16 h-16 text-primary" />
      
      {/* Tooltip on hover */}
      <div className="absolute inset-0 bg-secondary-900/95 rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center">
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          {title}
        </h3>
        <p className="text-sm text-foreground/70">
          {description}
        </p>
      </div>
    </div>
  );
}
