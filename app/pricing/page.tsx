"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Stethoscope, Building2, Building } from "lucide-react";

const T = {
  fr: {
    back: "Retour",
    badge: "Tarification transparente · Aucune surprise",
    headline: "Choisissez votre plan",
    sub: "Conçu pour les médecins indépendants, les cliniques et les agences de facturation médicale au Canada.",
    monthly: "Mensuel",
    annual: "Annuel",
    annualSave: "2 mois gratuits",
    mostPopular: "Le plus populaire",
    perMonth: "/mois",
    perYear: "/an",
    startTrial: "Commencer",
    contactSales: "Contacter les ventes",
    bookDemo: "Réserver une démo",
    allPlansInclude: "Tous les plans incluent",
    common: [
      "Bilingue français / anglais",
      "Données hébergées au Canada",
      "Conformité LPRPDE",
      "Support par courriel",
    ],
    plans: [
      {
        icon: "solo",
        name: "Solo",
        tagline: "Médecin indépendant",
        price: 99,
        priceAnnual: 990,
        description: "Tout ce dont un médecin indépendant a besoin pour gérer sa pratique au complet.",
        cta: "Commencer",
        ctaHref: "/signup",
        highlight: false,
        features: [
          "Facturation RAMQ (11 catégories)",
          "Réclamations fédérales (PFSI/SSNA)",
          "Réclamations hors province",
          "Réclamations diplomatiques",
          "Soumission par lot",
          "Réconciliation des paiements",
          "OCR des avis de remise",
          "Suivi des dépenses (scan, manuel, CSV)",
          "Gestion des factures et paiements",
          "Gestion du budget",
          "Tableau de bord & rapports",
        ],
      },
      {
        icon: "clinic",
        name: "Clinique",
        tagline: "À partir de $299/mois",
        price: null,
        priceAnnual: null,
        description: "Pour les cliniques avec plusieurs médecins. L'administrateur gère les lots, les médecins saisissent depuis leur téléphone.",
        cta: "Contacter les ventes",
        ctaHref: "mailto:sales@meditrackr.ca?subject=Plan Clinique",
        highlight: true,
        features: [
          "Tout ce qui est inclus dans Solo",
          "Plusieurs postes médecins",
          "Tableau de bord administrateur centralisé",
          "Saisie mobile optimisée pour les médecins",
          "Gestion des lots par l'administrateur",
          "Vue consolidée de tous les médecins",
        ],
      },
      {
        icon: "bureau",
        name: "Bureau de facturation",
        tagline: "À partir de $999/mois",
        price: null,
        priceAnnual: null,
        description: "Pour les agences qui gèrent la facturation de plusieurs cliniques et médecins. Tarification personnalisée.",
        cta: "Réserver une démo",
        ctaHref: "mailto:demo@meditrackr.ca?subject=Demo Bureau de facturation",
        highlight: false,
        features: [
          "Tout ce qui est inclus dans Clinique",
          "Gestion multi-cliniques / multi-clients",
          "Vue consolidée par client",
          "Accès API",
          "Intégration personnalisée",
          "Intégration dédiée",
          "Support prioritaire",
          "Tarification selon volume",
        ],
      },
    ],
    faqTitle: "Questions fréquentes",
    faqs: [
      { q: "Y a-t-il un essai gratuit ?", a: "Oui — 14 jours gratuits pour le plan Solo, sans carte de crédit requise." },
      { q: "Puis-je changer de plan ?", a: "Oui, à tout moment. Votre compte est mis à jour immédiatement." },
      { q: "Les données sont-elles hébergées au Canada ?", a: "Oui. Toutes les données sont hébergées sur des serveurs canadiens, conformément à la LPRPDE." },
      { q: "Comment fonctionne le plan Clinique ?", a: "L'administrateur de la clinique gère un compte principal. Chaque médecin a accès à une vue simplifiée pour saisir ses réclamations. L'admin révise, corrige et soumet les lots en fin de journée." },
    ],
  },
  en: {
    back: "Back",
    badge: "Transparent pricing · No surprises",
    headline: "Choose your plan",
    sub: "Built for independent physicians, clinics, and medical billing bureaus across Canada.",
    monthly: "Monthly",
    annual: "Annual",
    annualSave: "2 months free",
    mostPopular: "Most popular",
    perMonth: "/month",
    perYear: "/year",
    startTrial: "Get Started",
    contactSales: "Contact Sales",
    bookDemo: "Book a Demo",
    allPlansInclude: "All plans include",
    common: [
      "Bilingual French / English",
      "Data hosted in Canada",
      "PIPEDA compliant",
      "Email support",
    ],
    plans: [
      {
        icon: "solo",
        name: "Solo",
        tagline: "Independent physician",
        price: 99,
        priceAnnual: 990,
        description: "Everything an independent physician needs to manage their practice end to end.",
        cta: "Get Started",
        ctaHref: "/signup",
        highlight: false,
        features: [
          "RAMQ billing (all 11 categories)",
          "Federal claims (PFSI/NIHB)",
          "Out-of-province claims",
          "Diplomatic claims",
          "Daily batch submission",
          "Payment reconciliation",
          "Remittance notice OCR",
          "Expense tracking (scan, manual, CSV)",
          "Invoice & payment management",
          "Budget tracking",
          "Dashboard & reports",
        ],
      },
      {
        icon: "clinic",
        name: "Clinic",
        tagline: "Starting at $299/month",
        price: null,
        priceAnnual: null,
        description: "For clinics with multiple physicians. Admin manages batches, doctors enter data from their phone.",
        cta: "Contact Sales",
        ctaHref: "mailto:sales@meditrackr.ca?subject=Clinic Plan",
        highlight: true,
        features: [
          "Everything in Solo",
          "Multiple doctor seats",
          "Centralized admin dashboard",
          "Mobile-optimized doctor entry view",
          "Admin-managed batch submission",
          "Consolidated view of all physicians",
        ],
      },
      {
        icon: "bureau",
        name: "Billing Bureau",
        tagline: "Starting at $999/month",
        price: null,
        priceAnnual: null,
        description: "For agencies managing billing for multiple clinics and physicians. Custom pricing based on volume.",
        cta: "Book a Demo",
        ctaHref: "mailto:demo@meditrackr.ca?subject=Billing Bureau Demo",
        highlight: false,
        features: [
          "Everything in Clinic",
          "Multi-clinic / multi-client management",
          "Consolidated client overview",
          "API access",
          "Custom integration",
          "Dedicated onboarding",
          "Priority support",
          "Volume-based pricing",
        ],
      },
    ],
    faqTitle: "Frequently asked questions",
    faqs: [
      { q: "Is there a free trial?", a: "Yes — 14 days free on the Solo plan, no credit card required." },
      { q: "Can I change plans?", a: "Yes, at any time. Your account is updated immediately." },
      { q: "Is data hosted in Canada?", a: "Yes. All data is hosted on Canadian servers, fully PIPEDA compliant." },
      { q: "How does the Clinic plan work?", a: "The clinic admin manages a main account. Each physician gets a simplified view to enter their claims. The admin reviews, corrects, and submits the batch at end of day." },
    ],
  },
};

