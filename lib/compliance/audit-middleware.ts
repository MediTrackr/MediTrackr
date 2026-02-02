import { createClient } from '@/utils/supabase/server';

interface AuditLogEntry {
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'VIEW';
  reason?: string;
}

export async function logAuditTrail(entry: AuditLogEntry, request: Request) {
  const supabase = createClient();
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    await supabase.from('audit_log').insert({
      table_name: entry.table_name,
      record_id: entry.record_id,
      action: entry.action,
      reason: entry.reason || 'User action',
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('[AUDIT LOG ERROR]', error);
  }
}
