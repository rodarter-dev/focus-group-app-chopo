import React, { useState, useEffect } from 'react';
import {
  generateSingleAudienceFromPrompt,
  generateImageFromPrompt
} from '../services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users,
  TrendingUp,
  Briefcase,
  RotateCcw,
  Shield,
  Settings,
  X,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  History,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Target,
  Camera
} from 'lucide-react';
import { AppMode, AudienceTrack, CombinedPersona } from '../types';
import { STANDARD_AUDIENCES } from '../data/simulationData';
import { useCompanyContext } from '../context/CompanyContext';
import { useLanguage } from '../context/LanguageContext';
import {
  TRACK_TO_SEGMENT_KEY,
  SEGMENT_KEY_TO_TRACK,
  resolveSegmentKey
} from '../services/brandManualUtils';

interface AudienceGeneratorProps {
  personas: CombinedPersona[];
  setPersonas: React.Dispatch<React.SetStateAction<CombinedPersona[]>>;
  setMode?: (mode: AppMode) => void;
}

export type AudienceSegmentCode = 'B2C' | 'B2D' | 'B2B';

const SEGMENT_OPTIONS: Array<{
  code: AudienceSegmentCode;
  track: AudienceTrack;
  label: string;
  shortLabel: string;
  hint: string;
  activeClass: string;
  inactiveClass: string;
  badgeClass: string;
}> = [
  {
    code: 'B2C',
    track: 'patient',
    label: '🏥 Paciente (B2C)',
    shortLabel: 'Paciente (B2C)',
    hint: 'Habla de Tú',
    activeClass: 'bg-[#0066FF] text-white shadow-sm',
    inactiveClass: 'text-slate-600 hover:text-[#003B7A]',
    badgeClass: 'bg-[#0066FF] text-white border-blue-400'
  },
  {
    code: 'B2D',
    track: 'physician',
    label: '🩺 Médico (B2D)',
    shortLabel: 'Médico (B2D)',
    hint: 'Habla de Tú respetuoso',
    activeClass: 'bg-emerald-600 text-white shadow-sm',
    inactiveClass: 'text-slate-600 hover:text-emerald-800',
    badgeClass: 'bg-emerald-600 text-white border-emerald-400'
  },
  {
    code: 'B2B',
    track: 'enterprise',
    label: '🏢 Empresa (B2B)',
    shortLabel: 'Empresa (B2B)',
    hint: 'Habla de Usted — Convenios y Salud Ocupacional',
    activeClass: 'bg-indigo-700 text-white shadow-sm',
    inactiveClass: 'text-slate-600 hover:text-indigo-800',
    badgeClass: 'bg-indigo-700 text-white border-indigo-400'
  }
];

const SEGMENT_CODE_TO_TRACK: Record<AudienceSegmentCode, AudienceTrack> = {
  B2C: SEGMENT_KEY_TO_TRACK.b2c_patients,
  B2D: SEGMENT_KEY_TO_TRACK.b2d_doctors,
  B2B: SEGMENT_KEY_TO_TRACK.b2b_enterprises
};

const QUICK_PROMPT_EXAMPLES: Array<{
  labelEs: string;
  prompt: string;
  track: AudienceSegmentCode;
}> = [
  {
    labelEs: '🩺 Médico general recién egresado que acaba de terminar su servicio social',
    prompt: 'Médico general recién egresado que acaba de terminar su servicio social y abre su primer consultorio particular buscando estudios diagnósticos confiables y accesibles para sus pacientes.',
    track: 'B2D'
  },
  {
    labelEs: '🩺 Oncólogo clínico enfocado en detección oportuna y biomarcadores',
    prompt: 'Oncólogo clínico o médico especialista en cáncer enfocado en detección oportuna, biomarcadores tumorales, estudios de imagen de alta resolución y seguimiento digital de pacientes.',
    track: 'B2D'
  },
  {
    labelEs: '🤰 Mujer embarazada primeriza buscando ultrasonido prenatal y control trimestral',
    prompt: 'Mujer embarazada primeriza buscando ultrasonido prenatal, estudios de control trimestral, trato cálido en sucursal y resultados digitales para compartir con su ginecólogo.',
    track: 'B2C'
  },
  {
    labelEs: '🏃‍♂️ Adulto joven deportista que monitorea su química sanguínea cada 6 meses',
    prompt: 'Adulto joven deportista que monitorea su química sanguínea de 45 elementos, perfil lipídico y biomarcadores cada 6 meses mediante la App Chopo sin hacer filas.',
    track: 'B2C'
  },
  {
    labelEs: '🏢 Directora de Recursos Humanos buscando convenios de check-ups anuales para 350 colaboradores',
    prompt: 'Directora de Recursos Humanos de una empresa mediana buscando convenios corporativos de check-ups anuales, salud ocupacional y facturación centralizada para 350 colaboradores.',
    track: 'B2B'
  },
  {
    labelEs: '🏢 Gerente de Seguridad e Higiene coordinando exámenes médicos de ingreso y periódicos',
    prompt: 'Gerente de Seguridad e Higiene en planta industrial coordinando convenios empresariales de exámenes médicos de ingreso, perfiles toxicológicos y seguimiento periódico de salud ocupacional.',
    track: 'B2B'
  }
];

