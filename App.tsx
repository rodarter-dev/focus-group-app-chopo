import React, { useState, useEffect } from 'react';
import { brandConfig } from './config';
import { AppMode, CombinedPersona } from './types';
import { Navigation } from './components/Navigation';
import { AudienceGenerator } from './components/AudienceGenerator';
import { MarketingBrief } from './components/MarketingBrief';
import { SyntheticChat } from './components/SyntheticChat';
import { SyntheticTesting } from './components/SyntheticTesting';
import { Home } from './components/Home';
import { SyntheticUsers } from './components/SyntheticUsers';
import { BrandManualView } from './components/BrandManualView';
import { STANDARD_AUDIENCES } from './data/simulationData';
import { CompanyProvider } from './context/CompanyContext';
import { LanguageProvider } from './context/LanguageContext';

const MODE_TO_HASH: Record<AppMode, string> = {
  [AppMode.HOME]: '#/inicio',
  [AppMode.AUDIENCE_GEN]: '#/audiencias',
  [AppMode.SYNTHETIC_USERS]: '#/usuarios-sinteticos',
  [AppMode.MARKETING_BRIEF]: '#/brief',
  [AppMode.SYNTHETIC_FOCUS_GROUP]: '#/focus-group',
  [AppMode.SYNTHETIC_CHAT]: '#/chat',
  [AppMode.BRAND_MANUAL]: '#/manual-de-marca',
};

const HASH_TO_MODE: Record<string, AppMode> = Object.entries(MODE_TO_HASH).reduce(
  (acc, [modeKey, hashVal]) => {
    acc[hashVal] = modeKey as AppMode;
    return acc;
  },
  {} as Record<string, AppMode>
);

const ACTIVE_MODE_STORAGE_KEY = 'chopo_active_mode';

function resolveInitialMode(): AppMode {
  if (typeof window === 'undefined') return AppMode.HOME;
  const normalizedHash = window.location.hash.trim().toLowerCase();
  if (normalizedHash && HASH_TO_MODE[normalizedHash]) {
    return HASH_TO_MODE[normalizedHash];
  }
  try {
    const saved = window.sessionStorage.getItem(ACTIVE_MODE_STORAGE_KEY) as AppMode | null;
    if (saved && Object.values(AppMode).includes(saved)) {
      return saved;
    }
  } catch {
    // Ignore restricted storage environments
  }
  return AppMode.HOME;
}

function App() {
  return (
    <LanguageProvider>
      <CompanyProvider>
        <AppContent />
      </CompanyProvider>
    </LanguageProvider>
  );
}

function AppContent() {
  const [mode, setModeState] = useState<AppMode>(resolveInitialMode);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [personas, setPersonas] = useState<CombinedPersona[]>(
    STANDARD_AUDIENCES as unknown as CombinedPersona[]
  );

  const setMode = (nextMode: AppMode) => {
    setModeState(nextMode);
    try {
      window.sessionStorage.setItem(ACTIVE_MODE_STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage errors
    }
    const targetHash = MODE_TO_HASH[nextMode] || '#/inicio';
    if (typeof window !== 'undefined' && window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  useEffect(() => {
    const targetHash = MODE_TO_HASH[mode] || '#/inicio';
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
    try {
      window.sessionStorage.setItem(ACTIVE_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
  }, [mode]);

  useEffect(() => {
    const handleHashChange = () => {
      const normalizedHash = window.location.hash.trim().toLowerCase();
      const matched = HASH_TO_MODE[normalizedHash];
      if (matched) {
        setModeState(matched);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    document.title = brandConfig.meta.title;

    // Load audiences from /api/config/personas as the single authoritative source
    const loadAudiences = async () => {
      try {
        const configRes = await fetch('/api/config/personas');
        if (configRes.ok) {
          const configData = await configRes.json();
          const configPersonas: CombinedPersona[] | null = Array.isArray(configData)
            ? configData
            : Array.isArray(configData?.personas)
              ? configData.personas
              : null;
          if (configPersonas !== null) {
            setPersonas(configPersonas);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not load /api/config/personas:", err);
      }

      try {
        const res = await fetch('/api/load-run/audience_generator');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.personas)) {
            setPersonas(data.personas);
          }
        }
      } catch (err) {
        console.warn("No saved audience run found:", err);
      }
    };
    loadAudiences();
  }, []);

  const renderContent = () => {
    switch (mode) {
      case AppMode.AUDIENCE_GEN:
        return (
          <AudienceGenerator
            personas={personas}
            setPersonas={setPersonas}
            setMode={setMode}
          />
        );
      case AppMode.MARKETING_BRIEF:
        return <MarketingBrief setMode={setMode} />;
      case AppMode.SYNTHETIC_CHAT:
        return <SyntheticChat />;
      case AppMode.SYNTHETIC_USERS:
        return <SyntheticUsers personas={personas} setMode={setMode} />;
      case AppMode.SYNTHETIC_FOCUS_GROUP:
        return <SyntheticTesting setMode={setMode} />;
      case AppMode.BRAND_MANUAL:
        return <BrandManualView />;
      case AppMode.HOME:
      default:
        return (
          <Home setMode={setMode} />
        );
    }
  };

  return (
    <div className="app-container font-sans">
      <Navigation
        currentMode={mode}
        setMode={setMode}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className={`
        main-content p-4 md:p-8 transition-all duration-300
        mt-16 md:mt-0
      `}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
