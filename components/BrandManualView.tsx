import React, { useEffect, useState, useMemo } from 'react';
import {
  Palette,
  Save,
  History,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Camera,
  Layers,
  Megaphone,
  FileText,
  Loader2,
  Ban,
  RefreshCw,
  ShieldCheck,
  Type,
  Users
} from 'lucide-react';
import {
  BrandManualConfig,
  BrandColorItem,
  BrandContrastRule,
  BrandChannelRule,
  BrandSegmentConfig,
  BrandFunnelStageRule,
  ConfigVersionSnapshot
} from '../types';
import { exportBrandManualToMarkdown } from '../services/brandManualUtils';

type ManualTabId = 'identity' | 'photography' | 'palette' | 'design' | 'channels';

const BUILT_IN_CHANNEL_IDS = new Set([
  'social_media',
  'mailing_ecommerce',
  'web',
  'pdv_sucursal'
]);

const BUILT_IN_CHANNEL_SHORT_LABELS: Record<string, string> = {
  social_media: 'Redes Sociales',
  mailing_ecommerce: 'Mailing / E-commerce',
  web: 'Sitio Web',
  pdv_sucursal: 'PDV Sucursal'
};

const SEGMENT_ORDER = ['b2c_patients', 'b2d_doctors', 'b2b_enterprises'];

const SEGMENT_DISPLAY_TITLES: Record<string, string> = {
  b2c_patients: 'B2C — Pacientes',
  b2d_doctors: 'B2D — Médicos',
  b2b_enterprises: 'B2B — Empresas'
};

const FUNNEL_ORDER = ['awareness', 'consideration', 'performance'];

const FUNNEL_BADGES: Record<string, { title: string; colorClass: string }> = {
  awareness: {
    title: 'Awareness',
    colorClass: 'bg-sky-50 text-[#004699] border-sky-200'
  },
  consideration: {
    title: 'Consideration',
    colorClass: 'bg-blue-50 text-[#005FFC] border-blue-200'
  },
  performance: {
    title: 'Performance',
    colorClass: 'bg-rose-50 text-[#F24360] border-rose-200'
  }
};

