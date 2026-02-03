import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Politique de confidentialité — MediTrackr" };

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Informations collectées",
      body: "MediTrackr collecte les informations que vous fournissez lors de l'inscription (nom, courriel, numéro RAMQ professionnel, coordonnées bancaires) ainsi que les données générées par l'utilisation du service (factures, réclamations, dépenses). Aucune donnée clinique sur les patients n'est conservée sur nos serveurs.",
    },
    {
      title: "2. Utilisation des données",
      body: "Vos données sont utilisées exclusivement pour fournir les fonctionnalités de MediTrackr : gestion de facturation, production de rapports financiers et conformité réglementaire. Nous ne vendons, ne louons et ne partageons pas vos données avec des tiers à des fins commerciales.",
    },
    {
      title: "3. Résidence des données",
      body: "Toutes les données sont hébergées sur des serveurs situés au Canada, conformément aux exigences de la Loi 25 (Québec) et de la LPRPDE fédérale. Notre infrastructure Supabase est configurée pour la région Canada (ca-central-1).",
    },
    {
      title: "4. Sécurité",
      body: "MediTrackr utilise le chiffrement TLS 1.3 pour toutes les transmissions, le chiffrement AES-256 pour les données au repos, et l'authentification à deux facteurs optionnelle. Les accès sont journalisés et audités.",
    },
    {
      title: "5. Rétention des données",
      body: "Vos données sont conservées pendant la durée de votre abonnement actif et 24 mois après la résiliation du compte (pour répondre aux obligations fiscales). Vous pouvez demander la suppression anticipée de vos données en contactant notre équipe.",
    },
    {
      title: "6. Vos droits (Loi 25)",
      body: "Conformément à la Loi 25, vous avez le droit d'accéder à vos données personnelles, d'en demander la rectification ou la suppression, de vous opposer à certains traitements, et de recevoir vos données dans un format structuré (portabilité). Pour exercer ces droits, contactez privacy@meditrackr.ca.",
    },
    {
      title: "7. Témoins (cookies)",
      body: "MediTrackr utilise des témoins de session strictement nécessaires au fonctionnement de l'authentification. Aucun témoin publicitaire ou de traçage n'est utilisé.",
    },
    {
      title: "8. Services tiers",
      body: "MediTrackr intègre Stripe (paiements) et Resend (courriels transactionnels). Ces prestataires sont soumis à leurs propres politiques de confidentialité et traitent uniquement les données nécessaires à la fourniture de leurs services. Aucune donnée médicale n'est transmise à ces tiers.",
    },
    {
      title: "9. Modifications",
      body: "Toute modification substantielle à cette politique sera communiquée par courriel 30 jours avant son entrée en vigueur. L'utilisation continue du service après ce délai constitue une acceptation des nouvelles conditions.",
    },
    {
      title: "10. Contact",
      body: "Pour toute question relative à la confidentialité : privacy@meditrackr.ca — MediTrackr, Montréal, Québec, Canada.",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20">

        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-primary transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest font-bold text-primary/60 mb-2">MediTrackr</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">Politique de confidentialité</h1>
          <p className="text-sm text-white/30">Dernière mise à jour : {new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl mb-10">
          <p className="text-sm text-white/60 leading-relaxed">
            MediTrackr est conçu pour les professionnels de santé canadiens. Cette politique est conforme à la <strong className="text-white/80">Loi 25 (Québec)</strong> et à la <strong className="text-white/80">LPRPDE fédérale</strong>.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map(({ title, body }) => (
            <div key={title} className="border-b border-white/5 pb-8">
              <h2 className="text-base font-bold text-primary mb-3">{title}</h2>
              <p className="text-sm text-white/50 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-sm text-white/20 hover:text-white/50 transition-colors">
            © {new Date().getFullYear()} MediTrackr — Conçu au Canada
          </Link>
        </div>
      </div>
    </main>
  );
}
