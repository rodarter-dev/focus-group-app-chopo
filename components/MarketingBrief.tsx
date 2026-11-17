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
import { Send, Loader2, Globe, Target, Calendar, ShieldCheck, Zap, ArrowLeft, Search, Mail, Youtube, Share2, MessageCircle, ThumbsUp, Sparkles, Heart, FileText, Users, X, ListChecks, Award, Clock, Settings, RotateCcw, Plus, Edit2, Trash2, CheckCircle2, History, Eye, Upload, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { AppMode, MarketingBriefData, ClinicalUseCase, ConfigVersionSnapshot } from '../types';
import { useCompanyContext } from '../context/CompanyContext';
import { useLanguage } from '../context/LanguageContext';

interface MarketingBriefProps {
  setMode?: (mode: AppMode) => void;
}

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
  const { language, setLanguage, t } = useLanguage();
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

  const [goal, setGoal] = useState("Impulsar la adopción del Check-up Control Diabetes (HbA1c, Química Sanguínea y Microalbuminuria) en Pacientes B2C (prevención empática, precio especial en línea y resultados digitales en App Chopo) y Médicos Prescriptores B2B (precisión diagnóstica acreditada NGSP) bajo lineamientos COFEPRIS.");
  const [brief, setBrief] = useState<MarketingBriefData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [campaignAssetsMap, setCampaignAssetsMap] = useState<Record<string, MarketingAssets> | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<string>("");
  const [isAssetLoading, setIsAssetLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [activeAssetTab, setActiveAssetTab] = useState<'social' | 'search' | 'email' | 'youtube' | 'website'>('social');
  const [availableAudiences, setAvailableAudiences] = useState<any[]>([]);
  const [selectedAudienceNames, setSelectedAudienceNames] = useState<string[]>([]);
  const [selectedAudienceModal, setSelectedAudienceModal] = useState<any | null>(null);
  const [isUploadingEmailImage, setIsUploadingEmailImage] = useState<boolean>(false);
  const emailImageInputRef = useRef<HTMLInputElement>(null);

  const selectedUseCase = useCases.find(u => u.id === selectedUseCaseId) || useCases.find(u => u.isDefault) || useCases[0] || DEFAULT_FALLBACK_USE_CASES[0];
  const currentAssets = campaignAssetsMap && selectedAudience ? campaignAssetsMap[selectedAudience] : null;
  const isBusy = isLoading || isAssetLoading || isSavingUseCase || isUploadingEmailImage;

  const isAudienceB2B = (aud: any): boolean => {
    const rawName: string = aud?.name || '';
    return /Médico|B2B|Physician/i.test(rawName) || aud?.track === 'physician';
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
    if (!label) return t('Configuración Base por Defecto — Laboratorios Chopo', 'Default Baseline Configuration — Laboratorios Chopo');
    if (/MVP|Semilla Oficial/i.test(label)) {
      return t('Configuración Base por Defecto — Laboratorios Chopo', 'Default Baseline Configuration — Laboratorios Chopo');
    }
    return label;
  };

  const formatVersionDate = (ver: ConfigVersionSnapshot): string => {
    const rawDate = ver.timestamp || (ver as any).createdAt;
    if (!rawDate) return t('Versión base', 'Baseline version');
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) return t('Versión base', 'Baseline version');
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
    return `Impulsar la adopción de ${uc.studyName}${studiesSummary ? ` (${studiesSummary})` : ''} en Pacientes B2C (precio especial en línea en chopo.com.mx / App Chopo y entrega digital) y Médicos Prescriptores B2B (rigor analítico acreditado) cumpliendo estrictamente ${uc.cofeprisPermitB2C} y las reglas de realismo visual (${uc.fastingRequirement}).`;
  };

  const handleSelectUseCase = (uc: ClinicalUseCase) => {
    setSelectedUseCaseId(uc.id);
    setGoal(buildGoalForUseCase(uc));
    if (availableAudiences.length > 0) {
      if (uc.track === 'patient') {
        setSelectedAudienceNames(
          availableAudiences.filter((a) => !isAudienceB2B(a)).map((a) => a.name)
        );
      } else if (uc.track === 'physician') {
        setSelectedAudienceNames(
          availableAudiences.filter((a) => isAudienceB2B(a)).map((a) => a.name)
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

  const handleGenerate = async () => {
    setIsLoading(true);
    setGenerationStatus(t("Redactando Brief Clínico de Marketing...", "Drafting Clinical Marketing Brief..."));
    try {
      // 1. Generate Brief anchored on selected clinical use case and selected audiences
      const studyName = selectedUseCase?.studyName || 'Check-up Control Diabetes';
      const studyTrack = selectedUseCase?.track || 'both';
      const targetAudiences = availableAudiences.filter((a) =>
        selectedAudienceNames.includes(a.name)
      );
      const result = await generateMarketingBrief(description, goal, targetAudiences, studyName, studyTrack);

      if (result) {
        // 2. Generate Assets immediately
        setGenerationStatus(t("Diseñando Materiales de Campaña (Social, Buscador, Email, YouTube)...", "Designing Campaign Assets (Social, Search, Email, YouTube)..."));
        const productName = result.productName || studyName || `${name} Diagnostic Panel`;

        const finalAssetsMap: Record<string, MarketingAssets> = {};
        try {
          setGenerationStatus(t(`Diseñando Materiales de Campaña (0/${result.audiences.length})...`, `Designing Campaign Assets (0/${result.audiences.length})...`));
          
          for (let i = 0; i < result.audiences.length; i++) {
            const aud = result.audiences[i];
            setGenerationStatus(t(`Diseñando Materiales para ${aud.name} (${i + 1}/${result.audiences.length})...`, `Designing Campaign Assets for ${aud.name} (${i + 1}/${result.audiences.length})...`));
            
            const verbatimGoal = goal.trim() || result.campaignGoal;
            const combinedGoal = `INSTRUCCIÓN OBLIGATORIA DEL USUARIO (SEGUIR AL PIE DE LA LETRA): ${verbatimGoal} | Audiencia Objetivo: ${aud.name} (${aud.ageRange || ''}) | Ángulo: ${aud.messagingAngle?.es || aud.messagingAngle?.en || ''}`;
            const assets = await generateMarketingCampaignAssets(productName, combinedGoal, context);
            finalAssetsMap[aud.name] = assets;
          }
        } catch (assetErr) {
          console.error("Failed to auto-generate assets:", assetErr);
        }

        // 3. Combine and Save
        const finalBrief = { ...result, campaignAssetsMap: finalAssetsMap || undefined };

        setBrief(finalBrief);
        if (finalAssetsMap) {
          setCampaignAssetsMap(finalAssetsMap);
          setSelectedAudience(result.audiences[0]?.name || "");
        }
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
      alert(t("Error al generar el brief de marketing.", "Failed to generate marketing brief."));
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
      
      for (let i = 0; i < brief.audiences.length; i++) {
        const aud = brief.audiences[i];
        setGenerationStatus(t(`Regenerando Materiales para ${aud.name} (${i + 1}/${brief.audiences.length})...`, `Regenerating Assets for ${aud.name} (${i + 1}/${brief.audiences.length})...`));
        
        const verbatimGoal = goal.trim() || brief.campaignGoal;
        const combinedGoal = `INSTRUCCIÓN OBLIGATORIA DEL USUARIO (SEGUIR AL PIE DE LA LETRA): ${verbatimGoal} | Audiencia Objetivo: ${aud.name} (${aud.ageRange || ''}) | Ángulo: ${aud.messagingAngle?.es || aud.messagingAngle?.en || ''}`;
        const assets = await generateMarketingCampaignAssets(productName, combinedGoal, context);
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
      alert(t("Error al regenerar los materiales de campaña.", "Failed to regenerate campaign assets."));
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
        if (data.campaignAssetsMap) {
          setCampaignAssetsMap(data.campaignAssetsMap);
          if (data.audiences?.length) setSelectedAudience(data.audiences[0].name);
        }
        setStep(2);
      }
    } catch (e) {
      alert(t("No se encontró ningún brief guardado.", "No saved brief found."));
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
              <h1 className="page-title">{t('Generador de Brief de Marketing', 'Marketing Brief Generator')}</h1>
            </div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#003B7A] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#78D600]" />
              {t('Cumplimiento COFEPRIS • Lineamientos de Marca Chopo', 'COFEPRIS Compliance • Chopo Brand Guidelines')}
            </span>
          </div>
          <p className="text-subtext mt-1">
            {t('Genera estrategias integrales multicanal y materiales creativos para los segmentos de Pacientes B2C y Médicos B2B.', 'Generate comprehensive multi-channel strategies and creative assets across B2C Patient and B2B Physician tracks.')}
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
                {generationStatus || t('Procesando con IA... La edición y selección están bloqueadas temporalmente.', 'AI Processing in progress... Editing and selection are temporarily locked.')}
              </p>
              <p className="text-xs text-[#0066FF]">
                {t('Por favor espera a que finalice la operación actual antes de modificar campos o cambiar de selección.', 'Please wait for the current operation to finish before modifying fields or changing selections.')}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-white text-[#003B7A] border border-blue-200 text-[11px] font-bold shrink-0">
            {t('Edición Bloqueada', 'Editing Locked')}
          </span>
        </div>
      )}

      {step === 1 && (
        <div className={`space-y-8 mb-12 animate-fadeIn ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
          {/* Card 1 — Objetivo Estratégico de la Campaña y Contexto Institucional */}
          <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#0066FF] p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0">
                  <Target size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#003B7A]">
                    {t('1. Objetivo Estratégico de la Campaña / Promoción', '1. Campaign / Promotion Strategic Objective')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('Define la meta comercial, promocional o clínica que deseas impulsar en pacientes B2C y médicos B2B.', 'Define the commercial, promotional, or clinical goal you want to drive across B2C patients and B2B physicians.')}
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
                <span>{t('Editar Contexto Institucional de Laboratorios Chopo', 'Edit Laboratorios Chopo Institutional Context')}</span>
              </button>
            </div>

            {/* Compact 1-line Institutional Context Summary or Expanded Editor */}
            {!isContextExpanded ? (
              <div className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex items-center justify-between gap-3 text-xs text-slate-600">
                <div className="truncate">
                  <span className="font-bold text-[#003B7A] mr-1.5">{t('Contexto Institucional:', 'Institutional Context:')}</span>
                  <span>{context}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-blue-200 space-y-2 animate-fadeIn">
                <label className="block text-xs font-bold text-[#003B7A] uppercase tracking-wider">
                  {t('Contexto Institucional de Laboratorios Chopo', 'Laboratorios Chopo Institutional Context')}
                </label>
                <textarea
                  rows={2}
                  disabled={isBusy}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-y transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder={t(`ej. ${brandConfig.companyName} - Diagnóstico Clínico e Imagenología`, `e.g. ${brandConfig.companyName} - Clinical Diagnostics & Imaging`)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#003B7A] uppercase tracking-wider mb-1">
                {t('Objetivo Estratégico de la Campaña / Promoción (Paciente B2C / Médico B2B)', 'Strategic Campaign / Promotion Goal (B2C Patient / B2B Physician)')}
              </label>
              <p className="text-xs text-slate-500 mb-2">
                {t('Se actualiza automáticamente al elegir un estudio clínico abajo, pero puedes personalizar el enfoque comercial, descuento o mensaje clave.', 'Automatically updates when selecting a clinical study below, or customize the commercial, discount, or key message angle.')}
              </p>
              <textarea
                rows={3}
                disabled={isBusy}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#F8FAFC] focus:bg-white text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-y transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={t("Describe lo que deseas lograr con este estudio clínico en pacientes y médicos prescriptores...", "Describe what you want to achieve with this clinical study across patients and prescribing physicians...")}
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
                  <div className="inline-flex items-center bg-[#F8FAFC] p-1 rounded-xl border border-slate-200 gap-1">
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
                      {t('Todas', 'All')}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        setSelectedAudienceNames(
                          availableAudiences.filter((a) => !isAudienceB2B(a)).map((a) => a.name)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-[#0066FF] hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {t('Solo Pacientes B2C', 'B2C Patients Only')}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        setSelectedAudienceNames(
                          availableAudiences.filter((a) => isAudienceB2B(a)).map((a) => a.name)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-[#003B7A] hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {t('Solo Médicos B2B', 'B2B Physicians Only')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {availableAudiences.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableAudiences.map((aud, index) => {
                  const rawName: string = aud.name || '';
                  const isB2B = isAudienceB2B(aud);
                  const cleanedTitle = rawName.replace(/^\[[^\]]+\]\s*/, '').trim() || rawName;
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
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                              isB2B
                                ? 'bg-slate-100 text-[#003B7A] border-slate-200'
                                : 'bg-[#EFF6FF] text-[#0066FF] border-blue-100'
                            }`}
                          >
                            {isB2B
                              ? t('Médico Prescriptor B2B', 'B2B Prescribing Physician')
                              : t('Paciente B2C', 'B2C Patient')}
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
                          {aud.personaName || aud.bio || t('Audiencia Clínica Activa', 'Active Clinical Audience')}
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
                          <span>{t('Ver más información', 'More info')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-600">
                {t('El brief generará automáticamente segmentos estratégicos para Paciente B2C y Médico Prescriptor B2B basados en el estudio clínico seleccionado.', 'The brief will automatically generate strategic segments for B2C Patients and B2B Prescribing Physicians based on the selected clinical study.')}
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
              <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200">
                <button
                  disabled={isBusy}
                  onClick={() => setLanguage('es')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${language === 'es' ? 'bg-white text-[#0066FF] shadow-sm font-bold' : 'text-subtext hover:text-heading'}`}
                >
                  Español
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => setLanguage('en')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${language === 'en' ? 'bg-white text-[#0066FF] shadow-sm font-bold' : 'text-subtext hover:text-heading'}`}
                >
                  English
                </button>
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

              {/* 9. Campaign Preview (Generated Assets) */}
              <section>
                <div className="flex items-center justify-between mb-6 border-b-2 border-slate-200 pb-2">
                  <h4 className="section-header uppercase tracking-wide mb-0">
                    <span className="bg-[#0066FF] text-white w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold">9</span>
                    {t('Vista Previa Creativa de Campaña', 'Campaign Creative Preview')}
                  </h4>
                  {!campaignAssetsMap && (
                    <button
                      onClick={handleRegenerateAssets}
                      disabled={isAssetLoading}
                      className="bg-[#0066FF] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#004ECC] transition-colors disabled:opacity-50"
                    >
                      {isAssetLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      {isAssetLoading ? t("Regenerando...", "Regenerating...") : t("Regenerar Materiales", "Regenerate Assets")}
                    </button>
                  )}
                </div>

                {isAssetLoading ? (
                  <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                    <Loader2 className="animate-spin mx-auto text-[#0066FF] mb-4" size={48} />
                    <p className="text-slate-500 font-medium">{t('Creando materiales multicanal basados en el brief...', 'Creating multi-channel assets based on brief...')}</p>
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
                              ? 'bg-[#0066FF] text-white shadow-md'
                              : 'text-subtext hover:text-heading'
                              }`}
                          >
                            {aud}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 bg-white overflow-x-auto mt-4">
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('social')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors disabled:opacity-50 ${activeAssetTab === 'social' ? 'bg-slate-50 text-[#0066FF] border-t-2 border-[#0066FF]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Share2 size={18} /> Social
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('search')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors disabled:opacity-50 ${activeAssetTab === 'search' ? 'bg-slate-50 text-[#0066FF] border-t-2 border-[#0066FF]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Search size={18} /> {t('Buscador', 'Search')}
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('email')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors disabled:opacity-50 ${activeAssetTab === 'email' ? 'bg-slate-50 text-[#0066FF] border-t-2 border-[#0066FF]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Mail size={18} /> Email
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('youtube')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors disabled:opacity-50 ${activeAssetTab === 'youtube' ? 'bg-slate-50 text-[#0066FF] border-t-2 border-[#0066FF]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Youtube size={18} /> YouTube
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => setActiveAssetTab('website')}
                        className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors disabled:opacity-50 ${activeAssetTab === 'website' ? 'bg-slate-50 text-[#0066FF] border-t-2 border-[#0066FF]' : 'text-subtext hover:text-heading'}`}
                      >
                        <Globe size={18} /> {t('Sitio Web', 'Website')}
                      </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-8 bg-slate-50 flex items-center justify-center min-h-[500px]">
                      <div className={`w-full flex flex-col items-center ${activeAssetTab === 'website' ? 'max-w-4xl' : 'max-w-lg'}`}>
                        {/* Social Media Preview */}
                        {activeAssetTab === 'social' && (
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
                            <div className="p-3 flex items-center gap-3 border-b border-slate-100">
                              <div className="w-8 h-8 bg-[#0066FF] rounded-full flex items-center justify-center text-white font-bold text-xs">C</div>
                              <p className="font-bold text-sm text-heading">{brandConfig.companyName}</p>
                            </div>
                            <div className="aspect-square bg-slate-100">
                              {currentAssets.image ? (
                                <img src={currentAssets.image} alt="Campaign" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">{t('Imagen no disponible', 'Image Failed')}</div>
                              )}
                            </div>
                            <div className="p-4">
                              <div className="flex gap-4 mb-3">
                                <Heart size={24} className="text-slate-400" />
                                <MessageCircle size={24} className="text-slate-400" />
                                <Share2 size={24} className="text-slate-400" />
                              </div>
                              <p className="text-sm text-slate-800 mb-2">
                                <span className="font-bold mr-2 text-heading">{brandConfig.companyName}</span>
                                {currentAssets.social.caption}
                              </p>
                              <p className="text-[#0066FF] text-sm font-medium">
                                {currentAssets.social.hashtags.join(' ')}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Search Ad Preview */}
                        {activeAssetTab === 'search' && (
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 w-full">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-900 text-sm">{t('Patrocinado', 'Sponsored')}</span>
                              <span className="text-slate-500 text-xs">·</span>
                              <span className="text-slate-500 text-xs">{currentAssets.search.url}</span>
                            </div>
                            <h3 className="text-xl text-[#0066FF] hover:underline cursor-pointer font-semibold mb-2">
                              {currentAssets.search.headline}
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                              {currentAssets.search.description}
                            </p>

                            <div className="mt-6 pt-6 border-t border-slate-100">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('Imagen de Campaña', 'Campaign Image Asset')}</h4>
                              <div className="h-32 w-48 bg-white rounded-lg overflow-hidden border border-slate-200">
                                {currentAssets.image && <img src={currentAssets.image} className="w-full h-full object-contain" />}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Email Preview */}
                        {activeAssetTab === 'email' && (
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
                            <div className="bg-slate-50 p-3 border-b border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                              <span className="font-semibold text-slate-700">{t('De:', 'From:')} {brandConfig.companyName}</span>
                              <span>{t('Justo ahora', 'Just now')}</span>
                            </div>
                            <div className="p-5">
                              <div className="mb-4 pb-4 border-b border-slate-100">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF] mb-0.5">
                                  {t('Asunto:', 'Subject:')}
                                </div>
                                <h3 className="font-bold text-lg text-[#003B7A] leading-snug mb-1.5">
                                  {currentAssets.email.subject}
                                </h3>
                                {currentAssets.email.preheader && (
                                  <p className="text-slate-500 text-xs">
                                    <span className="font-semibold text-slate-600">{t('Preheader:', 'Preheader:')}</span> {currentAssets.email.preheader}
                                  </p>
                                )}
                              </div>

                              {/* Visual Banner with Non-Invasive Overlay Text & Image Upload */}
                              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/10] mb-5 group">
                                {(currentAssets.email.image || currentAssets.image) ? (
                                  <img
                                    src={currentAssets.email.image || currentAssets.image || ''}
                                    alt={currentAssets.email.subject}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <ImageIcon size={32} />
                                    <span className="text-xs font-medium">{t('Sin imagen de banner', 'No banner image')}</span>
                                  </div>
                                )}

                                {/* Upload / Change Banner Image Button */}
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
                                    className="px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-[#003B7A] border border-slate-200 text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                                  >
                                    <Upload size={13} className="text-[#0066FF]" />
                                    {isUploadingEmailImage
                                      ? t('Subiendo...', 'Uploading...')
                                      : t('Subir / Cambiar Imagen', 'Upload / Change Image')}
                                  </button>
                                </div>

                                {/* Non-invasive bottom gradient overlay */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#003B7A]/90 via-[#003B7A]/45 to-transparent p-5 flex flex-col justify-end">
                                  <span className="bg-white/95 text-[#003B7A] text-[11px] font-bold px-2.5 py-0.5 rounded-full w-fit mb-1.5 shadow-sm">
                                    {currentAssets.email.bannerSubheadline || brief.productName}
                                  </span>
                                  <h4 className="text-white font-bold text-lg sm:text-xl leading-snug drop-shadow">
                                    {currentAssets.email.bannerHeadline || currentAssets.search?.headline || currentAssets.email.subject}
                                  </h4>
                                </div>
                              </div>

                              {/* Concise Companion Copy + CTA + Legal Footer */}
                              <div>
                                <p className="text-slate-800 text-sm leading-relaxed mb-5">
                                  {(currentAssets.email.body || '').replace(/\s*Incluye pie legal:[\s\S]*$/i, '').trim()}
                                </p>
                                <button
                                  type="button"
                                  className="w-full py-3 rounded-full font-bold text-sm bg-[#0066FF] text-white hover:bg-[#004ECC] transition-colors shadow-sm"
                                >
                                  {currentAssets.email.ctaText || t('Agendar Estudio en Línea', 'Book Lab Study Online')}
                                </button>
                                <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 mt-4 leading-relaxed">
                                  {currentAssets.email.legalFooter || 'Consulte a su médico. Permiso de Publicidad COFEPRIS No. 2609152002A00518.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* YouTube Shorts Preview */}
                        {activeAssetTab === 'youtube' && (
                          <div className="bg-black rounded-2xl shadow-xl overflow-hidden relative aspect-[9/16] max-h-[600px] mx-auto w-full max-w-[340px]">
                            {currentAssets.image && (
                              <img src={currentAssets.image} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>

                            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-[#0066FF] rounded-full flex items-center justify-center font-bold text-xs text-white">C</div>
                                <span className="font-bold text-sm">@{brandConfig.companyName.replace(/\s+/g, '').toLowerCase()}</span>
                                <button className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full">{t('Suscribirse', 'Subscribe')}</button>
                              </div>
                              <p className="text-sm mb-2 font-bold">{currentAssets.youtube.title}</p>
                              <div className="bg-white/20 backdrop-blur-md rounded-lg p-3 mb-4 border border-white/10">
                                <p className="text-xs text-white/90 font-mono">{t('GUION:', 'SCRIPT:')}</p>
                                <p className="text-xs italic text-white/80">{currentAssets.youtube.script}</p>
                              </div>
                              <button className={`w-full py-3 rounded-lg font-bold text-sm bg-[#0066FF] text-white hover:bg-[#004ECC] transition-colors`}>
                                {t('Conoce más en chopo.com.mx', 'Learn More at chopo.com.mx')}
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
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full w-full">
                            {/* Fake Nav */}
                            <div className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 gap-4 shrink-0 border-t-4 border-t-[#78D600]">
                              <div className="text-[#0066FF] font-black text-lg tracking-tight">{name}</div>
                              <div className="h-9 bg-slate-100 rounded-full w-full max-w-xs flex items-center px-4 text-slate-500 text-xs font-medium">
                                <Search size={14} className="mr-2" /> {t('Buscar estudios o check-ups...', 'Search lab tests or check-ups...')}
                              </div>
                              <div className="text-slate-600 text-xs font-bold flex items-center gap-4">
                                <span className="hidden sm:inline">{t('Sucursales', 'Branches')}</span>
                                <span className="hidden sm:inline">{t('Médicos', 'Physicians')}</span>
                                <span className="text-[#0066FF]">{t('Resultados', 'Lab Results')}</span>
                              </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                              {/* Main Product Hero */}
                              <div className="flex flex-col sm:flex-row gap-8 mb-8">
                                {/* Image Container */}
                                <div className="w-full sm:w-1/2 aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center relative group">
                                  {currentAssets.image ? (
                                    <img
                                      src={currentAssets.image}
                                      alt="Clinical Panel"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  ) : (
                                    <div className="text-slate-400 text-sm font-medium">{t('Imagen Clínica', 'Clinical Image')}</div>
                                  )}
                                </div>

                                {/* Product Details */}
                                <div className="w-full sm:w-1/2 flex flex-col justify-center">
                                  <div className="text-[#0066FF] text-xs font-bold mb-2 uppercase tracking-wider">{t('Perfil Clínico Acreditado', 'Accredited Clinical Panel')}</div>
                                  <h1 className="text-3xl font-bold text-heading leading-none tracking-tight mb-2">{brief.productName || t('Perfil Control Diabetes (HbA1c)', 'Diabetes Control Panel (HbA1c)')}</h1>
                                  <h2 className="text-lg text-subtext font-medium mb-4">{t('Precisión Diagnóstica • Entrega Digital', 'Diagnostic Precision • Digital Delivery')}</h2>

                                  <div className="mb-6">
                                    <span className="text-2xl font-bold text-heading">$890.00 MXN</span>
                                    <span className="text-subtext"> • {t('Precio en Línea', 'Online Price')}</span>
                                  </div>

                                  <p className="text-base text-slate-800 mb-6 leading-relaxed">
                                    {currentAssets.search?.description || t("Análisis clínicos acreditados con entrega rápida de resultados digitales.", "Accredited clinical laboratory testing with fast digital results delivery.")}
                                  </p>

                                  <div className="space-y-3">
                                    <button className="w-full bg-[#0066FF] text-white hover:bg-[#004ECC] py-3.5 rounded-full font-bold text-sm transition-colors">
                                      {t('Agendar Cita en Línea', 'Schedule Appointment Online')}
                                    </button>
                                    <button className="w-full bg-white border border-slate-300 text-slate-900 py-3.5 rounded-full font-bold text-sm hover:bg-slate-50 transition-colors">
                                      {t('Ver Indicaciones de Ayuno', 'View Fasting Instructions')}
                                    </button>
                                  </div>
                                  <p className="mt-4 text-[11px] text-slate-400 italic">
                                    {t('Consulte a su médico. Aviso de Publicidad COFEPRIS.', 'Consult your physician. COFEPRIS Advertising Permit Compliant.')}
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
                    <p>{t('Haz clic en "Generar Brief y Materiales" para visualizar esta campaña en todos los canales.', 'Click "Generate Brief & Assets" to visualize this campaign across channels.')}</p>
                  </div>
                )}

                {setMode && (
                  <div className="mt-8 p-6 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div>
                      <h5 className="text-base font-bold text-[#003B7A]">
                        {t('¿Listo para poner a prueba esta campaña con tus pacientes y médicos sintéticos?', 'Ready to test this campaign with your synthetic patients and physicians?')}
                      </h5>
                      <p className="text-xs text-slate-600 mt-1">
                        {t('Todos los mensajes clave, correos, promociones, estudios e imágenes generados ya están listos en el Focus Group.', 'All generated key messages, emails, promotions, studies, and images are ready in the Focus Group.')}
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
                                  <span className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#0066FF] text-[11px] font-bold rounded-md border border-blue-100">
                                    {isAudienceB2B(selectedAudienceModal)
                                      ? t('Médico Prescriptor B2B', 'B2B Prescribing Physician')
                                      : t('Paciente B2C', 'B2C Patient')}
                                  </span>
                                  {selectedAudienceModal.isWildcard && (
                                    <span className="px-2.5 py-0.5 bg-blue-50 text-[#003B7A] text-[10px] font-bold rounded-md uppercase tracking-wider border border-blue-100">
                                      {t('Exploratorio', 'Wildcard')}
                                    </span>
                                  )}
                              </div>
                              <h3 className="text-xl font-bold text-[#003B7A] leading-snug">
                                {(selectedAudienceModal.name || '').replace(/^\[[^\]]+\]\s*/, '')}
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
                          onChange={(e) => setEditingUseCase({ ...editingUseCase, track: e.target.value as 'patient' | 'physician' | 'both' })}
                          className="input-field text-sm disabled:opacity-60"
                        >
                          <option value="both">{t('Ambas Pistas (Paciente B2C + Médico B2B)', 'Both Tracks (B2C Patient + B2B Physician)')}</option>
                          <option value="patient">{t('Solo Paciente B2C', 'B2C Patient Only')}</option>
                          <option value="physician">{t('Solo Médico B2B', 'B2B Physician Only')}</option>
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
                          {t('Aviso COFEPRIS B2B', 'COFEPRIS B2B Notice')}
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
