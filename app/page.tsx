import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-6xl w-full space-y-16 relative z-10">
        <Card className="max-w-2xl w-full text-center mx-auto">
          <CardHeader>
            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32">
                <Image
                  src="/images/meditrackr logo.png"
                  alt="MediTrackr Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-[#00d9ff] text-glow mb-6">
              MediTrackr
            </h1>
            <p className="text-base md:text-lg text-foreground/90 max-w-md mx-auto">
              Track your medical practice revenue and expenses
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full px-8 py-6 text-lg bg-red-600 hover:bg-red-700 text-white">
                  Get Started
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full px-8 py-6 text-lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-2xl mx-auto">
          <FeaturesGrid />
        </div>
      </div>
    </main>
  );
}