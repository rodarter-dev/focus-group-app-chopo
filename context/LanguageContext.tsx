import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UILanguage = 'es' | 'en';

const STORAGE_KEY = 'chopo_ui_lang';

let currentGlobalLanguage: UILanguage = 'es';

export const getCurrentLanguage = (): UILanguage => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'es' || saved === 'en') {
        currentGlobalLanguage = saved;
        return saved;
      }
    }
  } catch (e) {
    // Ignore storage read errors
  }
  return currentGlobalLanguage;
};

interface LanguageContextType {
  language: UILanguage;
  setLanguage: (lang: UILanguage) => void;
  toggleLanguage: () => void;
  t: (esText: string, enText: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<UILanguage>(() => getCurrentLanguage());

  const setLanguage = (lang: UILanguage) => {
    currentGlobalLanguage = lang;
    setLanguageState(lang);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, lang);
      }
    } catch (e) {
      // Ignore storage write errors
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  useEffect(() => {
    currentGlobalLanguage = language;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, language);
      }
    } catch (e) {
      // Ignore storage write errors
    }
  }, [language]);

  const t = (esText: string, enText: string): string => {
    return language === 'es' ? esText : enText;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
