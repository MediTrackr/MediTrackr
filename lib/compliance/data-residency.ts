export function verifyDataResidency() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isSupabaseCanadian = supabaseUrl?.includes('.ca') || 
                              supabaseUrl?.includes('canada') ||
                              supabaseUrl?.includes('toronto') ||
                              supabaseUrl?.includes('montreal');
  
  if (!isSupabaseCanadian) {
    console.warn('?? LAW 25 WARNING: Supabase may not be in Canadian region');
  }
  
  return {
    supabase: { compliant: isSupabaseCanadian, region: supabaseUrl },
    stripe: { note: 'Verify Stripe account is set to Canada in Dashboard' }
  };
}