export const getPersonaSegmentCode = (p: CombinedPersona | any): AudienceSegmentCode => {
  if (!p) return 'B2C';
  const rawTrack = String(p.track || '').trim();
  const rawName = String(p.name || '');

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

  if (/convenios?\s+empresarial|salud\s+ocupacional|corporativ|empresa\s*\(?b2b/i.test(combinedText)) {
    return 'B2B';
  }
  if (/médico|b2d|physician|oncólog|endocrin|ginecólog|especialista prescriptor|dr\.|dra\./i.test(combinedText)) {
    return 'B2D';
  }
  return 'B2C';
};

export const isPersonaB2B = (p: CombinedPersona | any): boolean => {
  return getPersonaSegmentCode(p) === 'B2B';
};

const formatDisplayPersonaName = (rawName?: string): string => {
  if (!rawName) return '';
  return rawName
    .replace(/\[Médico B2B\]/gi, '[Médico B2D]')
    .replace(/\(Médico B2B\)/gi, '(Médico B2D)')
    .replace(/Médico Prescriptor B2B/gi, 'Médico (B2D)')
    .replace(/Médico B2B/gi, 'Médico (B2D)');
};

export const AudienceGenerator: React.FC<AudienceGeneratorProps> = ({
  personas,
  setPersonas,
  setMode
}) => {
  const { description } = useCompanyContext();
  const { t } = useLanguage();

  const [selectedTrack, setSelectedTrack] = useState<AudienceSegmentCode>('B2C');
  const [promptInput, setPromptInput] = useState<string>('');
  const [trackFilter, setTrackFilter] = useState<'ALL' | AudienceSegmentCode>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [generatingPortraitKey, setGeneratingPortraitKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Version History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [versionsList, setVersionsList] = useState<any[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);

  // Edit Persona Modal State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    personaName: string;
    track: AudienceSegmentCode;
    age: number;
    income: string;
    job_title: string;
    demographics: string;
    bio: string;
    painPointsText: string;
    goalsText: string;
    preferredProductsText: string;
    lifestyleTagsText: string;
  } | null>(null);

  // Strategy Settings Modal State
  const [audienceTargets, setAudienceTargets] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSavingStrategy, setIsSavingStrategy] = useState<boolean>(false);

  const isBusy = isLoading || isSavingStrategy;

  // Displayed list: reflects the exact personas state (even if user deleted all of them to start empty)
  const displayedPersonas: CombinedPersona[] = Array.isArray(personas) ? personas : [];

  const persistPersonasList = async (
    updatedList: CombinedPersona[],
    changeSummary: string,
    options?: { skipVersionSnapshot?: boolean; backupPersonas?: CombinedPersona[] }
  ) => {
    try {
      await Promise.all([
        fetch('/api/config/personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personas: updatedList,
            changeSummary,
            label: changeSummary,
            skipVersionSnapshot: options?.skipVersionSnapshot,
            backupPersonas: options?.backupPersonas
          })
        }),
        fetch('/api/save-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            featureId: 'audience_generator',
            data: { personas: updatedList, context: description, audienceTargets }
          })
        })
      ]);
    } catch (err) {
      console.error('Failed to persist personas list:', err);
    }
  };

  // Sync with /api/config/personas on mount
  useEffect(() => {
    let isMounted = true;

    const syncPersonasFromServer = async () => {
      try {
        const res = await fetch('/api/config/personas');
        if (res.ok) {
          const data = await res.json();
          const serverPersonas: CombinedPersona[] | null = Array.isArray(data)
            ? data
            : Array.isArray(data?.personas)
              ? data.personas
              : null;
          if (isMounted && serverPersonas !== null) {
            setPersonas(serverPersonas);
            return;
          }
        }
      } catch (e) {
        // Fallback to /api/load-run/audience_generator if /api/config/personas is unavailable
      }

      try {
        const runRes = await fetch('/api/load-run/audience_generator');
        if (runRes.ok) {
          const runData = await runRes.json();
          if (isMounted && Array.isArray(runData?.personas)) {
            setPersonas(runData.personas);
          }
        }
      } catch {
        // Keep current personas state
      }
    };

    const loadStrategy = async () => {
      try {
        const res = await fetch('/api/audience-strategy');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.audienceTargets) {
            setAudienceTargets(data.audienceTargets);
          }
        }
      } catch {
        // Ignore
      }
    };

    syncPersonasFromServer();
    loadStrategy();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateSingleAudience = async () => {
    const trimmedPrompt = promptInput.trim();
    if (!trimmedPrompt || isBusy) return;

    const selectedSegmentMeta = SEGMENT_OPTIONS.find(s => s.code === selectedTrack) || SEGMENT_OPTIONS[0];

    setIsLoading(true);
    setStatusMessage(null);
    setLoadingStep(
      t(`Generando perfil de audiencia ${selectedSegmentMeta.shortLabel} con IA...`)
    );

    try {
      const effectiveDescription = audienceTargets.trim()
        ? `${description}\nLineamientos estratégicos de audiencia: ${audienceTargets.trim()}`
        : description;

      const newPersona = await generateSingleAudienceFromPrompt(
        trimmedPrompt,
        selectedTrack,
        effectiveDescription
      );

      const currentBase = Array.isArray(personas) ? personas : [];

      const updatedList: CombinedPersona[] = [
        newPersona,
        ...currentBase.filter(p => p.name !== newPersona.name)
      ];

      setPersonas(updatedList);
      setPromptInput('');
      setStatusMessage(
        t(`Perfil "${formatDisplayPersonaName(newPersona.name)}" creado y agregado al catálogo.`)
      );

      const summary = `Creación de perfil (${selectedTrack}): ${trimmedPrompt.slice(0, 60)}`;
      await persistPersonasList(updatedList, summary);

      // Generate portrait in background without blocking the user
      if (newPersona.imagePrompt) {
        setGeneratingPortraitKey(newPersona.name);
        generateImageFromPrompt(
          `${newPersona.imagePrompt} professional portrait, high quality, studio lighting, natural look`
        )
          .then(async url => {
            if (!url) return;
            setPersonas(prev => {
              const base = prev && prev.length > 0 ? prev : updatedList;
              const withImg = base.map(item =>
                item.name === newPersona.name ? { ...item, imageUrl: url } : item
              );
              persistPersonasList(
                withImg,
                `Retrato IA generado para: ${newPersona.name}`
              );
              return withImg;
            });
          })
          .catch(err => console.error('Background portrait generation error:', err))
          .finally(() => {
            setGeneratingPortraitKey(prev => (prev === newPersona.name ? null : prev));
          });
      }
    } catch (error) {
      console.error('Error generating single audience from prompt:', error);
      alert(
        t(
          'Ocurrió un error al generar el perfil de audiencia con IA.',
          'Failed to generate audience profile with AI.'
        )
      );
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleGeneratePortraitForCard = async (persona: CombinedPersona) => {
    if (generatingPortraitKey) return;
    setGeneratingPortraitKey(persona.name);
    try {
      const promptToUse =
        persona.imagePrompt ||
        `Retrato fotográfico realista de estudio de ${persona.personaName || persona.name} en México, iluminación cálida profesional, sin texto incrustado`;
      const url = await generateImageFromPrompt(
        `${promptToUse} professional portrait, high quality, studio lighting, natural look`
      );
      if (url) {
        const updatedList = displayedPersonas.map(item =>
          item.name === persona.name ? { ...item, imageUrl: url } : item
        );
        setPersonas(updatedList);
        await persistPersonasList(updatedList, `Retrato actualizado: ${persona.name}`);
      }
    } catch (err) {
      console.error('Error generating portrait for persona:', err);
    } finally {
      setGeneratingPortraitKey(null);
    }
  };

  const openEditModal = (index: number) => {
    const p = displayedPersonas[index];
    if (!p) return;
    const segCode = getPersonaSegmentCode(p);
    const painPoints = p.details?.pain_points || p.pain_points || [];
    const goals = p.details?.goals || p.goals || [];
    const preferredProducts = p.details?.preferred_products || p.preferred_products || [];
    const lifestyleTags = p.details?.lifestyle_tags || p.lifestyle_tags || [];

    setEditingIndex(index);
    setEditForm({
      name: p.name || '',
      personaName: p.personaName || '',
      track: segCode,
      age: Number(p.details?.age || p.age || 40),
      income: p.details?.income || '',
      job_title: p.details?.job_title || p.job_title || '',
      demographics: p.demographics || '',
      bio: p.details?.bio || p.bio || '',
      painPointsText: painPoints.join('\n'),
      goalsText: goals.join('\n'),
      preferredProductsText: preferredProducts.join(', '),
      lifestyleTagsText: lifestyleTags.join(', ')
    });
  };

  const handleSaveEditedPersona = async () => {
    if (editingIndex === null || !editForm) return;
    const original = displayedPersonas[editingIndex];
    if (!original) return;

    const painPoints = editForm.painPointsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    const goals = editForm.goalsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    const preferredProducts = editForm.preferredProductsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const lifestyleTags = editForm.lifestyleTagsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const updatedPersona: CombinedPersona = {
      ...original,
      track: SEGMENT_CODE_TO_TRACK[editForm.track] || 'patient',
      name: editForm.name.trim() || original.name,
      personaName: editForm.personaName.trim() || original.personaName,
      age: Number(editForm.age) || 40,
      job_title: editForm.job_title.trim(),
      demographics: editForm.demographics.trim(),
      bio: editForm.bio.trim(),
      pain_points: painPoints,
      goals,
      preferred_products: preferredProducts,
      lifestyle_tags: lifestyleTags,
      details: {
        ...(original.details || {
          name: editForm.personaName.trim() || editForm.name.trim(),
          age: Number(editForm.age) || 40,
          job_title: editForm.job_title.trim(),
          bio: editForm.bio.trim(),
          lifestyle_tags: lifestyleTags,
          preferred_products: preferredProducts,
          pain_points: painPoints,
          goals
        }),
        name: editForm.personaName.split(',')[0].split('(')[0].trim() || editForm.name.trim(),
        age: Number(editForm.age) || 40,
        income: editForm.income.trim(),
        job_title: editForm.job_title.trim(),
        bio: editForm.bio.trim(),
        pain_points: painPoints,
        goals,
        preferred_products: preferredProducts,
        lifestyle_tags: lifestyleTags
      }
    };

    const updatedList = displayedPersonas.map((item, idx) =>
      idx === editingIndex ? updatedPersona : item
    );
    setPersonas(updatedList);
    setEditingIndex(null);
    setEditForm(null);
    setStatusMessage(
      t(
        `Perfil "${updatedPersona.name}" actualizado correctamente.`,
        `Profile "${updatedPersona.name}" updated successfully.`
      )
    );
    await persistPersonasList(updatedList, `Edición de perfil: ${updatedPersona.name}`);
  };

  const handleDeletePersona = async (personaToDelete: CombinedPersona) => {
    const previousList = [...displayedPersonas];
    const updatedList = displayedPersonas.filter(p => p.name !== personaToDelete.name);
    setPersonas(updatedList);
    setStatusMessage(
      t(
        `Perfil "${personaToDelete.name}" eliminado. Puedes recuperarlo desde Historial / Versiones.`,
        `Profile "${personaToDelete.name}" deleted. You can restore it from History / Versions.`
      )
    );
    await persistPersonasList(
      updatedList,
      `Respaldo antes de eliminar: ${personaToDelete.name}`,
      { backupPersonas: previousList, skipVersionSnapshot: true }
    );
  };

  const handleClearAllPersonas = async () => {
    const previousList = [...displayedPersonas];
    setPersonas([]);
    setStatusMessage(
      t(
        'Catálogo vaciado. Puedes crear tus propios perfiles con el generador de IA o restaurarlos desde Historial / Versiones.',
        'Catalog cleared. You can create your own profiles with the AI generator or restore them from History / Versions.'
      )
    );
    await persistPersonasList(
      [],
      `Respaldo antes de vaciar catálogo (${previousList.length} perfiles)`,
      { backupPersonas: previousList, skipVersionSnapshot: true }
    );
  };

  const handleOpenVersionHistory = async () => {
    setIsHistoryOpen(true);
    setIsLoadingVersions(true);
    try {
      const res = await fetch('/api/config/personas/versions');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.versions || []);
        setVersionsList(list);
      } else {
        const fallbackRes = await fetch('/api/config-versions/personas');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setVersionsList(Array.isArray(fallbackData) ? fallbackData : []);
        }
      }
    } catch (err) {
      console.error('Failed to load persona versions:', err);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleRollbackVersion = async (versionId: string) => {
    setIsLoading(true);
    setLoadingStep(t('Restaurando versión seleccionada...', 'Restoring selected version...'));
    try {
      const res = await fetch('/api/config/personas/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      if (res.ok) {
        const data = await res.json();
        const restored: CombinedPersona[] = data?.personas || data?.data || [];
        if (restored.length > 0) {
          setPersonas(restored);
        }
      } else {
        const fallbackRes = await fetch('/api/config-versions/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityType: 'personas', versionId })
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData?.data) && fallbackData.data.length > 0) {
            setPersonas(fallbackData.data);
          }
        }
      }
      setIsHistoryOpen(false);
      setStatusMessage(
        t(
          'Versión de audiencias restaurada correctamente.',
          'Audience version restored successfully.'
        )
      );
    } catch (err) {
      console.error('Error rolling back version:', err);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleResetToBaseProfiles = async () => {
    setIsLoading(true);
    setLoadingStep(t('Restaurando perfiles base de Laboratorios Chopo...', 'Restoring Laboratorios Chopo base profiles...'));
    try {
      const res = await fetch('/api/config/personas/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const restored: CombinedPersona[] = data?.personas || data?.data || (STANDARD_AUDIENCES as unknown as CombinedPersona[]);
        setPersonas(restored);
      } else {
        const baseList = STANDARD_AUDIENCES as unknown as CombinedPersona[];
        setPersonas(baseList);
        await persistPersonasList(baseList, 'Restauración de Perfiles Base Oficiales');
      }
      setStatusMessage(
        t(
          'Se restauraron los 5 perfiles base oficiales de Laboratorios Chopo.',
          'Restored the 5 official Laboratorios Chopo base profiles.'
        )
      );
    } catch (err) {
      const baseList = STANDARD_AUDIENCES as unknown as CombinedPersona[];
      setPersonas(baseList);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleJumpToSyntheticUsers = (persona: CombinedPersona) => {
    try {
      localStorage.setItem('chopo_preselected_audience', persona.name);
    } catch (e) {
      console.warn('Could not save preselected audience to localStorage:', e);
    }
    if (setMode) {
      setMode(AppMode.SYNTHETIC_USERS);
    }
  };

  const handleSaveStrategy = async () => {
    setIsSavingStrategy(true);
    try {
      await fetch('/api/audience-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audienceTargets })
      });
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Failed to save strategy:', error);
    } finally {
      setIsSavingStrategy(false);
    }
  };

  const transformChartData = (chartData: { labels: string[]; data: number[] }) => {
    return chartData.labels.map((label, i) => ({
      name: label,
      value: chartData.data[i]
    }));
  };

  const b2cCount = displayedPersonas.filter(p => getPersonaSegmentCode(p) === 'B2C').length;
  const b2dCount = displayedPersonas.filter(p => getPersonaSegmentCode(p) === 'B2D').length;
  const b2bCount = displayedPersonas.filter(p => getPersonaSegmentCode(p) === 'B2B').length;

  const filteredPersonas = displayedPersonas.filter(p => {
    if (trackFilter === 'ALL') return true;
    return getPersonaSegmentCode(p) === trackFilter;
  });

  const activeSegmentOption =
    SEGMENT_OPTIONS.find(opt => opt.code === selectedTrack) || SEGMENT_OPTIONS[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Users className="text-[#0066FF]" />
              <h1 className="page-title">
                {t('Generador y Catálogo de Audiencias (B2C, B2D y B2B)')}
              </h1>
            </div>
            <button
              disabled={isBusy}
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-[#0066FF] transition-colors bg-white rounded-lg border border-slate-200 shadow-sm disabled:opacity-50"
              title={t('Configuración de Estrategia de Audiencias')}
            >
              <Settings size={20} />
            </button>
          </div>
          <p className="text-subtext mt-1">
            {t(
              'Consulta los perfiles base de Laboratorio Médico del Chopo (Pacientes B2C, Médicos B2D y Empresas B2B) o crea nuevos segmentos personalizados con IA a partir de una descripción.'
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 bg-[#F8FAFC] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Busy / Loading Banner */}
          {isBusy && (
            <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#0066FF]/30 flex items-center justify-between gap-4 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0066FF] border-t-transparent shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#003B7A]">
                    {loadingStep || t('Procesando operación con IA...')}
                  </p>
                  <p className="text-xs text-slate-600">
                    {t(
                      'Construyendo el perfil completo en español de México y guardando los cambios en tu catálogo.'
                    )}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-white border border-blue-200 text-[11px] font-bold text-[#0066FF] shrink-0">
                {t('Generando...')}
              </span>
            </div>
          )}

          {/* Status Toast */}
          {statusMessage && !isBusy && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-emerald-600 hover:text-emerald-900"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Top Executive Card: ✨ Crear Nuevo Perfil de Audiencia con IA */}
          <div
            className={`content-card border border-blue-200/80 bg-gradient-to-br from-white via-white to-[#EFF6FF]/50 shadow-sm ${
              isBusy ? 'pointer-events-none opacity-65 select-none' : ''
            }`}
          >
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-[#003B7A] flex items-center gap-2">
                      <Sparkles size={20} className="text-[#0066FF] shrink-0" />
                      <span>{t('✨ Crear Nuevo Perfil de Audiencia con IA')}</span>
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {t(
                        'Elige el segmento oficial (Paciente B2C, Médico B2D o Empresa B2B), describe el perfil con tus propias palabras o usa un ejemplo rápido, y agrégalo al instante a tu catálogo.'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EFF9FE] border border-[#BDD4F2] text-xs text-[#004699] shrink-0">
                    <span className="font-bold">{activeSegmentOption.label}:</span>
                    <span>{activeSegmentOption.hint}</span>
                  </div>
                </div>

                {/* 3-Segment Official Manual V4 Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1.5 border border-slate-200 w-full">
                  {SEGMENT_OPTIONS.map(option => {
                    const isActive = selectedTrack === option.code;
                    return (
                      <button
                        key={option.code}
                        type="button"
                        disabled={isBusy}
                        data-segment-key={TRACK_TO_SEGMENT_KEY[option.track]}
                        onClick={() => setSelectedTrack(option.code)}
                        className={`px-3.5 py-2.5 rounded-lg text-left transition-all flex flex-col justify-center ${
                          isActive ? option.activeClass : `bg-transparent ${option.inactiveClass} hover:bg-white/70`
                        }`}
                      >
                        <span className="text-xs font-bold leading-tight whitespace-nowrap">
                          {option.label}
                        </span>
                        <span
                          className={`text-[11px] leading-tight mt-0.5 ${
                            isActive ? 'text-white/90' : 'text-slate-500'
                          }`}
                        >
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Example Chips */}
            <div className="mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                {t('Ejemplos rápidos (clic para probar):')}
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPT_EXAMPLES.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setSelectedTrack(ex.track);
                      setPromptInput(ex.prompt);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all text-left ${
                      ex.track === 'B2D'
                        ? 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        : ex.track === 'B2B'
                          ? 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                          : 'bg-blue-50/70 hover:bg-blue-100 text-[#003B7A] border-blue-200'
                    }`}
                  >
                    {ex.labelEs}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Input + Primary CTA */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <textarea
                rows={2}
                disabled={isBusy}
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                placeholder={t(
                  'Describe el perfil de audiencia que deseas agregar (ej. "Directora de Recursos Humanos buscando convenios de check-ups anuales para 350 colaboradores", "Médico general recién egresado..." o "Mujer embarazada primeriza...")...'
                )}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none text-sm text-slate-900 resize-none"
              />
              <button
                type="button"
                disabled={isBusy || !promptInput.trim()}
                onClick={handleCreateSingleAudience}
                className="btn-primary px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                <Plus size={18} />
                <span>{t('Generar y Agregar Audiencia')}</span>
              </button>
            </div>
          </div>

          {/* Filter Bar & Version Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTrackFilter('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  trackFilter === 'ALL'
                    ? 'bg-[#003B7A] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('Todos los Perfiles')} ({displayedPersonas.length})
              </button>
              <button
                type="button"
                onClick={() => setTrackFilter('B2C')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  trackFilter === 'B2C'
                    ? 'bg-[#0066FF] text-white shadow-sm'
                    : 'bg-blue-50 text-[#003B7A] hover:bg-blue-100 border border-blue-200'
                }`}
              >
                {t('🏥 Pacientes B2C')} ({b2cCount})
              </button>
              <button
                type="button"
                onClick={() => setTrackFilter('B2D')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  trackFilter === 'B2D'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                {t('🩺 Médicos B2D')} ({b2dCount})
              </button>
              <button
                type="button"
                onClick={() => setTrackFilter('B2B')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  trackFilter === 'B2B'
                    ? 'bg-indigo-700 text-white shadow-sm'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                {t('🏢 Empresas B2B')} ({b2bCount})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isBusy}
                onClick={handleOpenVersionHistory}
                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#003B7A] border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <History size={15} className="text-[#0066FF]" />
                <span>{t('📜 Historial / Versiones')}</span>
              </button>
              {displayedPersonas.length > 0 && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleClearAllPersonas}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>{t('🗑️ Vaciar Todos')}</span>
                </button>
              )}
              <button
                type="button"
                disabled={isBusy}
                onClick={handleResetToBaseProfiles}
                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={15} />
                <span>{t('Restaurar Perfiles Base')}</span>
              </button>
            </div>
          </div>

          {/* Audience Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {filteredPersonas.map((p, idx) => {
              const segCode = getPersonaSegmentCode(p);
              const segMeta = SEGMENT_OPTIONS.find(s => s.code === segCode) || SEGMENT_OPTIONS[0];
              const displayName = formatDisplayPersonaName(p.name);
              const realIndex = displayedPersonas.findIndex(item => item.name === p.name);
              const painPoints = p.details?.pain_points || p.pain_points || [];
              const goals = p.details?.goals || p.goals || [];
              const preferredProducts = p.details?.preferred_products || p.preferred_products || [];
              const lifestyleTags = p.details?.lifestyle_tags || p.lifestyle_tags || [];
              const isGeneratingThisPortrait = generatingPortraitKey === p.name;

              return (
                <div
                  key={p.id || `${p.name}_${idx}`}
                  className="content-card p-0 overflow-hidden flex flex-col hover:border-[#0066FF] transition-colors"
                >
                  {/* Header / Portrait */}
                  <div className="relative h-72 bg-slate-100">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={displayName} className="img-cover-top" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 p-6 text-center">
                        <Users size={44} className="mx-auto mb-2 opacity-30" />
                        {isGeneratingThisPortrait ? (
                          <span className="text-xs font-semibold text-[#0066FF] animate-pulse">
                            {t('Generando Retrato con IA...')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGeneratePortraitForCard(p)}
                            className="mt-1 px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm z-10"
                          >
                            <Camera size={14} />
                            <span>{t('Generar Retrato IA')}</span>
                          </button>
                        )}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                    {/* Segment Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${segMeta.badgeClass}`}
                      >
                        {segMeta.label}
                      </span>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <h3 className="font-bold text-xl leading-snug mb-1">{displayName}</h3>
                      <p className="text-slate-100 font-semibold text-xs mb-1">
                        {p.personaName}
                      </p>
                      <span className="text-slate-200 font-medium text-xs bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-md inline-block border border-white/10">
                        {p.details?.job_title || p.job_title || t('Perfil Clínico', 'Clinical Profile')}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-5 flex-1 bg-white">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-subtext text-[11px] uppercase font-bold mb-0.5">
                          {t('Edad / Perfil', 'Age / Profile')}
                        </p>
                        <p className="font-semibold text-heading text-xs">
                          {p.details?.age || p.age || (p.demographics ? p.demographics.split(',')[0] : '40')} {t('años', 'yrs')}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-subtext text-[11px] uppercase font-bold mb-0.5">
                          {t('Ingreso / Demografía', 'Income / Demographics')}
                        </p>
                        <p className="font-semibold text-heading text-xs line-clamp-2">
                          {p.details?.income || p.demographics || '...'}
                        </p>
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <h4 className="font-bold text-heading mb-1.5 flex items-center gap-2 text-sm">
                        <Briefcase size={15} className="text-[#0066FF]" />
                        {t('Contexto Clínico y Estilo de Vida', 'Clinical Context & Lifestyle')}
                      </h4>
                      <p className="text-subtext text-xs leading-relaxed">
                        {p.bio || p.details?.bio}
                      </p>
                    </div>

                    {/* Pain Points (Dolores / Barreras) */}
                    {painPoints.length > 0 && (
                      <div>
                        <h4 className="font-bold text-rose-700 mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                          <AlertCircle size={14} className="text-rose-600" />
                          {t('Dolores / Barreras', 'Pain Points / Barriers')}
                        </h4>
                        <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                          {painPoints.slice(0, 4).map((pt, i) => (
                            <li key={i} className="leading-snug">
                              {pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Goals (Motivadores) */}
                    {goals.length > 0 && (
                      <div>
                        <h4 className="font-bold text-emerald-700 mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                          <Target size={14} className="text-emerald-600" />
                          {t('Motivadores y Metas', 'Goals & Motivators')}
                        </h4>
                        <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                          {goals.slice(0, 4).map((g, i) => (
                            <li key={i} className="leading-snug">
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Preferred Diagnostic Studies */}
                    {preferredProducts.length > 0 && (
                      <div>
                        <h4 className="font-bold text-heading mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                          <Shield size={14} className="text-emerald-600" />
                          {t('Estudios Diagnósticos Recomendados', 'Recommended Diagnostic Studies')}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {preferredProducts.map((product, pIdx) => (
                            <span
                              key={pIdx}
                              className="bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-1 rounded-full font-bold border border-emerald-100"
                            >
                              {product}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lifestyle Tags */}
                    {lifestyleTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {lifestyleTags.slice(0, 5).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="bg-blue-50 text-[#0066FF] text-[11px] px-2.5 py-0.5 rounded-full font-medium border border-blue-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Action Bar */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => openEditModal(realIndex >= 0 ? realIndex : idx)}
                        className="flex-1 px-3 py-2 rounded-lg bg-white hover:bg-blue-50 text-[#003B7A] border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Edit2 size={13} className="text-[#0066FF]" />
                        <span>{t('✏️ Editar Perfil', '✏️ Edit Profile')}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeletePersona(p)}
                        className="px-3 py-2 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Trash2 size={13} />
                        <span>{t('🗑️ Eliminar', '🗑️ Delete')}</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleJumpToSyntheticUsers(p)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <UserPlus size={15} />
                      <span>
                        {t(
                          '👥 Crear Usuarios Sintéticos de este Perfil ➔',
                          '👥 Create Synthetic Users for this Profile ➔'
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Persona Modal */}
      {editingIndex !== null && editForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Edit2 size={18} className="text-[#0066FF]" />
                <h2 className="text-lg font-bold text-[#003B7A]">
                  {t('Editar Perfil de Audiencia', 'Edit Audience Profile')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(null);
                  setEditForm(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                    {t('Nombre del Segmento', 'Segment Name')}
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                    {t('Nombre del Arquetipo')}
                  </label>
                  <input
                    type="text"
                    value={editForm.personaName}
                    onChange={e => setEditForm({ ...editForm, personaName: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                    {t('Segmento')}
                  </label>
                  <select
                    value={editForm.track}
                    onChange={e => setEditForm({ ...editForm, track: e.target.value as AudienceSegmentCode })}
                    className="input-field text-sm"
                  >
                    <option value="B2C">{t('🏥 Paciente (B2C) — Habla de Tú')}</option>
                    <option value="B2D">{t('🩺 Médico (B2D) — Habla de Tú respetuoso')}</option>
                    <option value="B2B">{t('🏢 Empresa (B2B) — Habla de Usted')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                    {t('Edad', 'Age')}
                  </label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={e => setEditForm({ ...editForm, age: Number(e.target.value) })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                    {t('Ocupación / Especialidad', 'Occupation / Specialty')}
                  </label>
                  <input
                    type="text"
                    value={editForm.job_title}
                    onChange={e => setEditForm({ ...editForm, job_title: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                    {t('Demografía', 'Demographics')}
                  </label>
                  <input
                    type="text"
                    value={editForm.demographics}
                    onChange={e => setEditForm({ ...editForm, demographics: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                    {t('Nivel de Ingresos', 'Income Tier')}
                  </label>
                  <input
                    type="text"
                    value={editForm.income}
                    onChange={e => setEditForm({ ...editForm, income: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                  {t('Biografía e Historia Clínica', 'Bio & Clinical Context')}
                </label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                    {t('Dolores / Barreras (1 por línea)', 'Pain Points / Barriers (1 per line)')}
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.painPointsText}
                    onChange={e => setEditForm({ ...editForm, painPointsText: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                    {t('Motivadores / Metas (1 por línea)', 'Goals / Motivators (1 per line)')}
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.goalsText}
                    onChange={e => setEditForm({ ...editForm, goalsText: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                  {t('Estudios Recomendados (separados por coma)', 'Recommended Studies (comma-separated)')}
                </label>
                <input
                  type="text"
                  value={editForm.preferredProductsText}
                  onChange={e => setEditForm({ ...editForm, preferredProductsText: e.target.value })}
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(null);
                  setEditForm(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                {t('Cancelar', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEditedPersona}
                className="px-5 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {t('Guardar Cambios', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <History size={18} className="text-[#0066FF]" />
                <h2 className="text-lg font-bold text-[#003B7A]">
                  {t('Historial de Versiones de Audiencias', 'Audience Version History')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {isLoadingVersions ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  {t('Cargando historial de versiones...', 'Loading version history...')}
                </p>
              ) : versionsList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  {t('No hay versiones registradas aún.', 'No versions recorded yet.')}
                </p>
              ) : (
                versionsList.map((ver, idx) => {
                  const vId = ver.versionId || ver.id || `v_${idx}`;
                  const label = ver.changeSummary || ver.label || vId;
                  const ts = ver.timestamp || ver.createdAt;
                  return (
                    <div
                      key={vId}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#003B7A] truncate">{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ts ? new Date(ts).toLocaleString() : ''} • {ver.itemCount ?? 5}{' '}
                          {t('perfiles', 'profiles')}
                        </p>
                        {Array.isArray(ver.previewNames) && ver.previewNames.length > 0 && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            <span className="font-semibold text-[#003B7A]">{t('Incluye:', 'Includes:')}</span>{' '}
                            {ver.previewNames.join(' • ')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRollbackVersion(vId)}
                        className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#0066FF] border border-blue-200 text-xs font-bold shrink-0"
                      >
                        {t('Restaurar')}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                  handleResetToBaseProfiles();
                }}
                className="text-xs font-bold text-slate-600 hover:text-[#0066FF] flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>{t('Restaurar Perfiles Base', 'Restore Base Profiles')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
              >
                {t('Cerrar', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A2E73]/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 border-t-4 border-t-[#78D600]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0066FF]/10 rounded-lg text-[#0066FF]">
                  <Settings size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#003B7A]">
                  {t('Estrategia de Audiencias', 'Audience Strategy')}
                </h2>
              </div>
              <button
                disabled={isBusy}
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className={`p-6 space-y-4 ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
              <div>
                <label className="block text-xs font-bold text-[#003B7A] uppercase tracking-wider mb-2">
                  {t('Definiciones Estratégicas de Audiencia', 'Strategic Audience Definitions')}
                </label>
                <textarea
                  disabled={isBusy}
                  value={audienceTargets}
                  onChange={e => setAudienceTargets(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all outline-none font-medium text-slate-900 resize-none disabled:opacity-60"
                  placeholder={t(
                    'Escribe lineamientos adicionales que la IA deba considerar al crear nuevos perfiles de audiencia...',
                    'Enter additional guidelines for the AI to consider when creating new audience profiles...'
                  )}
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                disabled={isBusy}
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                {t('Cancelar', 'Cancel')}
              </button>
              <button
                disabled={isBusy}
                onClick={handleSaveStrategy}
                className="px-6 py-2.5 bg-[#0066FF] hover:bg-[#004ECC] text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {t('Guardar Estrategia', 'Save Strategy')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
