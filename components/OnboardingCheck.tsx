"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboarding();
  }, [pathname]);

  async function checkOnboarding() {
    try {
      // Pages that don't require onboarding check
      const publicPages = ['/', '/login', '/signup', '/onboarding'];
      if (publicPages.includes(pathname)) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not logged in, redirect to landing page
        router.push('/');
        return;
      }

      // Check if profile exists and has required fields
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      // If no profile or missing required fields, redirect to onboarding
      if (!profile || !profile.first_name || !profile.last_name) {
        router.push('/onboarding');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-primary text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}