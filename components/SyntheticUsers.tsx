import React, { useState } from 'react';
import { generateSyntheticUsersBatch } from '../services/geminiService';
import { RotateCcw, UserPlus, Brain, Target, Compass, Smartphone, ShieldCheck, Trash2 } from 'lucide-react';
import { AppMode, CombinedPersona, SyntheticUserProfile } from '../types';
import { STANDARD_AUDIENCES, localizePersonaLabel } from '../data/simulationData';
import { useCompanyContext } from '../context/CompanyContext';
import { useLanguage } from '../context/LanguageContext';
import { resolveSegmentKey } from '../services/brandManualUtils';

interface SyntheticUsersProps {
  personas: CombinedPersona[];
  setMode?: (mode: AppMode) => void;
}

type SegmentCode = 'B2C' | 'B2D' | 'B2B';

const getSegmentMeta = (code: SegmentCode) => {
  if (code === 'B2D') {
    return {
      label: '🩺 Médico (B2D)',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
  if (code === 'B2B') {
    return {
      label: '🏢 Empresa (B2B)',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
  }
  return {
    label: '🏥 Paciente (B2C)',
    badgeClass: 'bg-blue-50 text-[#0066FF] border-blue-200'
  };
};

const formatDisplayLabel = (label: string): string =>
  label
    .replace(/\[Médico B2B\]/gi, '[Médico B2D]')
    .replace(/\(Médico B2B\)/gi, '(Médico B2D)')
    .replace(/Médico Prescriptor B2B/gi, 'Médico (B2D)')
    .replace(/Médico B2B/gi, 'Médico (B2D)');

export const SyntheticUsers: React.FC<SyntheticUsersProps> = ({ personas, setMode }) => {
  const { description: companyDescription } = useCompanyContext();
  const { language, t } = useLanguage();

  // Reflect the exact active audiences configured in 1. Audiencias (including deletions or additions)
  const allPersonas: CombinedPersona[] = Array.from(
    new Map(
      (Array.isArray(personas) ? personas : []).filter(p => p && p.name).map(p => [p.name, p])
    ).values()
  );

  const getPersonaSegmentCode = (p: CombinedPersona | any): SegmentCode => {
    if (!p) return 'B2C';
    const rawTrack = String(p.track || '').trim();
    const rawName = String(p.name || p.baseAudienceName || '');
    if (rawTrack === 'enterprise' || rawTrack === 'b2b_enterprises') return 'B2B';
    if (rawTrack === 'physician' || rawTrack === 'B2D' || rawTrack === 'b2d_doctors') return 'B2D';
    if (rawTrack === 'patient' || rawTrack === 'B2C' || rawTrack === 'b2c_patients') {
      if (/\[empresa|\bempresa\s*\(?b2b/i.test(rawName)) return 'B2B';
      if (/médico\s*b2[bd]|\[médico/i.test(rawName)) return 'B2D';
      return 'B2C';
    }
    const combinedText = `${rawName} ${p.personaName || ''} ${p.job_title || ''} ${p.details?.job_title || ''}`;
    if (rawTrack === 'B2B') {
      if (/médico|physician|oncólog|endocrin|ginecólog|especialista prescriptor|dr\.|dra\./i.test(combinedText)) {
        return 'B2D';
      }
      return 'B2B';
    }
    if (/\[paciente|paciente\s*\(?b2c/i.test(rawName)) return 'B2C';
    if (/\[médico|médico\s*\(?b2[bd]/i.test(rawName)) return 'B2D';
    if (/\[empresa|empresa\s*\(?b2b/i.test(rawName)) return 'B2B';
    const resolved = resolveSegmentKey(rawTrack);
    if (rawTrack && resolved === 'b2b_enterprises') return 'B2B';
    if (rawTrack && resolved === 'b2d_doctors') return 'B2D';
    if (/convenios?\s+empresarial|salud\s+ocupacional|corporativ|empresa\s*\(?b2b/i.test(combinedText)) return 'B2B';
    if (/médico|b2d|physician|oncólog|endocrin|ginecólog|especialista prescriptor|dr\.|dra\./i.test(combinedText)) return 'B2D';
    return 'B2C';
  };

  const standardNames = new Set(STANDARD_AUDIENCES.map(s => s.name));
  const customPersonas: CombinedPersona[] = allPersonas.filter(p => !standardNames.has(p.name));
  const mergedStandardPersonas: CombinedPersona[] = allPersonas.filter(p => standardNames.has(p.name));

  const [trackFilter, setTrackFilter] = useState<'ALL' | SegmentCode>('ALL');
  const [selectedPersonaNames, setSelectedPersonaNames] = useState<string[]>(() =>
    allPersonas.map(p => p.name)
  );
  const hasLoadedSavedSelectionRef = React.useRef<boolean>(false);
  const [count, setCount] = useState<number>(5);
  const [context, setContext] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedUsers, setGeneratedUsers] = useState<SyntheticUserProfile[]>([]);
  const [audienceContextModal, setAudienceContextModal] = useState<{name: string, bio: string} | null>(null);

  React.useEffect(() => {
    let hasPreselected = false;
    try {
      const preselected = localStorage.getItem('chopo_preselected_audience');
      if (preselected) {
        hasPreselected = true;
        hasLoadedSavedSelectionRef.current = true;
        setSelectedPersonaNames([preselected]);
        localStorage.removeItem('chopo_preselected_audience');
      }
    } catch {
      // Ignore localStorage access errors
    }

    const loadInitial = async () => {
      try {
        const res = await fetch('/api/load-run/synthetic_users');
        if (res.ok) {
          const data = await res.json();
          if (data.generatedUsers && data.generatedUsers.length > 0) {
            setGeneratedUsers(data.generatedUsers);
          }
          if (data.context) {
            setContext(data.context);
          }
          if (!hasPreselected) {
            const savedSelected: string[] =
              Array.isArray(data.selectedPersonaNames) && data.selectedPersonaNames.length > 0
                ? data.selectedPersonaNames
                : Array.isArray(data.generatedUsers) && data.generatedUsers.length > 0
                  ? Array.from(new Set(data.generatedUsers.map((u: any) => u.baseAudienceName).filter(Boolean)))
                  : [];
            if (savedSelected.length > 0) {
              hasLoadedSavedSelectionRef.current = true;
              setSelectedPersonaNames(savedSelected);
            }
          }
        }
      } catch (err) {
        // Ignore if no previous run exists
      }
    };
    loadInitial();
  }, []);

  const togglePersona = (name: string) => {
    setSelectedPersonaNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleGenerate = async () => {
    if (selectedPersonaNames.length === 0) return;
    
    setIsLoading(true);
    try {
      let allNewProfiles: SyntheticUserProfile[] = [];
      const selectedPersonasObjects = allPersonas.filter(p => selectedPersonaNames.includes(p.name));

      for (const basePersona of selectedPersonasObjects) {
        const batch = await generateSyntheticUsersBatch(basePersona, count, companyDescription, context);
        
        const newProfiles = batch.map((u: any, idx: number) => ({
          ...basePersona,
          id: `u_${basePersona.name.replace(/\s+/g, '_')}_${Date.now()}_${idx}`,
          baseAudienceName: basePersona.name,
          baseAudienceBio: basePersona.details?.bio || basePersona.bio,
          name: u.name || "Unknown",
          bio: u.bio || "No bio available.",
          demographics: u.demographics || "Unknown demographics",
          cognitiveStyle: u.cognitiveStyle,
          lifestyleFriction: u.lifestyleFriction,
          digitalFootprint: u.digitalFootprint,
          psychographicFlavor: u.psychographicFlavor
        }));
        
        allNewProfiles = [...allNewProfiles, ...newProfiles];
      }

      setGeneratedUsers(allNewProfiles);

      // Save run
      if (allNewProfiles.length > 0) {
        fetch('/api/save-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            featureId: 'synthetic_users',
            data: { generatedUsers: allNewProfiles, context, selectedPersonaNames }
          })
        }).catch(err => console.error("Failed to save synthetic users run:", err));
      }

    } catch (error) {
      console.error(error);
      alert(t("Error al generar usuarios sintéticos.", "Failed to generate synthetic users."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadLast = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/load-run/synthetic_users');
      if (!res.ok) throw new Error("No saved run found");
      const data = await res.json();

      if (data.generatedUsers) {
        setGeneratedUsers(data.generatedUsers);
      }
      if (data.context) {
        setContext(data.context);
      }
      const savedSelected: string[] =
        Array.isArray(data.selectedPersonaNames) && data.selectedPersonaNames.length > 0
          ? data.selectedPersonaNames
          : Array.isArray(data.generatedUsers) && data.generatedUsers.length > 0
            ? Array.from(new Set(data.generatedUsers.map((u: any) => u.baseAudienceName).filter(Boolean)))
            : [];
      if (savedSelected.length > 0) {
        hasLoadedSavedSelectionRef.current = true;
        setSelectedPersonaNames(savedSelected);
      }
    } catch (error) {
      console.warn(error);
      alert(t("No se encontró ninguna sesión anterior.", "No previous session found."));
    } finally {
      setIsLoading(false);
    }
  };

  const persistGeneratedUsers = (updatedUsers: SyntheticUserProfile[]) => {
    fetch('/api/save-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureId: 'synthetic_users',
        data: { generatedUsers: updatedUsers, context, selectedPersonaNames }
      })
    }).catch(err => console.error("Failed to save synthetic users run:", err));
  };

  const handleDeleteSingleUser = (indexToRemove: number) => {
    const updated = generatedUsers.filter((_, idx) => idx !== indexToRemove);
    setGeneratedUsers(updated);
    persistGeneratedUsers(updated);
  };

  const handleClearAllUsers = () => {
    setGeneratedUsers([]);
    persistGeneratedUsers([]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <UserPlus className="text-[#0066FF]" />
              <h1 className="page-title">{t('Usuarios Sintéticos', 'Synthetic Users')}</h1>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#003B7A] text-xs font-bold">
              <ShieldCheck size={14} className="text-[#78D600]" /> {t('Datos 100% Simulados (Sin datos reales de pacientes)', '100% Simulated Data (No real patient data)')}
            </span>
          </div>
          <p className="text-subtext mt-1">
            {t(
              'Genera pacientes (B2C), médicos (B2D) y tomadores de decisión empresariales (B2B) sintéticos altamente detallados basados en tus audiencias principales.'
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 bg-[#F8FAFC] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {isLoading && (
            <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#0066FF]/30 flex items-center justify-between gap-4 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0066FF] border-t-transparent shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#003B7A]">
                    {t('Generando perfiles sintéticos con IA...', 'Generating synthetic profiles with AI...')}
                  </p>
                  <p className="text-xs text-slate-600">
                    {t(
                      'La selección de audiencias y los campos de edición están bloqueados temporalmente hasta finalizar el proceso.',
                      'Audience selection and editing fields are temporarily locked until processing completes.'
                    )}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-white border border-blue-200 text-[11px] font-bold text-[#0066FF] shrink-0">
                {t('Edición Bloqueada', 'Editing Locked')}
              </span>
            </div>
          )}

          <div className={`content-card transition-opacity ${isLoading ? 'pointer-events-none opacity-65 select-none' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-heading">{t('Configuración de Generación', 'Generation Settings')}</h3>
              <div className="flex items-center gap-2">
                {generatedUsers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllUsers}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} /> {t('🗑️ Vaciar Usuarios Sintéticos', '🗑️ Clear Synthetic Users')}
                  </button>
                )}
                <button
                  onClick={handleLoadLast}
                  className="btn-ghost flex items-center gap-2 disabled:opacity-50"
                  disabled={isLoading}
                >
                  <RotateCcw size={16} /> {t('Cargar Último', 'Load Last')}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <label className="form-label mb-0">
                  {t('Seleccionar Perfiles Base (Paciente B2C / Médico B2D / Empresa B2B)')}
                  <span className="ml-2 text-xs font-bold text-[#0066FF]">
                    ({selectedPersonaNames.length} {t('seleccionados')} × {count} = {selectedPersonaNames.length * count} {t('usuarios a generar')})
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Track Filter Pills (Manual V4: B2C, B2D, B2B) */}
                  <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5 border border-slate-200 gap-0.5">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => setTrackFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                        trackFilter === 'ALL'
                          ? 'bg-[#003B7A] text-white shadow-sm'
                          : 'text-slate-600 hover:text-[#003B7A]'
                      }`}
                    >
                      {t('Todos')}
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => setTrackFilter('B2C')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                        trackFilter === 'B2C'
                          ? 'bg-[#0066FF] text-white shadow-sm'
                          : 'text-slate-600 hover:text-[#0066FF]'
                      }`}
                    >
                      {t('🏥 Solo Pacientes B2C')}
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => setTrackFilter('B2D')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                        trackFilter === 'B2D'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      {t('🩺 Solo Médicos B2D')}
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => setTrackFilter('B2B')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                        trackFilter === 'B2B'
                          ? 'bg-indigo-700 text-white shadow-sm'
                          : 'text-slate-600 hover:text-indigo-700'
                      }`}
                    >
                      {t('🏢 Solo Empresas B2B')}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setSelectedPersonaNames(allPersonas.map(p => p.name))}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#003B7A] transition-colors disabled:opacity-50"
                  >
                    {t('Seleccionar Todos')}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setSelectedPersonaNames([])}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors disabled:opacity-50"
                  >
                    {t('Limpiar Selección')}
                  </button>
                </div>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg bg-white grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Dynamic Custom Audiences */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('Audiencias Personalizadas')}</h4>
                  {customPersonas.filter(p => trackFilter === 'ALL' ? true : getPersonaSegmentCode(p) === trackFilter).length === 0 ? (
                    <div className="bg-[#EFF6FF] border border-blue-100 p-3 rounded-md text-sm text-slate-800">
                      <p className="font-semibold text-[#0066FF] mb-1">{t('No hay audiencias personalizadas adicionales en este filtro.')}</p>
                      <p className="text-slate-600 text-xs">{t('Cualquier segmento personalizado (B2C, B2D o B2B) que crees en la pestaña Audiencias o en Focus Group aparecerá aquí. Usa los Perfiles Base de Chopo a la derecha.')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customPersonas
                        .filter(p => trackFilter === 'ALL' ? true : getPersonaSegmentCode(p) === trackFilter)
                        .map((p, i) => {
                          const segMeta = getSegmentMeta(getPersonaSegmentCode(p));
                          return (
                            <label key={`dyn-${i}`} className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 transition-colors">
                              <input 
                                type="checkbox" 
                                disabled={isLoading}
                                className="w-4 h-4 mt-0.5 text-[#0066FF] rounded border-slate-300 focus:ring-[#0066FF] accent-[#0066FF] disabled:opacity-50"
                                checked={selectedPersonaNames.includes(p.name)}
                                onChange={() => togglePersona(p.name)}
                              />
                              <div className="min-w-0">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1 ${segMeta.badgeClass}`}>
                                  {segMeta.label}
                                </span>
                                <p className="font-medium text-sm text-slate-900 leading-snug">{formatDisplayLabel(localizePersonaLabel(p.name, language))}</p>
                                <p className="text-xs text-slate-500">{localizePersonaLabel(p.personaName, language)}</p>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Standard Personas */}
                <div className="md:border-l md:border-slate-100 md:pl-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('Perfiles Base de Chopo (B2C, B2D y B2B)')}</h4>
                  {mergedStandardPersonas.filter(p => trackFilter === 'ALL' ? true : getPersonaSegmentCode(p) === trackFilter).length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-md text-xs text-slate-600">
                      {t('No hay perfiles base en este segmento. Crea uno personalizado en el módulo Audiencias.')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mergedStandardPersonas
                        .filter(p => trackFilter === 'ALL' ? true : getPersonaSegmentCode(p) === trackFilter)
                        .map((p, i) => {
                          const segMeta = getSegmentMeta(getPersonaSegmentCode(p));
                          return (
                            <label key={`std-${i}`} className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 transition-colors">
                              <input 
                                type="checkbox" 
                                disabled={isLoading}
                                className="w-4 h-4 mt-0.5 text-[#0066FF] rounded border-slate-300 focus:ring-[#0066FF] accent-[#0066FF] disabled:opacity-50"
                                checked={selectedPersonaNames.includes(p.name)}
                                onChange={() => togglePersona(p.name)}
                              />
                              <div className="min-w-0">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1 ${segMeta.badgeClass}`}>
                                  {segMeta.label}
                                </span>
                                <p className="font-medium text-sm text-slate-900 leading-snug">{formatDisplayLabel(localizePersonaLabel(p.name, language))}</p>
                                <p className="text-xs text-slate-500">{localizePersonaLabel(p.personaName, language)}</p>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="md:col-span-1">
                <label className="form-label">{t('Usuarios por Segmento', 'Users to Generate')}</label>
                <select
                  disabled={isLoading}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="input-field disabled:opacity-60"
                >
                  <option value={1}>1 {t('Usuario', 'User')}</option>
                  <option value={2}>2 {t('Usuarios', 'Users')}</option>
                  <option value={3}>3 {t('Usuarios', 'Users')}</option>
                  <option value={5}>5 {t('Usuarios', 'Users')}</option>
                  <option value={10}>10 {t('Usuarios', 'Users')}</option>
                  <option value={15}>15 {t('Usuarios', 'Users')}</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="form-label">{t('Contexto Clínico Adicional (Opcional)', 'Additional Clinical Context (Optional)')}</label>
                <textarea
                  disabled={isLoading}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="input-field min-h-[42px] py-2 disabled:opacity-60"
                  placeholder={t("Agrega contexto específico para estos usuarios (ej. 'Enfocarse en pacientes con dudas sobre el ayuno para HbA1c y endocrinólogos en zonas metropolitanas').", "Add any specific context for these users (e.g. 'Focus on patients with questions about fasting requirements for HbA1c and endocrinologists in major metro areas').")}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={isLoading || selectedPersonaNames.length === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                    {t('Generando Perfiles...', 'Generating Profiles...')}
                  </div>
                ) : t("Generar Usuarios", "Generate Users")}
              </button>
            </div>
          </div>

          {generatedUsers.length > 0 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Next Step Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#EFF6FF] border border-blue-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={20} className="text-[#0066FF] shrink-0 mt-0.5" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[#003B7A]">
                        {t('Usuarios Sintéticos Generados', 'Generated Synthetic Users')} ({generatedUsers.length})
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-blue-200 text-[11px] font-bold text-[#0066FF]">
                        <span className="w-2 h-2 rounded-full bg-[#78D600]" />
                        {t('Sincronizado con Focus Group', 'Synced with Focus Group')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {t(
                        `Estos ${generatedUsers.length} usuarios sintéticos ya están listos como participantes activos para tu Focus Group (Promociones, Mensajes Clave, Email, Compra de Estudios, Imagen / Banner y A/B Test).`,
                        `These ${generatedUsers.length} synthetic users are ready as active participants across all Focus Group tabs (Promotions, Key Messages, Email, Study Purchase, Image / Banner, and A/B Test).`
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearAllUsers}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Trash2 size={15} />
                    <span>{t('🗑️ Borrar Todos', '🗑️ Clear All')}</span>
                  </button>
                  {setMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => setMode(AppMode.MARKETING_BRIEF)}
                        className="px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
                      >
                        {t('Siguiente Paso: 3. Crear Brief de Campaña ➔', 'Next Step: 3. Create Campaign Brief ➔')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode(AppMode.SYNTHETIC_FOCUS_GROUP)}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#003B7A] border border-blue-300 text-xs sm:text-sm font-bold shadow-sm transition-all"
                      >
                        {t('O ir directo a: 4. Evaluar en Focus Group ➔', 'Or jump straight to: 4. Evaluate in Focus Group ➔')}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {generatedUsers.map((user, idx) => {
                  const segMeta = getSegmentMeta(getPersonaSegmentCode(user));
                  const displayBaseName = formatDisplayLabel(localizePersonaLabel(user.baseAudienceName || user.name, language));
                  return (
                  <div key={idx} className="content-card">
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100 gap-3 flex-wrap">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl font-bold text-heading">{user.name}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${segMeta.badgeClass}`}>
                            {segMeta.label}
                          </span>
                        </div>
                        <p className="text-sm text-subtext font-medium">{user.demographics}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setAudienceContextModal({ name: displayBaseName, bio: user.baseAudienceBio || user.bio })}
                          className="px-3 py-1 bg-[#EFF6FF] hover:bg-blue-100 cursor-pointer transition-colors text-[#003B7A] text-xs rounded-full font-bold uppercase border border-blue-200"
                          aria-label="Ver contexto de audiencia"
                        >
                          {displayBaseName}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleUser(idx)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors"
                          title={t('Eliminar este usuario sintético')}
                        >
                          <Trash2 size={13} />
                          <span>{t('Eliminar')}</span>
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-slate-700 italic mb-6">"{user.bio}"</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {user.cognitiveStyle && (
                        <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                          <h5 className="font-bold flex items-center gap-2 text-[#0066FF] mb-3">
                            <Brain size={16} /> {t('Estilo Cognitivo', 'Cognitive Style')}
                          </h5>
                          <ul className="space-y-2 text-sm text-slate-700">
                            <li><span className="font-semibold text-slate-900">{t('Densidad de Info:', 'Info Density:')}</span> {user.cognitiveStyle.informationDensityPreference}</li>
                            <li><span className="font-semibold text-slate-900">{t('Señal de Confianza:', 'Trust Signal:')}</span> {user.cognitiveStyle.primaryTrustSignal}</li>
                            <li><span className="font-semibold text-slate-900">{t('Velocidad de Decisión:', 'Decision Velocity:')}</span> {user.cognitiveStyle.decisionVelocity}</li>
                            <li><span className="font-semibold text-slate-900">{t('Tolerancia al Riesgo:', 'Risk Tolerance:')}</span> {user.cognitiveStyle.riskTolerance}</li>
                          </ul>
                        </div>
                      )}

                      {user.lifestyleFriction && (
                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                          <h5 className="font-bold flex items-center gap-2 text-purple-700 mb-3">
                            <Target size={16} /> {t('Estilo de Vida y Fricción', 'Lifestyle & Friction')}
                          </h5>
                          <ul className="space-y-2 text-sm text-slate-700">
                            <li><span className="font-semibold text-slate-900">{t('Rutina Diaria:', 'Daily Grind:')}</span> {user.lifestyleFriction.dailyGrindContext}</li>
                            <li><span className="font-semibold text-slate-900">{t('Mentalidad Financiera:', 'Financial Mindset:')}</span> {user.lifestyleFriction.financialMindset}</li>
                            <li><span className="font-semibold text-slate-900">{t('Lealtad de Marca:', 'Brand Loyalty:')}</span> {user.lifestyleFriction.brandLoyaltyQuotient}</li>
                            <li><span className="font-semibold text-slate-900">{t('Dinámica Familiar:', 'Power Dynamic:')}</span> {user.lifestyleFriction.householdPowerDynamic}</li>
                          </ul>
                        </div>
                      )}

                      {user.digitalFootprint && (
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                          <h5 className="font-bold flex items-center gap-2 text-indigo-700 mb-3">
                            <Smartphone size={16} /> {t('Huella Digital', 'Digital Footprint')}
                          </h5>
                          <ul className="space-y-2 text-sm text-slate-700">
                            <li><span className="font-semibold text-slate-900">{t('Búsquedas Recientes:', 'Recent Searches:')}</span> {user.digitalFootprint.last3SearchQueries?.join(', ')}</li>
                            <li><span className="font-semibold text-slate-900">{t('Motivo de Baja:', 'Unsubscribe Trigger:')}</span> {user.digitalFootprint.unsubscribeTrigger}</li>
                            <li><span className="font-semibold text-slate-900">{t('Ecosistema:', 'Ecosystem:')}</span> {user.digitalFootprint.platformEcosystem}</li>
                            <li><span className="font-semibold text-slate-900">{t('Evento de Vida Reciente:', 'Recent Life Event:')}</span> {user.digitalFootprint.recentBigLifeEvent}</li>
                          </ul>
                        </div>
                      )}

                      {user.psychographicFlavor && (
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                          <h5 className="font-bold flex items-center gap-2 text-amber-700 mb-3">
                            <Compass size={16} /> {t('Perfil Psicográfico', 'Psychographic Flavor')}
                          </h5>
                          <ul className="space-y-2 text-sm text-slate-700">
                            <li><span className="font-semibold text-slate-900">{t('Su Gusto Especial:', 'The One Luxury:')}</span> {user.psychographicFlavor.theOneLuxury}</li>
                            <li><span className="font-semibold text-slate-900">{t('Aspiración vs Realidad:', 'Aspiration vs Reality:')}</span> {user.psychographicFlavor.aspirationVsReality}</li>
                            <li><span className="font-semibold text-slate-900">{t('Causa Social:', 'Social Cause:')}</span> {user.psychographicFlavor.socialCauseAlignment}</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Bottom Next Step Bar */}
              {setMode && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-blue-200 rounded-2xl p-5 shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-[#003B7A]">
                      {t('¿Listo para continuar con tu muestra de usuarios sintéticos?', 'Ready to continue with your synthetic user cohort?')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t('Genera un Brief de Campaña con IA o evalúa tus propias piezas directamente en el Focus Group.', 'Generate an AI Campaign Brief or evaluate your own creative pieces directly in the Focus Group.')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMode(AppMode.MARKETING_BRIEF)}
                      className="px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
                    >
                      {t('Siguiente Paso: 3. Crear Brief de Campaña ➔', 'Next Step: 3. Create Campaign Brief ➔')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode(AppMode.SYNTHETIC_FOCUS_GROUP)}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#003B7A] border border-blue-300 text-xs sm:text-sm font-bold shadow-sm transition-all"
                    >
                      {t('O ir directo a: 4. Evaluar en Focus Group ➔', 'Or jump straight to: 4. Evaluate in Focus Group ➔')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {audienceContextModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
            <button 
              onClick={() => setAudienceContextModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-heading mb-2">{audienceContextModal.name} — {t('Contexto', 'Context')}</h3>
            <p className="text-slate-700 leading-relaxed mb-6 whitespace-pre-line">{audienceContextModal.bio}</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAudienceContextModal(null)}
                className="btn-secondary"
              >
                {t('Cerrar', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
