import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | MediTrackr",
  description: "Our commitment to protecting your personal information under Quebec Law 25",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-16 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Last Updated: February 3, 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              1. Introduction
            </h2>
            <p className="text-slate-700 leading-relaxed">
              MediTrackr (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting the privacy
              and security of your personal information. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information in compliance with
              Quebec&apos;s <strong>Law 25</strong> (Act Respecting the Protection of Personal
              Information in the Private Sector) and applicable Canadian privacy legislation.
            </p>
          </section>

          {/* What We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              2. Information We Collect
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              We collect the following types of personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>
                <strong>Account Information:</strong> Name, email, phone, professional
                designation (e.g., Dr., prefix)
              </li>
              <li>
                <strong>Patient Information:</strong> Patient names, health card numbers (RAMQ),
                service dates, diagnoses, procedure codes
              </li>
              <li>
                <strong>Financial Information:</strong> Invoice amounts, payment records, expense
                data (no credit card numbers are stored by us)
              </li>
              <li>
                <strong>Usage Data:</strong> Login times, IP addresses, device information,
                features accessed
              </li>
              <li>
                <strong>Health Card Images (Temporary):</strong> OCR scanning of health cards
                (images are immediately deleted after processing)
              </li>
            </ul>
          </section>

          {/* How We Use It */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Provide medical billing and claims management services</li>
              <li>Process payments and reimbursements</li>
              <li>Communicate with you about your account</li>
              <li>Comply with legal and regulatory obligations</li>
              <li>Improve our services and develop new features</li>
              <li>Detect and prevent fraud or unauthorized access</li>
            </ul>
          </section>

          {/* Data Residency */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              4. Data Residency & Security
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              <strong>🇨🇦 Your data is stored exclusively in Canada.</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Database hosting: Supabase (Canadian region)</li>
              <li>Encryption at rest: AES-256</li>
              <li>Encryption in transit: TLS 1.3</li>
              <li>Access controls: Row-Level Security (RLS) policies</li>
              <li>
                Health card images: Immediately deleted from memory after OCR processing
                (via <code>global.gc()</code>)
              </li>
            </ul>
          </section>

          {/* Third Parties */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              5. Third-Party Service Providers
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              We work with the following trusted vendors, all of whom have committed to
              Law 25 compliance via Data Processing Agreements (DPAs):
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>
                <strong>Supabase:</strong> Database and authentication (Canadian region)
              </li>
              <li>
                <strong>Stripe:</strong> Payment processing (Canadian entity)
              </li>
              <li>
                <strong>Mindee:</strong> Health card OCR (images processed in-memory, not
                stored)
              </li>
              <li>
                <strong>Resend:</strong> Transactional email delivery
              </li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          {/* Retention */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              6. Data Retention
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              We retain your information only as long as necessary:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>
                <strong>Invoices & Claims:</strong> 7 years (required by CRA and medical
                record laws)
              </li>
              <li>
                <strong>Account Information:</strong> Until you request deletion
              </li>
              <li>
                <strong>Usage Logs:</strong> 90 days
              </li>
              <li>
                <strong>Deleted Accounts:</strong> 30-day grace period, then permanently
                deleted
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              7. Your Rights Under Law 25
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              You have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>
                <strong>Right to Access:</strong> Request a copy of all personal information
                we hold about you
              </li>
              <li>
                <strong>Right to Rectification:</strong> Correct inaccurate or incomplete data
              </li>
              <li>
                <strong>Right to Deletion:</strong> Request deletion of your account and
                associated data
              </li>
              <li>
                <strong>Right to Portability:</strong> Receive your data in a structured,
                machine-readable format
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Revoke your consent at any time
                (may limit service availability)
              </li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-4">
              To exercise these rights, email us at{" "}
              <a
                href="mailto:privacy@meditrackr.com"
                className="text-blue-600 hover:underline"
              >
                privacy@meditrackr.com
              </a>{" "}
              or use the tools in your account settings.
            </p>
          </section>

          {/* Breach Notification */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              8. Data Breach Notification
            </h2>
            <p className="text-slate-700 leading-relaxed">
              In the event of a security breach that poses a risk to your rights and
              freedoms, we will notify you and the Commission d&apos;accès à l&apos;information du
              Québec (CAI) within 72 hours, as required by Law 25.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              9. Changes to This Policy
            </h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes via email or a prominent notice in the application. Your
              continued use of MediTrackr after changes constitutes acceptance.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              10. Contact Us
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
              <p className="text-slate-700 leading-relaxed">
                <strong>Privacy Officer:</strong> [Your Name]
                <br />
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:privacy@meditrackr.com"
                  className="text-blue-600 hover:underline"
                >
                  privacy@meditrackr.com
                </a>
                <br />
                <strong>Address:</strong> [Your Business Address]
                <br />
                <strong>Phone:</strong> [Your Phone Number]
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                If you have a complaint about how we handle your personal information, you
                may also contact the{" "}
                <strong>Commission d&apos;accès à l&apos;information du Québec (CAI)</strong>:
                <br />
                Phone: 1-888-528-7741
                <br />
                Website:{" "}
                <a
                  href="https://www.cai.gouv.qc.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  www.cai.gouv.qc.ca
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            This Privacy Policy is governed by the laws of Quebec and Canada.
          </p>
        </div>
      </div>
    </div>
  );
}
