import Image from "next/image";
import Link from "next/link";
import { Bell, Settings } from "lucide-react";

export default function DashboardHeader() {
  return (
    <div className="flex justify-between items-center border-b border-primary/10 pb-6">
      <div className="flex items-center gap-3">
        <Image 
          src="/images/meditrackr logo.png" 
          alt="MediTrackr Logo" 
          width={40} 
          height={40}
          className="object-contain drop-shadow-[0_0_8px_rgba(0,217,255,0.4)]"
        />
        <span className="text-xl font-bold tracking-tight text-glow text-primary">MediTrackr</span>
      </div>
      <div className="flex items-center gap-4">
        <Bell className="w-5 h-5 text-primary cursor-pointer" />
        <Link href="/settings">
            <Settings className="w-5 h-5 text-primary/70 cursor-pointer hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
