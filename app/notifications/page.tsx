"use client";
import { Bell } from "lucide-react";

export default function Notifications() {
  const notifications = [
    { id: 1, title: "Paiement reçu", message: "La facture #1234 a été payée", time: "Il y a 2 heures", read: false },
    { id: 2, title: "Nouvelle dépense", message: "Dépense de fournitures médicales enregistrée", time: "Il y a 5 heures", read: true },
  ];

  return (
    <main className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-black text-primary uppercase tracking-tight">Notifications</h1>

        <div className="card-medical p-6 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/50">Récentes</h2>
          </div>
          {notifications.map((notif) => (
            <div key={notif.id} className={`p-4 rounded-xl border transition-colors ${
              notif.read ? "bg-white/3 border-white/5" : "bg-primary/5 border-primary/20"
            }`}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-bold text-sm text-foreground">{notif.title}</p>
                  <p className="text-xs text-foreground/50 mt-1">{notif.message}</p>
                </div>
                <span className="text-[10px] text-foreground/30 whitespace-nowrap">{notif.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