function normalizeHexForPicker(hex?: string): string {
  if (!hex) return '#005FFC';
  const cleaned = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) return cleaned.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(cleaned)) {
    const r = cleaned[1];
    const g = cleaned[2];
    const b = cleaned[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return '#005FFC';
}

function hexToRgbString(hex: string): string {
  const safe = normalizeHexForPicker(hex).replace('#', '');
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return 'R:0 G:95 B:252';
  return `R:${r} G:${g} B:${b}`;
}

function isLightHex(hex?: string): boolean {
  const safe = normalizeHexForPicker(hex).replace('#', '');
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
}

function slugifyAscii(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatMexicanDate(raw?: string): string {
  if (!raw) return 'Versión oficial';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'Versión oficial';
  return parsed.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function sanitizeSnapshotLabel(label?: string): string {
  if (!label || /MVP|Semilla|seed/i.test(label)) {
    return 'Manual de Marca V4 Oficial — Laboratorio Médico del Chopo';
  }
  return label;
}

function normalizeManual(raw: any): BrandManualConfig {
  const m = raw && typeof raw === 'object' ? raw : {};
  const idv = m.identity_and_voice || {};
  const photo = m.photography_and_imagery || {};
  const pal = m.color_palette || {};
  const gfx = m.graphic_design_and_layout || {};
  const ch = m.channels || {};

  return {
    metadata: {
      id: m.metadata?.id || 'chopo_brand_manual_v4',
      version: m.metadata?.version || '4.0.0',
      sourceDocument: m.metadata?.sourceDocument || 'Manual V4 — Laboratorio Médico del Chopo',
      client: m.metadata?.client || 'Grupo PROA / Laboratorio Médico del Chopo',
      umbrellaCampaign: m.metadata?.umbrellaCampaign || 'Chopo, toda una vida cuidando la vida.',
      lastUpdated: m.metadata?.lastUpdated || new Date().toISOString().slice(0, 10),
      architectureNote: m.metadata?.architectureNote
    },
    identity_and_voice: {
      uiTabTitle: idv.uiTabTitle || '1. Identidad y Voz',
      sourcePages: idv.sourcePages,
      officialBrandNames: Array.isArray(idv.officialBrandNames)
        ? idv.officialBrandNames
        : ['Laboratorio Médico del Chopo', 'Chopo'],
      logoDescriptor: idv.logoDescriptor || 'Análisis clínicos y estudios especializados',
      mandatorySlogan: {
        text: idv.mandatorySlogan?.text || 'Chopo, toda una vida cuidando la vida.',
        usageRule: idv.mandatorySlogan?.usageRule || ''
      },
      purpose: idv.purpose || '',
      brandAttributesPyramid: {
        cuspUnique: Array.isArray(idv.brandAttributesPyramid?.cuspUnique) ? idv.brandAttributesPyramid.cuspUnique : [],
        centerDifferentiators: Array.isArray(idv.brandAttributesPyramid?.centerDifferentiators) ? idv.brandAttributesPyramid.centerDifferentiators : [],
        baseCategoryEssentials: Array.isArray(idv.brandAttributesPyramid?.baseCategoryEssentials) ? idv.brandAttributesPyramid.baseCategoryEssentials : [],
        experiencePillars: idv.brandAttributesPyramid?.experiencePillars || {}
      },
      audienceSegments: idv.audienceSegments || {},
      voiceAndCopyInvariants: {
        grammaticalPerson: idv.voiceAndCopyInvariants?.grammaticalPerson || '',
        zeroExclamationMarks: idv.voiceAndCopyInvariants?.zeroExclamationMarks || '',
        clarityOverJargon: idv.voiceAndCopyInvariants?.clarityOverJargon || '',
        ingenuityVsHumor: idv.voiceAndCopyInvariants?.ingenuityVsHumor || '',
        dos: Array.isArray(idv.voiceAndCopyInvariants?.dos) ? idv.voiceAndCopyInvariants.dos : [],
        donts: Array.isArray(idv.voiceAndCopyInvariants?.donts) ? idv.voiceAndCopyInvariants.donts : []
      },
      funnelStageRules: idv.funnelStageRules || {},
      contactTouchpointsOrder: {
        strictOrder: Array.isArray(idv.contactTouchpointsOrder?.strictOrder)
          ? idv.contactTouchpointsOrder.strictOrder
          : [],
        rule: idv.contactTouchpointsOrder?.rule || ''
      },
      medicalCitationsRule: {
        maxAgeYears: typeof idv.medicalCitationsRule?.maxAgeYears === 'number' ? idv.medicalCitationsRule.maxAgeYears : 5,
        citationStandard: idv.medicalCitationsRule?.citationStandard || 'APA 7',
        rule: idv.medicalCitationsRule?.rule || ''
      },
      advertisingPermitRule: idv.advertisingPermitRule || ''
    },
    photography_and_imagery: {
      uiTabTitle: photo.uiTabTitle || '2. Fotografía e Imagen',
      sourcePages: photo.sourcePages,
      generalPhilosophy: photo.generalPhilosophy || '',
      colorTemperatureRule: photo.colorTemperatureRule || '',
      cleanBaseImageRuleForAI: photo.cleanBaseImageRuleForAI || '',
      focusGroupWarmthHint: photo.focusGroupWarmthHint || '',
      dos: Array.isArray(photo.dos) ? photo.dos : [],
      donts: Array.isArray(photo.donts) ? photo.donts : []
    },
    color_palette: {
      uiTabTitle: pal.uiTabTitle || '3. Paleta y Contrastes',
      sourcePages: pal.sourcePages,
      ambientPromptGuidance: pal.ambientPromptGuidance || '',
      primaryDigital: Array.isArray(pal.primaryDigital) ? pal.primaryDigital : [],
      secondaryDigital: Array.isArray(pal.secondaryDigital) ? pal.secondaryDigital : [],
      promotionalAndButtons: Array.isArray(pal.promotionalAndButtons) ? pal.promotionalAndButtons : [],
      contrastMatrix: Array.isArray(pal.contrastMatrix) ? pal.contrastMatrix : []
    },
    graphic_design_and_layout: {
      uiTabTitle: gfx.uiTabTitle || '4. Diseño Gráfico y Línea Basal',
      sourcePages: gfx.sourcePages,
      usageNote: gfx.usageNote || '',
      logoRules: {
        mandatoryDescriptor: gfx.logoRules?.mandatoryDescriptor || '',
        contrastOnPhotos: gfx.logoRules?.contrastOnPhotos || '',
        modularLogoColor: gfx.logoRules?.modularLogoColor || '',
        placement: gfx.logoRules?.placement || '',
        cobrandingRule: gfx.logoRules?.cobrandingRule || ''
      },
      typographyRules: {
        primaryFontFamily: gfx.typographyRules?.primaryFontFamily || '',
        webAlternativeFontFamily: gfx.typographyRules?.webAlternativeFontFamily || '',
        weightHierarchy: gfx.typographyRules?.weightHierarchy || {
          BLACK: '',
          HEAVY: '',
          MEDIUM: '',
          LIGHT: ''
        },
        visionAuditGuidance: gfx.typographyRules?.visionAuditGuidance || ''
      },
      lineaBasalRules: {
        description: gfx.lineaBasalRules?.description || '',
        proportionInvariants: Array.isArray(gfx.lineaBasalRules?.proportionInvariants) ? gfx.lineaBasalRules.proportionInvariants : [],
        interactionAndSizeRules: Array.isArray(gfx.lineaBasalRules?.interactionAndSizeRules) ? gfx.lineaBasalRules.interactionAndSizeRules : [],
        allowedAndForbiddenCrops: Array.isArray(gfx.lineaBasalRules?.allowedAndForbiddenCrops) ? gfx.lineaBasalRules.allowedAndForbiddenCrops : [],
        nonAggressionRules: Array.isArray(gfx.lineaBasalRules?.nonAggressionRules) ? gfx.lineaBasalRules.nonAggressionRules : []
      },
      modularityRules: {
        cornerGeometry: gfx.modularityRules?.cornerGeometry || '',
        noFloatingBoxes: gfx.modularityRules?.noFloatingBoxes || '',
        singleAxisOrientation: gfx.modularityRules?.singleAxisOrientation || '',
        maxSizeLimits: gfx.modularityRules?.maxSizeLimits || '',
        horizontalLayoutAndCtaTab: gfx.modularityRules?.horizontalLayoutAndCtaTab || ''
      },
      pricingAndDiscountsRules: {
        mandatoryColor: gfx.pricingAndDiscountsRules?.mandatoryColor || '',
        circularBadgeBleed: gfx.pricingAndDiscountsRules?.circularBadgeBleed || '',
        modularPromoBox: gfx.pricingAndDiscountsRules?.modularPromoBox || ''
      },
      iconsLegalsAndNoPhotoRules: {
        icons: gfx.iconsLegalsAndNoPhotoRules?.icons || '',
        legalsPlacement: gfx.iconsLegalsAndNoPhotoRules?.legalsPlacement || '',
        noPhotoLayouts: gfx.iconsLegalsAndNoPhotoRules?.noPhotoLayouts || ''
      }
    },
    channels: {
      uiTabTitle: ch.uiTabTitle || '5. Reglas por Canal',
      items: ch.items || {}
    }
  };
}

interface EditableListProps {
  items: string[];
  onChange: (next: string[]) => void;
  addButtonLabel?: string;
  placeholder?: string;
  variant?: 'neutral' | 'do' | 'dont' | 'ordered';
  multiline?: boolean;
  disabled?: boolean;
}

const EditableStringList: React.FC<EditableListProps> = ({
  items,
  onChange,
  addButtonLabel = '+ Agregar',
  placeholder = 'Escribe un nuevo lineamiento...',
  variant = 'neutral',
  multiline = false,
  disabled = false
}) => {
  const handleItemChange = (idx: number, value: string) => {
    const next = [...items];
    next[idx] = value;
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    onChange([...items, '']);
  };

  const handleMove = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const temp = next[idx];
    next[idx] = next[target];
    next[target] = temp;
    onChange(next);
  };

  const cardStyles =
    variant === 'do'
      ? 'bg-emerald-50/60 border-emerald-200 focus-within:border-emerald-400'
      : variant === 'dont'
        ? 'bg-rose-50/60 border-rose-200 focus-within:border-rose-400'
        : 'bg-slate-50/70 border-slate-200 focus-within:border-[#005FFC]';

  const addButtonStyles =
    variant === 'do'
      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
      : variant === 'dont'
        ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
        : 'bg-[#EFF9FE] hover:bg-blue-100 text-[#004699] border-blue-200';

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => {
        const isCriticalPhotoAlert =
          variant === 'dont' && /estetoscopio/i.test(item);
        return (
          <div
            key={idx}
            className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${cardStyles} ${
              isCriticalPhotoAlert ? 'ring-2 ring-rose-300/80 bg-rose-50' : ''
            }`}
          >
            {variant === 'do' && (
              <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-1.5" />
            )}
            {variant === 'dont' && (
              <AlertTriangle size={17} className="text-rose-600 shrink-0 mt-1.5" />
            )}
            {variant === 'ordered' && (
              <span className="w-6 h-6 rounded-full bg-[#005FFC] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                {idx + 1}
              </span>
            )}

            <div className="flex-1 min-w-0">
              {isCriticalPhotoAlert && (
                <span className="inline-block mb-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wide">
                  Regla Crítica de Marca
                </span>
              )}
              {multiline ? (
                <textarea
                  rows={2}
                  disabled={disabled}
                  value={item}
                  onChange={(e) => handleItemChange(idx, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-white/90 focus:bg-white text-sm text-slate-800 px-3 py-2 rounded-lg border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 resize-y leading-relaxed disabled:opacity-60"
                />
              ) : (
                <input
                  type="text"
                  disabled={disabled}
                  value={item}
                  onChange={(e) => handleItemChange(idx, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-white/90 focus:bg-white text-sm text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-60"
                />
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 mt-1">
              {variant === 'ordered' && (
                <>
                  <button
                    type="button"
                    disabled={disabled || idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="p-1 rounded-lg text-slate-400 hover:text-[#004699] hover:bg-white disabled:opacity-30"
                    title="Subir posición"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || idx === items.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="p-1 rounded-lg text-slate-400 hover:text-[#004699] hover:bg-white disabled:opacity-30"
                    title="Bajar posición"
                  >
                    <ArrowDown size={14} />
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemove(idx)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors disabled:opacity-40"
                title="Eliminar elemento"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={handleAdd}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors disabled:opacity-50 ${addButtonStyles}`}
      >
        <Plus size={14} />
        <span>{addButtonLabel.replace(/^\+\s*/, '')}</span>
      </button>
    </div>
  );
};

interface AccordionCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
  children: React.ReactNode;
}

const AccordionCard: React.FC<AccordionCardProps> = ({
  title,
  subtitle,
  icon,
  defaultOpen = true,
  accentColor = 'border-t-[#005FFC]',
  children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 border-t-4 ${accentColor} shadow-sm overflow-hidden`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-[#EFF9FE] border border-blue-100 flex items-center justify-center text-[#005FFC] shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#004699]">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <span className="p-1.5 rounded-lg text-slate-400 bg-slate-100/80 shrink-0">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {isOpen && <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4">{children}</div>}
    </div>
  );
};

export const BrandManualView: React.FC = () => {
  const [manual, setManual] = useState<BrandManualConfig | null>(null);
  const [versions, setVersions] = useState<ConfigVersionSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<ManualTabId>('identity');
  const [selectedChannelKey, setSelectedChannelKey] = useState<string>('social_media');
  const [versionNote, setVersionNote] = useState<string>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tab 5 inline channel creator & format input
  const [isCreatingChannel, setIsCreatingChannel] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [newFormatInput, setNewFormatInput] = useState<string>('');

  // Tab 3 contrast chip inputs keyed by `${rowIdx}_allowed` or `${rowIdx}_forbidden`
  const [contrastHexDrafts, setContrastHexDrafts] = useState<Record<string, string>>({});

  const isBusy = isLoading || isSaving || isRestoring;

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 5500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const fetchVersions = async () => {
    try {
      const res = await fetch('/api/config/versions?entityType=brand_manual');
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.versions)
          ? data.versions
          : [];
      setVersions(list);
    } catch (err) {
      console.warn('No se pudo cargar el historial de versiones del manual:', err);
    }
  };

  const fetchActiveManual = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [manualRes] = await Promise.all([
        fetch('/api/config/brand-manual'),
        fetchVersions()
      ]);
      if (!manualRes.ok) {
        throw new Error(`HTTP ${manualRes.status}`);
      }
      const data = await manualRes.json();
      const rawManual = data?.manual || data?.data || (data?.identity_and_voice ? data : null);
      if (!rawManual) {
        throw new Error('Respuesta vacía del servidor');
      }
      const normalized = normalizeManual(rawManual);
      setManual(normalized);
      setHasUnsavedChanges(false);
      const chKeys = Object.keys(normalized.channels.items);
      if (chKeys.length > 0 && !normalized.channels.items[selectedChannelKey]) {
        setSelectedChannelKey(chKeys.includes('social_media') ? 'social_media' : chKeys[0]);
      }
    } catch (err) {
      console.error('Error al cargar Manual de Marca V4:', err);
      setErrorMessage('No fue posible cargar el Manual de Marca V4 desde el servidor. Verifica la conexión e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveManual();
  }, []);

  const updateManual = (updater: (prev: BrandManualConfig) => BrandManualConfig) => {
    setManual((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!manual || isBusy) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const label = versionNote.trim() || 'Actualización del Manual de Marca V4';
      const updatedManual: BrandManualConfig = {
        ...manual,
        metadata: {
          ...manual.metadata,
          umbrellaCampaign: manual.identity_and_voice.mandatorySlogan.text || manual.metadata.umbrellaCampaign,
          lastUpdated: new Date().toISOString().slice(0, 10)
        }
      };

      const res = await fetch('/api/config/brand-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: updatedManual, label })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const savedManual = data?.manual || data?.data || updatedManual;
      setManual(normalizeManual(savedManual));
      setHasUnsavedChanges(false);
      setVersionNote('');
      await fetchVersions();
      showToast('Cambios guardados correctamente. Los lineamientos ya están activos en campañas, imágenes y evaluaciones.');
    } catch (err) {
      console.error('Error al guardar Manual de Marca V4:', err);
      setErrorMessage('No se pudieron guardar los cambios del Manual de Marca V4. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (isBusy) return;
    setIsRestoring(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/config/versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'brand_manual', versionId })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const restored = data?.manual || data?.data;
      if (restored && typeof restored === 'object') {
        const normalized = normalizeManual(restored);
        setManual(normalized);
        const chKeys = Object.keys(normalized.channels.items);
        if (chKeys.length > 0 && !normalized.channels.items[selectedChannelKey]) {
          setSelectedChannelKey(chKeys[0]);
        }
      } else {
        await fetchActiveManual();
      }
      setHasUnsavedChanges(false);
      await fetchVersions();
      showToast(
        versionId === 'OFFICIAL_SEED'
          ? 'Se restauró el Manual de Marca V4 Oficial de Laboratorio Médico del Chopo.'
          : 'Se restauró la versión seleccionada del Manual de Marca V4 correctamente.'
      );
    } catch (err) {
      console.error('Error al restaurar versión del manual:', err);
      setErrorMessage('No se pudo restaurar la versión seleccionada. Intenta de nuevo.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!manual) return;
    const markdownText = exportBrandManualToMarkdown(manual);
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Manual_Marca_Chopo_V4.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Descarga iniciada: Manual_Marca_Chopo_V4.md');
  };

  const allPaletteColors = useMemo<BrandColorItem[]>(() => {
    if (!manual) return [];
    return [
      ...manual.color_palette.primaryDigital,
      ...manual.color_palette.secondaryDigital,
      ...manual.color_palette.promotionalAndButtons
    ];
  }, [manual]);

  const orderedSegmentKeys = useMemo(() => {
    if (!manual) return [];
    const existing = Object.keys(manual.identity_and_voice.audienceSegments || {});
    const primary = SEGMENT_ORDER.filter((k) => existing.includes(k));
    const extras = existing.filter((k) => !SEGMENT_ORDER.includes(k));
    return [...primary, ...extras];
  }, [manual]);

  const orderedFunnelKeys = useMemo(() => {
    if (!manual) return [];
    const existing = Object.keys(manual.identity_and_voice.funnelStageRules || {});
    const primary = FUNNEL_ORDER.filter((k) => existing.includes(k));
    const extras = existing.filter((k) => !FUNNEL_ORDER.includes(k));
    return [...primary, ...extras];
  }, [manual]);

  const channelKeys = useMemo(() => {
    if (!manual) return [];
    const keys = Object.keys(manual.channels.items || {});
    const defaultOrder = ['social_media', 'mailing_ecommerce', 'web', 'pdv_sucursal'];
    const ordered = defaultOrder.filter((k) => keys.includes(k));
    const custom = keys.filter((k) => !defaultOrder.includes(k));
    return [...ordered, ...custom];
  }, [manual]);

  const tabs: Array<{ id: ManualTabId; label: string; icon: React.FC<any> }> = [
    { id: 'identity', label: '1. Identidad y Voz', icon: Users },
    { id: 'photography', label: '2. Fotografía e Imagen', icon: Camera },
    { id: 'palette', label: '3. Paleta y Contrastes', icon: Palette },
    { id: 'design', label: '4. Diseño Gráfico y Línea Basal', icon: Layers },
    { id: 'channels', label: '5. Reglas por Canal', icon: Megaphone }
  ];

  // Helpers for Tab 3 palette updates
  const updateColorGroup = (
    groupKey: 'primaryDigital' | 'secondaryDigital' | 'promotionalAndButtons',
    updater: (list: BrandColorItem[]) => BrandColorItem[]
  ) => {
    updateManual((prev) => ({
      ...prev,
      color_palette: {
        ...prev.color_palette,
        [groupKey]: updater(prev.color_palette[groupKey])
      }
    }));
  };

  const handleAddColorToGroup = (
    groupKey: 'primaryDigital' | 'secondaryDigital' | 'promotionalAndButtons'
  ) => {
    const newItem: BrandColorItem = {
      id: `custom_color_${Date.now()}`,
      name: 'Nuevo Color Corporativo',
      hex: '#005FFC',
      rgb: 'R:0 G:95 B:252',
      usage: 'Define el uso autorizado de este color en materiales de marca.'
    };
    updateColorGroup(groupKey, (list) => [...list, newItem]);
  };

  const handleUpdateContrastRow = (
    rowIdx: number,
    updater: (row: BrandContrastRule) => BrandContrastRule
  ) => {
    updateManual((prev) => {
      const nextMatrix = [...prev.color_palette.contrastMatrix];
      nextMatrix[rowIdx] = updater(nextMatrix[rowIdx]);
      return {
        ...prev,
        color_palette: {
          ...prev.color_palette,
          contrastMatrix: nextMatrix
        }
      };
    });
  };

  const handleAddContrastRow = () => {
    updateManual((prev) => ({
      ...prev,
      color_palette: {
        ...prev.color_palette,
        contrastMatrix: [
          ...prev.color_palette.contrastMatrix,
          {
            backgroundHex: '#EFF9FE',
            backgroundName: 'Nuevo Fondo',
            allowedForegrounds: ['#004699'],
            forbiddenForegrounds: ['#FFFFFF'],
            notes: 'Especifica recomendaciones de lectura y contraste.'
          }
        ]
      }
    }));
  };

  const handleAddContrastChip = (
    rowIdx: number,
    field: 'allowedForegrounds' | 'forbiddenForegrounds',
    rawHex: string
  ) => {
    const trimmed = rawHex.trim().toUpperCase();
    if (!trimmed) return;
    const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!/^#[0-9A-F]{6}$/.test(formatted)) return;
    handleUpdateContrastRow(rowIdx, (row) => {
      const current = row[field] || [];
      if (current.includes(formatted)) return row;
      return { ...row, [field]: [...current, formatted] };
    });
    const draftKey = `${rowIdx}_${field}`;
    setContrastHexDrafts((prev) => ({ ...prev, [draftKey]: '' }));
  };

  // Helpers for Tab 5 channels
  const handleCreateChannel = () => {
    const cleanLabel = newChannelName.trim();
    if (!cleanLabel || !manual) return;
    let slug = slugifyAscii(cleanLabel) || `canal_${Date.now()}`;
    if (manual.channels.items[slug]) {
      slug = `${slug}_${Date.now().toString().slice(-4)}`;
    }
    const newChannel: BrandChannelRule = {
      id: slug,
      label: cleanLabel,
      supportedFormats: ['Formato Estándar'],
      copyRules: '',
      photoRules: '',
      focusGroupContext: '',
      auditorRules: []
    };
    updateManual((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        items: {
          ...prev.channels.items,
          [slug]: newChannel
        }
      }
    }));
    setSelectedChannelKey(slug);
    setNewChannelName('');
    setIsCreatingChannel(false);
  };

  const handleDeleteCustomChannel = (chKey: string) => {
    if (BUILT_IN_CHANNEL_IDS.has(chKey) || !manual) return;
    updateManual((prev) => {
      const nextItems = { ...prev.channels.items };
      delete nextItems[chKey];
      return {
        ...prev,
        channels: {
          ...prev.channels,
          items: nextItems
        }
      };
    });
    const remaining = channelKeys.filter((k) => k !== chKey);
    if (remaining.length > 0) setSelectedChannelKey(remaining[0]);
  };

  const updateSelectedChannel = (updater: (ch: BrandChannelRule) => BrandChannelRule) => {
    if (!manual || !manual.channels.items[selectedChannelKey]) return;
    updateManual((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        items: {
          ...prev.channels.items,
          [selectedChannelKey]: updater(prev.channels.items[selectedChannelKey])
        }
      }
    }));
  };

  const handleAddChannelFormat = () => {
    const fmt = newFormatInput.trim();
    if (!fmt) return;
    updateSelectedChannel((ch) => ({
      ...ch,
      supportedFormats: ch.supportedFormats.includes(fmt)
        ? ch.supportedFormats
        : [...ch.supportedFormats, fmt]
    }));
    setNewFormatInput('');
  };

  const renderColorGroupSection = (
    title: string,
    subtitle: string,
    groupKey: 'primaryDigital' | 'secondaryDigital' | 'promotionalAndButtons'
  ) => {
    if (!manual) return null;
    const list = manual.color_palette[groupKey] || [];
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#004699]">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleAddColorToGroup(groupKey)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EFF9FE] hover:bg-blue-100 text-[#004699] border border-blue-200 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            <span>Agregar Color</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((colorItem, idx) => {
            const safeHex = normalizeHexForPicker(colorItem.hex);
            const light = isLightHex(safeHex);
            return (
              <div
                key={colorItem.id || idx}
                className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/40 flex flex-col shadow-sm hover:border-[#005FFC]/50 transition-colors"
              >
                {/* Live Color Swatch Preview */}
                <div
                  className="h-24 p-3.5 flex items-end justify-between relative border-b border-slate-200/70"
                  style={{ backgroundColor: safeHex }}
                >
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide shadow-sm ${
                      light
                        ? 'bg-white/85 text-[#004699] border border-slate-200/80'
                        : 'bg-slate-900/35 text-white backdrop-blur-sm'
                    }`}
                  >
                    {colorItem.hex}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <label
                      className={`cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-opacity hover:opacity-90 ${
                        light
                          ? 'bg-white/90 text-[#004699] border border-slate-200'
                          : 'bg-white/20 text-white backdrop-blur-sm border border-white/30'
                      }`}
                      title="Elegir color visualmente"
                    >
                      <input
                        type="color"
                        disabled={isBusy}
                        value={safeHex}
                        onChange={(e) => {
                          const picked = e.target.value.toUpperCase();
                          updateColorGroup(groupKey, (items) =>
                            items.map((c, i) =>
                              i === idx ? { ...c, hex: picked, rgb: hexToRgbString(picked) } : c
                            )
                          );
                        }}
                        className="w-4 h-4 rounded border-0 p-0 bg-transparent cursor-pointer"
                      />
                      <span>Selector</span>
                    </label>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        updateColorGroup(groupKey, (items) => items.filter((_, i) => i !== idx))
                      }
                      className={`p-1.5 rounded-lg transition-colors ${
                        light
                          ? 'bg-white/90 text-slate-500 hover:text-rose-600 border border-slate-200'
                          : 'bg-slate-900/30 text-white/90 hover:bg-rose-600'
                      }`}
                      title="Eliminar color"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="p-4 space-y-3 bg-white flex-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Nombre del color
                    </label>
                    <input
                      type="text"
                      disabled={isBusy}
                      value={colorItem.name}
                      onChange={(e) =>
                        updateColorGroup(groupKey, (items) =>
                          items.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c))
                        )
                      }
                      className="w-full px-3 py-1.5 text-sm font-semibold text-[#004699] bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Código HEX
                      </label>
                      <input
                        type="text"
                        disabled={isBusy}
                        value={colorItem.hex}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          updateColorGroup(groupKey, (items) =>
                            items.map((c, i) =>
                              i === idx
                                ? {
                                    ...c,
                                    hex: val,
                                    rgb: /^#[0-9A-F]{6}$/.test(val) ? hexToRgbString(val) : c.rgb
                                  }
                                : c
                            )
                          );
                        }}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Equivalencia RGB
                      </label>
                      <input
                        type="text"
                        disabled={isBusy}
                        value={colorItem.rgb}
                        onChange={(e) =>
                          updateColorGroup(groupKey, (items) =>
                            items.map((c, i) => (i === idx ? { ...c, rgb: e.target.value } : c))
                          )
                        }
                        className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Uso autorizado
                    </label>
                    <textarea
                      rows={2}
                      disabled={isBusy}
                      value={colorItem.usage}
                      onChange={(e) =>
                        updateColorGroup(groupKey, (items) =>
                          items.map((c, i) => (i === idx ? { ...c, usage: e.target.value } : c))
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 resize-y leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading && !manual) {
    return (
      <div className="max-w-7xl mx-auto py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 size={32} className="animate-spin text-[#005FFC]" />
        <p className="text-sm font-semibold text-[#004699]">
          Cargando Manual de Marca V4 — Laboratorio Médico del Chopo...
        </p>
      </div>
    );
  }

  if (!manual) {
    return (
      <div className="max-w-3xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 p-8 shadow-sm text-center space-y-4">
        <AlertTriangle size={36} className="text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-[#004699]">No se pudo cargar el Manual de Marca V4</h2>
        <p className="text-sm text-slate-600">
          {errorMessage || 'Ocurrió un problema al consultar los lineamientos vigentes.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={fetchActiveManual}
            className="px-5 py-2.5 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white text-sm font-bold inline-flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={16} />
            <span>Reintentar</span>
          </button>
          <button
            type="button"
            onClick={() => handleRestoreVersion('OFFICIAL_SEED')}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#004699] text-sm font-bold inline-flex items-center gap-2 transition-colors"
          >
            <RotateCcw size={16} />
            <span>Restaurar Manual V4 Oficial</span>
          </button>
        </div>
      </div>
    );
  }

  const activeChannel = manual.channels.items[selectedChannelKey] || null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Enterprise Header & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#005FFC] via-[#004699] to-[#63CF00]" />
        <div className="p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF9FE] border border-blue-200 flex items-center justify-center text-[#005FFC] shrink-0 shadow-sm">
                <Palette size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-black text-[#004699] tracking-tight">
                    Manual de Marca V4 — Laboratorio Médico del Chopo
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EFF9FE] text-[#005FFC] border border-blue-200 text-xs font-bold">
                    Versión {manual.metadata.version || '4.0.0'}
                  </span>
                  {hasUnsavedChanges && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Cambios sin guardar
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 max-w-4xl leading-relaxed">
                  Administra por secciones los lineamientos oficiales de identidad, fotografía, colores, diseño y canales. Cada cambio se aplica automáticamente al generar campañas, imágenes y evaluaciones.
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
              <input
                type="text"
                disabled={isBusy}
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                placeholder="Nota de cambio (opcional)..."
                className="flex-1 min-w-[220px] max-w-md px-4 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white text-sm font-bold shadow-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  const next = !isHistoryOpen;
                  setIsHistoryOpen(next);
                  if (next) fetchVersions();
                }}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 ${
                  isHistoryOpen
                    ? 'bg-[#004699] text-white border-[#004699]'
                    : 'bg-white hover:bg-slate-50 text-[#004699] border-slate-200'
                }`}
              >
                <History size={15} />
                <span>Historial de Versiones</span>
                {versions.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isHistoryOpen ? 'bg-white/20 text-white' : 'bg-[#EFF9FE] text-[#005FFC]'
                    }`}
                  >
                    {versions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={handleDownloadMarkdown}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EFF9FE] text-[#004699] border border-slate-200 hover:border-blue-300 text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Download size={15} className="text-[#005FFC]" />
                <span>Descargar en Texto (.md)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Toast Banner */}
        {toastMessage && (
          <div className="px-6 py-3 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between gap-3 text-sm font-semibold text-emerald-800">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="px-6 py-3 bg-rose-50 border-t border-rose-200 flex items-center justify-between gap-3 text-sm font-semibold text-rose-800">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-950 p-1 rounded-lg hover:bg-rose-100"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Collapsible Version History Panel */}
        {isHistoryOpen && (
          <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#004699]">
                  Control de Versiones del Manual de Marca V4
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cada guardado conserva un respaldo completo para volver a una versión anterior en un clic.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleRestoreVersion('OFFICIAL_SEED')}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-amber-50 text-[#004699] border border-slate-300 hover:border-amber-400 text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                  {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  <span>Restaurar Manual V4 Oficial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"
                  title="Cerrar historial"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {versions.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-500">
                Aún no hay versiones guardadas personalizadas. Puedes editar cualquier pestaña y presionar &ldquo;Guardar Cambios&rdquo;, o restablecer con &ldquo;Restaurar Manual V4 Oficial&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {versions.map((ver) => (
                  <div
                    key={ver.versionId}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-sm hover:border-blue-300 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#004699] truncate">
                        {sanitizeSnapshotLabel(ver.label)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatMexicanDate(ver.timestamp || (ver as any).createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRestoreVersion(ver.versionId)}
                      className="px-3.5 py-2 rounded-xl bg-[#EFF9FE] hover:bg-[#005FFC] text-[#005FFC] hover:text-white text-xs font-bold transition-colors shrink-0 disabled:opacity-50"
                    >
                      Restaurar esta versión
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5-Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-auto px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-[#005FFC] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-[#EFF9FE] hover:text-[#004699]'
              }`}
            >
              <Icon size={15} className={isSelected ? 'text-white shrink-0' : 'text-[#005FFC] shrink-0'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: 1. IDENTIDAD Y VOZ ==================== */}
      {activeTab === 'identity' && (
        <div className="space-y-6">
          {/* Card 1: Identidad Oficial, Slogan y Propósito */}
          <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#005FFC] p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#004699]">Identidad Oficial, Slogan y Propósito</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nombres oficiales autorizados, descriptivo del logotipo y frase paraguas obligatoria en todas las campañas.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-2">
                  Nombres Oficiales de Marca
                </label>
                <EditableStringList
                  items={manual.identity_and_voice.officialBrandNames}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: { ...prev.identity_and_voice, officialBrandNames: next }
                    }))
                  }
                  addButtonLabel="+ Agregar nombre oficial"
                  placeholder="ej. Laboratorio Médico del Chopo"
                  disabled={isBusy}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                    Descriptivo Obligatorio del Logotipo
                  </label>
                  <input
                    type="text"
                    disabled={isBusy}
                    value={manual.identity_and_voice.logoDescriptor}
                    onChange={(e) =>
                      updateManual((prev) => ({
                        ...prev,
                        identity_and_voice: { ...prev.identity_and_voice, logoDescriptor: e.target.value }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                    Slogan Obligatorio
                  </label>
                  <input
                    type="text"
                    disabled={isBusy}
                    value={manual.identity_and_voice.mandatorySlogan.text}
                    onChange={(e) =>
                      updateManual((prev) => ({
                        ...prev,
                        identity_and_voice: {
                          ...prev.identity_and_voice,
                          mandatorySlogan: {
                            ...prev.identity_and_voice.mandatorySlogan,
                            text: e.target.value
                          }
                        }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-[#004699] bg-[#EFF9FE]/60 focus:bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Regla de Uso del Slogan
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.identity_and_voice.mandatorySlogan.usageRule}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        mandatorySlogan: {
                          ...prev.identity_and_voice.mandatorySlogan,
                          usageRule: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Propósito de Marca
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.identity_and_voice.purpose}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: { ...prev.identity_and_voice, purpose: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Card 2: 3 Segmentos Oficiales de Audiencia */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#004699]">3 Segmentos Oficiales de Audiencia</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define el pronombre de trato (Tú / Usted), tono, destino digital, leyenda precautoria e impulsores de valor para cada segmento.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {orderedSegmentKeys.map((segKey) => {
                const seg: BrandSegmentConfig = manual.identity_and_voice.audienceSegments[segKey];
                if (!seg) return null;
                const displayHeader = SEGMENT_DISPLAY_TITLES[segKey] || seg.label;
                const badgeStyle =
                  seg.code === 'B2C'
                    ? 'bg-[#EFF9FE] text-[#005FFC] border-blue-200'
                    : seg.code === 'B2D'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200';

                const updateSegment = (patch: Partial<BrandSegmentConfig>) => {
                  updateManual((prev) => ({
                    ...prev,
                    identity_and_voice: {
                      ...prev.identity_and_voice,
                      audienceSegments: {
                        ...prev.identity_and_voice.audienceSegments,
                        [segKey]: {
                          ...prev.identity_and_voice.audienceSegments[segKey],
                          ...patch
                        }
                      }
                    }
                  }));
                };

                return (
                  <div
                    key={segKey}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-[#004699]">{displayHeader}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}>
                        {seg.code}
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Nombre del segmento en el manual
                        </label>
                        <input
                          type="text"
                          disabled={isBusy}
                          value={seg.label}
                          onChange={(e) => updateSegment({ label: e.target.value })}
                          className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Pronombre de trato
                          </label>
                          <select
                            disabled={isBusy}
                            value={seg.pronoun}
                            onChange={(e) => updateSegment({ pronoun: e.target.value })}
                            className="w-full px-3 py-2 text-sm font-bold text-[#004699] bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                          >
                            <option value="Tú">Tú</option>
                            <option value="Usted">Usted</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Destino principal
                          </label>
                          <input
                            type="text"
                            disabled={isBusy}
                            value={seg.primaryDestination}
                            onChange={(e) => updateSegment({ primaryDestination: e.target.value })}
                            className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Guía de tono y personalidad
                        </label>
                        <textarea
                          rows={3}
                          disabled={isBusy}
                          value={seg.toneGuidance}
                          onChange={(e) => updateSegment({ toneGuidance: e.target.value })}
                          className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Leyenda precautoria obligatoria
                        </label>
                        <input
                          type="text"
                          disabled={isBusy}
                          value={seg.mandatoryPrecautionaryLegend}
                          onChange={(e) => updateSegment({ mandatoryPrecautionaryLegend: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold text-[#004699] bg-amber-50/50 focus:bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                          Impulsores de valor
                        </label>
                        <EditableStringList
                          items={seg.valueDrivers || []}
                          onChange={(next) => updateSegment({ valueDrivers: next })}
                          addButtonLabel="+ Agregar"
                          placeholder="Nuevo impulsor de valor..."
                          disabled={isBusy}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Reglas Invariables de Voz */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#004699]">Reglas Invariables de Voz</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Principios obligatorios que aplican en todos los textos, sin importar el canal o promoción.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Persona Gramatical (Primera Persona Plural)
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.identity_and_voice.voiceAndCopyInvariants.grammaticalPerson}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        voiceAndCopyInvariants: {
                          ...prev.identity_and_voice.voiceAndCopyInvariants,
                          grammaticalPerson: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-700 uppercase tracking-wide mb-1.5">
                  Cero Signos de Admiración (¡...!)
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.identity_and_voice.voiceAndCopyInvariants.zeroExclamationMarks}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        voiceAndCopyInvariants: {
                          ...prev.identity_and_voice.voiceAndCopyInvariants,
                          zeroExclamationMarks: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-rose-50/40 focus:bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Claridad Sobre Tecnicismos
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.identity_and_voice.voiceAndCopyInvariants.clarityOverJargon}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        voiceAndCopyInvariants: {
                          ...prev.identity_and_voice.voiceAndCopyInvariants,
                          clarityOverJargon: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Ingenio vs. Humor
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.identity_and_voice.voiceAndCopyInvariants.ingenuityVsHumor}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        voiceAndCopyInvariants: {
                          ...prev.identity_and_voice.voiceAndCopyInvariants,
                          ingenuityVsHumor: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-emerald-800">Sí Hacer</h3>
                </div>
                <EditableStringList
                  items={manual.identity_and_voice.voiceAndCopyInvariants.dos}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        voiceAndCopyInvariants: {
                          ...prev.identity_and_voice.voiceAndCopyInvariants,
                          dos: next
                        }
                      }
                    }))
                  }
                  variant="do"
                  multiline
                  addButtonLabel="+ Agregar"
                  placeholder="Buena práctica de redacción..."
                  disabled={isBusy}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Ban size={18} className="text-rose-600" />
                  <h3 className="text-sm font-bold text-rose-800">Prohibido</h3>
                </div>
                <EditableStringList
                  items={manual.identity_and_voice.voiceAndCopyInvariants.donts}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        voiceAndCopyInvariants: {
                          ...prev.identity_and_voice.voiceAndCopyInvariants,
                          donts: next
                        }
                      }
                    }))
                  }
                  variant="dont"
                  multiline
                  addButtonLabel="+ Agregar"
                  placeholder="Práctica prohibida en textos..."
                  disabled={isBusy}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Reglas por Etapa del Funnel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#004699]">Reglas por Etapa del Funnel</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Estructura obligatoria de titulares, enfoque del mensaje y ubicación del llamado a la acción según el objetivo de campaña.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {orderedFunnelKeys.map((stageKey) => {
                const stage: BrandFunnelStageRule = manual.identity_and_voice.funnelStageRules[stageKey];
                if (!stage) return null;
                const meta = FUNNEL_BADGES[stageKey] || {
                  title: stage.label || stageKey,
                  colorClass: 'bg-slate-100 text-slate-700 border-slate-200'
                };
                const updateStage = (patch: Partial<BrandFunnelStageRule>) => {
                  updateManual((prev) => ({
                    ...prev,
                    identity_and_voice: {
                      ...prev.identity_and_voice,
                      funnelStageRules: {
                        ...prev.identity_and_voice.funnelStageRules,
                        [stageKey]: {
                          ...prev.identity_and_voice.funnelStageRules[stageKey],
                          ...patch
                        }
                      }
                    }
                  }));
                };

                return (
                  <div
                    key={stageKey}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.colorClass}`}>
                        {meta.title}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 truncate">{stage.label}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#004699] uppercase tracking-wide mb-1">
                        Regla de Titular
                      </label>
                      <textarea
                        rows={4}
                        disabled={isBusy}
                        value={stage.headlineRule}
                        onChange={(e) => updateStage({ headlineRule: e.target.value })}
                        className="w-full px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#004699] uppercase tracking-wide mb-1">
                        Enfoque del Cuerpo
                      </label>
                      <textarea
                        rows={3}
                        disabled={isBusy}
                        value={stage.bodyFocus}
                        onChange={(e) => updateStage({ bodyFocus: e.target.value })}
                        className="w-full px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#004699] uppercase tracking-wide mb-1">
                        Ubicación y Estilo de Llamado a la Acción
                      </label>
                      <textarea
                        rows={3}
                        disabled={isBusy}
                        value={stage.ctaPlacementAndStyle}
                        onChange={(e) => updateStage({ ctaPlacementAndStyle: e.target.value })}
                        className="w-full px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 5: Orden Estricto de Puntos de Contacto, Citas Médicas y Permisos COFEPRIS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#004699]">Orden Estricto de Puntos de Contacto</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Secuencia jerárquica obligatoria para mostrar canales de atención en piezas publicitarias.
                </p>
              </div>

              <EditableStringList
                items={manual.identity_and_voice.contactTouchpointsOrder.strictOrder}
                onChange={(next) =>
                  updateManual((prev) => ({
                    ...prev,
                    identity_and_voice: {
                      ...prev.identity_and_voice,
                      contactTouchpointsOrder: {
                        ...prev.identity_and_voice.contactTouchpointsOrder,
                        strictOrder: next
                      }
                    }
                  }))
                }
                variant="ordered"
                addButtonLabel="+ Agregar punto de contacto"
                placeholder="ej. App Chopo"
                disabled={isBusy}
              />

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Regla de aplicación de puntos de contacto
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.identity_and_voice.contactTouchpointsOrder.rule}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        contactTouchpointsOrder: {
                          ...prev.identity_and_voice.contactTouchpointsOrder,
                          rule: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="space-y-3">
                <div>
                  <h2 className="text-base font-bold text-[#004699]">Citas Médicas y Respaldo Científico</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Criterios obligatorios al citar estadísticas o datos clínicos en publicaciones informativas.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Antigüedad máxima (años)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      disabled={isBusy}
                      value={manual.identity_and_voice.medicalCitationsRule.maxAgeYears}
                      onChange={(e) =>
                        updateManual((prev) => ({
                          ...prev,
                          identity_and_voice: {
                            ...prev.identity_and_voice,
                            medicalCitationsRule: {
                              ...prev.identity_and_voice.medicalCitationsRule,
                              maxAgeYears: Number(e.target.value) || 5
                            }
                          }
                        }))
                      }
                      className="w-full px-3 py-2 text-sm font-bold text-[#004699] bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Estándar de citación
                    </label>
                    <input
                      type="text"
                      disabled={isBusy}
                      value={manual.identity_and_voice.medicalCitationsRule.citationStandard}
                      onChange={(e) =>
                        updateManual((prev) => ({
                          ...prev,
                          identity_and_voice: {
                            ...prev.identity_and_voice,
                            medicalCitationsRule: {
                              ...prev.identity_and_voice.medicalCitationsRule,
                              citationStandard: e.target.value
                            }
                          }
                        }))
                      }
                      className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Regla de citación médica
                  </label>
                  <textarea
                    rows={3}
                    disabled={isBusy}
                    value={manual.identity_and_voice.medicalCitationsRule.rule}
                    onChange={(e) =>
                      updateManual((prev) => ({
                        ...prev,
                        identity_and_voice: {
                          ...prev.identity_and_voice,
                          medicalCitationsRule: {
                            ...prev.identity_and_voice.medicalCitationsRule,
                            rule: e.target.value
                          }
                        }
                      }))
                    }
                    className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <label className="block text-sm font-bold text-[#004699]">
                  Regla de Permisos COFEPRIS
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.identity_and_voice.advertisingPermitRule}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        advertisingPermitRule: e.target.value
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-xs text-slate-700 bg-amber-50/40 focus:bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Optional Collapsible Card: Pirámide de Atributos de Marca */}
          <AccordionCard
            title="Pirámide de Atributos de Marca"
            subtitle="Cúspide única, diferenciadores centrales y esenciales de categoría"
            icon={<ShieldCheck size={18} />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-2">
                  Cúspide Única
                </label>
                <EditableStringList
                  items={manual.identity_and_voice.brandAttributesPyramid.cuspUnique}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        brandAttributesPyramid: {
                          ...prev.identity_and_voice.brandAttributesPyramid,
                          cuspUnique: next
                        }
                      }
                    }))
                  }
                  addButtonLabel="+ Agregar"
                  disabled={isBusy}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-2">
                  Diferenciadores Centrales
                </label>
                <EditableStringList
                  items={manual.identity_and_voice.brandAttributesPyramid.centerDifferentiators}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        brandAttributesPyramid: {
                          ...prev.identity_and_voice.brandAttributesPyramid,
                          centerDifferentiators: next
                        }
                      }
                    }))
                  }
                  addButtonLabel="+ Agregar"
                  disabled={isBusy}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-2">
                  Esenciales de Categoría
                </label>
                <EditableStringList
                  items={manual.identity_and_voice.brandAttributesPyramid.baseCategoryEssentials}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: {
                        ...prev.identity_and_voice,
                        brandAttributesPyramid: {
                          ...prev.identity_and_voice.brandAttributesPyramid,
                          baseCategoryEssentials: next
                        }
                      }
                    }))
                  }
                  addButtonLabel="+ Agregar"
                  disabled={isBusy}
                />
              </div>
            </div>

            {Object.keys(manual.identity_and_voice.brandAttributesPyramid.experiencePillars || {}).length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-[#004699] uppercase tracking-wide">
                  Pilares de Experiencia
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(manual.identity_and_voice.brandAttributesPyramid.experiencePillars).map(
                    ([pillarKey, pillarValues]) => (
                      <div key={pillarKey} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
                        <span className="block text-xs font-bold text-[#004699] capitalize">
                          {pillarKey}
                        </span>
                        <EditableStringList
                          items={Array.isArray(pillarValues) ? pillarValues : []}
                          onChange={(next) =>
                            updateManual((prev) => ({
                              ...prev,
                              identity_and_voice: {
                                ...prev.identity_and_voice,
                                brandAttributesPyramid: {
                                  ...prev.identity_and_voice.brandAttributesPyramid,
                                  experiencePillars: {
                                    ...prev.identity_and_voice.brandAttributesPyramid.experiencePillars,
                                    [pillarKey]: next
                                  }
                                }
                              }
                            }))
                          }
                          addButtonLabel="+ Agregar"
                          disabled={isBusy}
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </AccordionCard>
        </div>
      )}

      {/* ==================== TAB 2: 2. FOTOGRAFÍA E IMAGEN ==================== */}
      {activeTab === 'photography' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#005FFC] p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#004699]">Dirección de Arte y Estilo Fotográfico</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lineamientos de calidez humana, temperatura de luz, fotografía base limpia y evaluación de autenticidad.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Filosofía General de Fotografía
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.photography_and_imagery.generalPhilosophy}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      photography_and_imagery: {
                        ...prev.photography_and_imagery,
                        generalPhilosophy: e.target.value
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Regla de Temperatura de Color e Iluminación
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.photography_and_imagery.colorTemperatureRule}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      photography_and_imagery: {
                        ...prev.photography_and_imagery,
                        colorTemperatureRule: e.target.value
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Regla de Fotografía Base Limpia (Generación de Imágenes)
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.photography_and_imagery.cleanBaseImageRuleForAI}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      photography_and_imagery: {
                        ...prev.photography_and_imagery,
                        cleanBaseImageRuleForAI: e.target.value
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-[#EFF9FE]/50 focus:bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Guía de Calidez para Evaluación en Focus Group
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.photography_and_imagery.focusGroupWarmthHint}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      photography_and_imagery: {
                        ...prev.photography_and_imagery,
                        focusGroupWarmthHint: e.target.value
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Visual Checklists Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-emerald-200 border-t-4 border-t-emerald-500 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900">Sí Hacer en Fotografía</h3>
                  <p className="text-xs text-slate-500">Elementos deseables en retratos, escenas cotidianas y espacios clínicos.</p>
                </div>
              </div>

              <EditableStringList
                items={manual.photography_and_imagery.dos}
                onChange={(next) =>
                  updateManual((prev) => ({
                    ...prev,
                    photography_and_imagery: { ...prev.photography_and_imagery, dos: next }
                  }))
                }
                variant="do"
                multiline
                addButtonLabel="+ Agregar"
                placeholder="Nuevo criterio visual aprobado..."
                disabled={isBusy}
              />
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 border-t-4 border-t-rose-500 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-900">Prohibido en Fotografía</h3>
                  <p className="text-xs text-slate-500">Restricciones estrictas de marca (incluye cero estetoscopios en médicos).</p>
                </div>
              </div>

              <EditableStringList
                items={manual.photography_and_imagery.donts}
                onChange={(next) =>
                  updateManual((prev) => ({
                    ...prev,
                    photography_and_imagery: { ...prev.photography_and_imagery, donts: next }
                  }))
                }
                variant="dont"
                multiline
                addButtonLabel="+ Agregar"
                placeholder="Nueva restricción fotográfica..."
                disabled={isBusy}
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: 3. PALETA Y CONTRASTES ==================== */}
      {activeTab === 'palette' && (
        <div className="space-y-6">
          {/* Ambient Guidance */}
          <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#005FFC] p-6 shadow-sm space-y-3">
            <div>
              <h2 className="text-lg font-bold text-[#004699]">Ambientación de Color en Escenas Fotográficas</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Guía sutil para vestimenta, consultorios y detalles de ambiente sin teñir piel ni paredes.
              </p>
            </div>
            <textarea
              rows={3}
              disabled={isBusy}
              value={manual.color_palette.ambientPromptGuidance}
              onChange={(e) =>
                updateManual((prev) => ({
                  ...prev,
                  color_palette: {
                    ...prev.color_palette,
                    ambientPromptGuidance: e.target.value
                  }
                }))
              }
              className="w-full px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
            />
          </div>

          {/* 3 Palette Groups */}
          {renderColorGroupSection(
            'Colores Primarios Digitales',
            'Base institucional obligatoria de Laboratorio Médico del Chopo y Línea Basal.',
            'primaryDigital'
          )}
          {renderColorGroupSection(
            'Colores Secundarios y Modulares',
            'Tonos de soporte, cajas modulares y piezas sin fotografía.',
            'secondaryDigital'
          )}
          {renderColorGroupSection(
            'Promocionales y Botones',
            'Colores de conversión para preciadores, temporadas especiales y botones de correo electrónico.',
            'promotionalAndButtons'
          )}

          {/* Visual Contrast Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#004699]">
                  Matriz Visual de Contrastes Permitidos vs. Prohibidos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Combinaciones autorizadas y restringidas de color de texto o elementos sobre cada color de fondo.
                </p>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleAddContrastRow}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EFF9FE] hover:bg-blue-100 text-[#004699] border border-blue-200 text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                <span>Agregar Fondo</span>
              </button>
            </div>

            <div className="space-y-4">
              {manual.color_palette.contrastMatrix.map((row, rowIdx) => {
                const bgSafe = normalizeHexForPicker(row.backgroundHex);
                const bgLight = isLightHex(bgSafe);
                const allowedKey = `${rowIdx}_allowedForegrounds`;
                const forbiddenKey = `${rowIdx}_forbiddenForegrounds`;

                return (
                  <div
                    key={rowIdx}
                    className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/40"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                      {/* Background Swatch Column */}
                      <div
                        className="lg:col-span-3 p-4 flex flex-col justify-between gap-3 border-b lg:border-b-0 lg:border-r border-slate-200"
                        style={{ backgroundColor: bgSafe }}
                      >
                        <div className="space-y-2">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              bgLight
                                ? 'bg-white/85 text-[#004699] border border-slate-200'
                                : 'bg-slate-900/35 text-white'
                            }`}
                          >
                            Color de Fondo
                          </span>
                          <input
                            type="text"
                            disabled={isBusy}
                            value={row.backgroundName}
                            onChange={(e) =>
                              handleUpdateContrastRow(rowIdx, (r) => ({
                                ...r,
                                backgroundName: e.target.value
                              }))
                            }
                            className={`w-full px-2.5 py-1.5 text-sm font-bold rounded-lg border focus:outline-none ${
                              bgLight
                                ? 'bg-white/90 text-[#004699] border-slate-300'
                                : 'bg-slate-900/30 text-white border-white/30 placeholder:text-white/70'
                            }`}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              disabled={isBusy}
                              value={bgSafe}
                              onChange={(e) =>
                                handleUpdateContrastRow(rowIdx, (r) => ({
                                  ...r,
                                  backgroundHex: e.target.value.toUpperCase()
                                }))
                              }
                              className="w-7 h-7 rounded cursor-pointer border border-white/60 bg-transparent"
                            />
                            <input
                              type="text"
                              disabled={isBusy}
                              value={row.backgroundHex}
                              onChange={(e) =>
                                handleUpdateContrastRow(rowIdx, (r) => ({
                                  ...r,
                                  backgroundHex: e.target.value.toUpperCase()
                                }))
                              }
                              className={`w-24 px-2 py-1 text-xs font-bold rounded-lg border ${
                                bgLight
                                  ? 'bg-white/90 text-slate-800 border-slate-300'
                                  : 'bg-slate-900/30 text-white border-white/30'
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              updateManual((prev) => ({
                                ...prev,
                                color_palette: {
                                  ...prev.color_palette,
                                  contrastMatrix: prev.color_palette.contrastMatrix.filter((_, i) => i !== rowIdx)
                                }
                              }))
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              bgLight
                                ? 'bg-white/90 text-slate-500 hover:text-rose-600 border border-slate-200'
                                : 'bg-slate-900/30 text-white hover:bg-rose-600'
                            }`}
                            title="Eliminar fila de contraste"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Allowed, Forbidden & Notes Columns */}
                      <div className="lg:col-span-9 p-4 bg-white space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Allowed Foregrounds */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2 size={14} />
                              <span>Permitidos (✓)</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(row.allowedForegrounds || []).map((fgHex, fgIdx) => (
                                <span
                                  key={`${fgHex}_${fgIdx}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900"
                                >
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                                    style={{ backgroundColor: normalizeHexForPicker(fgHex) }}
                                  />
                                  <span>{fgHex}</span>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleUpdateContrastRow(rowIdx, (r) => ({
                                        ...r,
                                        allowedForegrounds: r.allowedForegrounds.filter((_, i) => i !== fgIdx)
                                      }))
                                    }
                                    className="text-emerald-600 hover:text-rose-600"
                                    title="Quitar color permitido"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1">
                              <select
                                disabled={isBusy}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddContrastChip(rowIdx, 'allowedForegrounds', e.target.value);
                                  }
                                }}
                                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                              >
                                <option value="">+ Elegir de la paleta...</option>
                                {allPaletteColors.map((c) => (
                                  <option key={c.id} value={c.hex}>
                                    {c.name} ({c.hex})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                disabled={isBusy}
                                value={contrastHexDrafts[allowedKey] || ''}
                                onChange={(e) =>
                                  setContrastHexDrafts((prev) => ({
                                    ...prev,
                                    [allowedKey]: e.target.value
                                  }))
                                }
                                placeholder="#HEX"
                                className="w-20 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                              />
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleAddContrastChip(
                                    rowIdx,
                                    'allowedForegrounds',
                                    contrastHexDrafts[allowedKey] || ''
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                title="Agregar HEX permitido"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Forbidden Foregrounds */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                              <Ban size={14} />
                              <span>Prohibidos (✕)</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(row.forbiddenForegrounds || []).map((fgHex, fgIdx) => (
                                <span
                                  key={`${fgHex}_${fgIdx}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900"
                                >
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                                    style={{ backgroundColor: normalizeHexForPicker(fgHex) }}
                                  />
                                  <span>{fgHex}</span>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleUpdateContrastRow(rowIdx, (r) => ({
                                        ...r,
                                        forbiddenForegrounds: r.forbiddenForegrounds.filter((_, i) => i !== fgIdx)
                                      }))
                                    }
                                    className="text-rose-600 hover:text-rose-900"
                                    title="Quitar color prohibido"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1">
                              <select
                                disabled={isBusy}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddContrastChip(rowIdx, 'forbiddenForegrounds', e.target.value);
                                  }
                                }}
                                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
                              >
                                <option value="">+ Elegir de la paleta...</option>
                                {allPaletteColors.map((c) => (
                                  <option key={c.id} value={c.hex}>
                                    {c.name} ({c.hex})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                disabled={isBusy}
                                value={contrastHexDrafts[forbiddenKey] || ''}
                                onChange={(e) =>
                                  setContrastHexDrafts((prev) => ({
                                    ...prev,
                                    [forbiddenKey]: e.target.value
                                  }))
                                }
                                placeholder="#HEX"
                                className="w-20 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                              />
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleAddContrastChip(
                                    rowIdx,
                                    'forbiddenForegrounds',
                                    contrastHexDrafts[forbiddenKey] || ''
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                                title="Agregar HEX prohibido"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Notas y excepciones de contraste
                          </label>
                          <input
                            type="text"
                            disabled={isBusy}
                            value={row.notes}
                            onChange={(e) =>
                              handleUpdateContrastRow(rowIdx, (r) => ({ ...r, notes: e.target.value }))
                            }
                            className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: 4. DISEÑO GRÁFICO Y LÍNEA BASAL ==================== */}
      {activeTab === 'design' && (
        <div className="space-y-5">
          {/* Mandatory Prominent Info Banner */}
          <div className="rounded-2xl bg-[#EFF9FE] border border-[#BDD4F2] p-5 flex items-start gap-3.5 text-[#004699] shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-white border border-blue-200 flex items-center justify-center text-[#005FFC] shrink-0 mt-0.5">
              <Info size={20} />
            </div>
            <p className="text-sm font-medium leading-relaxed">
              <strong className="font-bold">Uso de esta sección:</strong> Estas reglas gráficas guían las plantillas de vista previa y al Revisor Automático (Agente Evaluador) cuando audita artes finales diseñados por agencia. No se envían al generador de fotografías base para mantener las fotos limpias sin logos ni textos deformados.
            </p>
          </div>

          {/* 1. Reglas de Logotipo */}
          <AccordionCard
            title="Reglas de Logotipo"
            subtitle="Descriptivo obligatorio, contraste sobre fotografía, ubicación y cobrandeo"
            icon={<ShieldCheck size={18} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Descriptivo obligatorio
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.logoRules.mandatoryDescriptor}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        logoRules: {
                          ...prev.graphic_design_and_layout.logoRules,
                          mandatoryDescriptor: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Contraste sobre fotografías
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.logoRules.contrastOnPhotos}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        logoRules: {
                          ...prev.graphic_design_and_layout.logoRules,
                          contrastOnPhotos: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Color en aplicaciones modulares
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.logoRules.modularLogoColor}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        logoRules: {
                          ...prev.graphic_design_and_layout.logoRules,
                          modularLogoColor: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Ubicación autorizada
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.logoRules.placement}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        logoRules: {
                          ...prev.graphic_design_and_layout.logoRules,
                          placement: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Regla de cobrandeo con aliados
                </label>
                <textarea
                  rows={2}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.logoRules.cobrandingRule}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        logoRules: {
                          ...prev.graphic_design_and_layout.logoRules,
                          cobrandingRule: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
            </div>
          </AccordionCard>

          {/* 2. Tipografía */}
          <AccordionCard
            title="Tipografía (Avenir / Roboto y Jerarquía de Pesos)"
            subtitle="Familias oficiales y jerarquía BLACK / HEAVY / MEDIUM / LIGHT"
            icon={<Type size={18} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Familia Tipográfica Principal
                </label>
                <input
                  type="text"
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.typographyRules.primaryFontFamily}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        typographyRules: {
                          ...prev.graphic_design_and_layout.typographyRules,
                          primaryFontFamily: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Alternativa Web e Interfaz
                </label>
                <input
                  type="text"
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.typographyRules.webAlternativeFontFamily}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        typographyRules: {
                          ...prev.graphic_design_and_layout.typographyRules,
                          webAlternativeFontFamily: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-2">
                Jerarquía de Pesos (BLACK / HEAVY / MEDIUM / LIGHT)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(manual.graphic_design_and_layout.typographyRules.weightHierarchy || {}).map(
                  ([weightKey, weightDesc]) => {
                    const weightClass =
                      weightKey === 'BLACK'
                        ? 'font-black'
                        : weightKey === 'HEAVY'
                          ? 'font-extrabold'
                          : weightKey === 'MEDIUM'
                            ? 'font-medium'
                            : 'font-light';
                    return (
                      <div
                        key={weightKey}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center gap-3"
                      >
                        <span
                          className={`w-20 text-center px-2 py-1 rounded-lg bg-[#EFF9FE] text-[#004699] border border-blue-200 text-xs shrink-0 ${weightClass}`}
                        >
                          {weightKey}
                        </span>
                        <input
                          type="text"
                          disabled={isBusy}
                          value={weightDesc}
                          onChange={(e) =>
                            updateManual((prev) => ({
                              ...prev,
                              graphic_design_and_layout: {
                                ...prev.graphic_design_and_layout,
                                typographyRules: {
                                  ...prev.graphic_design_and_layout.typographyRules,
                                  weightHierarchy: {
                                    ...prev.graphic_design_and_layout.typographyRules.weightHierarchy,
                                    [weightKey]: e.target.value
                                  }
                                }
                              }
                            }))
                          }
                          className="flex-1 px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                        />
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                Criterio de Revisión Visual Tipográfica
              </label>
              <textarea
                rows={3}
                disabled={isBusy}
                value={manual.graphic_design_and_layout.typographyRules.visionAuditGuidance}
                onChange={(e) =>
                  updateManual((prev) => ({
                    ...prev,
                    graphic_design_and_layout: {
                      ...prev.graphic_design_and_layout,
                      typographyRules: {
                        ...prev.graphic_design_and_layout.typographyRules,
                        visionAuditGuidance: e.target.value
                      }
                    }
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
              />
            </div>
          </AccordionCard>

          {/* 3. Línea Basal Verde */}
          <AccordionCard
            title="Línea Basal Verde (#63CF00)"
            subtitle="Onda de pulso característica: proporciones, interacción tridimensional, recortes y no agresión"
            icon={<Layers size={18} />}
            accentColor="border-t-[#63CF00]"
          >
            <div>
              <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                Descripción y significado
              </label>
              <textarea
                rows={2}
                disabled={isBusy}
                value={manual.graphic_design_and_layout.lineaBasalRules.description}
                onChange={(e) =>
                  updateManual((prev) => ({
                    ...prev,
                    graphic_design_and_layout: {
                      ...prev.graphic_design_and_layout,
                      lineaBasalRules: {
                        ...prev.graphic_design_and_layout.lineaBasalRules,
                        description: e.target.value
                      }
                    }
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-2">
                  Proporciones Invariables
                </label>
                <EditableStringList
                  items={manual.graphic_design_and_layout.lineaBasalRules.proportionInvariants}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        lineaBasalRules: {
                          ...prev.graphic_design_and_layout.lineaBasalRules,
                          proportionInvariants: next
                        }
                      }
                    }))
                  }
                  multiline
                  addButtonLabel="+ Agregar regla de proporción"
                  disabled={isBusy}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-2">
                  Interacción con Personas y Tamaño
                </label>
                <EditableStringList
                  items={manual.graphic_design_and_layout.lineaBasalRules.interactionAndSizeRules}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        lineaBasalRules: {
                          ...prev.graphic_design_and_layout.lineaBasalRules,
                          interactionAndSizeRules: next
                        }
                      }
                    }))
                  }
                  multiline
                  addButtonLabel="+ Agregar regla de interacción"
                  disabled={isBusy}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-2">
                  Recortes Permitidos y Prohibidos
                </label>
                <EditableStringList
                  items={manual.graphic_design_and_layout.lineaBasalRules.allowedAndForbiddenCrops}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        lineaBasalRules: {
                          ...prev.graphic_design_and_layout.lineaBasalRules,
                          allowedAndForbiddenCrops: next
                        }
                      }
                    }))
                  }
                  multiline
                  addButtonLabel="+ Agregar regla de recorte"
                  disabled={isBusy}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-700 uppercase tracking-wide mb-2">
                  Reglas de No Agresión
                </label>
                <EditableStringList
                  items={manual.graphic_design_and_layout.lineaBasalRules.nonAggressionRules}
                  onChange={(next) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        lineaBasalRules: {
                          ...prev.graphic_design_and_layout.lineaBasalRules,
                          nonAggressionRules: next
                        }
                      }
                    }))
                  }
                  variant="dont"
                  multiline
                  addButtonLabel="+ Agregar regla de no agresión"
                  disabled={isBusy}
                />
              </div>
            </div>
          </AccordionCard>

          {/* 4. Modularidad y Cajas */}
          <AccordionCard
            title="Modularidad y Cajas"
            subtitle="Geometría de esquinas, cajas ancladas a bordes, orientación y límites máximos"
            icon={<Layers size={18} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Geometría de Esquinas y Radios
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.modularityRules.cornerGeometry}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        modularityRules: {
                          ...prev.graphic_design_and_layout.modularityRules,
                          cornerGeometry: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Prohibición de Cajas Flotantes
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.modularityRules.noFloatingBoxes}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        modularityRules: {
                          ...prev.graphic_design_and_layout.modularityRules,
                          noFloatingBoxes: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Orientación de un Solo Eje
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.modularityRules.singleAxisOrientation}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        modularityRules: {
                          ...prev.graphic_design_and_layout.modularityRules,
                          singleAxisOrientation: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Límites Máximos de Tamaño
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.modularityRules.maxSizeLimits}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        modularityRules: {
                          ...prev.graphic_design_and_layout.modularityRules,
                          maxSizeLimits: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Composición Horizontal y Pleca de Llamado a la Acción
                </label>
                <textarea
                  rows={3}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.modularityRules.horizontalLayoutAndCtaTab}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        modularityRules: {
                          ...prev.graphic_design_and_layout.modularityRules,
                          horizontalLayoutAndCtaTab: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
            </div>
          </AccordionCard>

          {/* 5. Preciadores y Descuentos */}
          <AccordionCard
            title="Preciadores y Descuentos"
            subtitle="Color rosa promocional (#F24360), rojo estacional (#E20613), rebase circular y caja modular"
            icon={<Palette size={18} />}
            accentColor="border-t-[#F24360]"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Color Obligatorio
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.pricingAndDiscountsRules.mandatoryColor}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        pricingAndDiscountsRules: {
                          ...prev.graphic_design_and_layout.pricingAndDiscountsRules,
                          mandatoryColor: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Círculo Rebasado sobre Fotografía
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.pricingAndDiscountsRules.circularBadgeBleed}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        pricingAndDiscountsRules: {
                          ...prev.graphic_design_and_layout.pricingAndDiscountsRules,
                          circularBadgeBleed: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Caja Promocional Modular
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.pricingAndDiscountsRules.modularPromoBox}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        pricingAndDiscountsRules: {
                          ...prev.graphic_design_and_layout.pricingAndDiscountsRules,
                          modularPromoBox: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
            </div>
          </AccordionCard>

          {/* 6. Íconos, Legales y Piezas sin Foto */}
          <AccordionCard
            title="Íconos, Legales y Piezas sin Foto"
            subtitle="Iconografía monocromática, ubicación de textos legales y piezas de fondo sólido"
            icon={<FileText size={18} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Íconos
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.iconsLegalsAndNoPhotoRules.icons}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        iconsLegalsAndNoPhotoRules: {
                          ...prev.graphic_design_and_layout.iconsLegalsAndNoPhotoRules,
                          icons: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Ubicación de Legales
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.iconsLegalsAndNoPhotoRules.legalsPlacement}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        iconsLegalsAndNoPhotoRules: {
                          ...prev.graphic_design_and_layout.iconsLegalsAndNoPhotoRules,
                          legalsPlacement: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Piezas sin Fotografía
                </label>
                <textarea
                  rows={4}
                  disabled={isBusy}
                  value={manual.graphic_design_and_layout.iconsLegalsAndNoPhotoRules.noPhotoLayouts}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      graphic_design_and_layout: {
                        ...prev.graphic_design_and_layout,
                        iconsLegalsAndNoPhotoRules: {
                          ...prev.graphic_design_and_layout.iconsLegalsAndNoPhotoRules,
                          noPhotoLayouts: e.target.value
                        }
                      }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>
            </div>
          </AccordionCard>
        </div>
      )}

      {/* ==================== TAB 5: 5. REGLAS POR CANAL ==================== */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          {/* Channel Selector Pills + Inline Creator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {channelKeys.map((chKey) => {
                  const ch = manual.channels.items[chKey];
                  const pillName = BUILT_IN_CHANNEL_SHORT_LABELS[chKey] || ch?.label || chKey;
                  const isActive = selectedChannelKey === chKey;
                  return (
                    <button
                      key={chKey}
                      type="button"
                      onClick={() => setSelectedChannelKey(chKey)}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                        isActive
                          ? 'bg-[#005FFC] text-white border-[#005FFC] shadow-sm'
                          : 'bg-slate-50 hover:bg-[#EFF9FE] text-[#004699] border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {pillName}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => setIsCreatingChannel(!isCreatingChannel)}
                className="px-4 py-2.5 rounded-xl bg-[#EFF9FE] hover:bg-blue-100 text-[#004699] border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Plus size={15} />
                <span>Nuevo Canal</span>
              </button>
            </div>

            {isCreatingChannel && (
              <div className="p-4 rounded-xl bg-[#EFF9FE]/70 border border-blue-200 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  disabled={isBusy}
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateChannel();
                    }
                  }}
                  placeholder="Nombre del nuevo canal (ej. Pantallas en Sucursal, WhatsApp Business)..."
                  className="flex-1 min-w-[240px] px-3.5 py-2 text-sm bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                />
                <button
                  type="button"
                  disabled={isBusy || !newChannelName.trim()}
                  onClick={handleCreateChannel}
                  className="px-4 py-2 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white text-xs font-bold disabled:opacity-50"
                >
                  Crear Canal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingChannel(false);
                    setNewChannelName('');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Selected Channel Detail Form */}
          {activeChannel && (
            <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#005FFC] p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex-1 min-w-[260px]">
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                    Nombre descriptivo del canal
                  </label>
                  <input
                    type="text"
                    disabled={isBusy}
                    value={activeChannel.label}
                    onChange={(e) =>
                      updateSelectedChannel((ch) => ({ ...ch, label: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 text-base font-bold text-[#004699] bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                  />
                </div>

                {!BUILT_IN_CHANNEL_IDS.has(selectedChannelKey) && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDeleteCustomChannel(selectedChannelKey)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 mt-6"
                  >
                    <Trash2 size={14} />
                    <span>Eliminar Canal</span>
                  </button>
                )}
              </div>

              {/* Supported Formats Chips */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide">
                  Formatos Soportados
                </label>
                <div className="flex flex-wrap gap-2">
                  {(activeChannel.supportedFormats || []).map((fmt, fmtIdx) => (
                    <span
                      key={`${fmt}_${fmtIdx}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF9FE] border border-blue-200 text-xs font-bold text-[#004699]"
                    >
                      <span>{fmt}</span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          updateSelectedChannel((ch) => ({
                            ...ch,
                            supportedFormats: ch.supportedFormats.filter((_, i) => i !== fmtIdx)
                          }))
                        }
                        className="text-slate-400 hover:text-rose-600"
                        title="Quitar formato"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    disabled={isBusy}
                    value={newFormatInput}
                    onChange={(e) => setNewFormatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChannelFormat();
                      }
                    }}
                    placeholder="ej. Carrusel 4:5, Póster Vertical..."
                    className="w-72 px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30"
                  />
                  <button
                    type="button"
                    disabled={isBusy || !newFormatInput.trim()}
                    onClick={handleAddChannelFormat}
                    className="px-3.5 py-2 rounded-xl bg-[#EFF9FE] hover:bg-blue-100 text-[#004699] border border-blue-200 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    <span>Agregar formato</span>
                  </button>
                </div>
              </div>

              {/* Copy, Photo & Focus Group Context */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                    Reglas de Redacción y Textos
                  </label>
                  <textarea
                    rows={5}
                    disabled={isBusy}
                    value={activeChannel.copyRules}
                    onChange={(e) =>
                      updateSelectedChannel((ch) => ({ ...ch, copyRules: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                    Reglas de Fotografía y Encuadre
                  </label>
                  <textarea
                    rows={5}
                    disabled={isBusy}
                    value={activeChannel.photoRules}
                    onChange={(e) =>
                      updateSelectedChannel((ch) => ({ ...ch, photoRules: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Contexto de Experiencia para Focus Group
                </label>
                <textarea
                  rows={2}
                  disabled={isBusy}
                  value={activeChannel.focusGroupContext}
                  onChange={(e) =>
                    updateSelectedChannel((ch) => ({ ...ch, focusGroupContext: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed"
                />
              </div>

              {/* Auditor Rules Checklist */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[#004699]">
                    Lista de Verificación del Revisor Automático (Agente Evaluador)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Criterios específicos que se auditan automáticamente para las piezas de este canal.
                  </p>
                </div>
                <EditableStringList
                  items={activeChannel.auditorRules || []}
                  onChange={(next) =>
                    updateSelectedChannel((ch) => ({ ...ch, auditorRules: next }))
                  }
                  variant="do"
                  multiline
                  addButtonLabel="+ Agregar regla"
                  placeholder="Escribe una regla de revisión para este canal..."
                  disabled={isBusy}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