const PLAN_ICONS = {
  solo:   <Stethoscope className="w-6 h-6" />,
  clinic: <Building2 className="w-6 h-6" />,
  bureau: <Building className="w-6 h-6" />,
};

export default function PricingPage() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const t = T[lang];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Nav */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" className="gap-2 text-white/40 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </Button>
        </Link>
        <button
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
          className="text-[10px] uppercase tracking-widest font-bold text-white/30 hover:text-white/60 border border-white/10 px-3 py-1.5 rounded-full transition-colors"
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-16 text-center space-y-4">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5">
          {t.badge}
        </span>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight" style={{ color: "#00d9ff" }}>
          {t.headline}
        </h1>
        <p className="text-white/50 text-base max-w-xl mx-auto">{t.sub}</p>

        {/* Monthly / Annual toggle — only shown when Solo is relevant */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className={`text-sm font-bold ${!annual ? "text-white" : "text-white/30"}`}>{t.monthly}</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-primary" : "bg-white/10"}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${annual ? "left-7" : "left-1"}`} />
          </button>
          <span className={`text-sm font-bold ${annual ? "text-white" : "text-white/30"}`}>
            {t.annual}
            <span className="ml-2 text-[10px] text-primary font-black uppercase tracking-wider">{t.annualSave}</span>
          </span>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border flex flex-col overflow-hidden transition-all ${
                plan.highlight
                  ? "border-primary/50 bg-primary/5 shadow-[0_0_40px_rgba(0,217,255,0.12)]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
              )}

              {plan.highlight && (
                <div className="absolute top-4 right-4">
                  <span className="text-[9px] uppercase tracking-widest font-black text-black bg-primary px-2 py-1 rounded-full">
                    {t.mostPopular}
                  </span>
                </div>
              )}

              <div className="p-8 flex-1 flex flex-col gap-6">
                {/* Header */}
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.highlight ? "bg-primary/20 text-primary" : "bg-white/5 text-white/50"}`}>
                    {PLAN_ICONS[plan.icon as keyof typeof PLAN_ICONS]}
                  </div>
                  <h2 className="text-xl font-black text-white">{plan.name}</h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div>
                  {plan.price !== null ? (
                    <div className="flex items-end gap-1">
                      <span className="text-5xl font-black text-white">
                        ${annual ? plan.priceAnnual?.toLocaleString() : plan.price}
                      </span>
                      <span className="text-white/30 text-sm mb-2">
                        {annual ? t.perYear : t.perMonth}
                      </span>
                    </div>
                  ) : (
                    <div className="text-2xl font-black text-white/60 py-2">{plan.tagline}</div>
                  )}
                  <p className="text-xs text-white/40 mt-2 leading-relaxed">{plan.description}</p>
                </div>

                {/* CTA */}
                <Link href={plan.ctaHref}>
                  <Button
                    className={`w-full h-12 font-bold rounded-xl text-sm ${
                      plan.highlight
                        ? "bg-primary text-black hover:bg-primary/80 shadow-[0_0_20px_rgba(0,217,255,0.3)]"
                        : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? "text-primary" : "text-white/30"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* All plans include */}
        <div className="mt-12 border border-white/5 rounded-2xl p-8 bg-white/[0.01]">
          <p className="text-xs uppercase tracking-widest font-bold text-white/30 mb-5">{t.allPlansInclude}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {t.common.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-white/50">
                <Check className="w-4 h-4 text-primary/60 shrink-0" /> {item}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-white mb-8 text-center">{t.faqTitle}</h2>
          <div className="space-y-3">
            {t.faqs.map((faq, i) => (
              <div key={i} className="border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex justify-between items-center p-5 text-left text-sm font-bold text-white/70 hover:text-white transition-colors"
                >
                  {faq.q}
                  <span className={`text-primary transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-white/40 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 text-center py-8">
        <p className="text-[10px] text-white/20 uppercase tracking-widest">
          © {new Date().getFullYear()} MediTrackr — Conçu au Canada pour les professionnels de santé
        </p>
      </div>
    </div>
  );
}
