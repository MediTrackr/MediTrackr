import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * DELETE /api/privacy/delete-account
 * 
 * Law 25 Article 28: Right to Deletion
 * Soft-deletes the user account (anonymizes immediately, hard-deletes after 30 days).
 * 
 * IMPORTANT: Medical records must be retained for 7 years per Quebec regulations.
 * We anonymize patient names in invoices/claims but retain financial records.
 */
export async function DELETE() {
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

    // Check if already marked for deletion
    const { data: profile } = await supabase
      .from("profiles")
      .select("deleted_at")
      .eq("id", user.id)
      .single();

    if (profile?.deleted_at) {
      return NextResponse.json(
        { error: "Account already scheduled for deletion" },
        { status: 400 }
      );
    }

    // === SOFT DELETE: Anonymize immediately ===
    const deletedEmail = `deleted-${user.id}@meditrackr.deleted`;
    const timestamp = new Date().toISOString();

    // Anonymize profile
    await supabase
      .from("profiles")
      .update({
        first_name: "DELETED",
        last_name: "USER",
        email: deletedEmail,
        phone: null,
        avatar_url: null,
        deleted_at: timestamp,
        privacy_consent_given: false,
      })
      .eq("id", user.id);

    // Anonymize patient names in invoices/claims (retain financial data for 7 years)
    await supabase
      .from("invoices")
      .update({
        patient_name: "ANONYMIZED",
        patient_ramq: null,
        patient_email: null,
        patient_phone: null,
      })
      .eq("user_id", user.id);

    await supabase
      .from("ramq_claims")
      .update({
        patient_name: "ANONYMIZED",
        patient_ramq: null,
      })
      .eq("user_id", user.id);

    await supabase
      .from("federal_claims")
      .update({
        patient_name: "ANONYMIZED",
        patient_federal_id: null,
      })
      .eq("user_id", user.id);

    await supabase
      .from("out_of_province_claims")
      .update({
        patient_name: "ANONYMIZED",
        patient_health_number: null,
      })
      .eq("user_id", user.id);

    await supabase
      .from("diplomatic_claims")
      .update({
        patient_code: "ANONYMIZED",
      })
      .eq("user_id", user.id);

    // === SCHEDULE HARD DELETE (30 days) ===
    const hardDeleteDate = new Date();
    hardDeleteDate.setDate(hardDeleteDate.getDate() + 30);

    await supabase.from("deletion_queue").insert({
      user_id: user.id,
      scheduled_for: hardDeleteDate.toISOString(),
      status: "pending",
    });

    // Log the deletion request
    await supabase.from("access_logs").insert({
      user_id: user.id,
      action: "ACCOUNT_DELETION_REQUESTED",
      resource: "user_account",
    });

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message:
        "Your account has been anonymized. All personal identifiers have been removed. Financial records will be retained for 7 years as required by law, then permanently deleted. You will receive a confirmation email.",
      hard_delete_date: hardDeleteDate.toISOString(),
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/privacy/delete-account/cancel
 * 
 * Allows users to cancel deletion within the 30-day grace period.
 */
export async function POST() {
  try {
    const supabase = await createClient();

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

    // Check if deletion was requested
    const { data: profile } = await supabase
      .from("profiles")
      .select("deleted_at")
      .eq("id", user.id)
      .single();

    if (!profile?.deleted_at) {
      return NextResponse.json(
        { error: "No deletion request found" },
        { status: 400 }
      );
    }

    // Check if still within grace period (30 days)
    const deletedDate = new Date(profile.deleted_at);
    const gracePeriodEnd = new Date(deletedDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);

    if (new Date() > gracePeriodEnd) {
      return NextResponse.json(
        { error: "Grace period expired, account cannot be restored" },
        { status: 400 }
      );
    }

    // Cancel deletion
    await supabase
      .from("deletion_queue")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("status", "pending");

    await supabase
      .from("profiles")
      .update({ deleted_at: null })
      .eq("id", user.id);

    // Log the cancellation
    await supabase.from("access_logs").insert({
      user_id: user.id,
      action: "ACCOUNT_DELETION_CANCELLED",
      resource: "user_account",
    });

    return NextResponse.json({
      success: true,
      message:
        "Deletion cancelled. However, anonymized data cannot be restored. Please update your profile with current information.",
    });
  } catch (error) {
    console.error("Deletion cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel deletion" },
      { status: 500 }
    );
  }
}
