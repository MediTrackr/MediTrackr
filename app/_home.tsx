"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  BarChart3, ShieldCheck, ClipboardList,
  Banknote, Activity, DollarSign, FileText,
} from "lucide-react";

type Lang = "fr" | "en";

const CONTENT = {
  fr: {
    badge: "🇨🇦 Pour les professionnels de santé au Canada",
    tagline: "Simplifiez la gestion de votre pratique.",
    sub: "Revenus, dépenses, facturation et conformité — tout ce dont votre pratique médicale a besoin, dans un seul outil pensé pour le Canada.",
    cta1: "Commencer gratuitement",
    cta2: "Se connecter",
    stats: [
      { value: "🇨🇦", label: "Professionnels au Canada", isEmoji: true },
      { value: "11+", label: "types de pratique" },
      { value: "4", label: "modes de rémunération" },
    ],
    featuresLabel: "Ce que MediTrackr fait pour vous",
    featuresHeadline: ["Tout ce dont vous avez besoin,", "rien de superflu."],
    features: [
      { icon: DollarSign, title: "Gestion des revenus", body: "Suivez vos revenus de facturation, honoraires et remboursements en temps réel.", accent: "text-primary" },
      { icon: ClipboardList, title: "Facturation médicale", body: "RAMQ (Québec), OHIP (Ontario), MSP (C.-B.) et autres régimes provinciaux — regroupés dans un seul outil.", accent: "text-primary" },
      { icon: Activity, title: "Suivi des dépenses", body: "Catégorisez les frais de pratique, fournitures et frais généraux.", accent: "text-primary" },
      { icon: Banknote, title: "Modes de rémunération", body: "À l'acte, vacation, salariat ou mixte — gérez plusieurs modes simultanément.", accent: "text-primary" },
      { icon: BarChart3, title: "Rapports et fiscalité", body: "Bilans financiers, rapports de taxes et résumés de revenus prêts pour votre comptable.", accent: "text-accent" },
      { icon: ShieldCheck, title: "Conformité canadienne", body: "Conforme à la LPRPDE fédérale et aux lois provinciales sur la protection des données.", accent: "text-accent" },
    ],
    profsLabel: "Conçu pour votre réalité",
    profsHeadline: ["Peu importe votre spécialité,", "MediTrackr s'adapte."],
    ramqLabel: "Facturation RAMQ — Québec",
    ramqBody: "Support complet pour les 11 catégories RAMQ, codes CIM-9/CIM-10 et formulaires B2B — intégré comme module dans MediTrackr.",
    ctaHeadline: ["Prêt à simplifier la gestion", "de votre pratique ?"],
    ctaSub: "Créez votre compte en quelques minutes. Aucune carte de crédit requise.",
    ctaBtn1: "Créer un compte",
    ctaBtn2: "J'ai déjà un compte",
    footer: `© ${new Date().getFullYear()} MediTrackr — Conçu au Canada pour les professionnels de santé`,
  },
  en: {
    badge: "🇨🇦 For Canadian Healthcare Professionals",
    tagline: "Simplify the management of your practice.",
    sub: "Revenue, expenses, billing and compliance — everything your medical practice needs, in one tool built for Canada.",
    cta1: "Get started for free",
    cta2: "Sign in",
    stats: [
      { value: "🇨🇦", label: "Professionals across Canada", isEmoji: true },
      { value: "11+", label: "practice types" },
      { value: "4", label: "remuneration modes" },
    ],
    featuresLabel: "What MediTrackr does for you",
    featuresHeadline: ["Everything you need,", "nothing you don't."],
    features: [
      { icon: DollarSign, title: "Revenue management", body: "Track billing revenue, fees, and reimbursements in real time.", accent: "text-primary" },
      { icon: ClipboardList, title: "Medical billing", body: "RAMQ (Quebec), OHIP (Ontario), MSP (BC) and other provincial plans — all in one tool.", accent: "text-primary" },
      { icon: Activity, title: "Expense tracking", body: "Categorize practice costs, supplies, and overhead for complete financial control.", accent: "text-primary" },
      { icon: Banknote, title: "Remuneration modes", body: "Fee-for-service, hourly, salary or mixed — manage multiple modes simultaneously.", accent: "text-primary" },
      { icon: BarChart3, title: "Reports & taxes", body: "Financial statements, tax reports, and revenue summaries ready for your accountant.", accent: "text-accent" },
      { icon: ShieldCheck, title: "Canadian compliance", body: "Compliant with PIPEDA and provincial health data protection legislation.", accent: "text-accent" },
    ],
    profsLabel: "Built for your reality",
    profsHeadline: ["Whatever your specialty,", "MediTrackr adapts."],
    ramqLabel: "RAMQ Billing — Quebec",
    ramqBody: "Full support for all 11 RAMQ categories, CIM-9/CIM-10 diagnostic codes, and B2B access forms — integrated as a module in MediTrackr.",
    ctaHeadline: ["Ready to simplify the management", "of your practice?"],
    ctaSub: "Create your account in minutes. No credit card required to get started.",
    ctaBtn1: "Create an account",
    ctaBtn2: "I already have an account",
    footer: `© ${new Date().getFullYear()} MediTrackr — Built in Canada for healthcare professionals`,
  },
};

