import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Filter } from "lucide-react";

export default function Transactions() {
  const transactions = [
    { id: 1, type: "Revenue", description: "Emergency Consultation", amount: "$243.47", date: "Jan 24, 2026", status: "Completed" },
    { id: 2, type: "Expense", description: "Medical Supplies", amount: "$150.00", date: "Jan 23, 2026", status: "Completed" },
    { id: 3, type: "Revenue", description: "Specialist Consultation", amount: "$300.00", date: "Jan 22, 2026", status: "Pending" },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-primary text-glow">All Transactions</h1>
          <Button glow className="gap-2">
            <Filter className="w-5 h-5" />
            Filter
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-secondary-900/50 rounded-lg border border-primary-500/10">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "Revenue" ? "bg-success/10" : "bg-accent/10"
                    }`}>
                      <DollarSign className={`w-5 h-5 ${tx.type === "Revenue" ? "text-success" : "text-accent"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tx.description}</p>
                      <div className="flex items-center gap-3 text-sm text-foreground/60">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span className={tx.type === "Revenue" ? "text-success" : "text-accent"}>{tx.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg text-foreground">{tx.amount}</p>
                    <span className={`text-xs ${tx.status === "Completed" ? "text-success" : "text-accent"}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
