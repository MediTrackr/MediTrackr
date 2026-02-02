import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScanText, FilePlus, Users, Eye, CreditCard, UserPlus, Printer, QrCode, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Sidebar() {
  const [isManagementOpen, setIsManagementOpen] = useState(true);

  return (
    <div className="lg:col-span-1 space-y-4">
      <div className="card-medical p-4 shadow-cyan space-y-2">
        <h3 className="text-xs font-bold text-primary/50 uppercase tracking-widest mb-4">Quick Actions</h3>
        <Button variant="default" className="w-full justify-start gap-3 shadow-cyan bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
          <ScanText className="w-4 h-4" /> Scan Receipt (OCR)
        </Button>
      </div>

      {/* Stripe Payment / QR Upload */}
      <div className="card-medical p-4 shadow-green space-y-3">
        <h3 className="text-xs font-bold text-green-400/50 uppercase tracking-widest mb-2">Payment</h3>
        <Button variant="outline" className="w-full justify-start gap-3 hover:bg-green-500/10 border-green-400/30">
          <CreditCard className="w-4 h-4 text-green-400" /> Stripe Payment
        </Button>
        <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <QrCode className="w-8 h-8 mx-auto mb-2 text-primary/50" />
          <p className="text-xs text-foreground/60">Upload QR Code</p>
        </div>
      </div>

      {/* Management Section */}
      <div className="card-medical p-4 shadow-cyan space-y-4">
        <button 
          onClick={() => setIsManagementOpen(!isManagementOpen)}
          className="w-full flex items-center justify-between text-xs font-bold text-foreground/50 uppercase tracking-widest hover:text-foreground/70 transition-colors"
        >
          <span>Management</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isManagementOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isManagementOpen && (
          <>
            {/* First Box - View Group */}
            <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Link href="/invoices" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 text-foreground/80">
                  <FilePlus className="w-4 h-4" /> View Invoices
                </Button>
              </Link>
              <Link href="/revenue" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-green-500/10 text-foreground/80">
                  <CreditCard className="w-4 h-4 text-green-400" /> View Payments
                </Button>
              </Link>
              <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 text-foreground/80">
                <Users className="w-4 h-4" /> Patient Details
              </Button>
            </div>

            {/* Second Box - Action Group */}
            <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Link href="/budget" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-green-500/10 text-foreground/80">
                  <Eye className="w-4 h-4 text-green-400" /> View Budget
                </Button>
              </Link>
              <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 text-foreground/80">
                <UserPlus className="w-4 h-4 text-primary" /> Add Partner
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-accent/10 text-foreground/80">
                <Printer className="w-4 h-4 text-accent" /> Print Report
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="card-medical p-4 shadow-orange">
        <h3 className="text-xs font-bold text-accent/50 uppercase tracking-widest mb-2">System Status</h3>
        <p className="text-[10px] opacity-60">OCR Engine: <span className="text-green-400">Ready</span></p>
        <p className="text-[10px] opacity-60">RAMQ Server: <span className="text-green-400">Online</span></p>
      </div>
    </div>
  );
}