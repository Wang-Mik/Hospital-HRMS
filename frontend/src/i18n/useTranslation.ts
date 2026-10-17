import { useLanguageStore, type Language } from './useLanguageStore';
import { translations, type TranslationKey } from './translations';

export const useTranslation = () => {
  const { lang, setLanguage, toggleLanguage } = useLanguageStore();

  const t = (key: TranslationKey | string, fallback?: string): string => {
    const currentDict = translations[lang] as Record<string, string>;
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    const defaultDict = translations.vi as Record<string, string>;
    if (defaultDict && defaultDict[key]) {
      return defaultDict[key];
    }
    return fallback !== undefined ? fallback : key;
  };

  return {
    t,
    lang,
    setLanguage,
    toggleLanguage,
    isVietnamese: lang === 'vi',
  };
};
