import React, { useState, useEffect, useRef } from 'react';
import {
  generateMarketingBrief,
  generateMarketingCampaignAssets,
  MarketingAssets,
  fetchUseCases,
  saveUseCases,
  fetchConfigVersions,
  restoreConfigVersion
} from '../services/geminiService';
import { brandConfig } from '../config';
import { Send, Loader2, Globe, Target, Calendar, ShieldCheck, Zap, ArrowLeft, Search, Mail, Youtube, Share2, MessageCircle, ThumbsUp, Sparkles, Heart, FileText, Users, X, ListChecks, Award, Clock, Settings, RotateCcw, Plus, Edit2, Trash2, CheckCircle2, History, Eye, Upload, Image as ImageIcon, ChevronDown, ChevronUp, LayoutTemplate, Layers } from 'lucide-react';
import {
  AppMode,
  BrandAudienceSegmentKey,
  BrandChannelKey,
  ClinicalUseCase,
  ConfigVersionSnapshot,
  FunnelStage,
  MarketingBriefData
} from '../types';
import { useCompanyContext } from '../context/CompanyContext';
import { useLanguage } from '../context/LanguageContext';
import {
  CHANNEL_SUBFORMATS,
  SEGMENT_KEY_TO_TRACK,
  TRACK_TO_SEGMENT_KEY,
  buildBrandSlices,
  resolveSegmentKey
} from '../services/brandManualUtils';

interface MarketingBriefProps {
  setMode?: (mode: AppMode) => void;
}

const V4_AUDIENCE_SEGMENTS: Array<{
  key: BrandAudienceSegmentKey;
  code: 'B2C' | 'B2D' | 'B2B';
  label: string;
  pronounHint: string;
}> = [
  { key: 'b2c_patients', code: 'B2C', label: 'B2C — Pacientes (Tú)', pronounHint: 'Tú cercano y empático' },
  { key: 'b2d_doctors', code: 'B2D', label: 'B2D — Médicos (Tú respetuoso)', pronounHint: 'Tú respetuoso entre colegas' },
  { key: 'b2b_enterprises', code: 'B2B', label: 'B2B — Empresas (Usted)', pronounHint: 'Usted corporativo y convenios' }
];

const V4_FUNNEL_STAGES: Array<{
  key: FunnelStage;
  label: string;
  ruleHint: string;
}> = [
  {
    key: 'awareness',
    label: 'Awareness',
    ruleHint: 'Titular "Toda una vida..." + CTA discreto abajo'
  },
  {
    key: 'consideration',
    label: 'Consideration',
    ruleHint: 'Titular "Toda una vida..." + diferenciador + CTA abajo'
  },
  {
    key: 'performance',
    label: 'Performance',
    ruleHint: 'Beneficio directo + CTA arriba, sin signos ¡!'
  }
];

const V4_CHANNELS: Array<{
  key: 'social_media' | 'mailing_ecommerce' | 'web' | 'pdv_sucursal';
  label: string;
  shortDesc: string;
}> = [
  { key: 'social_media', label: 'Redes Sociales', shortDesc: 'Feed 1:1, 4:5, Historias y Reels' },
  { key: 'mailing_ecommerce', label: 'Mailing / E-commerce', shortDesc: 'Correo promocional y módulo web' },
  { key: 'web', label: 'Sitio Web', shortDesc: 'Hero Banner y banner horizontal' },
  { key: 'pdv_sucursal', label: 'PDV Sucursal', shortDesc: 'Póster, folleto, lona y regional' }
];

const getChannelDisplayLabel = (channelKey?: string): string => {
  const found = V4_CHANNELS.find((c) => c.key === channelKey);
  return found ? found.label : (channelKey || 'Redes Sociales');
};

const getSegmentDisplayLabel = (segmentKey?: string): string => {
  const resolved = resolveSegmentKey(segmentKey);
  const found = V4_AUDIENCE_SEGMENTS.find((s) => s.key === resolved);
  return found ? found.label : 'B2C — Pacientes (Tú)';
};

const getFunnelDisplayLabel = (stage?: string): string => {
  const found = V4_FUNNEL_STAGES.find((f) => f.key === stage);
  return found ? found.label : 'Performance';
};

const formatDisplayPersonaName = (rawName?: string): string => {
  if (!rawName) return '';
  return rawName
    .replace(/\[Médico B2B\]/gi, '[Médico B2D]')
    .replace(/\(Médico B2B\)/gi, '(Médico B2D)')
    .replace(/Médico Prescriptor B2B/gi, 'Médico (B2D)')
    .replace(/Médico B2B/gi, 'Médico (B2D)');
};

const DEFAULT_FALLBACK_USE_CASES: ClinicalUseCase[] = [
  {
    id: 'uc_diabetes_control',
    studyName: 'Check-up Control Diabetes',
    category: 'Metabolismo y Control Glucémico',
    track: 'both',
    isDefault: true,
    includedStudies: [
      'Hemoglobina Glicosilada (HbA1c) certificada NGSP',
      'Química Sanguínea (Glucosa en ayuno, Perfil de Lípidos, Creatinina/TFGe)',
      'Examen General de Orina (EGO) / Microalbuminuria'
    ],
    fastingRequirement: 'Ayuno obligatorio de 8 a 12 horas y muestra de la primera orina de la mañana.',
    visualRealismRules: 'Paciente en ropa casual cotidiana (sin bata hospitalaria), entrega 100% digital en App Chopo/smartphone/tablet (prohibido placas físicas), prohibido mostrar agujas perforando piel o sangre explícita.',
    defaultPromoText: 'Precio especial exclusivo pagando en línea en chopo.com.mx o App Chopo. Vigencia al 31 de diciembre de 2026.',
    cofeprisPermitB2C: 'Permiso de Publicidad COFEPRIS No. 2609152002A00518',
    cofeprisPermitB2B: 'Aviso de Publicidad COFEPRIS No. 243300202A0911',
    responsableSanitario: 'Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.'
  },
  {
    id: 'uc_hba1c_individual',
    studyName: 'Hemoglobina Glicosilada (HbA1c)',
    category: 'Metabolismo y Control Glucémico',
    track: 'both',
    isDefault: false,
    includedStudies: [
      'Hemoglobina Glicosilada (HbA1c) en sangre venosa con EDTA estandarizada NGSP (promedio glucémico de 8 a 12 semanas)'
    ],
    fastingRequirement: 'No requiere ayuno estricto cuando se solicita como estudio individual aislado.',
    visualRealismRules: 'Paciente en ropa casual cotidiana consultando resultados digitales en App Chopo o médico especialista revisando historial glucémico en tablet; prohibido mostrar agujas perforando la piel, sangre explícita o placas radiográficas físicas.',
    defaultPromoText: 'Precio especial exclusivo pagando en línea en chopo.com.mx o App Chopo. Vigencia al 31 de diciembre de 2026.',
    cofeprisPermitB2C: 'Permiso de Publicidad COFEPRIS No. 2609152002A00518',
    cofeprisPermitB2B: 'Aviso de Publicidad COFEPRIS No. 243300202A0911',
    responsableSanitario: 'Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.'
  },
  {
    id: 'uc_checkup_completo',
    studyName: 'Check-up Completo Chopo',
    category: 'Check-ups Preventivos',
    track: 'both',
    isDefault: false,
    includedStudies: [
      'Biometría Hemática Completa (BH)',
      'Química Sanguínea de 45 elementos (Glucosa, Función Renal, Función Hepática, Electrolitos y Perfil de Lípidos)',
      'Examen General de Orina (EGO)'
    ],
    fastingRequirement: 'Ayuno obligatorio de 8 a 12 horas previo a la toma de muestra sanguínea y entrega de la primera orina de la mañana.',
    visualRealismRules: 'Paciente en ropa casual cotidiana en ambiente luminoso o sucursal moderna consultando resultados en App Chopo; químico con bata blanca institucional; prohibido bata hospitalaria en toma de sangre o agujas/sangre explícita.',
    defaultPromoText: 'Precio especial exclusivo pagando en línea en chopo.com.mx o App Chopo. Vigencia al 31 de diciembre de 2026.',
    cofeprisPermitB2C: 'Permiso de Publicidad COFEPRIS No. 2609152002A00518',
    cofeprisPermitB2B: 'Aviso de Publicidad COFEPRIS No. 243300202A0911',
    responsableSanitario: 'Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.'
  },
  {
    id: 'uc_mastografia_ultrasonido',
    studyName: 'Mastografía Digital + Ultrasonido',
    category: 'Imagenología y Salud de la Mujer',
    track: 'both',
    isDefault: false,
    includedStudies: [
      'Mastografía Digital de alta resolución',
      'Ultrasonido Mamario complementario interpretado por médicos radiólogos certificados'
    ],
    fastingRequirement: 'No requiere ayuno. Acudir con axilas limpias sin desodorante, talco, crema ni perfume.',
    visualRealismRules: 'Mastógrafo digital vertical o consola de ultrasonido con transductor de mano; paciente mujer vistiendo bata clínica institucional en entorno cálido y privado; resultados 100% digitales (prohibido placas físicas a contraluz o equipos de túnel).',
    defaultPromoText: 'Precio especial exclusivo pagando en línea en chopo.com.mx o App Chopo. Vigencia al 31 de diciembre de 2026.',
    cofeprisPermitB2C: 'Permiso de Publicidad COFEPRIS No. 2609152002A00518',
    cofeprisPermitB2B: 'Aviso de Publicidad COFEPRIS No. 243300202A0911',
    responsableSanitario: 'Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.'
  },
  {
    id: 'uc_rayos_x_torax',
    studyName: 'Rayos X de Tórax Digital',
    category: 'Imagenología Digital',
    track: 'both',
    isDefault: false,
    includedStudies: [
      'Radiografía Digital de Tórax (tele de tórax) con detector plano de alta definición e interpretación radiológica certificada'
    ],
    fastingRequirement: 'No requiere ayuno. Retirar objetos metálicos, joyería y prendas con botones o cierres en la zona torácica.',
    visualRealismRules: 'Paciente vistiendo bata clínica institucional (prohibido ropa de calle o joyería en el equipo), sala de radiología con brazo/columna vertical y detector plano bucky de pared (prohibido túnel de Resonancia/TAC), y visualización 100% digital en monitor o tablet (prohibido placas físicas impresas a contraluz).',
    defaultPromoText: 'Precio especial exclusivo pagando en línea en chopo.com.mx o App Chopo. Vigencia al 31 de diciembre de 2026.',
    cofeprisPermitB2C: 'Permiso de Publicidad COFEPRIS No. 2609152002A00518',
    cofeprisPermitB2B: 'Aviso de Publicidad COFEPRIS No. 243300202A0911',
    responsableSanitario: 'Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.'
  }
];

