"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const PUBLIC_PATHS = ['/', '/login', '/signup', '/onboarding', '/forgot-password', '/auth', '/payment-success'];

function isPublic(path: string | null): boolean {
  if (!path) return true;
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'));
}

export default function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Public pages skip auth entirely — start ready immediately
  const [ready, setReady] = useState(() => isPublic(pathname));

  useEffect(() => {
    if (isPublic(pathname)) {
      return;
    }

    let done = false;

    const timeout = setTimeout(() => {
      if (!done) { done = true; setReady(true); }
    }, 3000);

    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (done) return;

        if (!session?.user) {
          done = true;
          clearTimeout(timeout);
          router.push('/login');
          return;
        }

        const { data: settings } = await supabase
          .from('practice_settings')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (done) return;
        done = true;
        clearTimeout(timeout);

        if (!settings) {
          router.push('/onboarding');
        } else {
          setReady(true);
        }
      } catch {
        if (!done) { done = true; clearTimeout(timeout); setReady(true); }
      }
    })();

    return () => { done = true; clearTimeout(timeout); };
  }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
