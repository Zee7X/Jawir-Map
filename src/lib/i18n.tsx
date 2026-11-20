'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ID, ID_PATTERNS } from '@/lib/i18n-id';

// The UI is written in Javanese (ngoko); Javanese strings are the keys and ID maps them to Indonesian.
// A string with no entry falls back to Javanese, so a missed translation never shows a blank.
export type Lang = 'jv' | 'id';

const LANG_KEY = 'jawir_lang';

type Vars = Record<string, string | number>;

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function translate(lang: Lang, jv: string, vars?: Vars): string {
  return fill(lang === 'id' ? ID[jv] ?? jv : jv, vars);
}

// Messages coming from the API: exact entries first, then patterns with numbers, then "Label: reason" pairs.
export function translateMessage(lang: Lang, msg: string): string {
  if (lang === 'jv' || !msg) return msg;
  if (ID[msg]) return ID[msg];
  for (const [re, out] of ID_PATTERNS) if (re.test(msg)) return msg.replace(re, out);
  const i = msg.indexOf(': ');
  if (i > 0) {
    const head = msg.slice(0, i);
    const tail = msg.slice(i + 2);
    if (ID[head] || ID[tail]) return `${ID[head] ?? head}: ${ID[tail] ?? tail}`;
  }
  return msg;
}

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (jv: string, vars?: Vars) => string;
  tm: (msg: string) => string;
}

const LangContext = createContext<LangState>({
  lang: 'jv',
  setLang: () => {},
  t: (jv, vars) => fill(jv, vars),
  tm: (m) => m,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('jv');

  useEffect(() => {
    try {
      if (localStorage.getItem(LANG_KEY) === 'id') setLangState('id');
    } catch {
      // storage blocked: stay in Javanese
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // storage blocked: the choice lasts for this visit
    }
  }, []);

  const value = useMemo<LangState>(
    () => ({
      lang,
      setLang,
      t: (jv, vars) => translate(lang, jv, vars),
      tm: (msg) => translateMessage(lang, msg),
    }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangState {
  return useContext(LangContext);
}
