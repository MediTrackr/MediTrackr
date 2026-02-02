import { Resend } from 'resend';

// Initializing Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a Law 25 compliant transaction receipt for Meditrackr.
 * This function is called by your Stripe Webhook.
 */
export async function sendReceiptEmail(data: {
  to: string;
  patientName: string;
  amount: number;
  invoiceId: string;
  transactionId: string;
}) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      // 🛡️ Ensure this domain matches the one you just verified in Resend
      from: 'MediTrackr Billing <billing@meditrackr.ca>', 
      to: [data.to],
      subject: `Reçu de paiement - Facture #${data.invoiceId.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #00d9ff; border-radius: 12px;">
          <h1 style="color: #00d9ff; margin-bottom: 10px;">MediTrackr</h1>
          <p>Bonjour <strong>${data.patientName}</strong>,</p>
          <p>Votre paiement a été traité avec succès.</p>
          
          <div style="background: #f4f7f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Montant :</strong> $${data.amount.toFixed(2)} CAD</p>
            <p style="margin: 5px 0;"><strong>No. Facture :</strong> #${data.invoiceId.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>No. Transaction :</strong> ${data.transactionId}</p>
          </div>

          <p style="font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
            <strong>Loi 25 Compliance:</strong> This receipt contains no clinical data or diagnostic information to protect your privacy.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('📧 [RESEND ERROR]:', error);
      return { success: false, error };
    }

    return { success: true, data: emailData };
  } catch (err) {
    console.error('📧 [CRITICAL EMAIL FAIL]:', err);
    return { success: false, error: err };
  }
}