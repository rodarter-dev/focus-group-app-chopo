import React, { createContext, useContext, ReactNode } from 'react';

export type UILanguage = 'es' | 'en';

const FIXED_LANGUAGE: UILanguage = 'es';

export const getCurrentLanguage = (): UILanguage => FIXED_LANGUAGE;

interface LanguageContextType {
  language: UILanguage;
  setLanguage: (lang: UILanguage) => void;
  toggleLanguage: () => void;
  t: (esText: string, enText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const noopSetLanguage = (_lang: UILanguage): void => {
  // Language is permanently locked to Mexican Spanish ('es')
};

const noopToggleLanguage = (): void => {
  // Language is permanently locked to Mexican Spanish ('es')
};

const translateSpanishOnly = (esText: string, _enText?: string): string => esText;

const FIXED_LANGUAGE_CONTEXT_VALUE: LanguageContextType = {
  language: FIXED_LANGUAGE,
  setLanguage: noopSetLanguage,
  toggleLanguage: noopToggleLanguage,
  t: translateSpanishOnly,
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LanguageContext.Provider value={FIXED_LANGUAGE_CONTEXT_VALUE}>
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
