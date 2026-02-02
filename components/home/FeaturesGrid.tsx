import { DollarSign, TrendingUp, FileText, BarChart3 } from "lucide-react";
import FeatureCard from "./FeatureCard";

export default function FeaturesGrid() {
  const features = [
    {
      icon: DollarSign,
      title: "Revenue Tracking",
      description: "Track consultations, invoices, and patient payments in real-time"
    },
    {
      icon: FileText,
      title: "Expense Management",
      description: "Categorize and monitor practice expenses, supplies, and overhead costs"
    },
    {
      icon: TrendingUp,
      title: "Financial Analytics",
      description: "View profit margins, cash flow, and practice performance metrics"
    },
    {
      icon: BarChart3,
      title: "Custom Reports",
      description: "Generate tax reports, financial statements, and revenue summaries"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {features.map((feature, index) => (
        <FeatureCard
          key={index}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </div>
  );
}
