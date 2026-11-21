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
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [personas, setPersonas] = useState<CombinedPersona[]>(
    STANDARD_AUDIENCES as unknown as CombinedPersona[]
  );

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
