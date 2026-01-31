import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Plus, TrendingDown, AlertCircle } from "lucide-react";

export default function Expenses() {
  const recentExpenses = [
    { id: 1, category: "Medical Supplies", vendor: "MedSupply Inc", date: "Jan 15, 2026", amount: "$850.00" },
    { id: 2, category: "Equipment Maintenance", vendor: "MedTech Services", date: "Jan 14, 2026", amount: "$1,200.00" },
    { id: 3, category: "Office Rent", vendor: "Property Management", date: "Jan 1, 2026", amount: "$3,500.00" },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-primary text-glow">Expense Management</h1>
          <Button glow className="gap-2">
            <Plus className="w-5 h-5" />
            Add Expense
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent-light" />
            <CardHeader>
              <CardTitle className="text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">$12,450.00</p>
              <p className="text-sm text-foreground/70 mt-1">45 expenses</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-medical-cyan" />
            <CardHeader>
              <CardTitle className="text-lg">Average/Day</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">$498.00</p>
              <p className="text-sm text-foreground/70 mt-1">Based on 25 days</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success to-medical-teal" />
            <CardHeader>
              <CardTitle className="text-lg">Top Category</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">$5,200</p>
              <p className="text-sm text-foreground/70 mt-1">Medical Supplies</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary-500" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-secondary-900/50 rounded-lg border border-primary-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{expense.category}</p>
                      <div className="flex items-center gap-3 text-sm text-foreground/60">
                        <span>{expense.vendor}</span>
                        <span>•</span>
                        <span>{expense.date}</span>
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold text-lg text-foreground">{expense.amount}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
