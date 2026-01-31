import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, PlusCircle } from "lucide-react";

export default function Budget() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-primary text-glow">Budget Management</h1>
          <Button glow className="gap-2">
            <PlusCircle className="w-5 h-5" />
            New Budget
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-medical-cyan" />
            <CardHeader>
              <CardTitle className="text-lg">Monthly Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">$15,000</p>
              <p className="text-sm text-foreground/70 mt-1">Total allocated</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success to-medical-teal" />
            <CardHeader>
              <CardTitle className="text-lg">Spent This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">$8,750</p>
              <p className="text-sm text-foreground/70 mt-1">58% of budget</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent-light" />
            <CardHeader>
              <CardTitle className="text-lg">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">$6,250</p>
              <p className="text-sm text-foreground/70 mt-1">42% remaining</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
