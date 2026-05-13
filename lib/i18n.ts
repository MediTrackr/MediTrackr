'use client';

import { useState, useEffect } from 'react';

export type Lang = 'fr' | 'en';

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    const stored = document.cookie.split('; ').find(r => r.startsWith('lang='))?.split('=')[1];
    if (stored === 'en' || stored === 'fr') setLangState(stored as Lang);
  }, []);

  const setLang = (l: Lang) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000`;
    setLangState(l);
  };

  return [lang, setLang];
}
