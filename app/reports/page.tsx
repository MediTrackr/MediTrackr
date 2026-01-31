import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, TrendingUp, TrendingDown } from "lucide-react";

export default function Reports() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-primary text-glow">Financial Reports</h1>
          <Button glow className="gap-2">
            <Download className="w-5 h-5" />
            Export Report
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="stat-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success to-medical-teal" />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                Net Income (This Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-success mb-2">$12,000.00</p>
              <p className="text-sm text-foreground/70">Revenue: $24,450 | Expenses: $12,450</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-medical-cyan" />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                Profit Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-white mb-2">49.1%</p>
              <p className="text-sm text-foreground/70">Above industry average (42%)</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-secondary-900/50 rounded-lg">
                <span className="font-medium">January 2026</span>
                <span className="text-success">$12,000</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-secondary-900/50 rounded-lg">
                <span className="font-medium">December 2025</span>
                <span className="text-foreground">$10,500</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-secondary-900/50 rounded-lg">
                <span className="font-medium">November 2025</span>
                <span className="text-foreground">$11,200</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
