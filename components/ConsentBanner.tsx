"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';

export default function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const supabase = createClient();

  useEffect(() => { checkConsent(); }, []);

  async function checkConsent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('privacy_consent_given').eq('id', user.id).single();
    if (!profile?.privacy_consent_given) { setShowBanner(true); }
  }

  async function giveConsent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ privacy_consent_given: true, privacy_consent_date: new Date().toISOString() }).eq('id', user.id);
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary/95 backdrop-blur-xl border-t border-white/10 p-6 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 text-black">
          <h3 className="text-lg font-bold mb-2">Protection de vos données personnelles (Loi 25)</h3>
          <p className="text-sm">Vos données sont hébergées au Canada et gérées conformément à la Loi 25.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={giveConsent} className="bg-black text-primary">J'accepte</Button>
        </div>
      </div>
    </div>
  );
}