const PROFESSIONS = [
  { icon: "🩺", fr: "Omnipraticien",      en: "Family physician" },
  { icon: "🔬", fr: "Spécialiste",        en: "Specialist" },
  { icon: "🎓", fr: "Résident",           en: "Resident" },
  { icon: "🥗", fr: "Diététiste",         en: "Dietitian" },
  { icon: "💉", fr: "Infirmier/ière",     en: "Nurse" },
  { icon: "🫁", fr: "Inhalothérapeute",   en: "Respiratory therapist" },
  { icon: "🦶", fr: "Podiatre",           en: "Podiatrist" },
  { icon: "👶", fr: "Sage-femme",         en: "Midwife" },
  { icon: "🦷", fr: "Dentiste",           en: "Dentist" },
  { icon: "🧠", fr: "Psychologue",        en: "Psychologist" },
  { icon: "🏥", fr: "Établissement",      en: "Health facility" },
];

export default function HomeClient({ initialLang }: { initialLang: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = CONTENT[lang];

  function switchLang(l: Lang) {
    document.cookie = `lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = l;
    setLang(l);
  }

  return (
    <main className="min-h-screen overflow-x-hidden">

      {/* ─── Language selector ─── */}
      <div className="fixed top-3 right-3 z-50">
        <select
          value={lang}
          onChange={(e) => switchLang(e.target.value as Lang)}
          className="appearance-none bg-black/70 backdrop-blur-md border border-white/10 text-white/70 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-xl cursor-pointer hover:border-primary/40 hover:text-white transition-all outline-none"
        >
          <option value="fr">🇫🇷 FR</option>
          <option value="en">🇬🇧 EN</option>
        </select>
      </div>

      {/* ─── Hero ─── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-16">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-2xl mx-auto gap-5">
          <div className="relative w-16 h-16 sm:w-24 sm:h-24">
            <Image
              src="/images/meditrackr logo.png"
              alt="MediTrackr"
              fill
              className="object-contain drop-shadow-[0_0_20px_rgba(0,217,255,0.4)]"
              priority
            />
          </div>

          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 leading-none">
            {t.badge}
          </span>

          <h1
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none drop-shadow-[0_0_30px_rgba(0,217,255,0.35)]"
            style={{ color: "#00d9ff" }}
          >
            MediTrackr
          </h1>

          <p className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-snug px-2">
            {t.tagline}
          </p>

          <p className="text-sm sm:text-base text-white/50 leading-relaxed px-2">
            {t.sub}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-1">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full px-8 py-5 text-sm font-bold bg-primary text-black hover:bg-primary/80 shadow-[0_0_24px_rgba(0,217,255,0.25)]"
              >
                {t.cta1}
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full px-8 py-5 text-sm font-bold border-white/20 text-white hover:bg-white/5"
              >
                {t.cta2}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto px-4 py-6 grid grid-cols-3 divide-x divide-white/5">
          {t.stats.map(({ value, label, isEmoji }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-2">
              <span className={isEmoji
                ? "text-2xl sm:text-4xl leading-none"
                : "text-2xl sm:text-4xl font-black text-primary drop-shadow-[0_0_12px_rgba(0,217,255,0.4)]"
              }>
                {value}
              </span>
              <span className="text-[9px] sm:text-[11px] uppercase tracking-wider text-white/40 font-bold text-center leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold text-primary/70 text-center mb-2">
          {t.featuresLabel}
        </h2>
        <p className="text-xl sm:text-2xl md:text-3xl font-black text-center text-white mb-8 sm:mb-12 px-2">
          {t.featuresHeadline[0]}{" "}
          <span className="text-primary">{t.featuresHeadline[1]}</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {t.features.map(({ icon: Icon, title, body, accent }) => (
            <div
              key={title}
              className="card-medical rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/20 transition-all"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 ${accent}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Professions ─── */}
      <section className="border-t border-white/5 bg-white/[0.015]">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <h2 className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold text-primary/70 text-center mb-2">
            {t.profsLabel}
          </h2>
          <p className="text-lg sm:text-xl font-black text-center text-white mb-8 px-2">
            {t.profsHeadline[0]}{" "}
            <span className="text-primary">{t.profsHeadline[1]}</span>
          </p>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {PROFESSIONS.map(({ icon, fr, en }) => (
              <div
                key={fr}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-white/10 bg-black/30 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-default"
              >
                <span className="text-base sm:text-lg leading-none">{icon}</span>
                <span className="text-[11px] sm:text-xs font-bold text-white/70 whitespace-nowrap">
                  {lang === "fr" ? fr : en}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-10 mx-auto max-w-xl p-4 sm:p-5 rounded-2xl border border-primary/15 bg-primary/5 flex items-start gap-3 sm:gap-4">
            <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-primary mb-1">{t.ramqLabel}</p>
              <p className="text-xs text-white/40 leading-relaxed">{t.ramqBody}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="max-w-3xl mx-auto px-4 py-16 sm:py-28">
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] bg-primary/5 rounded-full blur-[80px] sm:blur-[100px]" />
          </div>
          <div className="relative z-10 card-medical rounded-3xl p-6 sm:p-12 flex flex-col items-center gap-5 sm:gap-6 border-primary/10 text-center">
            <span className="text-3xl sm:text-4xl">🇨🇦</span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white px-2">
              {t.ctaHeadline[0]}<br />
              <span className="text-primary">{t.ctaHeadline[1]}</span>
            </h2>
            <p className="text-sm text-white/40 max-w-sm px-2">{t.ctaSub}</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full px-8 py-5 font-bold bg-primary text-black hover:bg-primary/80 shadow-[0_0_24px_rgba(0,217,255,0.2)]"
                >
                  {t.ctaBtn1}
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full px-8 py-5 font-bold text-white/50 hover:text-white hover:bg-white/5"
                >
                  {t.ctaBtn2}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-6 sm:py-8 px-4 text-center">
        <p className="text-[10px] sm:text-[11px] text-white/20 uppercase tracking-widest leading-relaxed">
          {t.footer}
        </p>
      </footer>
    </main>
  );
}
