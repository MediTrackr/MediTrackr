import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/privacy/export
 * 
 * Law 25 Article 27: Right to Access
 * Exports all personal data for the authenticated user in JSON format.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all user data across tables
    const [
      profileRes,
      invoicesRes,
      paymentsRes,
      expensesRes,
      ramqClaimsRes,
      federalClaimsRes,
      oopClaimsRes,
      diplomaticClaimsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("invoices").select("*").eq("user_id", user.id),
      supabase.from("payments").select("*").eq("user_id", user.id),
      supabase.from("expenses").select("*").eq("user_id", user.id),
      supabase.from("ramq_claims").select("*").eq("user_id", user.id),
      supabase.from("federal_claims").select("*").eq("user_id", user.id),
      supabase.from("out_of_province_claims").select("*").eq("user_id", user.id),
      supabase.from("diplomatic_claims").select("*").eq("user_id", user.id),
    ]);

    // Assemble export package
    const exportData = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: profileRes.data,
      invoices: invoicesRes.data || [],
      payments: paymentsRes.data || [],
      expenses: expensesRes.data || [],
      claims: {
        ramq: ramqClaimsRes.data || [],
        federal: federalClaimsRes.data || [],
        out_of_province: oopClaimsRes.data || [],
        diplomatic: diplomaticClaimsRes.data || [],
      },
      metadata: {
        total_invoices: invoicesRes.data?.length || 0,
        total_payments: paymentsRes.data?.length || 0,
        total_expenses: expensesRes.data?.length || 0,
        total_claims:
          (ramqClaimsRes.data?.length || 0) +
          (federalClaimsRes.data?.length || 0) +
          (oopClaimsRes.data?.length || 0) +
          (diplomaticClaimsRes.data?.length || 0),
      },
      notice:
        "This export contains all personal information MediTrackr holds about you as of the export date. If you have questions, contact privacy@meditrackr.com.",
    };

    // Log the access (Law 25 compliance)
    await supabase.from("access_logs").insert({
      user_id: user.id,
      action: "DATA_EXPORT",
      resource: "all_user_data",
      ip_address: null, // You can extract from request headers if needed
    });

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="meditrackr-data-export-${user.id}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