export const MarketingBrief: React.FC<MarketingBriefProps> = ({ setMode }) => {
  const { name, description } = useCompanyContext();
  const { language, t } = useLanguage();
  const [context, setContext] = useState(description);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [useCases, setUseCases] = useState<ClinicalUseCase[]>(DEFAULT_FALLBACK_USE_CASES);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string>('uc_diabetes_control');
  const [isUseCaseModalOpen, setIsUseCaseModalOpen] = useState<boolean>(false);
  const [activeUseCaseTab, setActiveUseCaseTab] = useState<'catalog' | 'history'>('catalog');
  const [editingUseCase, setEditingUseCase] = useState<ClinicalUseCase | null>(null);
  const [includedStudiesInput, setIncludedStudiesInput] = useState<string>('');
  const [useCaseVersionLabel, setUseCaseVersionLabel] = useState<string>('');
  const [useCaseVersions, setUseCaseVersions] = useState<ConfigVersionSnapshot[]>([]);
  const [isSavingUseCase, setIsSavingUseCase] = useState<boolean>(false);

  const [goal, setGoal] = useState("Impulsar la adopción del Check-up Control Diabetes (HbA1c, Química Sanguínea y Microalbuminuria) en Pacientes B2C (prevención empática, precio especial en línea y resultados digitales en App Chopo), Médicos B2D (precisión diagnóstica acreditada NGSP) y Empresas B2B (convenios preventivos) bajo lineamientos COFEPRIS y Manual de Marca V4.");
  const [audienceSegment, setAudienceSegment] = useState<BrandAudienceSegmentKey>('b2c_patients');
  const [funnelStage, setFunnelStage] = useState<FunnelStage>('performance');
  const [channelKey, setChannelKey] = useState<BrandChannelKey>('social_media');
  const [channelSubformat, setChannelSubformat] = useState<string>(CHANNEL_SUBFORMATS.social_media[0]);
  const [brief, setBrief] = useState<MarketingBriefData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [campaignAssetsMap, setCampaignAssetsMap] = useState<Record<string, MarketingAssets> | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<string>("");
  const [isAssetLoading, setIsAssetLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [activeAssetTab, setActiveAssetTab] = useState<'v4_modular' | 'social' | 'search' | 'email' | 'youtube' | 'website'>('social');
  const [availableAudiences, setAvailableAudiences] = useState<any[]>([]);
  const [selectedAudienceNames, setSelectedAudienceNames] = useState<string[]>([]);
  const [selectedAudienceModal, setSelectedAudienceModal] = useState<any | null>(null);
  const [isUploadingEmailImage, setIsUploadingEmailImage] = useState<boolean>(false);
  const emailImageInputRef = useRef<HTMLInputElement>(null);

  const selectedUseCase = useCases.find(u => u.id === selectedUseCaseId) || useCases.find(u => u.isDefault) || useCases[0] || DEFAULT_FALLBACK_USE_CASES[0];
  const currentAssets = campaignAssetsMap && selectedAudience ? campaignAssetsMap[selectedAudience] : null;
  const isBusy = isLoading || isAssetLoading || isSavingUseCase || isUploadingEmailImage;

  const getAudienceSegmentCode = (aud: any): 'B2C' | 'B2D' | 'B2B' => {
    if (!aud) return 'B2C';
    const rawTrack = String(aud?.track || '').trim();
    const rawName = String(aud?.name || '');
    if (rawTrack === 'enterprise' || rawTrack === 'b2b_enterprises') return 'B2B';
    if (rawTrack === 'physician' || rawTrack === 'B2D' || rawTrack === 'b2d_doctors') return 'B2D';
    if (rawTrack === 'patient' || rawTrack === 'B2C' || rawTrack === 'b2c_patients') {
      if (/\[empresa|\bempresa\s*\(?b2b/i.test(rawName)) return 'B2B';
      if (/médico\s*b2[bd]|\[médico/i.test(rawName)) return 'B2D';
      return 'B2C';
    }
    if (/\[empresa|\bempresa\s*\(?b2b/i.test(rawName)) return 'B2B';
    if (/médico|physician|b2d/i.test(rawName)) return 'B2D';
    const resolved = resolveSegmentKey(rawTrack);
    if (rawTrack && resolved === 'b2b_enterprises') return 'B2B';
    if (rawTrack && resolved === 'b2d_doctors') return 'B2D';
    return 'B2C';
  };

  const getAudienceSegmentBadge = (aud: any) => {
    const code = getAudienceSegmentCode(aud);
    if (code === 'B2D') {
      return {
        label: '🩺 Médico (B2D)',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    }
    if (code === 'B2B') {
      return {
        label: '🏢 Empresa (B2B)',
        className: 'bg-indigo-50 text-indigo-800 border-indigo-200'
      };
    }
    return {
      label: '🏥 Paciente (B2C)',
      className: 'bg-[#EFF6FF] text-[#0066FF] border-blue-100'
    };
  };

  const handleChannelChange = (newChannelKey: BrandChannelKey) => {
    setChannelKey(newChannelKey);
    const subformats = CHANNEL_SUBFORMATS[newChannelKey] || ['Formato Estándar'];
    setChannelSubformat(subformats[0]);
  };

  const toggleAudienceSelection = (audName: string) => {
    setSelectedAudienceNames((prev) =>
      prev.includes(audName) ? prev.filter((n) => n !== audName) : [...prev, audName]
    );
  };

  const cleanCategoryLabel = (cat?: string): string => {
    const cleaned = (cat || '').replace(/\s*\(?MVP[^)]*\)?/gi, '').trim();
    if (!cleaned || /^Línea Diabetes$/i.test(cleaned)) {
      return 'Metabolismo y Control Glucémico';
    }
    return cleaned;
  };

  const sanitizeVersionLabel = (label?: string): string => {
    if (!label) return t('Configuración Base por Defecto — Laboratorio Médico del Chopo');
    if (/MVP|Semilla Oficial/i.test(label)) {
      return t('Configuración Base por Defecto — Laboratorio Médico del Chopo');
    }
    return label;
  };

  const formatVersionDate = (ver: ConfigVersionSnapshot): string => {
    const rawDate = ver.timestamp || (ver as any).createdAt;
    if (!rawDate) return t('Versión base');
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) return t('Versión base');
    return parsed.toLocaleString(language === 'es' ? 'es-MX' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const buildGoalForUseCase = (uc: ClinicalUseCase) => {
    const studiesSummary = (uc.includedStudies || []).slice(0, 2).join(', ');
    return `Impulsar la adopción de ${uc.studyName}${studiesSummary ? ` (${studiesSummary})` : ''} en Pacientes B2C (precio especial en línea en chopo.com.mx / App Chopo y entrega digital), Médicos B2D (rigor analítico acreditado) y Empresas B2B (convenios y salud ocupacional) cumpliendo estrictamente ${uc.cofeprisPermitB2C} y las reglas de realismo visual (${uc.fastingRequirement}).`;
  };

  const handleSelectUseCase = (uc: ClinicalUseCase) => {
    setSelectedUseCaseId(uc.id);
    setGoal(buildGoalForUseCase(uc));
    if (uc.track === 'patient' || uc.track === 'physician' || uc.track === 'enterprise') {
      setAudienceSegment(TRACK_TO_SEGMENT_KEY[uc.track]);
    }
    if (availableAudiences.length > 0) {
      if (uc.track === 'patient') {
        setSelectedAudienceNames(
          availableAudiences.filter((a) => getAudienceSegmentCode(a) === 'B2C').map((a) => a.name)
        );
      } else if (uc.track === 'physician') {
        setSelectedAudienceNames(
          availableAudiences.filter((a) => getAudienceSegmentCode(a) === 'B2D').map((a) => a.name)
        );
      } else if (uc.track === 'enterprise') {
        setSelectedAudienceNames(
          availableAudiences.filter((a) => getAudienceSegmentCode(a) === 'B2B').map((a) => a.name)
        );
      } else {
        setSelectedAudienceNames(availableAudiences.map((a) => a.name));
      }
    }
  };

  const loadUseCaseVersions = async () => {
    try {
      const versions = await fetchConfigVersions('use_cases');
      if (Array.isArray(versions)) {
        setUseCaseVersions(versions);
      }
    } catch (e) {
      console.warn('Could not load use_cases versions:', e);
    }
  };

  const openUseCaseManager = async (ucToEdit?: ClinicalUseCase) => {
    const target = ucToEdit || selectedUseCase;
    setEditingUseCase({
      ...target,
      category: cleanCategoryLabel(target.category)
    });
    setIncludedStudiesInput((target.includedStudies || []).join('\n'));
    setActiveUseCaseTab('catalog');
    setIsUseCaseModalOpen(true);
    await loadUseCaseVersions();
  };

  const cleanRealismRules = (text?: string): string => {
    return (text || '').replace(/^RLM-[^:]+:\s*/i, '').trim();
  };

  const handleStartNewUseCase = () => {
    const blankUseCase: ClinicalUseCase = {
      id: `uc_custom_${Date.now()}`,
      studyName: '',
      category: 'Metabolismo y Control Glucémico',
      track: 'both',
      isDefault: false,
      includedStudies: ['Estudio clínico acreditado Chopo'],
      fastingRequirement: 'Ayuno obligatorio de 8 a 12 horas.',
      visualRealismRules: 'Resultados 100% digitales en App Chopo/smartphone; prohibido placas físicas impresas o agujas/sangre explícita.',
      defaultPromoText: 'Precio especial exclusivo pagando en línea en chopo.com.mx o App Chopo. Vigencia al 31 de diciembre de 2026.',
      cofeprisPermitB2C: 'Permiso de Publicidad COFEPRIS No. 2609152002A00518',
      cofeprisPermitB2B: 'Aviso de Publicidad COFEPRIS No. 243300202A0911',
      responsableSanitario: 'Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.'
    };
    setEditingUseCase(blankUseCase);
    setIncludedStudiesInput(blankUseCase.includedStudies.join('\n'));
  };

  const handleSaveUseCaseForm = async () => {
    if (!editingUseCase || !editingUseCase.studyName.trim()) {
      alert(t('Por favor ingresa el nombre del estudio clínico o caso de uso.', 'Please enter the clinical study or use case name.'));
      return;
    }
    setIsSavingUseCase(true);
    try {
      const parsedStudies = includedStudiesInput
        .split(/\n|,/)
        .map(s => s.trim())
        .filter(Boolean);
      const normalizedItem: ClinicalUseCase = {
        ...editingUseCase,
        studyName: editingUseCase.studyName.trim(),
        category: cleanCategoryLabel(editingUseCase.category),
        includedStudies: parsedStudies.length > 0 ? parsedStudies : [editingUseCase.studyName.trim()]
      };

      const exists = useCases.some(u => u.id === normalizedItem.id);
      const updatedList = exists
        ? useCases.map(u => (u.id === normalizedItem.id ? normalizedItem : u))
        : [...useCases, normalizedItem];

      const label = useCaseVersionLabel.trim() || `${exists ? 'Actualización' : 'Nuevo estudio'}: ${normalizedItem.studyName}`;
      const saved = await saveUseCases(updatedList, label);
      const finalList = Array.isArray(saved) && saved.length > 0 ? saved : updatedList;
      setUseCases(finalList);
      setSelectedUseCaseId(normalizedItem.id);
      setGoal(buildGoalForUseCase(normalizedItem));
      setUseCaseVersionLabel('');
      await loadUseCaseVersions();
    } catch (err) {
      console.error('Failed to save use cases:', err);
      alert(t('Error al guardar el estudio clínico.', 'Failed to save clinical study.'));
    } finally {
      setIsSavingUseCase(false);
    }
  };

  const handleRestoreUseCases = async (versionId: string) => {
    setIsSavingUseCase(true);
    try {
      const restored = await restoreConfigVersion('use_cases', versionId);
      const finalList = Array.isArray(restored) && restored.length > 0 ? restored : DEFAULT_FALLBACK_USE_CASES;
      setUseCases(finalList);
      const defaultItem = finalList.find((u: ClinicalUseCase) => u.isDefault) || finalList[0];
      if (defaultItem) {
        setSelectedUseCaseId(defaultItem.id);
        setEditingUseCase({
          ...defaultItem,
          category: cleanCategoryLabel(defaultItem.category)
        });
        setIncludedStudiesInput((defaultItem.includedStudies || []).join('\n'));
        setGoal(buildGoalForUseCase(defaultItem));
      }
      await loadUseCaseVersions();
      setActiveUseCaseTab('catalog');
    } catch (err) {
      console.error('Failed to restore use cases:', err);
      alert(t('Error al restaurar versión de estudios clínicos.', 'Failed to restore clinical studies version.'));
    } finally {
      setIsSavingUseCase(false);
    }
  };

  const resolveDefaultAssetTab = (chKey?: string): 'v4_modular' | 'social' | 'search' | 'email' | 'youtube' | 'website' => {
    if (chKey === 'pdv_sucursal') return 'v4_modular';
    if (chKey === 'mailing_ecommerce') return 'email';
    if (chKey === 'web') return 'website';
    return 'social';
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setGenerationStatus(t("Redactando Brief Clínico de Marketing (Manual V4)..."));
    try {
      // 1. Generate Brief anchored on selected clinical use case, selected audiences, and V4 campaign options
      const studyName = selectedUseCase?.studyName || 'Check-up Control Diabetes';
      const studyTrack = SEGMENT_KEY_TO_TRACK[audienceSegment] || selectedUseCase?.track || 'both';
      const targetAudiences = availableAudiences.filter((a) =>
        selectedAudienceNames.includes(a.name)
      );
      const brandV4Options = {
        audienceSegment,
        funnelStage,
        channelKey,
        channelSubformat
      };

      const result = await generateMarketingBrief(
        description,
        goal,
        targetAudiences,
        studyName,
        studyTrack,
        brandV4Options
      );

      if (result) {
        // 2. Generate Assets immediately with V4 Campaign Configuration
        setGenerationStatus(t("Diseñando Materiales de Campaña (PDV / Canal V4, Social, Buscador, Email, YouTube)..."));
        const productName = result.productName || studyName || `${name} Diagnostic Panel`;

        const finalAssetsMap: Record<string, MarketingAssets> = {};
        try {
          setGenerationStatus(t(`Diseñando Materiales de Campaña (0/${result.audiences.length})...`));
          
          for (let i = 0; i < result.audiences.length; i++) {
            const aud = result.audiences[i];
            setGenerationStatus(t(`Diseñando Materiales para ${aud.name} (${i + 1}/${result.audiences.length})...`));
            
            const verbatimGoal = goal.trim() || result.campaignGoal;
            const combinedGoal = `INSTRUCCIÓN OBLIGATORIA DEL USUARIO (SEGUIR AL PIE DE LA LETRA): ${verbatimGoal} | Audiencia Objetivo: ${aud.name} (${aud.ageRange || ''}) | Ángulo: ${aud.messagingAngle?.es || aud.messagingAngle?.en || ''}`;
            const assets = await generateMarketingCampaignAssets(productName, combinedGoal, context, brandV4Options);
            finalAssetsMap[aud.name] = assets;
          }
        } catch (assetErr) {
          console.error("Failed to auto-generate assets:", assetErr);
        }

        // 3. Combine and Save with V4 metadata preserved
        const finalBrief: MarketingBriefData = {
          ...result,
          audienceSegment: result.audienceSegment || audienceSegment,
          funnelStage: result.funnelStage || funnelStage,
          channelKey: result.channelKey || channelKey,
          channelSubformat: result.channelSubformat || channelSubformat,
          slogan: result.slogan || 'Chopo, toda una vida cuidando la vida.',
          campaignAssetsMap: finalAssetsMap || undefined
        };

        setBrief(finalBrief);
        if (finalAssetsMap) {
          setCampaignAssetsMap(finalAssetsMap);
          setSelectedAudience(result.audiences[0]?.name || "");
        }
        setActiveAssetTab(resolveDefaultAssetTab(finalBrief.channelKey));
        setStep(2);

        // Background Save
        fetch('/api/save-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureId: 'marketing_brief', data: finalBrief })
        }).catch(err => console.error("Failed to save brief to server:", err));
      }
    } catch (error) {
      console.error(error);
      alert(t("Error al generar el brief de marketing."));
    } finally {
      setIsLoading(false);
      setGenerationStatus("");
    }
  };

  const handleRegenerateAssets = async () => {
    if (!brief) return;
    setIsAssetLoading(true);
    try {
      const productName = brief.productName || `${name} Diagnostic Panel`;
      const newAssetsMap: Record<string, MarketingAssets> = {};
      const activeV4Options = {
        audienceSegment: brief.audienceSegment || audienceSegment,
        funnelStage: brief.funnelStage || funnelStage,
        channelKey: brief.channelKey || channelKey,
        channelSubformat: brief.channelSubformat || channelSubformat
      };
      
      for (let i = 0; i < brief.audiences.length; i++) {
        const aud = brief.audiences[i];
        setGenerationStatus(t(`Regenerando Materiales para ${aud.name} (${i + 1}/${brief.audiences.length})...`));
        
        const verbatimGoal = goal.trim() || brief.campaignGoal;
        const combinedGoal = `INSTRUCCIÓN OBLIGATORIA DEL USUARIO (SEGUIR AL PIE DE LA LETRA): ${verbatimGoal} | Audiencia Objetivo: ${aud.name} (${aud.ageRange || ''}) | Ángulo: ${aud.messagingAngle?.es || aud.messagingAngle?.en || ''}`;
        const assets = await generateMarketingCampaignAssets(productName, combinedGoal, context, activeV4Options);
        newAssetsMap[aud.name] = assets;
      }

      setCampaignAssetsMap(newAssetsMap);
      if (brief.audiences.length > 0) setSelectedAudience(brief.audiences[0].name);

      const updatedBrief = { ...brief, campaignAssetsMap: newAssetsMap };
      setBrief(updatedBrief);
      fetch('/api/save-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId: 'marketing_brief', data: updatedBrief })
      }).catch(err => console.error("Failed to save updated brief to server:", err));
    } catch (error) {
      console.error(error);
      alert(t("Error al regenerar los materiales de campaña."));
    } finally {
      setIsAssetLoading(false);
    }
  };

  const handleLoadLast = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/load-run/marketing_brief');
      if (!res.ok) throw new Error("No saved run");
      const data = await res.json();
      if (data) {
        setBrief(data);
        if (data.audienceSegment) setAudienceSegment(resolveSegmentKey(data.audienceSegment));
        if (data.funnelStage) setFunnelStage(data.funnelStage);
        if (data.channelKey) {
          setChannelKey(data.channelKey);
          setChannelSubformat(data.channelSubformat || (CHANNEL_SUBFORMATS[data.channelKey] || ['Formato Estándar'])[0]);
        }
        if (data.campaignAssetsMap) {
          setCampaignAssetsMap(data.campaignAssetsMap);
          if (data.audiences?.length) setSelectedAudience(data.audiences[0].name);
        }
        setActiveAssetTab(resolveDefaultAssetTab(data.channelKey));
        setStep(2);
      }
    } catch (e) {
      alert(t("No se encontró ningún brief guardado."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadEmailImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignAssetsMap || !selectedAudience || !brief) return;

    setIsUploadingEmailImage(true);
    try {
      const base64DataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      let uploadedUrl = base64DataUrl;
      try {
        const safeFilename = `email_banner_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const res = await fetch('/api/save-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64DataUrl, filename: safeFilename })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            uploadedUrl = data.url;
          }
        }
      } catch (uploadErr) {
        console.warn('Backend image upload failed, falling back to base64 data URL:', uploadErr);
      }

      const targetAssets = campaignAssetsMap[selectedAudience];
      if (targetAssets) {
        const updatedAudienceAssets: MarketingAssets = {
          ...targetAssets,
          email: {
            ...targetAssets.email,
            image: uploadedUrl
          }
        };
        const updatedMap = {
          ...campaignAssetsMap,
          [selectedAudience]: updatedAudienceAssets
        };
        const updatedBrief = {
          ...brief,
          campaignAssetsMap: updatedMap
        };
        setCampaignAssetsMap(updatedMap);
        setBrief(updatedBrief);

        fetch('/api/save-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureId: 'marketing_brief', data: updatedBrief })
        }).catch(err => console.error('Failed to save brief with updated email image:', err));
      }
    } catch (err) {
      console.error('Failed to upload email image:', err);
      alert(t('No se pudo cargar la imagen del correo.', 'Could not upload email image.'));
    } finally {
      setIsUploadingEmailImage(false);
      if (emailImageInputRef.current) {
        emailImageInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const fetchAudiences = async () => {
      try {
        const response = await fetch('/api/load-run/audience_generator');
        if (response.ok) {
          const data = await response.json();
          const personasData = Array.isArray(data) ? data : data.personas;
          if (personasData && Array.isArray(personasData)) {
            setAvailableAudiences(personasData);
            setSelectedAudienceNames(personasData.map((a: any) => a.name));
          }
        }
      } catch (err) {
        console.error("Failed to fetch available audiences:", err);
      }
    };
    const loadClinicalUseCases = async () => {
      try {
        const loaded = await fetchUseCases();
        if (Array.isArray(loaded) && loaded.length > 0) {
          setUseCases(loaded);
          const defaultUc = loaded.find(u => u.isDefault) || loaded[0];
          if (defaultUc) {
            setSelectedUseCaseId(defaultUc.id);
          }
        }
      } catch (err) {
        console.warn("Could not load clinical use cases from backend, using fallback seed:", err);
      }
    };
    fetchAudiences();
    loadClinicalUseCases();
  }, []);

  useEffect(() => {
    setContext(description);
  }, [description]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <FileText className="text-[#0066FF]" />
              <h1 className="page-title">{t('Generador de Brief de Marketing')}</h1>
            </div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#003B7A] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#63CF00]" />
              {t('Cumplimiento COFEPRIS • Manual de Marca V4 Chopo')}
            </span>
          </div>
          <p className="text-subtext mt-1">
            {t('Genera estrategias integrales multicanal y materiales creativos alineados al Manual V4 para Pacientes B2C, Médicos B2D y Empresas B2B.')}
          </p>
        </div>
      </div>

      <div className="flex-1 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">

      {isBusy && (
        <div className="mb-6 p-4 rounded-2xl bg-[#EFF6FF] border border-[#0066FF]/30 shadow-sm flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-[#0066FF] shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#003B7A]">
                {generationStatus || t('Procesando con IA... La edición y selección están bloqueadas temporalmente.')}
              </p>
              <p className="text-xs text-[#0066FF]">
                {t('Por favor espera a que finalice la operación actual antes de modificar campos o cambiar de selección.')}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-white text-[#003B7A] border border-blue-200 text-[11px] font-bold shrink-0">
            {t('Edición Bloqueada')}
          </span>
        </div>
      )}

      {step === 1 && (
        <div className={`space-y-8 mb-12 animate-fadeIn ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
          {/* Card 1 — Objetivo Estratégico, Configuración Manual V4 y Contexto Institucional */}
          <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#0066FF] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0">
                  <Target size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#003B7A]">
                    {t('1. Objetivo Estratégico y Configuración de Campaña')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('Define los lineamientos de audiencia, funnel, canal principal y la meta comercial o clínica que deseas impulsar.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setIsContextExpanded(!isContextExpanded)}
                className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#003B7A] border border-slate-200 hover:border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                {isContextExpanded ? <ChevronUp size={15} className="text-[#0066FF]" /> : <ChevronDown size={15} className="text-[#0066FF]" />}
                <span>{t('Editar Contexto Institucional de Chopo')}</span>
              </button>
            </div>

            {/* Compact 1-line Institutional Context Summary or Expanded Editor */}
            {!isContextExpanded ? (
              <div className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex items-center justify-between gap-3 text-xs text-slate-600">
                <div className="truncate">
                  <span className="font-bold text-[#003B7A] mr-1.5">{t('Contexto Institucional:')}</span>
                  <span>{context}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-blue-200 space-y-2 animate-fadeIn">
                <label className="block text-xs font-bold text-[#003B7A] uppercase tracking-wider">
                  {t('Contexto Institucional de Laboratorio Médico del Chopo')}
                </label>
                <textarea
                  rows={2}
                  disabled={isBusy}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-y transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder={t(`ej. ${brandConfig.companyName} - Diagnóstico Clínico e Imagenología`)}
                />
              </div>
            )}

            {/* Configuración de Campaña (Manual V4) */}
            <div className="p-5 rounded-2xl bg-[#EFF9FE] border border-[#BDD4F2] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#BDD4F2]/80">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-[#005FFC]" />
                  <h3 className="text-sm font-bold text-[#004699]">
                    {t('Configuración de Campaña (Manual V4)')}
                  </h3>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-[#004699] border border-[#BDD4F2]">
                  {t('Aplica voz, funnel y formato oficial automáticamente')}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* 1. Segmento de Audiencia */}
                <div className="bg-white p-4 rounded-xl border border-[#BDD4F2]/80 space-y-2.5">
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wider">
                    {t('1. Segmento de Audiencia')}
                  </label>
                  <div className="space-y-2">
                    {V4_AUDIENCE_SEGMENTS.map((seg) => {
                      const isActive = audienceSegment === seg.key;
                      return (
                        <button
                          key={seg.key}
                          type="button"
                          disabled={isBusy}
                          onClick={() => setAudienceSegment(seg.key)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                            isActive
                              ? 'bg-[#005FFC] text-white border-[#005FFC] shadow-sm'
                              : 'bg-[#F8FAFC] hover:bg-[#EFF9FE] text-[#004699] border-slate-200'
                          }`}
                        >
                          <div className="text-xs font-bold">{seg.label}</div>
                          <div className={`text-[11px] mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                            {seg.pronounHint}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Etapa del Funnel */}
                <div className="bg-white p-4 rounded-xl border border-[#BDD4F2]/80 space-y-2.5">
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wider">
                    {t('2. Etapa del Funnel')}
                  </label>
                  <div className="space-y-2">
                    {V4_FUNNEL_STAGES.map((stage) => {
                      const isActive = funnelStage === stage.key;
                      return (
                        <button
                          key={stage.key}
                          type="button"
                          disabled={isBusy}
                          onClick={() => setFunnelStage(stage.key)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                            isActive
                              ? 'bg-[#004699] text-white border-[#004699] shadow-sm'
                              : 'bg-[#F8FAFC] hover:bg-[#EFF9FE] text-[#004699] border-slate-200'
                          }`}
                        >
                          <div className="text-xs font-bold">{stage.label}</div>
                          <div className={`text-[11px] mt-0.5 leading-snug ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                            {stage.ruleHint}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Canal Principal y Subformato */}
                <div className="bg-white p-4 rounded-xl border border-[#BDD4F2]/80 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-[#004699] uppercase tracking-wider">
                      {t('3. Canal Principal y Subformato')}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {V4_CHANNELS.map((ch) => {
                        const isActive = channelKey === ch.key;
                        return (
                          <button
                            key={ch.key}
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleChannelChange(ch.key)}
                            className={`px-2.5 py-2 rounded-lg text-left border transition-all ${
                              isActive
                                ? 'bg-[#005FFC] text-white border-[#005FFC] shadow-sm'
                                : 'bg-[#F8FAFC] hover:bg-[#EFF9FE] text-[#004699] border-slate-200'
                            }`}
                          >
                            <div className="text-xs font-bold leading-tight">{ch.label}</div>
                            <div className={`text-[10px] mt-0.5 leading-tight ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                              {ch.shortDesc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#004699] uppercase tracking-wider mb-1.5">
                      {t('Subformato de Pieza')}
                    </label>
                    <select
                      disabled={isBusy}
                      value={channelSubformat}
                      onChange={(e) => setChannelSubformat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#BDD4F2] bg-[#F8FAFC] focus:bg-white text-xs font-bold text-[#004699] focus:outline-none focus:ring-2 focus:ring-[#005FFC]"
                    >
                      {(CHANNEL_SUBFORMATS[channelKey] || ['Formato Estándar']).map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003B7A] uppercase tracking-wider mb-1">
                {t('Objetivo Estratégico de la Campaña / Promoción (B2C / B2D / B2B)')}
              </label>
              <p className="text-xs text-slate-500 mb-2">
                {t('Se actualiza automáticamente al elegir un estudio clínico abajo, pero puedes personalizar el enfoque comercial, descuento o mensaje clave.')}
              </p>
              <textarea
                rows={3}
                disabled={isBusy}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#F8FAFC] focus:bg-white text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-y transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={t("Describe lo que deseas lograr con este estudio clínico en pacientes, médicos o empresas...")}
              />
            </div>
          </div>

          {/* Card 2 — Catálogo de Estudios y Casos de Uso Clínicos */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#003B7A]">
                    {t('2. Selección de Estudio Clínico de la Parrilla', '2. Clinical Study Selection')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('Elige el estudio o check-up diagnóstico para vincular sus estudios incluidos, preparación del paciente, reglas de realismo médico y permisos COFEPRIS.', 'Choose the diagnostic study or check-up to link its included studies, patient preparation, medical realism rules, and COFEPRIS permits.')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => openUseCaseManager(selectedUseCase)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#003B7A] border border-slate-200 hover:border-blue-200 text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings size={15} className="text-[#0066FF]" />
                <span>{t('Administrar Estudios Clínicos', 'Manage Clinical Studies')}</span>
              </button>
            </div>

            {/* Selectable Study Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {useCases.map((uc) => {
                const isActive = uc.id === selectedUseCase?.id;
                return (
                  <button
                    key={uc.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSelectUseCase(uc)}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-[#EFF6FF]/60 border-[#0066FF] ring-2 ring-[#0066FF]/15 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-[#0066FF]/60 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#0066FF] border border-blue-100">
                        {cleanCategoryLabel(uc.category)}
                      </span>
                      {isActive && <CheckCircle2 size={18} className="text-[#0066FF] shrink-0" />}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[#003B7A] leading-snug">
                        {uc.studyName}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {(uc.includedStudies || []).length} {t('parámetros clínicos incluidos', 'clinical parameters included')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Study Clinical & Regulatory Sheet (Zero Truncation) */}
            {selectedUseCase && (
              <div className="p-6 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#78D600]" />
                    <h3 className="text-sm font-bold text-[#003B7A]">
                      {t('Ficha Técnica y Normativa del Estudio Seleccionado:', 'Selected Study Technical & Regulatory Sheet:')} <span className="text-[#0066FF]">{selectedUseCase.studyName}</span>
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {cleanCategoryLabel(selectedUseCase.category)}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Col 1 — Estudios Incluidos y Preparación */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200/90 space-y-3">
                    <span className="font-bold text-[#003B7A] uppercase text-xs tracking-wider block">
                      {t('Estudios Incluidos y Preparación', 'Included Studies & Preparation')}
                    </span>
                    <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                      {(selectedUseCase.includedStudies || []).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#0066FF] font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Col 2 — Preparación e Indicaciones al Paciente */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200/90 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="font-bold text-[#003B7A] uppercase text-xs tracking-wider block">
                        {t('Indicaciones para el Paciente', 'Patient Instructions')}
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {selectedUseCase.fastingRequirement}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#EFF6FF] border border-blue-100 text-xs text-[#003B7A] leading-relaxed">
                      <strong className="font-bold text-[#0066FF] block mb-0.5">
                        {t('Condición Comercial Vigente:', 'Active Commercial Term:')}
                      </strong>
                      {(selectedUseCase as any).sampleCondition || selectedUseCase.defaultPromoText}
                    </div>
                  </div>

                  {/* Col 3 — Reglas de Realismo Médico y Regulación COFEPRIS */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200/90 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="font-bold text-[#003B7A] uppercase text-xs tracking-wider block">
                        {t('Reglas de Realismo Médico', 'Medical Realism Rules')}
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {cleanRealismRules(selectedUseCase.visualRealismRules)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1 leading-relaxed">
                      <p className="font-bold text-[#003B7A]">{selectedUseCase.cofeprisPermitB2C}</p>
                      <p className="text-slate-600">{selectedUseCase.responsableSanitario}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3 — Audiencias Objetivo y Generación */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#003B7A]">
                    {t('3. Audiencias Objetivo Vinculadas', '3. Linked Target Audiences')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('Haz clic en cualquier tarjeta para seleccionarla o deseleccionarla en la campaña, o abre su ficha técnica detallada.', 'Click any card to toggle its selection for the campaign, or open its detailed technical sheet.')}
                  </p>
                </div>
              </div>

              {availableAudiences.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs font-bold text-[#003B7A]">
                    <span className="w-2 h-2 rounded-full bg-[#78D600]" />
                    {selectedAudienceNames.length} {t('de', 'of')} {availableAudiences.length} {t('seleccionadas', 'selected')}
                  </span>
                  <div className="inline-flex flex-wrap items-center bg-[#F8FAFC] p-1 rounded-xl border border-slate-200 gap-1">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setSelectedAudienceNames(availableAudiences.map((a) => a.name))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                        selectedAudienceNames.length === availableAudiences.length
                          ? 'bg-[#0066FF] text-white shadow-sm'
                          : 'text-slate-600 hover:text-[#003B7A] hover:bg-white'
                      }`}
                    >
                      {t('Todas')}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        setSelectedAudienceNames(
                          availableAudiences.filter((a) => getAudienceSegmentCode(a) === 'B2C').map((a) => a.name)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-[#0066FF] hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {t('Solo Pacientes B2C')}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        setSelectedAudienceNames(
                          availableAudiences.filter((a) => getAudienceSegmentCode(a) === 'B2D').map((a) => a.name)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {t('Solo Médicos B2D')}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        setSelectedAudienceNames(
                          availableAudiences.filter((a) => getAudienceSegmentCode(a) === 'B2B').map((a) => a.name)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-700 hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {t('Solo Empresas B2B')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {availableAudiences.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableAudiences.map((aud, index) => {
                  const rawName: string = aud.name || '';
                  const segBadge = getAudienceSegmentBadge(aud);
                  const cleanedTitle = formatDisplayPersonaName(rawName).replace(/^\[[^\]]+\]\s*/, '').trim() || formatDisplayPersonaName(rawName);
                  const isSelected = selectedAudienceNames.includes(rawName);
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (isBusy) return;
                        toggleAudienceSelection(rawName);
                      }}
                      className={`p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                        isBusy ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isSelected
                          ? 'bg-[#EFF6FF]/60 border-[#0066FF] ring-2 ring-[#0066FF]/15 shadow-sm'
                          : 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-blue-300'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${segBadge.className}`}
                          >
                            {segBadge.label}
                          </span>
                          {isSelected ? (
                            <CheckCircle2 size={18} className="text-[#0066FF] shrink-0" />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 shrink-0" />
                          )}
                        </div>
                        <p className="font-bold text-[#003B7A] text-sm leading-snug">
                          {cleanedTitle}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-600 font-medium leading-snug">
                          {aud.personaName || aud.bio || t('Audiencia Activa')}
                        </span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isBusy) return;
                            setSelectedAudienceModal(aud);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0066FF] hover:text-[#003B7A] bg-white hover:bg-[#EFF6FF] px-2.5 py-1 rounded-lg border border-blue-200/80 transition-colors shrink-0 disabled:opacity-50"
                        >
                          <Eye size={13} />
                          <span>{t('Ver más información')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-600">
                {t('El brief generará automáticamente segmentos estratégicos para Pacientes B2C, Médicos B2D y Empresas B2B basados en la configuración de campaña y el estudio clínico seleccionado.')}
              </div>
            )}

            {/* Action Footer Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div>
                {availableAudiences.length > 0 && selectedAudienceNames.length === 0 && (
                  <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                    {t('Selecciona al menos una audiencia objetivo para generar el brief.', 'Select at least one target audience to generate the brief.')}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 ml-auto">
                <button
                  type="button"
                  onClick={handleLoadLast}
                  disabled={isBusy}
                  className="btn-secondary px-5 py-3 text-sm font-bold disabled:opacity-50"
                  title={t("Cargar Último Brief Guardado", "Load Last Saved Brief")}
                >
                  {t('Cargar Último Brief', 'Load Last Brief')}
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={
                    isBusy ||
                    !context.trim() ||
                    !goal.trim() ||
                    (availableAudiences.length > 0 && selectedAudienceNames.length === 0)
                  }
                  className="btn-primary px-6 py-3 text-sm font-bold flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  <span>
                    {isLoading
                      ? generationStatus
                      : t('Generar Brief y Materiales de Campaña', 'Generate Campaign Brief & Assets')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && brief && (
        <div className={`animate-fadeIn ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <button
              disabled={isBusy}
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-subtext hover:text-[#0066FF] font-semibold transition-colors disabled:opacity-50"
            >
              <ArrowLeft size={20} /> {t('Volver a Configuración', 'Back to Input')}
            </button>
            {setMode && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setMode(AppMode.SYNTHETIC_FOCUS_GROUP)}
                className="px-5 py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span>{t('Siguiente Paso: 4. Evaluar esta Campaña en Focus Group ➔', 'Next Step: 4. Evaluate this Campaign in Focus Group ➔')}</span>
              </button>
            )}
          </div>

          <div className="content-card overflow-hidden p-0">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-bold text-heading">{brief.title}</h3>
                <p className="text-subtext">{t('Fecha:', 'Timestamp:')} {brief.timestamp}</p>
                <p className="text-subtext mt-2 text-sm">{t('Objetivo de Campaña:', 'Campaign Goal:')} {brief.campaignGoal}</p>
              </div>
            </div>

            <div className="p-8 space-y-12">

              {/* 1. Assumptions & Resources */}
              <section>
                <h4 className="section-header border-b-2 border-slate-200 pb-2 uppercase tracking-wide">
                  <span className="bg-[#0066FF] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">1</span>
                  {t('Supuestos y Cumplimiento Regulatorio', 'Assumptions & Regulatory Compliance')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Zap className="text-amber-500 shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-xs uppercase text-subtext tracking-wider">{t('Presupuesto', 'Budget')}</p>
                        <p className="text-heading font-medium">{brief.assumptions.budget}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Calendar className="text-[#0066FF] shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-xs uppercase text-subtext tracking-wider">{t('Cronograma', 'Timeline')}</p>
                        <p className="text-heading font-medium">{brief.assumptions.timeline}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Target className="text-[#0066FF] shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-xs uppercase text-subtext tracking-wider">{t('Foco Principal de Conversión', 'Primary Sales Focus')}</p>
                        <p className="text-heading font-medium">{brief.assumptions.primarySalesFocus}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <ShieldCheck className="text-emerald-600 shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-xs uppercase text-subtext tracking-wider">{t('Estrategia de Mitigación (COFEPRIS)', 'Mitigation Strategy (COFEPRIS)')}</p>
                        <p className="text-heading font-medium">{brief.assumptions.mitigationStrategy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Campaign Objective */}
              <section>
                <h4 className="section-header border-b-2 border-slate-200 pb-2 uppercase tracking-wide">
                  <span className="bg-[#0066FF] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">2</span>
                  {t('Objetivo de Campaña', 'Campaign Objective')}
                </h4>
                <div className="p-6 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="mb-6">
                    <p className="font-bold text-xs uppercase text-subtext mb-2 tracking-wider">{t('Meta', 'Goal')}</p>
                    <p className="text-xl text-heading font-medium italic leading-relaxed">"{language === 'en' ? brief.objective.goal.en : brief.objective.goal.es}"</p>
                  </div>
                  <div>
                    <p className="font-bold text-xs uppercase text-subtext mb-2 tracking-wider">{t('KPI Objetivo', 'Target KPI')}</p>
                    <p className="text-lg text-heading font-semibold">{language === 'en' ? brief.objective.targetKpi.en : brief.objective.targetKpi.es}</p>
                  </div>
                </div>
              </section>

              {/* 3. Target Audiences */}
              <section>
                <h4 className="section-header border-b-2 border-slate-200 pb-2 uppercase tracking-wide">
                  <span className="bg-[#0066FF] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">3</span>
                  {t('Audiencias Objetivo (Perfiles)', 'Target Audiences (Personas)')}
                </h4>
                <div className="grid grid-cols-1 gap-8">
                  {brief.audiences.map((persona, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                        <div>
                          <h5 className="text-lg font-bold text-heading">{persona.name}</h5>
                          <p className="text-sm text-subtext">{t('Origen:', 'Source:')} {persona.sourceSegment}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-subtext uppercase">{t('Rango de Edad', 'Age Range')}</p>
                          <p className="text-heading font-medium">{persona.ageRange}</p>
                        </div>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                        <div>
                          <p className="font-bold text-sm uppercase text-subtext mb-3">{t('Puntos de Dolor y Motivadores', 'Pain Points & Drivers')}</p>
                          <ul className="space-y-2">
                            {persona.painPoints.map((point, pi) => (
                              <li key={pi} className="flex gap-2 text-sm text-slate-600">
                                <span className="text-[#0066FF]">•</span> {point}
                              </li>
                            ))}
                            {persona.drivers.map((driver, di) => (
                              <li key={di} className="flex gap-2 text-sm text-slate-600">
                                <span className="text-emerald-600">•</span> {driver}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-[#EFF6FF] p-4 rounded-lg border border-blue-100">
                          <p className="font-bold text-sm uppercase text-[#0066FF] mb-2">{t('Ángulo de Comunicación', 'Messaging Angle')}</p>
                          <p className="text-heading font-medium italic">
                            "{language === 'en' ? persona.messagingAngle.en : persona.messagingAngle.es}"
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 4. KPI Requirements */}
              {brief.kpis && brief.kpis.length > 0 && (
                <section>
                  <h4 className="section-header border-b-2 border-slate-200 pb-2 uppercase tracking-wide">
                    <span className="bg-[#0066FF] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">4</span>
                    {t('Requerimientos de KPIs', 'KPI Requirements')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {brief.kpis.map((kpi, index) => (
                      <div key={index} className="p-6 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                          <ListChecks size={20} />
                        </div>
                        <p className="font-bold text-slate-900">{kpi.title}</p>
                        <p className="text-sm text-subtext leading-relaxed">{kpi.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. Value Proposition */}
              {brief.valueProp && (
                <section>
                  <h4 className="section-header border-b-2 border-slate-200 pb-2 uppercase tracking-wide">
                    <span className="bg-[#0066FF] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">5</span>
                    {t('Propuesta de Valor', 'Value Proposition')}
                  </h4>
                  <div className="space-y-6">
                    <div className="p-8 rounded-2xl bg-gradient-to-br from-[#0066FF] to-[#004ECC] text-white shadow-lg">
                      <div className="flex items-center gap-3 mb-4 opacity-90">
                        <Award size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">{t('Narrativa Central', 'Core Narrative')}</span>
                      </div>
                      <p className="text-2xl font-bold leading-tight uppercase">
                        {language === 'en' ? brief.valueProp.main.en : brief.valueProp.main.es}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-xl border border-slate-100 bg-slate-50">
                        <p className="font-bold text-xs uppercase text-subtext mb-3 tracking-wider">{t('Ventaja Competitiva', 'Competitive Edge')}</p>
                        <p className="text-heading text-sm leading-relaxed">{brief.valueProp.againstCompetitors}</p>
                      </div>
                      <div className="p-6 rounded-xl border border-slate-100 bg-slate-50">
                        <p className="font-bold text-xs uppercase text-subtext mb-3 tracking-wider">{t('Contexto de Mercado', 'Market Context')}</p>
                        <p className="text-heading text-sm leading-relaxed">{brief.valueProp.addressingTrends}</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 6. Recommended Messaging Hook */}
              {brief.messaging && (
                <section>
                  <h4 className="section-header border-b-2 border-slate-200 pb-2 uppercase tracking-wide">
                    <span className="bg-[#0066FF] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">6</span>
                    {t('Mensajes Recomendados', 'Recommended Messaging')}
                  </h4>
                  <div className="p-6 rounded-xl border border-slate-200 bg-white">
                    <div className="mb-8">
                       <p className="font-bold text-xs uppercase text-subtext mb-2 tracking-wider">{t('Gancho Principal de Campaña', 'Primary Campaign Hook')}</p>
                       <p className="text-xl font-bold text-[#0066FF] italic">"{language === 'en' ? brief.messaging.primaryHook.en : brief.messaging.primaryHook.es}"</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <MessageCircle size={16} className="text-[#0066FF]" />
                          {brief.messaging.supporting1.title}
                        </p>
                        <p className="text-sm text-subtext leading-relaxed">
                          {language === 'en' ? brief.messaging.supporting1.content.en : brief.messaging.supporting1.content.es}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <MessageCircle size={16} className="text-[#0066FF]" />
                          {brief.messaging.supporting2.title}
                        </p>
                        <p className="text-sm text-subtext leading-relaxed">
                          {language === 'en' ? brief.messaging.supporting2.content.en : brief.messaging.supporting2.content.es}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 7. Strategic Channels */}
              {brief.channels && brief.channels.length > 0 && (
                <section>
                  <h4 className="section-header border-b-2 border-slate-200 pb-2 uppercase tracking-wide">
                    <span className="bg-[#0066FF] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">7</span>
                    {t('Canales Estratégicos', 'Strategic Channels')}
                  </h4>
                  <div className="space-y-3">
                    {brief.channels.map((channel, ci) => (
                      <div key={ci} className="p-4 rounded-xl border border-slate-100 bg-white flex items-center gap-6 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#0066FF] shrink-0">
                           <Globe size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{channel.name}</p>
                          <p className="text-sm text-subtext">{channel.justification}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 8. Campaign Phases */}
              {brief.phases && brief.phases.length > 0 && (
                <section>
                  <h4 className="section-header border-b-2 border-slate-200 pb-2 uppercase tracking-wide">
                    <span className="bg-[#0066FF] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">8</span>
                    {t('Fases de Campaña', 'Campaign Phases')}
                  </h4>
                  <div className="space-y-4">
                    {brief.phases.map((phase, pi) => (
                      <div key={pi} className="relative pl-8 border-l-2 border-blue-100 pb-8 last:pb-0">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-[#0066FF] border-4 border-white"></div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                           <h5 className="font-bold text-lg text-heading">{phase.title}</h5>
                           <span className="px-3 py-1 rounded-full bg-[#EFF6FF] text-[#0066FF] text-[10px] font-black uppercase tracking-widest border border-blue-100">
                             <Clock size={10} className="inline mr-1 mb-0.5" />
                             {phase.dates}
                           </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-subtext uppercase tracking-widest mb-1">{t('Enfoque Estratégico', 'Strategic Focus')}</p>
                            <p className="text-sm text-slate-800 font-medium">{phase.focus}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-subtext uppercase tracking-widest mb-1">{t('Meta Principal', 'Primary Goal')}</p>
                            <p className="text-sm text-slate-800 font-medium">{phase.goal}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 9. Campaign Preview (Generated Assets & Manual V4 Modular Preview) */}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b-2 border-slate-200 pb-2">
                  <h4 className="section-header uppercase tracking-wide mb-0">
                    <span className="bg-[#005FFC] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">9</span>
                    {t('Vista Previa Creativa de Campaña')}
                  </h4>
                  {!campaignAssetsMap && (
                    <button
                      onClick={handleRegenerateAssets}
                      disabled={isAssetLoading}
                      className="bg-[#005FFC] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#004699] transition-colors disabled:opacity-50"
                    >
                      {isAssetLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      {isAssetLoading ? t("Regenerando...") : t("Regenerar Materiales")}
                    </button>
                  )}
                </div>

                {/* V4 Metadata Badges Bar */}
                {(() => {
                  const activeBriefSegment = brief.audienceSegment || audienceSegment;
                  const activeBriefFunnel = brief.funnelStage || funnelStage;
                  const activeBriefChannel = brief.channelKey || channelKey;
                  const activeBriefSubformat = brief.channelSubformat || channelSubformat;
                  const activeBriefSlogan = brief.slogan || 'Chopo, toda una vida cuidando la vida.';
                  return (
                    <div className="mb-6 space-y-4 font-chopo-v4">
                      <div className="p-4 rounded-2xl bg-[#EFF9FE] border border-[#BDD4F2] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#BDD4F2] text-xs font-medium text-[#004699]">
                            <span className="font-bold text-[#005FFC]">{t('Segmento:')}</span>
                            <span>{getSegmentDisplayLabel(activeBriefSegment)}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#BDD4F2] text-xs font-medium text-[#004699]">
                            <span className="font-bold text-[#005FFC]">{t('Funnel:')}</span>
                            <span>{getFunnelDisplayLabel(activeBriefFunnel)}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#BDD4F2] text-xs font-medium text-[#004699]">
                            <span className="font-bold text-[#005FFC]">{t('Canal / Subformato:')}</span>
                            <span>{getChannelDisplayLabel(activeBriefChannel)} · {activeBriefSubformat}</span>
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none rounded-br-2xl bg-[#BDD4F2] text-[#004699] text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-[#63CF00] shrink-0" />
                          <span>{activeBriefSlogan}</span>
                        </div>
                      </div>

                      {/* Pieza Adaptada al Canal Seleccionado (when channelAdaptedCopy is returned) */}
                      {brief.channelAdaptedCopy && (
                        <div className="bg-white rounded-2xl border border-[#BDD4F2] overflow-hidden shadow-sm">
                          <div className="bg-[#004699] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b-4 border-b-[#63CF00]">
                            <div className="flex items-center gap-2">
                              <LayoutTemplate size={16} className="text-[#63CF00]" />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {t('Pieza Adaptada al Canal Seleccionado')} — {getChannelDisplayLabel(activeBriefChannel)} ({activeBriefSubformat})
                              </span>
                            </div>
                            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#F24360] text-white">
                              Manual V4
                            </span>
                          </div>
                          <div className="p-5 bg-[#EFF9FE]/50">
                            <div className="bg-[#BDD4F2] text-[#004699] p-5 rounded-none rounded-br-2xl whitespace-pre-line text-sm font-medium leading-relaxed shadow-sm">
                              {brief.channelAdaptedCopy}
                            </div>
                            {Array.isArray(brief.preFlightComplianceCheck) && brief.preFlightComplianceCheck.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {brief.preFlightComplianceCheck.map((checkItem, ci) => (
                                  <span
                                    key={ci}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  >
                                    <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                    <span>{checkItem}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isAssetLoading ? (
                  <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                    <Loader2 className="animate-spin mx-auto text-[#005FFC] mb-4" size={48} />
                    <p className="text-slate-500 font-medium">{t('Creando materiales multicanal basados en el brief...')}</p>
                  </div>
                ) : currentAssets && campaignAssetsMap ? (
                  <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                    {/* Audience Toggles */}
                    <div className="flex justify-center pt-6 bg-white px-4">
                      <div className="flex flex-wrap justify-center bg-slate-100 rounded-full p-1 shadow-sm border border-slate-200">
                        {Object.keys(campaignAssetsMap).map((aud) => (
                          <button
                            key={aud}
                            disabled={isBusy}
                            onClick={() => setSelectedAudience(aud)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${selectedAudience === aud
                              ? 'bg-[#005FFC] text-white shadow-md'
                              : 'text-subtext hover:text-heading'
                              }`}
                          >
                            {formatDisplayPersonaName(aud)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 bg-white overflow-x-auto mt-4">
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('v4_modular')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[120px] transition-colors disabled:opacity-50 ${activeAssetTab === 'v4_modular' ? 'bg-slate-50 text-[#005FFC] border-t-2 border-[#005FFC] font-bold' : 'text-subtext hover:text-heading'}`}
                      >
                        <LayoutTemplate size={18} /> {t('PDV / Canal V4')}
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('social')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors disabled:opacity-50 ${activeAssetTab === 'social' ? 'bg-slate-50 text-[#005FFC] border-t-2 border-[#005FFC] font-bold' : 'text-subtext hover:text-heading'}`}
                      >
                        <Share2 size={18} /> Social
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('search')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors disabled:opacity-50 ${activeAssetTab === 'search' ? 'bg-slate-50 text-[#005FFC] border-t-2 border-[#005FFC] font-bold' : 'text-subtext hover:text-heading'}`}
                      >
                        <Search size={18} /> {t('Buscador')}
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('email')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors disabled:opacity-50 ${activeAssetTab === 'email' ? 'bg-slate-50 text-[#005FFC] border-t-2 border-[#005FFC] font-bold' : 'text-subtext hover:text-heading'}`}
                      >
                        <Mail size={18} /> Email
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('youtube')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors disabled:opacity-50 ${activeAssetTab === 'youtube' ? 'bg-slate-50 text-[#005FFC] border-t-2 border-[#005FFC] font-bold' : 'text-subtext hover:text-heading'}`}
                      >
                        <Youtube size={18} /> YouTube
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('website')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[90px] transition-colors disabled:opacity-50 ${activeAssetTab === 'website' ? 'bg-slate-50 text-[#005FFC] border-t-2 border-[#005FFC] font-bold' : 'text-subtext hover:text-heading'}`}
                      >
                        <Globe size={18} /> {t('Sitio Web')}
                      </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-8 bg-slate-50 flex items-center justify-center min-h-[500px]">
                      <div className={`w-full flex flex-col items-center ${activeAssetTab === 'website' ? 'max-w-4xl' : 'max-w-lg'}`}>
                        {/* PDV / Canal V4 Modular Creative Preview (Official Roboto + Modular #BDD4F2/#004699 + #F24360 + SVG Logo) */}
                        {activeAssetTab === 'v4_modular' && (() => {
                          const v4Funnel = brief.funnelStage || funnelStage;
                          const v4Channel = brief.channelKey || channelKey;
                          const v4Subformat = brief.channelSubformat || channelSubformat;
                          const v4Slogan = brief.slogan || 'Chopo, toda una vida cuidando la vida.';
                          const v4Headline =
                            currentAssets.email?.bannerHeadline ||
                            currentAssets.search?.headline ||
                            brief.messaging?.primaryHook?.es ||
                            brief.productName;
                          const v4Body =
                            brief.channelAdaptedCopy ||
                            currentAssets.social?.caption ||
                            currentAssets.search?.description ||
                            '';
                          const v4CtaText =
                            currentAssets.email?.ctaText || 'Agenda tu estudio en chopo.com.mx';
                          const v4Legal =
                            currentAssets.email?.legalFooter ||
                            'Consulte a su médico. Permiso de Publicidad COFEPRIS No. 2609152002A00518.';
                          const isPerformance = v4Funnel === 'performance';

                          return (
                            <div className="font-chopo-v4 bg-white shadow-lg border border-slate-200 overflow-hidden w-full rounded-none rounded-br-2xl">
                              {/* Clean Base Photo + Official SVG Logo Overlay + Promo Badge */}
                              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                                {currentAssets.image ? (
                                  <img
                                    src={currentAssets.image}
                                    alt={brief.productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                                    {t('Imagen base no disponible')}
                                  </div>
                                )}

                                {/* Official SVG Logo Overlay (Clean Vector, Never AI-Drawn) */}
                                <div className="absolute top-0 left-0 bg-white/95 px-4 py-2.5 rounded-none rounded-br-2xl shadow-sm">
                                  <img
                                    src="/images/chopo-logo.svg"
                                    alt="Laboratorio Médico del Chopo"
                                    className="h-7 w-auto"
                                  />
                                </div>

                                {/* Official Promo Badge (#F24360 background + #FFFFFF text) */}
                                <div className="absolute top-4 right-0 bg-[#F24360] text-white px-4 py-1.5 rounded-l-full shadow-md text-xs font-bold tracking-wide">
                                  {v4Subformat}
                                </div>

                                {/* Basal Green Signature Line (#63CF00) */}
                                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[#63CF00]" />
                              </div>

                              {/* Modular Card Attached to Frame (#BDD4F2 bg + #004699 text, 3 sharp corners + 1 bottom-right rounded) */}
                              <div className="bg-[#BDD4F2] text-[#004699] p-6 rounded-none rounded-br-2xl space-y-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="inline-block bg-[#F24360] text-white text-[11px] font-bold px-3 py-1 rounded-full">
                                    {t('Precio especial en línea')}
                                  </span>
                                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#004699]/80">
                                    {getChannelDisplayLabel(v4Channel)} • {getFunnelDisplayLabel(v4Funnel)}
                                  </span>
                                </div>

                                {/* Headline — Roboto Black (900) */}
                                <h3 className="text-2xl font-black leading-tight text-[#004699]">
                                  {v4Headline}
                                </h3>

                                {/* Slogan — Roboto Bold (700) */}
                                <p className="text-sm font-bold text-[#005FFC]">
                                  {v4Slogan}
                                </p>

                                {/* Funnel-Aware CTA (Performance: CTA prominent above body) */}
                                {isPerformance && (
                                  <div className="pt-1">
                                    <span className="inline-block bg-[#005FFC] text-white text-xs font-medium px-5 py-2.5 rounded-full shadow-sm">
                                      {v4CtaText}
                                    </span>
                                  </div>
                                )}

                                {/* Body — Roboto Medium (500) */}
                                <p className="text-sm font-medium text-[#004699] leading-relaxed whitespace-pre-line">
                                  {v4Body}
                                </p>

                                {/* Funnel-Aware CTA (Awareness / Consideration: discrete CTA below body) */}
                                {!isPerformance && (
                                  <div className="pt-1">
                                    <span className="inline-block bg-[#004699] text-white text-xs font-medium px-4 py-2 rounded-full">
                                      {v4CtaText}
                                    </span>
                                  </div>
                                )}

                                {/* Official Contact Bar + Legal — Roboto Light (300) */}
                                <div className="pt-3 border-t border-[#004699]/20 space-y-1">
                                  {!brief.channelAdaptedCopy && (
                                    <p className="text-[11px] font-medium text-[#004699]">
                                      {buildBrandSlices(null, {
                                        audienceSegment: brief.audienceSegment || audienceSegment,
                                        funnelStage: v4Funnel,
                                        channelKey: v4Channel
                                      }).dynamicVars.contactBar}
                                    </p>
                                  )}
                                  <p className="text-[10px] font-light text-[#004699]/80 leading-snug">
                                    {v4Legal}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Social Media Preview (Manual V4 Typography + SVG Logo Overlay + Modular Strip) */}
                        {activeAssetTab === 'social' && (
                          <div className="font-chopo-v4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
                            <div className="p-3 flex items-center justify-between gap-3 border-b border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src="/images/chopo-logo.svg"
                                  alt="Laboratorio Médico del Chopo"
                                  className="h-6 w-auto"
                                />
                                <span className="text-xs font-bold text-[#004699]">{brandConfig.companyName}</span>
                              </div>
                              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#EFF9FE] text-[#005FFC] border border-[#BDD4F2]">
                                {brief.channelSubformat || channelSubformat}
                              </span>
                            </div>
                            <div className="relative aspect-square bg-slate-100 overflow-hidden">
                              {currentAssets.image ? (
                                <img src={currentAssets.image} alt="Campaña Chopo" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">{t('Imagen no disponible')}</div>
                              )}
                              {/* Official SVG Logo Overlay */}
                              <div className="absolute top-0 left-0 bg-white/95 px-3 py-2 rounded-none rounded-br-2xl shadow-sm">
                                <img src="/images/chopo-logo.svg" alt="Chopo" className="h-5 w-auto" />
                              </div>
                              {/* Promo Badge (#F24360 + #FFFFFF) */}
                              <div className="absolute top-3 right-0 bg-[#F24360] text-white px-3 py-1 rounded-l-full text-[11px] font-bold shadow">
                                {brief.productName}
                              </div>
                              {/* Basal Green Accent */}
                              <div className="absolute inset-x-0 bottom-0 h-1 bg-[#63CF00]" />
                            </div>
                            {/* V4 Modular Footer Card (#BDD4F2 + #004699, 3 sharp + 1 bottom-right rounded) */}
                            <div className="bg-[#BDD4F2] text-[#004699] px-4 py-3 rounded-none rounded-br-2xl">
                              <p className="text-base font-black leading-snug">
                                {currentAssets.email?.bannerHeadline || currentAssets.search?.headline || brief.productName}
                              </p>
                              <p className="text-xs font-bold text-[#005FFC] mt-0.5">
                                {brief.slogan || 'Chopo, toda una vida cuidando la vida.'}
                              </p>
                            </div>
                            <div className="p-4">
                              <div className="flex gap-4 mb-3">
                                <Heart size={22} className="text-slate-400" />
                                <MessageCircle size={22} className="text-slate-400" />
                                <Share2 size={22} className="text-slate-400" />
                              </div>
                              <p className="text-sm font-medium text-slate-800 mb-2 leading-relaxed">
                                <span className="font-bold mr-2 text-[#004699]">{brandConfig.companyName}</span>
                                {currentAssets.social.caption}
                              </p>
                              <p className="text-[#005FFC] text-xs font-medium">
                                {currentAssets.social.hashtags.join(' ')}
                              </p>
                              <p className="text-[10px] font-light text-slate-500 mt-3 pt-2 border-t border-slate-100">
                                {currentAssets.email?.legalFooter || 'Consulte a su médico. Permiso de Publicidad COFEPRIS No. 2609152002A00518.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Search Ad Preview */}
                        {activeAssetTab === 'search' && (
                          <div className="font-chopo-v4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 w-full">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-900 text-sm">{t('Patrocinado')}</span>
                              <span className="text-slate-500 text-xs">·</span>
                              <span className="text-slate-500 text-xs">{currentAssets.search.url}</span>
                            </div>
                            <h3 className="text-xl text-[#005FFC] hover:underline cursor-pointer font-black mb-2">
                              {currentAssets.search.headline}
                            </h3>
                            <p className="text-slate-700 text-sm font-medium leading-relaxed">
                              {currentAssets.search.description}
                            </p>
                            <p className="text-xs font-bold text-[#004699] mt-2">
                              {brief.slogan || 'Chopo, toda una vida cuidando la vida.'}
                            </p>

                            <div className="mt-6 pt-6 border-t border-slate-100">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('Imagen de Campaña')}</h4>
                              <div className="h-32 w-48 bg-white rounded-lg overflow-hidden border border-slate-200">
                                {currentAssets.image && <img src={currentAssets.image} alt={brief.productName} className="w-full h-full object-contain" />}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Email / Mailing Preview (V4 Roboto + Official SVG Logo + Modular Overlay + #D200F4 CTA + Upload Image Button) */}
                        {activeAssetTab === 'email' && (
                          <div className="font-chopo-v4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
                            <div className="bg-slate-50 p-3 border-b border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <img src="/images/chopo-logo.svg" alt="Laboratorio Médico del Chopo" className="h-5 w-auto" />
                                <span className="font-bold text-[#004699]">{t('De:')} {brandConfig.companyName}</span>
                              </div>
                              <span>{t('Justo ahora')}</span>
                            </div>
                            <div className="p-5">
                              <div className="mb-4 pb-4 border-b border-slate-100">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-[#005FFC] mb-0.5">
                                  {t('Asunto:')}
                                </div>
                                <h3 className="font-black text-lg text-[#004699] leading-snug mb-1.5">
                                  {currentAssets.email.subject}
                                </h3>
                                {currentAssets.email.preheader && (
                                  <p className="text-slate-500 text-xs font-medium">
                                    <span className="font-bold text-slate-600">{t('Preheader:')}</span> {currentAssets.email.preheader}
                                  </p>
                                )}
                              </div>

                              {/* Visual Banner with Official SVG Logo + Upload / Change Image Button */}
                              <div className="relative rounded-none rounded-br-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/10] mb-4 group">
                                {(currentAssets.email.image || currentAssets.image) ? (
                                  <img
                                    src={currentAssets.email.image || currentAssets.image || ''}
                                    alt={currentAssets.email.subject}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <ImageIcon size={32} />
                                    <span className="text-xs font-medium">{t('Sin imagen de banner')}</span>
                                  </div>
                                )}

                                {/* Official SVG Logo Overlaid Top-Left */}
                                <div className="absolute top-0 left-0 bg-white/95 px-3 py-2 rounded-none rounded-br-2xl shadow-sm z-10">
                                  <img
                                    src="/images/chopo-logo.svg"
                                    alt="Laboratorio Médico del Chopo"
                                    className="h-5 w-auto"
                                  />
                                </div>

                                {/* Upload / Change Banner Image Button (Preserved 100%) */}
                                <div className="absolute top-3 right-3 z-10">
                                  <input
                                    ref={emailImageInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUploadEmailImage}
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => emailImageInputRef.current?.click()}
                                    className="px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-[#004699] border border-slate-200 text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                                  >
                                    <Upload size={13} className="text-[#005FFC]" />
                                    {isUploadingEmailImage
                                      ? t('Subiendo...')
                                      : t('Subir / Cambiar Imagen')}
                                  </button>
                                </div>

                                {/* Basal Green Signature Line */}
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-[#63CF00]" />
                              </div>

                              {/* V4 Modular Headline Card (#BDD4F2 + #004699 + #F24360 Promo Badge) */}
                              <div className="bg-[#BDD4F2] text-[#004699] p-4 rounded-none rounded-br-2xl mb-5 space-y-1.5">
                                <span className="inline-block bg-[#F24360] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                  {currentAssets.email.bannerSubheadline || brief.productName}
                                </span>
                                <h4 className="font-black text-lg sm:text-xl leading-snug text-[#004699]">
                                  {currentAssets.email.bannerHeadline || currentAssets.search?.headline || currentAssets.email.subject}
                                </h4>
                                <p className="text-xs font-bold text-[#005FFC]">
                                  {brief.slogan || 'Chopo, toda una vida cuidando la vida.'}
                                </p>
                              </div>

                              {/* Concise Companion Copy + Official Mailing Magenta CTA (#D200F4) + Light Legal Footer */}
                              <div>
                                <p className="text-slate-800 text-sm font-medium leading-relaxed mb-5">
                                  {(currentAssets.email.body || '').replace(/\s*Incluye pie legal:[\s\S]*$/i, '').trim()}
                                </p>
                                <button
                                  type="button"
                                  className="w-full py-3 rounded-full font-medium text-sm bg-[#D200F4] text-white hover:bg-[#b500d4] transition-colors shadow-sm"
                                >
                                  {currentAssets.email.ctaText || t('Agendar Estudio en Línea')}
                                </button>
                                <p className="text-[11px] font-light text-slate-500 border-t border-slate-100 pt-3 mt-4 leading-relaxed">
                                  {currentAssets.email.legalFooter || 'Consulte a su médico. Permiso de Publicidad COFEPRIS No. 2609152002A00518.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* YouTube Shorts Preview */}
                        {activeAssetTab === 'youtube' && (
                          <div className="font-chopo-v4 bg-black rounded-2xl shadow-xl overflow-hidden relative aspect-[9/16] max-h-[600px] mx-auto w-full max-w-[340px]">
                            {currentAssets.image && (
                              <img src={currentAssets.image} alt={brief.productName} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>

                            <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-1.5 rounded-none rounded-br-xl">
                              <img src="/images/chopo-logo.svg" alt="Chopo" className="h-4 w-auto" />
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-[#005FFC] rounded-full flex items-center justify-center font-bold text-xs text-white">C</div>
                                <span className="font-bold text-sm">@{brandConfig.companyName.replace(/\s+/g, '').toLowerCase()}</span>
                                <button className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full">{t('Suscribirse')}</button>
                              </div>
                              <p className="text-sm mb-1 font-black">{currentAssets.youtube.title}</p>
                              <p className="text-xs mb-2 font-bold text-[#BDD4F2]">
                                {brief.slogan || 'Chopo, toda una vida cuidando la vida.'}
                              </p>
                              <div className="bg-white/20 backdrop-blur-md rounded-lg p-3 mb-4 border border-white/10">
                                <p className="text-xs text-white/90 font-bold">{t('GUION:')}</p>
                                <p className="text-xs font-medium text-white/90">{currentAssets.youtube.script}</p>
                              </div>
                              <button className="w-full py-3 rounded-lg font-medium text-sm bg-[#005FFC] text-white hover:bg-[#004699] transition-colors">
                                {t('Conoce más en chopo.com.mx')}
                              </button>
                            </div>

                            {/* UI Icons Overlay */}
                            <div className="absolute right-2 bottom-24 flex flex-col gap-6 items-center">
                              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <ThumbsUp size={24} className="text-white fill-white/20" />
                              </div>
                              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <MessageCircle size={24} className="text-white fill-white/20" />
                              </div>
                              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Share2 size={24} className="text-white fill-white/20" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Website Preview */}
                        {activeAssetTab === 'website' && (
                          <div className="font-chopo-v4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full w-full">
                            {/* Fake Nav with Official SVG Logo + Basal Green Accent */}
                            <div className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 gap-4 shrink-0 border-t-4 border-t-[#63CF00]">
                              <img src="/images/chopo-logo.svg" alt={name} className="h-7 w-auto" />
                              <div className="h-9 bg-slate-100 rounded-full w-full max-w-xs flex items-center px-4 text-slate-500 text-xs font-medium">
                                <Search size={14} className="mr-2" /> {t('Buscar estudios o check-ups...')}
                              </div>
                              <div className="text-slate-600 text-xs font-bold flex items-center gap-4">
                                <span className="hidden sm:inline">{t('Sucursales')}</span>
                                <span className="hidden sm:inline">{t('Médicos')}</span>
                                <span className="text-[#005FFC]">{t('Resultados')}</span>
                              </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                              {/* Main Product Hero */}
                              <div className="flex flex-col sm:flex-row gap-8 mb-8">
                                {/* Image Container */}
                                <div className="w-full sm:w-1/2 aspect-square bg-slate-100 rounded-none rounded-br-2xl overflow-hidden flex items-center justify-center relative group">
                                  {currentAssets.image ? (
                                    <img
                                      src={currentAssets.image}
                                      alt="Estudio Clínico"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  ) : (
                                    <div className="text-slate-400 text-sm font-medium">{t('Imagen Clínica')}</div>
                                  )}
                                  <div className="absolute top-3 right-0 bg-[#F24360] text-white px-3 py-1 rounded-l-full text-xs font-bold shadow">
                                    {t('Precio en Línea')}
                                  </div>
                                </div>

                                {/* Product Details */}
                                <div className="w-full sm:w-1/2 flex flex-col justify-center">
                                  <div className="text-[#005FFC] text-xs font-bold mb-2 uppercase tracking-wider">{t('Perfil Clínico Acreditado')}</div>
                                  <h1 className="text-3xl font-black text-[#004699] leading-tight tracking-tight mb-2">{brief.productName || t('Perfil Control Diabetes (HbA1c)')}</h1>
                                  <h2 className="text-sm font-bold text-[#005FFC] mb-4">{brief.slogan || 'Chopo, toda una vida cuidando la vida.'}</h2>

                                  <div className="mb-5 bg-[#BDD4F2] text-[#004699] px-4 py-3 rounded-none rounded-br-2xl">
                                    <span className="text-2xl font-black">$890.00 MXN</span>
                                    <span className="text-xs font-medium ml-2">• {t('Precio especial en línea')}</span>
                                  </div>

                                  <p className="text-sm font-medium text-slate-800 mb-6 leading-relaxed">
                                    {currentAssets.search?.description || t("Análisis clínicos acreditados con entrega rápida de resultados digitales.")}
                                  </p>

                                  <div className="space-y-3">
                                    <button className="w-full bg-[#005FFC] text-white hover:bg-[#004699] py-3.5 rounded-full font-medium text-sm transition-colors">
                                      {t('Agendar Cita en Línea')}
                                    </button>
                                    <button className="w-full bg-white border border-slate-300 text-[#004699] py-3.5 rounded-full font-medium text-sm hover:bg-slate-50 transition-colors">
                                      {t('Ver Indicaciones de Ayuno')}
                                    </button>
                                  </div>
                                  <p className="mt-4 text-[11px] font-light text-slate-500">
                                    {currentAssets.email?.legalFooter || t('Consulte a su médico. Permiso de Publicidad COFEPRIS.')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center text-slate-500">
                    <p>{t('Haz clic en "Generar Brief y Materiales" para visualizar esta campaña en todos los canales.')}</p>
                  </div>
                )}

                {setMode && (
                  <div className="mt-8 p-6 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div>
                      <h5 className="text-base font-bold text-[#003B7A]">
                        {t('¿Listo para poner a prueba esta campaña con tus pacientes, médicos y empresas sintéticas?')}
                      </h5>
                      <p className="text-xs text-slate-600 mt-1">
                        {t('Todos los mensajes clave, correos, promociones, estudios e imágenes generados ya están listos en el Focus Group.')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setMode(AppMode.SYNTHETIC_FOCUS_GROUP)}
                      className="px-6 py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-sm shadow-md transition-all shrink-0 disabled:opacity-50"
                    >
                      {t('Siguiente Paso: 4. Evaluar esta Campaña en Focus Group ➔', 'Next Step: 4. Evaluate this Campaign in Focus Group ➔')}
                    </button>
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Audience Details Modal */}
      {selectedAudienceModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 relative">
                  <div className="w-full h-1.5 bg-[#0066FF]" />
                  {/* Header */}
                  <div className="bg-white p-6 sm:p-8 border-b border-slate-100 flex justify-between items-start gap-4">
                      <div className="flex gap-5 items-center">
                          <div className="w-20 h-20 rounded-2xl bg-[#F8FAFC] overflow-hidden shadow-sm flex-shrink-0 border border-slate-200 flex items-center justify-center">
                              {selectedAudienceModal.imageUrl ? (
                                <img src={selectedAudienceModal.imageUrl} className="w-full h-full object-cover" alt={selectedAudienceModal.personaName || selectedAudienceModal.name} />
                              ) : (
                                <Users size={34} className="text-[#0066FF]" />
                              )}
                          </div>
                          <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${getAudienceSegmentBadge(selectedAudienceModal).className}`}>
                                    {getAudienceSegmentBadge(selectedAudienceModal).label}
                                  </span>
                                  {selectedAudienceModal.isWildcard && (
                                    <span className="px-2.5 py-0.5 bg-blue-50 text-[#003B7A] text-[10px] font-bold rounded-md uppercase tracking-wider border border-blue-100">
                                      {t('Exploratorio')}
                                    </span>
                                  )}
                              </div>
                              <h3 className="text-xl font-bold text-[#003B7A] leading-snug">
                                {formatDisplayPersonaName(selectedAudienceModal.name || '').replace(/^\[[^\]]+\]\s*/, '')}
                              </h3>
                              <div className="text-slate-600 font-semibold text-xs flex items-center gap-2 mt-1">
                                  <span className="w-2 h-2 rounded-full bg-[#78D600]" />
                                  <span>{selectedAudienceModal.personaName}</span>
                              </div>
                          </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAudienceModal(null)}
                        className="text-slate-400 hover:text-slate-700 transition-all p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <X size={20} />
                      </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white">
                      {/* Bio */}
                      <div className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200">
                          <h4 className="text-xs font-bold text-[#003B7A] uppercase tracking-wider mb-2">
                            {t('Biografía y Contexto Clínico', 'Biography & Clinical Context')}
                          </h4>
                          <p className="text-slate-700 text-sm leading-relaxed">
                            {selectedAudienceModal.bio}
                          </p>
                      </div>

                      {/* Demographics & Tags */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                              <h4 className="text-xs font-bold text-[#003B7A] uppercase tracking-wider mb-2">
                                {t('Demografía de la Audiencia', 'Audience Demographics')}
                              </h4>
                              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 font-semibold text-slate-800 text-xs leading-relaxed">
                                  {selectedAudienceModal.demographics || "N/A"}
                              </div>
                          </div>
                          <div>
                              <h4 className="text-xs font-bold text-[#003B7A] uppercase tracking-wider mb-2">
                                {t('Etiquetas Clínicas y de Interés', 'Clinical & Interest Tags')}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                  {selectedAudienceModal.details?.lifestyle_tags?.map((tag: string, i: number) => (
                                      <span key={i} className="px-3 py-1 bg-[#EFF6FF] text-[#0066FF] rounded-lg text-xs font-bold border border-blue-100">
                                        {tag}
                                      </span>
                                  )) || <span className="text-slate-400 text-xs italic">{t('Sin etiquetas específicas.', 'No specific tags identified.')}</span>}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                      <button
                          type="button"
                          onClick={() => setSelectedAudienceModal(null)}
                          className="btn-secondary px-5 py-2 text-xs font-bold"
                      >
                          {t('Cerrar', 'Close')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Clinical Use Case & Versions Manager Modal */}
      {isUseCaseModalOpen && editingUseCase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[86vh] overflow-hidden flex flex-col border border-slate-200 relative">
            {/* Top Header with 2-Tab Switcher */}
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-white">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-blue-100 flex items-center justify-center text-[#0066FF]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#003B7A]">
                    {t('Administrar Estudios Clínicos', 'Manage Clinical Studies')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('Configura parámetros clínicos, indicaciones de preparación, realismo visual y folios regulatorios COFEPRIS.', 'Configure clinical parameters, preparation instructions, visual realism, and COFEPRIS regulatory permits.')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    disabled={isSavingUseCase}
                    onClick={() => setActiveUseCaseTab('catalog')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      activeUseCaseTab === 'catalog'
                        ? 'bg-white text-[#003B7A] shadow-sm'
                        : 'text-slate-600 hover:text-[#003B7A]'
                    }`}
                  >
                    <ListChecks size={14} className={activeUseCaseTab === 'catalog' ? 'text-[#0066FF]' : ''} />
                    {t('Catálogo de Estudios', 'Studies Catalog')} ({useCases.length})
                  </button>
                  <button
                    type="button"
                    disabled={isSavingUseCase}
                    onClick={() => setActiveUseCaseTab('history')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      activeUseCaseTab === 'history'
                        ? 'bg-white text-[#003B7A] shadow-sm'
                        : 'text-slate-600 hover:text-[#003B7A]'
                    }`}
                  >
                    <History size={14} className={activeUseCaseTab === 'history' ? 'text-[#0066FF]' : ''} />
                    {t('Historial de Versiones', 'Version History')}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isSavingUseCase}
                  onClick={() => setIsUseCaseModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {activeUseCaseTab === 'catalog' ? (
              <div className={`flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 ${isSavingUseCase ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                {/* Left Sidebar: Study List + New Study Button */}
                <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/70 p-5 flex flex-col gap-4 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {t('Estudios Registrados', 'Registered Studies')}
                    </span>
                    <button
                      type="button"
                      disabled={isSavingUseCase}
                      onClick={handleStartNewUseCase}
                      className="px-3 py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#004ECC] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                    >
                      <Plus size={14} />
                      {t('Nuevo Estudio', 'New Study')}
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {useCases.map((uc) => {
                      const isSelected = editingUseCase.id === uc.id;
                      return (
                        <button
                          key={uc.id}
                          type="button"
                          disabled={isSavingUseCase}
                          onClick={() => {
                            setEditingUseCase({
                              ...uc,
                              category: cleanCategoryLabel(uc.category)
                            });
                            setIncludedStudiesInput((uc.includedStudies || []).join('\n'));
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 disabled:opacity-50 ${
                            isSelected
                              ? 'bg-white border-[#0066FF] ring-2 ring-[#0066FF]/15 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EFF6FF] text-[#0066FF] self-start">
                            {cleanCategoryLabel(uc.category)}
                          </span>
                          <p className="text-sm font-bold text-[#003B7A] leading-snug">
                            {uc.studyName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(uc.includedStudies || []).length} {t('parámetros incluidos', 'parameters included')}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Detail Panel: Spacious Grouped Form */}
                <div className="md:col-span-8 p-6 sm:p-8 overflow-y-auto space-y-6 bg-white">
                  {/* Group 1: Información Clínica y Preparación */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-[#003B7A] border-b border-slate-100 pb-2">
                      {t('Información Clínica y Preparación', 'Clinical Information & Preparation')}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Nombre del Estudio / Paquete', 'Study / Package Name')}
                        </label>
                        <input
                          type="text"
                          disabled={isSavingUseCase}
                          value={editingUseCase.studyName}
                          onChange={(e) => setEditingUseCase({ ...editingUseCase, studyName: e.target.value })}
                          className="input-field text-sm disabled:opacity-60"
                          placeholder={t('ej. Check-up Control Diabetes', 'e.g. Diabetes Control Check-up')}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Categoría Clínica', 'Clinical Category')}
                        </label>
                        <input
                          type="text"
                          disabled={isSavingUseCase}
                          value={editingUseCase.category}
                          onChange={(e) => setEditingUseCase({ ...editingUseCase, category: e.target.value })}
                          className="input-field text-sm disabled:opacity-60"
                          placeholder={t('ej. Metabolismo y Control Glucémico', 'e.g. Metabolism & Glycemic Control')}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Segmento Objetivo', 'Target Track')}
                        </label>
                        <select
                          disabled={isSavingUseCase}
                          value={editingUseCase.track}
                          onChange={(e) => setEditingUseCase({ ...editingUseCase, track: e.target.value as 'both' | 'all' | 'patient' | 'physician' | 'enterprise' })}
                          className="input-field text-sm disabled:opacity-60"
                        >
                          <option value="both">{t('Todos los Segmentos (B2C + B2D + B2B)')}</option>
                          <option value="patient">{t('Solo Pacientes (B2C)')}</option>
                          <option value="physician">{t('Solo Médicos (B2D)')}</option>
                          <option value="enterprise">{t('Solo Empresas (B2B)')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Estudios Incluidos (1 por línea)', 'Included Studies (1 per line)')}
                        </label>
                        <textarea
                          rows={4}
                          disabled={isSavingUseCase}
                          value={includedStudiesInput}
                          onChange={(e) => setIncludedStudiesInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] focus:bg-white text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0066FF] disabled:opacity-60"
                          placeholder={t('Hemoglobina Glicosilada (HbA1c)\nQuímica Sanguínea\nMicroalbuminuria', 'HbA1c\nBlood Chemistry\nMicroalbuminuria')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Estudios Incluidos y Preparación', 'Included Studies & Preparation')}
                        </label>
                        <textarea
                          rows={4}
                          disabled={isSavingUseCase}
                          value={editingUseCase.fastingRequirement}
                          onChange={(e) => setEditingUseCase({ ...editingUseCase, fastingRequirement: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] focus:bg-white text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0066FF] disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Group 2: Regulación COFEPRIS y Realismo Médico */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-bold text-[#003B7A] border-b border-slate-100 pb-2">
                      {t('Regulación COFEPRIS y Reglas de Realismo Médico', 'COFEPRIS Compliance & Medical Realism Rules')}
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                        {t('Reglas de Realismo Médico', 'Medical Realism Rules')}
                      </label>
                      <textarea
                        rows={3}
                        disabled={isSavingUseCase}
                        value={editingUseCase.visualRealismRules}
                        onChange={(e) => setEditingUseCase({ ...editingUseCase, visualRealismRules: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] focus:bg-white text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0066FF] disabled:opacity-60"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Condición Promocional', 'Promo Condition')}
                        </label>
                        <input
                          type="text"
                          disabled={isSavingUseCase}
                          value={editingUseCase.defaultPromoText}
                          onChange={(e) => setEditingUseCase({ ...editingUseCase, defaultPromoText: e.target.value })}
                          className="input-field text-sm disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Permiso COFEPRIS B2C', 'COFEPRIS B2C Permit')}
                        </label>
                        <input
                          type="text"
                          disabled={isSavingUseCase}
                          value={editingUseCase.cofeprisPermitB2C}
                          onChange={(e) => setEditingUseCase({ ...editingUseCase, cofeprisPermitB2C: e.target.value })}
                          className="input-field text-sm disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Aviso COFEPRIS B2D (Médicos)')}
                        </label>
                        <input
                          type="text"
                          disabled={isSavingUseCase}
                          value={editingUseCase.cofeprisPermitB2B}
                          onChange={(e) => setEditingUseCase({ ...editingUseCase, cofeprisPermitB2B: e.target.value })}
                          className="input-field text-sm disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Responsable Sanitario y Cédula', 'Sanitary Officer & License')}
                        </label>
                        <input
                          type="text"
                          disabled={isSavingUseCase}
                          value={editingUseCase.responsableSanitario}
                          onChange={(e) => setEditingUseCase({ ...editingUseCase, responsableSanitario: e.target.value })}
                          className="input-field text-sm disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1.5">
                          {t('Nota de Versión (Opcional)', 'Version Note (Optional)')}
                        </label>
                        <input
                          type="text"
                          disabled={isSavingUseCase}
                          value={useCaseVersionLabel}
                          onChange={(e) => setUseCaseVersionLabel(e.target.value)}
                          placeholder={t('ej. Actualización de parámetros clínicos', 'e.g. Clinical parameters update')}
                          className="input-field text-sm disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Tab 2: Historial de Versiones */
              <div className={`flex-1 p-6 sm:p-8 overflow-y-auto bg-slate-50/50 ${isSavingUseCase ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                <div className="max-w-4xl mx-auto space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                    <div>
                      <h4 className="text-sm font-bold text-[#003B7A]">
                        {t('Control de Versiones del Catálogo de Estudios', 'Studies Catalog Version Control')}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t('Restaura cualquier versión guardada anteriormente o restablece la configuración base por defecto de Laboratorios Chopo.', 'Restore any previously saved version or reset to Laboratorios Chopo default baseline configuration.')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingUseCase}
                      onClick={() => handleRestoreUseCases('OFFICIAL_SEED')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      {t('Restaurar Valores por Defecto', 'Restore Default Values')}
                    </button>
                  </div>

                  {useCaseVersions.length > 0 ? (
                    <div className="space-y-2.5">
                      {useCaseVersions.map((ver) => (
                        <div
                          key={ver.versionId}
                          className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-blue-200 transition-colors gap-4"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#003B7A] truncate">
                              {sanitizeVersionLabel(ver.label)}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatVersionDate(ver)} • {ver.itemCount || useCases.length} {t('estudios clínicos', 'clinical studies')}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={isSavingUseCase}
                            onClick={() => handleRestoreUseCases(ver.versionId)}
                            className="px-4 py-2 rounded-xl bg-[#EFF6FF] hover:bg-[#0066FF] text-[#0066FF] hover:text-white text-xs font-bold transition-colors shrink-0"
                          >
                            {t('Restaurar esta versión', 'Restore this version')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                      {t('Aún no hay versiones personalizadas guardadas en el historial.', 'No custom versions saved in history yet.')}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3">
              <button
                type="button"
                disabled={isSavingUseCase}
                onClick={() => setIsUseCaseModalOpen(false)}
                className="btn-secondary disabled:opacity-50"
              >
                {t('Cerrar', 'Close')}
              </button>
              {activeUseCaseTab === 'catalog' && (
                <button
                  type="button"
                  disabled={isSavingUseCase}
                  onClick={handleSaveUseCaseForm}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingUseCase ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {t('Guardar Estudio y Versión', 'Save Study & Version')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
