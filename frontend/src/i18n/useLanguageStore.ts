import { create } from 'zustand';

export type Language = 'vi' | 'en';

interface LanguageState {
  lang: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const STORAGE_KEY = 'hospital_hrms_lang';

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'vi';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'vi' || saved === 'en') {
    return saved;
  }
  return 'vi';
};

const syncDocumentLang = (lang: Language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
};

const initialLang = getInitialLanguage();
syncDocumentLang(initialLang);

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: initialLang,
  setLanguage: (lang: Language) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
    syncDocumentLang(lang);
    set({ lang });
  },
  toggleLanguage: () => {
    set((state) => {
      const next: Language = state.lang === 'vi' ? 'en' : 'vi';
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next);
      }
      syncDocumentLang(next);
      return { lang: next };
    });
  },
}));

