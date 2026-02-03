import type { Metadata, Viewport } from "next";
import { Roboto_Slab } from "next/font/google";
import "./globals.css";

// ---------------------------------------------------------------------------
// Server-side wrappers
// ---------------------------------------------------------------------------
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import OnboardingCheck from "@/components/OnboardingCheck";
import ConsentBanner from "@/components/ConsentBanner";

// ---------------------------------------------------------------------------
// Font
// ---------------------------------------------------------------------------
const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap", // avoid FOUT on first paint
});

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  title: "MediTrackr – Medical Expense Tracker",
  description:
    "Track and manage your medical billing, RAMQ claims, and partner reimbursements efficiently.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  // Open Graph — social share card
  openGraph: {
    type: "website",
    locale: "fr_CA",
    title: "MediTrackr – Medical Expense Tracker",
    description:
      "Track and manage your medical billing, RAMQ claims, and partner reimbursements efficiently.",
    siteName: "MediTrackr",
  },
  // robots
  robots: {
    index: false, // private SaaS — do not crawl
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // lock zoom on mobile for form inputs
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#050505" },
  ],
};

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ---------------------------------------------------------------------------
  // Pre-fetch the Supabase session server-side so the first client render
  // already has auth state — avoids a flash of "logged-out" UI.
  // ---------------------------------------------------------------------------
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // Warm the session cache — the result is consumed internally by the
  // Supabase middleware / client hydration; we don't need the value here.
  await supabase.auth.getSession();

  return (
    <html lang="fr" suppressHydrationWarning>
      {/*
        • font-sans  → system stack (body copy, inputs)
        • robotoSlab.variable → exposed as --font-roboto-slab; used via
          a utility class or directly in components that need slab serifs.
        • antialiased → sub-pixel smoothing
      */}
      <body className={`${robotoSlab.variable} font-sans antialiased`}>
        {/*
          OnboardingCheck gates the app: new users are redirected to the
          onboarding flow until their profile is complete.  Existing users
          pass straight through to <children>.
        */}
        <OnboardingCheck>{children}</OnboardingCheck>

        {/*
          Quebec Law 25 consent banner.  Rendered outside OnboardingCheck so
          it is visible even during onboarding.  The component itself manages
          persistence (cookie / localStorage) and auto-hides once accepted.
        */}
        <ConsentBanner />
      </body>
    </html>
  );
}
