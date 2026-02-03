import type { Metadata, Viewport } from "next";
import { Roboto_Slab } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import OnboardingCheck from "@/components/OnboardingCheck";
import ConsentBanner from "@/components/ConsentBanner";

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "MediTrackr - Gestion médicale canadienne",
  description: "Gestion de facturation médicale pour professionnels de santé au Canada",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value === "en" ? "en" : "fr";

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={`${robotoSlab.variable} font-sans antialiased`}>
        <OnboardingCheck>
          {children}
        </OnboardingCheck>
        {/* Law 25 Consent Banner - shows until user clicks J'accepte */}
        <ConsentBanner />
      </body>
    </html>
  );
}