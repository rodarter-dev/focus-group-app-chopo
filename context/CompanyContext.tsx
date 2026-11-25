import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CompanyContextType {
  name: string;
  description: string;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  saveContext: (name: string, description: string) => Promise<void>;
  loadLast: () => Promise<void>;
  isLoaded: boolean;
}

const DEFAULT_NAME = 'Laboratorio Médico del Chopo';
const DEFAULT_DESCRIPTION =
  'Laboratorio Médico del Chopo (Grupo PROA) — Red líder de diagnóstico clínico e imagenología en México. Comunicación estructurada en tres segmentos oficiales: Pacientes B2C (prevención accesible, calidez en el servicio, indicaciones claras de preparación y entrega digital en App Chopo), Médicos B2D (rigor analítico acreditado, precisión diagnóstica para especialistas y tiempos de respuesta oportunos) y Empresas B2B (programas de salud ocupacional, convenios corporativos y cobertura nacional), en estricto apego al Manual de Marca V4 y la regulación sanitaria de COFEPRIS.';

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [name, setName] = useState<string>(DEFAULT_NAME);
  const [description, setDescription] = useState<string>(DEFAULT_DESCRIPTION);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from filesystem on mount
  useEffect(() => {
    loadLast();
  }, []);

  const loadLast = async () => {
    try {
      const response = await fetch('/api/load-run/company_context');
      if (response.ok) {
        const data = await response.json();
        const rawName = typeof data?.name === 'string' ? data.name : '';
        const rawDesc = typeof data?.description === 'string' ? data.description : '';
        const isStaleOrEnglish =
          rawName.toLowerCase().includes('qvc') ||
          rawName.toLowerCase() === 'chopo diagnostics' ||
          rawName.toLowerCase() === 'laboratorios chopo' ||
          rawDesc.includes('Leading clinical laboratory') ||
          rawDesc.includes('Dual strategic focus') ||
          rawDesc.includes('Pista Médico B2B');
        if (isStaleOrEnglish) {
          setName(DEFAULT_NAME);
          setDescription(DEFAULT_DESCRIPTION);
        } else {
          if (rawName) setName(rawName);
          if (rawDesc) setDescription(rawDesc);
        }
      }
    } catch (e) {
      console.error("Error loading company context from filesystem:", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveContext = async (newName: string, newDesc: string) => {
    try {
      const response = await fetch('/api/save-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureId: 'company_context',
          data: { name: newName, description: newDesc }
        })
      });
      if (response.ok) {
        setName(newName);
        setDescription(newDesc);
      } else {
        throw new Error("Failed to save company context");
      }
    } catch (e) {
      console.error("Error saving company context to filesystem:", e);
      throw e;
    }
  };

  return (
    <CompanyContext.Provider value={{ 
      name, 
      description, 
      setName, 
      setDescription, 
      saveContext, 
      loadLast,
      isLoaded 
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompanyContext = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
};
