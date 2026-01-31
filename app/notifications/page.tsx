import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle } from "lucide-react";

export default function Notifications() {
  const notifications = [
    { id: 1, title: "Payment Received", message: "Invoice #1234 has been paid", time: "2 hours ago", read: false },
    { id: 2, title: "New Expense Added", message: "Medical supplies expense recorded", time: "5 hours ago", read: true },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-primary text-glow">Notifications</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notif) => (
              <div key={notif.id} className={`p-4 rounded-lg border ${
                notif.read ? "bg-secondary-900/30 border-primary-500/5" : "bg-secondary-900/50 border-primary-500/20"
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-foreground">{notif.title}</p>
                    <p className="text-sm text-foreground/60 mt-1">{notif.message}</p>
                  </div>
                  <span className="text-xs text-foreground/50">{notif.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
