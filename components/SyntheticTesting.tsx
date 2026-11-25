import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    simulateMarketingFocusGroup,
    simulateAcquisitionFocusGroup,
    generateWildcardAudience,
    generateAudienceFromCriteria,
    generateSyntheticPersona,
    generateImageFromPrompt,
    simulateCreativeFocusGroup,
    generateMarketingCampaignAssets,
    fetchPersonas,
    savePersonas,
    fetchRubrics,
    saveRubrics,
    fetchConfigVersions,
    restoreConfigVersion,
    fetchBrandManual,
    DEFAULT_CHOPO_RUBRICS
} from '../services/geminiService';
import { brandConfig } from '../config';
import { AppMode, AudienceTrack, BrandChannelKey, BrandChannelRule, BrandManualConfig, SimulationResult, MarketingBriefData, AcquisitionResult, SavedSimulation, Persona, ABTestResult, FocusGroupRubric, ConfigVersionSnapshot } from '../types';
import { Users, BarChart2, Save, Download, Printer, Play, ShoppingCart, Mail, MessageSquare, Settings, X, ChevronDown, ChevronUp, Sparkles, UserPlus, Zap, Trash2, Edit2, History, MessageCircle, Plus, Info, ShoppingBag, Image, CheckCircle2, XCircle, Loader2, Upload, ClipboardList, RotateCcw, Radio } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SyntheticChat } from './SyntheticChat';
import { SyntheticInterview } from './SyntheticInterview';
import { SIMULATION_PRODUCTS, STANDARD_AUDIENCES, localizePersonaLabel, getPersonaInitial } from '../data/simulationData';
import { useCompanyContext } from '../context/CompanyContext';
import { useLanguage } from '../context/LanguageContext';
import { resolveSegmentKey } from '../services/brandManualUtils';
import {
    FocusGroupExecutiveReportPayload,
    FocusGroupParticipantOpinion,
    FocusGroupRubricSummaryItem,
    FocusGroupVariantItem,
    buildFocusGroupExecutiveReportHtml,
    buildSafeReportFilename,
    downloadHtmlReport,
    openPrintableReport
} from '../services/reportExporter';

interface SyntheticTestingProps {
    setMode?: (mode: AppMode) => void;
}

const EVALUATED_CHANNEL_OPTIONS: Array<{
    key: 'social_media' | 'mailing_ecommerce' | 'web' | 'pdv_sucursal';
    label: string;
}> = [
    { key: 'social_media', label: 'Redes Sociales' },
    { key: 'mailing_ecommerce', label: 'Mailing / E-commerce' },
    { key: 'web', label: 'Sitio Web' },
    { key: 'pdv_sucursal', label: 'PDV Sucursal' }
];

const DEFAULT_SEED_CHANNEL_LABELS: Record<string, string> = {
    social_media: 'Redes Sociales (Feed 1:1, Vertical 4:5, Carruseles, Historias y Reels/TikTok 9:16)',
    mailing_ecommerce: 'Mailings (Email Marketing) y E-commerce',
    web: 'Sitio Web y Banners Digitales (chopo.com.mx)',
    pdv_sucursal: 'Punto de Venta en Sucursal — PDV (Pósters, Folletos, Lonas Exteriores y Regionales)'
};

const BUILT_IN_CHANNEL_KEY_SET = new Set<string>(EVALUATED_CHANNEL_OPTIONS.map((c) => c.key));

const getBrandManualChannelMap = (
    manual: BrandManualConfig | null | undefined
): Record<string, BrandChannelRule> => {
    const rawChannels = manual?.channels as
        | { items?: Record<string, BrandChannelRule> }
        | Record<string, BrandChannelRule>
        | undefined;
    if (!rawChannels || typeof rawChannels !== 'object') return {};
    if ('items' in rawChannels && rawChannels.items && typeof rawChannels.items === 'object') {
        return rawChannels.items as Record<string, BrandChannelRule>;
    }
    const flat: Record<string, BrandChannelRule> = {};
    Object.entries(rawChannels).forEach(([k, v]) => {
        if (v && typeof v === 'object' && ('label' in v || 'supportedFormats' in v)) {
            flat[k] = v as BrandChannelRule;
        }
    });
    return flat;
};

const resolveChannelLabelFromManual = (
    channelKey: string | undefined,
    manual: BrandManualConfig | null
): string => {
    const key = String(channelKey || '').trim();
    const builtIn = EVALUATED_CHANNEL_OPTIONS.find((c) => c.key === key);
    const manualChannel = key ? getBrandManualChannelMap(manual)[key] : undefined;
    const rawManualLabel = manualChannel?.label?.trim();

    if (rawManualLabel) {
        if (builtIn && rawManualLabel === DEFAULT_SEED_CHANNEL_LABELS[key]) {
            return builtIn.label;
        }
        return rawManualLabel;
    }
    if (builtIn) return builtIn.label;
    return key || 'Redes Sociales';
};

const inferPersonaTrack = (p: any): AudienceTrack => {
    if (!p) return 'patient';
    const rawTrack = String(p.track || '').trim();
    const rawName = String(p.name || p.baseAudienceName || '');
    if (rawTrack === 'enterprise' || rawTrack === 'b2b_enterprises') return 'enterprise';
    if (rawTrack === 'physician' || rawTrack === 'B2D' || rawTrack === 'b2d_doctors') return 'physician';
    if (rawTrack === 'patient' || rawTrack === 'B2C' || rawTrack === 'b2c_patients') {
        if (/\[empresa|\bempresa\s*\(?b2b/i.test(rawName)) return 'enterprise';
        if (/médico\s*b2[bd]|\[médico/i.test(rawName)) return 'physician';
        return 'patient';
    }
    if (/\[empresa|\bempresa\s*\(?b2b/i.test(rawName)) return 'enterprise';
    if (/\[médico|médico\s*\(?b2[bd]|physician/i.test(rawName)) return 'physician';
    if (rawTrack) {
        const seg = resolveSegmentKey(rawTrack);
        if (seg === 'b2b_enterprises') return 'enterprise';
        if (seg === 'b2d_doctors') return 'physician';
    }
    return 'patient';
};

const getPersonaSegmentMeta = (p: any) => {
    const track = inferPersonaTrack(p);
    if (track === 'physician') {
        return {
            track,
            label: '🩺 Médico (B2D)',
            shortLabel: 'Médico (B2D)',
            badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        };
    }
    if (track === 'enterprise') {
        return {
            track,
            label: '🏢 Empresa (B2B)',
            shortLabel: 'Empresa (B2B)',
            badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200'
        };
    }
    return {
        track,
        label: '🏥 Paciente (B2C)',
        shortLabel: 'Paciente (B2C)',
        badgeClass: 'bg-blue-50 text-[#0066FF] border border-blue-200'
    };
};

const formatDisplayPersonaLabel = (label: string): string =>
    label
        .replace(/\[Médico B2B\]/gi, '[Médico B2D]')
        .replace(/\(Médico B2B\)/gi, '(Médico B2D)')
        .replace(/Médico Prescriptor B2B/gi, 'Médico (B2D)')
        .replace(/Médico B2B/gi, 'Médico (B2D)');

export const SyntheticTesting: React.FC<SyntheticTestingProps> = () => {
    const { name, description } = useCompanyContext();
    const { language, t } = useLanguage();
    // --- Global State ---
    const [personas, setPersonas] = useState<any[]>([]);
    const [allCatalogPersonas, setAllCatalogPersonas] = useState<any[]>(STANDARD_AUDIENCES);
    const [brief, setBrief] = useState<MarketingBriefData | null>(null);
    const [activeBrandManual, setActiveBrandManual] = useState<BrandManualConfig | null>(null);
    const [selectedChannelKey, setSelectedChannelKey] = useState<BrandChannelKey>('social_media');
    const [activeTab, setActiveTab] = useState<'ACQUISITION' | 'CHAT' | 'EMAIL' | 'BRIEF' | 'PURCHASE' | 'CREATIVE' | 'AB_TEST'>('CHAT');
    const [savedHistory, setSavedHistory] = useState<SavedSimulation[]>([]);
    const [marketingMessages, setMarketingMessages] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('chopo_fg_marketing_messages');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return [
            "Controla tu diabetes a tiempo: resultados de HbA1c el mismo día en tu WhatsApp",
            "Precisión diagnóstica acreditada para el seguimiento clínico de tus pacientes con diabetes",
            "Tu Check-up preventivo completo cerca de ti: agenda en línea con descuento especial",
            "Prevención que da tranquilidad: estudios de laboratorio clínico respaldados por nuestra calidad clínica"
        ];
    });

    const evaluatedChannelOptions = useMemo<Array<{ key: BrandChannelKey; label: string }>>(() => {
        const channelMap = getBrandManualChannelMap(activeBrandManual);
        const builtIns = EVALUATED_CHANNEL_OPTIONS.map((ch) => ({
            key: ch.key as BrandChannelKey,
            label: resolveChannelLabelFromManual(ch.key, activeBrandManual)
        }));
        const customChannels = Object.keys(channelMap)
            .filter((key) => !BUILT_IN_CHANNEL_KEY_SET.has(key))
            .map((key) => ({
                key: key as BrandChannelKey,
                label: resolveChannelLabelFromManual(key, activeBrandManual)
            }));
        const merged = [...builtIns, ...customChannels];
        if (selectedChannelKey && !merged.some((ch) => ch.key === selectedChannelKey)) {
            merged.push({
                key: selectedChannelKey,
                label: resolveChannelLabelFromManual(selectedChannelKey, activeBrandManual)
            });
        }
        return merged;
    }, [activeBrandManual, selectedChannelKey]);
    const [newMessage, setNewMessage] = useState("");
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [editingMessageText, setEditingMessageText] = useState("");
    const [isGeneratingWildcard, setIsGeneratingWildcard] = useState(false);
    const [status, setStatus] = useState("");
    const [isAddAudienceModalOpen, setIsAddAudienceModalOpen] = useState(false);
    const [audienceCriteria, setAudienceCriteria] = useState("");
    const [selectedAudience, setSelectedAudience] = useState<any | null>(null);
    const [isEditingSelectedAudience, setIsEditingSelectedAudience] = useState(false);
    const [editAudienceForm, setEditAudienceForm] = useState<any | null>(null);
    const [personaVersions, setPersonaVersions] = useState<ConfigVersionSnapshot[]>([]);
    const [personaVersionLabel, setPersonaVersionLabel] = useState("");
    const [isSavingPersonas, setIsSavingPersonas] = useState(false);
    const [newManualPersona, setNewManualPersona] = useState({
        name: '',
        personaName: '',
        track: 'patient' as AudienceTrack,
        age: 42,
        job_title: '',
        demographics: '',
        bio: '',
        pain_points_text: '',
        goals_text: ''
    });
    const [showManualPersonaForm, setShowManualPersonaForm] = useState(false);

    // Dynamic Rubrics State
    const [rubrics, setRubrics] = useState<FocusGroupRubric[]>(DEFAULT_CHOPO_RUBRICS);
    const [isRubricsModalOpen, setIsRubricsModalOpen] = useState(false);
    const [editingRubric, setEditingRubric] = useState<FocusGroupRubric | null>(null);
    const [rubricVersions, setRubricVersions] = useState<ConfigVersionSnapshot[]>([]);
    const [rubricVersionLabel, setRubricVersionLabel] = useState("");
    const [isSavingRubrics, setIsSavingRubrics] = useState(false);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [interviewPersona, setInterviewPersona] = useState<{ persona: Persona; result: any } | null>(null);
    const historyDropdownRef = useRef<HTMLDivElement>(null);
    const [exportFeedback, setExportFeedback] = useState<string>('');
    const exportFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (exportFeedbackTimerRef.current) {
                clearTimeout(exportFeedbackTimerRef.current);
            }
        };
    }, []);

    // Close history dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
                setIsHistoryOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // --- Tab Specific State ---
    // Member Simulation
    const [syntheticUsers, setSyntheticUsers] = useState<any[]>([]);
    const [memberResults, setMemberResults] = useState<SimulationResult[]>([]);
    const [isMemberLoading, setIsMemberLoading] = useState(false);
    const [showMemberSettings, setShowMemberSettings] = useState(false);
    const [showProducts, setShowProducts] = useState(false);
    type EmailDraftItem = {
        subject: string;
        preheader?: string;
        bannerHeadline?: string;
        bannerSubheadline?: string;
        body: string;
        image?: string;
        ctaText?: string;
        legalFooter?: string;
    };

    const [emailBodies, setEmailBodies] = useState<{ [key: string]: string }>({});
    const [emailDrafts, setEmailDrafts] = useState<EmailDraftItem[]>(() => {
        try {
            const saved = localStorage.getItem('chopo_fg_email_drafts');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return [];
    });
    const [isEmailEditorOpen, setIsEmailEditorOpen] = useState(false);
    const [editingEmailIndex, setEditingEmailIndex] = useState<number | null>(null);
    const [editingEmailSubject, setEditingEmailSubject] = useState("");
    const [editingEmailBannerHeadline, setEditingEmailBannerHeadline] = useState("");
    const [editingEmailBannerSubheadline, setEditingEmailBannerSubheadline] = useState("");
    const [editingEmailBody, setEditingEmailBody] = useState("");
    const [editingEmailImage, setEditingEmailImage] = useState("");
    const [isUploadingEmailDraftImage, setIsUploadingEmailDraftImage] = useState(false);
    const emailDraftImageInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);

    // New Modal States
    const [selectedCartResult, setSelectedCartResult] = useState<SimulationResult | null>(null);
    const [selectedEmailStats, setSelectedEmailStats] = useState<{
        subject: string;
        openRate: number;
        clickRate: number;
        body: string;
        bannerHeadline?: string;
        bannerSubheadline?: string;
        image?: string;
        ctaText?: string;
        legalFooter?: string;
    } | null>(null);
    const [isSyntheticUsersModalOpen, setIsSyntheticUsersModalOpen] = useState(false);
    
    // Purchase Products
    type StudyModality = 'Disponible en Sucursal y Domicilio' | 'Disponible solo en Sucursal' | 'Disponible solo a Domicilio';
    const [simulationProducts, setSimulationProducts] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('chopo_fg_simulation_products');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return SIMULATION_PRODUCTS;
    });
    const [newProduct, setNewProduct] = useState("");
    const [newProductModality, setNewProductModality] = useState<StudyModality>('Disponible en Sucursal y Domicilio');
    const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
    const [editingProductTitle, setEditingProductTitle] = useState("");
    const [editingProductDescription, setEditingProductDescription] = useState("");
    const [editingProductModality, setEditingProductModality] = useState<StudyModality>('Disponible en Sucursal y Domicilio');

    const parseSimulationProduct = (raw: string): { title: string; description: string; modality: StudyModality } => {
        const colonIdx = raw.indexOf(':');
        const leftPart = colonIdx !== -1 ? raw.slice(0, colonIdx) : raw;
        const description = colonIdx !== -1 ? raw.slice(colonIdx + 1).trim() : '';

        const bracketMatch = leftPart.match(/\[(.*?)\]/);
        const bracketText = bracketMatch ? bracketMatch[1].trim() : '';
        const cleanTitle = leftPart.replace(/\s*\[.*?\]\s*/g, '').trim();

        let modality: StudyModality = 'Disponible en Sucursal y Domicilio';
        if (/solo en sucursal/i.test(bracketText)) {
            modality = 'Disponible solo en Sucursal';
        } else if (/solo a domicilio/i.test(bracketText)) {
            modality = 'Disponible solo a Domicilio';
        } else if (/sucursal y domicilio/i.test(bracketText)) {
            modality = 'Disponible en Sucursal y Domicilio';
        } else if (/mastograf|rayos x|ultrasonido|resonancia|tomograf|imagen|densitometr|colposcop/i.test(raw)) {
            modality = 'Disponible solo en Sucursal';
        }

        return { title: cleanTitle || raw, description, modality };
    };

    const formatSimulationProduct = (titleInput: string, modality: StudyModality, descriptionInput?: string): string => {
        let titlePart = titleInput;
        let descPart = descriptionInput || '';
        if (descriptionInput === undefined && titleInput.includes(':')) {
            const idx = titleInput.indexOf(':');
            titlePart = titleInput.slice(0, idx);
            descPart = titleInput.slice(idx + 1);
        }
        const cleanTitle = titlePart.replace(/\s*\[.*?\]\s*/g, '').trim();
        const cleanDesc = descPart.trim();
        return cleanDesc ? `${cleanTitle} [${modality}]: ${cleanDesc}` : `${cleanTitle} [${modality}]`;
    };

    // A/B Test 
    const [abTestResults, setAbTestResults] = useState<ABTestResult[]>([]);
    const [isABTestingLoading, setIsABTestingLoading] = useState(false);
    const [regionalVariants, setRegionalVariants] = useState<{ region: string, imagePrompt: string, image: string | null }[]>([]);

    // Creative Testing
    const [creativeResults, setCreativeResults] = useState<any[]>([]);
    const [isCreativeLoading, setIsCreativeLoading] = useState(false);
    const [selectedCreativeAudience, setSelectedCreativeAudience] = useState<string>("");
    const [customCreativesMap, setCustomCreativesMap] = useState<Record<string, any>>({});
    const [customCreativeHeadline, setCustomCreativeHeadline] = useState<string>("");
    const [customCreativeCaption, setCustomCreativeCaption] = useState<string>("");
    const [isUploadingCreative, setIsUploadingCreative] = useState<boolean>(false);
    const customCreativeInputRef = useRef<HTMLInputElement>(null);

    const combinedCreativeAssetsMap: Record<string, any> = {
        ...(brief?.campaignAssetsMap || {}),
        ...customCreativesMap
    };

    const activeCreativeAssets = (selectedCreativeAudience && combinedCreativeAssetsMap[selectedCreativeAudience])
        ? combinedCreativeAssetsMap[selectedCreativeAudience]
        : (Object.keys(combinedCreativeAssetsMap).length > 0
            ? combinedCreativeAssetsMap[Object.keys(combinedCreativeAssetsMap)[0]]
            : brief?.campaignAssets);

    // Acquisition Simulation
    const [acquisitionResults, setAcquisitionResults] = useState<AcquisitionResult[]>([]);
    const [acquisitionOffers, setAcquisitionOffers] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('chopo_fg_acquisition_offers');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return [
            "Descuento exclusivo en línea al agendar y pagar en chopo.com.mx",
            "Resultados de HbA1c el mismo día directo en tu WhatsApp y en la App Chopo",
            "Toma de muestra a domicilio sin costo adicional en el Perfil Control Diabetes",
            "Portal Médico B2D con comparativo histórico de biomarcadores para especialistas",
            "Paquete Anual de Salud Preventiva Femenina con Mastografía Digital y Check-up"
        ];
    });
    const [newOffer, setNewOffer] = useState("");
    const [editingOfferIndex, setEditingOfferIndex] = useState<number | null>(null);
    const [editingOfferText, setEditingOfferText] = useState("");
    const [isAcquisitionLoading, setIsAcquisitionLoading] = useState(false);

    // Persist working stimulus lists in localStorage so user edits survive page refresh (F5)
    useEffect(() => {
        try {
            localStorage.setItem('chopo_fg_acquisition_offers', JSON.stringify(acquisitionOffers));
        } catch {}
    }, [acquisitionOffers]);

    useEffect(() => {
        try {
            localStorage.setItem('chopo_fg_marketing_messages', JSON.stringify(marketingMessages));
        } catch {}
    }, [marketingMessages]);

    useEffect(() => {
        try {
            localStorage.setItem('chopo_fg_simulation_products', JSON.stringify(simulationProducts));
        } catch {}
    }, [simulationProducts]);

    useEffect(() => {
        try {
            localStorage.setItem('chopo_fg_email_drafts', JSON.stringify(emailDrafts));
        } catch {}
    }, [emailDrafts]);

    const isBusy =
        isMemberLoading ||
        isGeneratingEmails ||
        isABTestingLoading ||
        isCreativeLoading ||
        isAcquisitionLoading ||
        isGeneratingWildcard ||
        isUploadingCreative ||
        isUploadingEmailDraftImage ||
        isSavingPersonas ||
        isSavingRubrics;

    const openEmailEditorForDraft = (idx: number, draft: EmailDraftItem) => {
        setEditingEmailIndex(idx);
        setEditingEmailSubject(draft.subject || "");
        setEditingEmailBannerHeadline(draft.bannerHeadline || draft.subject || "");
        setEditingEmailBannerSubheadline(draft.bannerSubheadline || brief?.productName || "Laboratorios Chopo");
        setEditingEmailBody((draft.body || "").replace(/\s*Incluye pie legal:[\s\S]*$/i, '').trim());
        setEditingEmailImage(draft.image || activeCreativeAssets?.image || "");
        setIsEmailEditorOpen(true);
    };

    const handleUploadEmailDraftImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingEmailDraftImage(true);
        try {
            const base64DataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });

            let uploadedUrl = base64DataUrl;
            try {
                const safeFilename = `fg_email_banner_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
                console.warn("Backend email draft image upload failed, falling back to base64:", uploadErr);
            }

            setEditingEmailImage(uploadedUrl);
        } catch (err) {
            console.error("Failed to read email draft image:", err);
            alert(t("No se pudo cargar la imagen del correo.", "Could not load email image."));
        } finally {
            setIsUploadingEmailDraftImage(false);
            if (emailDraftImageInputRef.current) {
                emailDraftImageInputRef.current.value = "";
            }
        }
    };

    // Chat
    // Chat state is mostly internal to SyntheticChat, but duplicate saving logic might be needed if SyntheticChat doesn't export it.
    // For this V1 Hub, we will render SyntheticChat directly.

    const EMAIL_HEADLINES = [
        `Bienvenido a ${name}: Tu salud diagnóstica en manos expertas`,
        "Guía rápida de preparación y ayuno para tus estudios de laboratorio",
        "Monitorea tu glucosa y HbA1c con precisión clínica acreditada",
        "Beneficios exclusivos en línea al agendar tu Check-up en chopo.com.mx",
        "Boletín clínico para médicos: Precisión analítica en el control de Diabetes"
    ];

    const syncStimuliFromBrief = (loadedBrief: MarketingBriefData) => {
        if (!loadedBrief) return;

        // 0. Sync evaluated channel cleanly when Brief includes a V4 channelKey (built-in or custom)
        if (loadedBrief.channelKey && String(loadedBrief.channelKey).trim()) {
            setSelectedChannelKey(String(loadedBrief.channelKey).trim() as BrandChannelKey);
        }

        // 1. Sync Key Marketing Messages (BRIEF tab)
        const candidateMessages: string[] = [
            loadedBrief.messaging?.primaryHook?.es || loadedBrief.messaging?.primaryHook?.en || '',
            loadedBrief.messaging?.supporting1?.content?.es || loadedBrief.messaging?.supporting1?.content?.en || '',
            loadedBrief.messaging?.supporting2?.content?.es || loadedBrief.messaging?.supporting2?.content?.en || '',
            loadedBrief.valueProp?.main?.es || loadedBrief.valueProp?.main?.en || '',
            ...((loadedBrief.audiences || []).map((a: any) => a?.messagingAngle?.es || a?.messagingAngle?.en || ''))
        ]
            .map(s => String(s || '').trim())
            .filter(Boolean);

        const uniqueMessages = Array.from(new Set(candidateMessages));
        if (uniqueMessages.length > 0) {
            setMarketingMessages(uniqueMessages);
        }

        // 2. Sync Email Drafts (EMAIL tab)
        const briefEmails: EmailDraftItem[] = [];
        const seenSubjects = new Set<string>();
        const assetsMap = loadedBrief.campaignAssetsMap || {};
        Object.entries(assetsMap).forEach(([audName, assets]: [string, any]) => {
            const subj = assets?.email?.subject?.trim();
            const rawBody = assets?.email?.body?.trim();
            if (subj && rawBody && !seenSubjects.has(subj)) {
                seenSubjects.add(subj);
                briefEmails.push({
                    subject: subj,
                    preheader: assets.email?.preheader || '',
                    bannerHeadline: assets.email?.bannerHeadline || assets.search?.headline || loadedBrief.productName || subj,
                    bannerSubheadline: assets.email?.bannerSubheadline || loadedBrief.productName || 'Laboratorios Chopo',
                    body: rawBody.replace(/\s*Incluye pie legal:[\s\S]*$/i, '').trim(),
                    image: assets.email?.image || assets.image || undefined,
                    ctaText: assets.email?.ctaText || 'Agendar Estudio en Línea',
                    legalFooter: assets.email?.legalFooter || 'Consulte a su médico. Permiso de Publicidad COFEPRIS No. 2609152002A00518.'
                });
            }
        });
        if (loadedBrief.campaignAssets?.email?.subject && loadedBrief.campaignAssets?.email?.body) {
            const assets: any = loadedBrief.campaignAssets;
            const subj = assets.email.subject.trim();
            const rawBody = assets.email.body.trim();
            if (subj && rawBody && !seenSubjects.has(subj)) {
                seenSubjects.add(subj);
                briefEmails.push({
                    subject: subj,
                    preheader: assets.email?.preheader || '',
                    bannerHeadline: assets.email?.bannerHeadline || assets.search?.headline || loadedBrief.productName || subj,
                    bannerSubheadline: assets.email?.bannerSubheadline || loadedBrief.productName || 'Laboratorios Chopo',
                    body: rawBody.replace(/\s*Incluye pie legal:[\s\S]*$/i, '').trim(),
                    image: assets.email?.image || assets.image || undefined,
                    ctaText: assets.email?.ctaText || 'Agendar Estudio en Línea',
                    legalFooter: assets.email?.legalFooter || 'Consulte a su médico. Permiso de Publicidad COFEPRIS No. 2609152002A00518.'
                });
            }
        }
        if (briefEmails.length > 0) {
            updateEmailDrafts(briefEmails);
        }

        // 3. Sync Acquisition / Promotional Offers (ACQUISITION tab)
        const studyName = (loadedBrief.productName || (loadedBrief as any).studyName || '').trim();
        const isImagingStudy = /mastograf|rayos x|ultrasonido|resonancia|tomograf|imagen|densitometr|colposcop|electrocardiogram/i.test(studyName);
        const candidateOffers: string[] = [];
        if (studyName) {
            candidateOffers.push(`Precio especial exclusivo en línea para ${studyName} al agendar en chopo.com.mx o App Chopo`);
            candidateOffers.push(`Entrega de resultados 100% digitales en App Chopo y WhatsApp para ${studyName}`);
            candidateOffers.push(
                isImagingStudy
                    ? `Cita programada sin filas en sucursal especializada para ${studyName}`
                    : `Toma de muestra a domicilio o en sucursal con cita programada para ${studyName}`
            );
        }
        const mainValProp = (loadedBrief.valueProp?.main?.es || loadedBrief.valueProp?.main?.en || '').trim();
        if (mainValProp) candidateOffers.push(mainValProp);
        const primaryHook = (loadedBrief.messaging?.primaryHook?.es || loadedBrief.messaging?.primaryHook?.en || '').trim();
        if (primaryHook) candidateOffers.push(primaryHook);

        const uniqueOffers = Array.from(new Set(candidateOffers.filter(Boolean)));
        if (uniqueOffers.length > 0) {
            setAcquisitionOffers(uniqueOffers);
        }

        // 4. Sync Diagnostic Studies Catalog (PURCHASE tab)
        const briefProducts: string[] = [];
        const seenTitles = new Set<string>();
        const addStudyIfUnique = (rawOrFormatted: string) => {
            const parsed = parseSimulationProduct(rawOrFormatted);
            const norm = parsed.title.toLowerCase();
            if (!seenTitles.has(norm)) {
                seenTitles.add(norm);
                briefProducts.push(formatSimulationProduct(parsed.title, parsed.modality, parsed.description));
            }
        };

        if (studyName) {
            const modality = parseSimulationProduct(studyName).modality;
            addStudyIfUnique(formatSimulationProduct(studyName, modality, 'Estudio principal del Brief de Marketing'));
        }

        const firstAssets: any = Object.values(assetsMap)[0] || loadedBrief.campaignAssets;
        const recs = firstAssets?.website?.recommendations;
        if (Array.isArray(recs)) {
            recs.forEach((rec: any) => {
                if (rec?.name) {
                    const recModality = parseSimulationProduct(rec.name).modality;
                    addStudyIfUnique(formatSimulationProduct(rec.name, recModality, rec.price ? `Complementario sugerido (${rec.price})` : 'Estudio complementario sugerido en Brief'));
                }
            });
        }

        SIMULATION_PRODUCTS.forEach(stdProd => addStudyIfUnique(stdProd));
        if (briefProducts.length > 0) {
            setSimulationProducts(briefProducts);
        }

        const briefSig = `${(loadedBrief as any).timestamp || ''}|${loadedBrief.title || ''}|${loadedBrief.productName || ''}`;
        try {
            localStorage.setItem('chopo_fg_synced_brief_ts', briefSig);
        } catch {}
    };

    const refreshBriefData = async (forceSync: boolean = false) => {
        const shouldAutoSync = (loadedBrief: any) => {
            if (forceSync) return true;
            try {
                const briefSig = `${loadedBrief?.timestamp || ''}|${loadedBrief?.title || ''}|${loadedBrief?.productName || ''}`;
                const lastSig = localStorage.getItem('chopo_fg_synced_brief_ts');
                const hasSavedOffers = Boolean(localStorage.getItem('chopo_fg_acquisition_offers'));
                return !lastSig || briefSig !== lastSig || !hasSavedOffers;
            } catch {
                return true;
            }
        };

        try {
            // Try Server First
            const res = await fetch('/api/load-run/marketing_brief');
            const data = await res.json();
            if (data && data.title) {
                console.log("Refreshed Brief Data:", data);
                setBrief(data);
                if (data.channelKey && String(data.channelKey).trim()) {
                    setSelectedChannelKey(String(data.channelKey).trim() as BrandChannelKey);
                }
                if (shouldAutoSync(data)) {
                    syncStimuliFromBrief(data);
                }

                if (data.campaignAssetsMap) {
                    const keys = Object.keys(data.campaignAssetsMap);
                    if (keys.length > 0) {
                        setSelectedCreativeAudience(prev => prev || keys[0]);
                    }
                }
                return;
            }
        } catch (e) { console.error("Server refresh failed", e); }

        // Fallback to Local
        const saved = localStorage.getItem('cc_marketing_brief');
        if (saved) {
            console.log("Loaded Brief from Local Storage");
            const parsed = JSON.parse(saved);
            setBrief(parsed);
            if (parsed?.channelKey && String(parsed.channelKey).trim()) {
                setSelectedChannelKey(String(parsed.channelKey).trim() as BrandChannelKey);
            }
            if (shouldAutoSync(parsed)) {
                syncStimuliFromBrief(parsed);
            }
        }
    };

    useEffect(() => {
        let isMounted = true;
        refreshBriefData();

        // Load active Brand Manual V4 (including custom channels and edited labels)
        fetchBrandManual(true)
            .then(manual => {
                if (isMounted && manual) {
                    setActiveBrandManual(manual);
                }
            })
            .catch(err => console.warn("Could not load Brand Manual V4 from server, using built-in channels:", err));

        // Load Rubrics from Firestore / Seed
        fetchRubrics()
            .then(loadedRubrics => {
                if (Array.isArray(loadedRubrics) && loadedRubrics.length > 0) {
                    setRubrics(loadedRubrics);
                }
            })
            .catch(err => console.warn("Could not load rubrics from server, using DEFAULT_CHOPO_RUBRICS:", err));

        // Load Catalog Personas + Synthetic Users and synchronize Contexto de Audiencias with selected/generated audiences
        const loadPersonasAndSyntheticUsers = async () => {
            let catalog: any[] = STANDARD_AUDIENCES;
            try {
                const loadedPersonas = await fetchPersonas();
                if (Array.isArray(loadedPersonas) && loadedPersonas.length > 0) {
                    catalog = loadedPersonas;
                } else {
                    const audRes = await fetch('/api/load-run/audience_generator');
                    if (audRes.ok) {
                        const audData = await audRes.json();
                        if (audData && Array.isArray(audData.personas) && audData.personas.length > 0) {
                            catalog = audData.personas;
                        } else if (Array.isArray(audData) && audData.length > 0) {
                            catalog = audData;
                        }
                    }
                }
            } catch {
                catalog = STANDARD_AUDIENCES;
            }

            // Merge with STANDARD_AUDIENCES and deduplicate by name so full catalog is always available
            const mergedCatalog = Array.from(
                new Map([...catalog, ...STANDARD_AUDIENCES].map(p => [p.name, p])).values()
            );
            setAllCatalogPersonas(mergedCatalog);

            try {
                const synRes = await fetch('/api/load-run/synthetic_users');
                if (synRes.ok) {
                    const synData = await synRes.json();
                    const generated: any[] = Array.isArray(synData?.generatedUsers) ? synData.generatedUsers : [];
                    const selectedNames: string[] = Array.isArray(synData?.selectedPersonaNames) ? synData.selectedPersonaNames : [];

                    if (generated.length > 0) {
                        setSyntheticUsers(generated);
                        const activeBaseNames = new Set<string>(
                            selectedNames.length > 0
                                ? selectedNames
                                : generated.map((u: any) => u.baseAudienceName || u.personaName || u.name).filter(Boolean)
                        );
                        const activePersonas = mergedCatalog.filter(
                            p => activeBaseNames.has(p.name) || activeBaseNames.has(p.personaName)
                        );
                        setPersonas(activePersonas.length > 0 ? activePersonas : mergedCatalog);
                        return;
                    }
                }
            } catch {
                console.log("No synthetic users run found, using standard clinical seeds");
            }

            setPersonas(mergedCatalog);
            setSyntheticUsers(mergedCatalog);
        };

        loadPersonasAndSyntheticUsers();

        // Load History (Server Only)
        fetch('/api/load-run/synthetic_focus_group')
            .then(res => res.json())
            .then(data => {
                if (isMounted && data && Array.isArray(data)) {
                    setSavedHistory(data);
                }
            })
            .catch(e => console.log("No server history found"));

        return () => {
            isMounted = false;
        };
    }, []);

    // --- Dynamic Rubrics Management & Rollback ---
    const loadRubricVersions = async () => {
        try {
            const versions = await fetchConfigVersions('rubrics');
            if (Array.isArray(versions)) {
                setRubricVersions(versions);
            }
        } catch (err) {
            console.warn("Failed to load rubric versions:", err);
        }
    };

    const openRubricsModal = async () => {
        setEditingRubric(rubrics[0] ? { ...rubrics[0], scoringAnchors: { ...rubrics[0].scoringAnchors } } : null);
        setIsRubricsModalOpen(true);
        await loadRubricVersions();
    };

    const handleStartNewRubric = () => {
        const blankRubric: FocusGroupRubric = {
            id: `rubric_custom_${Date.now()}`,
            name: '',
            track: 'both',
            weight: 15,
            evaluationQuestion: '',
            scoringAnchors: {
                low_0_to_40: 'El mensaje o imagen es confuso o poco relevante para el perfil.',
                mid_41_to_79: 'El mensaje se entiende parcialmente pero le falta fuerza comercial o clínica.',
                high_80_to_100: 'Comunicación clara, confiable y accionable en menos de 3 segundos.'
            }
        };
        setEditingRubric(blankRubric);
    };

    const handleSaveRubricsToServer = async (updatedList: FocusGroupRubric[], customLabel?: string) => {
        setIsSavingRubrics(true);
        try {
            const label = customLabel || rubricVersionLabel.trim() || `Actualización de Rúbricas (${updatedList.length} criterios)`;
            const saved = await saveRubrics(updatedList, label);
            const finalRubrics = Array.isArray(saved) && saved.length > 0 ? saved : updatedList;
            setRubrics(finalRubrics);
            setRubricVersionLabel("");
            await loadRubricVersions();
        } catch (err) {
            console.error("Failed to save rubrics:", err);
            alert(t("Error al guardar los criterios de evaluación.", "Failed to save evaluation rubrics."));
        } finally {
            setIsSavingRubrics(false);
        }
    };

    const handleApplyEditingRubric = async () => {
        if (!editingRubric || !editingRubric.name.trim()) {
            alert(t("Ingresa un nombre para el criterio de evaluación.", "Please enter a name for the evaluation rubric."));
            return;
        }
        const normalized: FocusGroupRubric = {
            ...editingRubric,
            name: editingRubric.name.trim(),
            weight: Number(editingRubric.weight) || 15
        };
        const exists = rubrics.some(r => r.id === normalized.id);
        const updatedList = exists
            ? rubrics.map(r => (r.id === normalized.id ? normalized : r))
            : [...rubrics, normalized];
        setEditingRubric(normalized);
        await handleSaveRubricsToServer(updatedList, rubricVersionLabel.trim() || `${exists ? 'Edición' : 'Nuevo criterio'}: ${normalized.name}`);
    };

    const handleDeleteRubric = async (rubricId: string) => {
        const updatedList = rubrics.filter(r => r.id !== rubricId);
        if (editingRubric?.id === rubricId) {
            setEditingRubric(updatedList[0] || null);
        }
        await handleSaveRubricsToServer(updatedList, 'Eliminación de criterio de evaluación');
    };

    const handleRestoreRubrics = async (versionId: string) => {
        setIsSavingRubrics(true);
        try {
            const restored = await restoreConfigVersion('rubrics', versionId);
            const finalRubrics = Array.isArray(restored) && restored.length > 0 ? restored : DEFAULT_CHOPO_RUBRICS;
            setRubrics(finalRubrics);
            setEditingRubric(finalRubrics[0] || null);
            await loadRubricVersions();
        } catch (err) {
            console.error("Failed to restore rubrics:", err);
            alert(t("Error al restaurar versión de criterios.", "Failed to restore rubrics version."));
        } finally {
            setIsSavingRubrics(false);
        }
    };

    // --- Fixed-Schema Persona Persistence & Rollback ---
    const loadPersonaVersions = async () => {
        try {
            const versions = await fetchConfigVersions('personas');
            if (Array.isArray(versions)) {
                setPersonaVersions(versions);
            }
        } catch (err) {
            console.warn("Failed to load persona versions:", err);
        }
    };

    const persistPersonasAllChannels = async (updatedPersonas: any[], label: string) => {
        setPersonas(updatedPersonas);
        setIsSavingPersonas(true);
        try {
            await savePersonas(updatedPersonas, label);
            await fetch('/api/save-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureId: 'audience_generator', data: { personas: updatedPersonas } })
            });
            await loadPersonaVersions();
        } catch (err) {
            console.error("Failed to persist personas:", err);
        } finally {
            setIsSavingPersonas(false);
        }
    };

    const handleRestorePersonas = async (versionId: string) => {
        setIsSavingPersonas(true);
        try {
            const restored = await restoreConfigVersion('personas', versionId);
            const finalPersonas = Array.isArray(restored) && restored.length > 0 ? restored : STANDARD_AUDIENCES;
            setPersonas(finalPersonas);
            setSyntheticUsers(finalPersonas);
            await loadPersonaVersions();
        } catch (err) {
            console.error("Failed to restore personas:", err);
            alert(t("Error al restaurar versión de perfiles.", "Failed to restore personas version."));
        } finally {
            setIsSavingPersonas(false);
        }
    };

    const handleCreateManualPersona = async () => {
        if (!newManualPersona.name.trim() || !newManualPersona.personaName.trim()) {
            alert(t("Completa al menos el Nombre del Segmento y el Nombre de la Persona.", "Please fill in at least Segment Name and Persona Name."));
            return;
        }
        const painPoints = newManualPersona.pain_points_text
            .split(/\n|,/)
            .map(s => s.trim())
            .filter(Boolean);
        const goals = newManualPersona.goals_text
            .split(/\n|,/)
            .map(s => s.trim())
            .filter(Boolean);
        const defaultJobTitle =
            newManualPersona.track === 'physician'
                ? 'Médico Especialista'
                : newManualPersona.track === 'enterprise'
                    ? 'Director de Recursos Humanos / Salud Ocupacional'
                    : 'Paciente';
        const defaultSegmentTag =
            newManualPersona.track === 'physician'
                ? 'Médico (B2D)'
                : newManualPersona.track === 'enterprise'
                    ? 'Empresa (B2B)'
                    : 'Paciente (B2C)';
        const created = {
            id: `aud_custom_${Date.now()}`,
            track: newManualPersona.track,
            name: newManualPersona.name.trim(),
            personaName: newManualPersona.personaName.trim(),
            age: Number(newManualPersona.age) || 40,
            job_title: newManualPersona.job_title.trim() || defaultJobTitle,
            demographics: newManualPersona.demographics.trim() || `${newManualPersona.age} años, México`,
            bio: newManualPersona.bio.trim() || 'Perfil sintético configurado para evaluación en Focus Group.',
            pain_points: painPoints.length > 0 ? painPoints : ['Busca claridad en precios e indicaciones de laboratorio'],
            goals: goals.length > 0 ? goals : ['Resultados digitales confiables en App Chopo'],
            imageUrl: newManualPersona.track === 'physician' ? '/images/audiences/physicians.png' : '/images/audiences/chronic_patients.png',
            details: {
                age: `${newManualPersona.age} años`,
                job_title: newManualPersona.job_title.trim() || defaultJobTitle,
                bio: newManualPersona.bio.trim(),
                pain_points: painPoints,
                goals: goals,
                lifestyle_tags: [defaultSegmentTag, 'Salud Digital']
            }
        };
        const updated = [...personas, created];
        await persistPersonasAllChannels(updated, personaVersionLabel.trim() || `Nuevo perfil fijo: ${created.personaName}`);
        setPersonaVersionLabel("");
        setShowManualPersonaForm(false);
        setIsAddAudienceModalOpen(false);
    };

    const handleSaveSelectedAudienceEdits = async () => {
        if (!editAudienceForm || !selectedAudience) return;
        const painPoints = (editAudienceForm.pain_points_text || '')
            .split(/\n|,/)
            .map((s: string) => s.trim())
            .filter(Boolean);
        const goals = (editAudienceForm.goals_text || '')
            .split(/\n|,/)
            .map((s: string) => s.trim())
            .filter(Boolean);
        const updatedAudience = {
            ...selectedAudience,
            name: editAudienceForm.name,
            personaName: editAudienceForm.personaName,
            track: editAudienceForm.track,
            age: Number(editAudienceForm.age) || 40,
            job_title: editAudienceForm.job_title,
            demographics: editAudienceForm.demographics,
            bio: editAudienceForm.bio,
            pain_points: painPoints,
            goals: goals,
            details: {
                ...(selectedAudience.details || {}),
                age: `${Number(editAudienceForm.age) || 40} años`,
                job_title: editAudienceForm.job_title,
                bio: editAudienceForm.bio,
                pain_points: painPoints,
                goals: goals
            }
        };
        const updatedList = personas.map(p => (p.id === selectedAudience.id || p.name === selectedAudience.name ? updatedAudience : p));
        setSelectedAudience(updatedAudience);
        setIsEditingSelectedAudience(false);
        await persistPersonasAllChannels(updatedList, `Edición de perfil: ${updatedAudience.personaName}`);
    };

    // Auto-refresh when switching to Creative tab and close tab-specific modals on tab change
    useEffect(() => {
        setIsEmailEditorOpen(false);
        setShowProducts(false);
        if (activeTab === 'CREATIVE') {
            refreshBriefData();
        }
    }, [activeTab]);

    // --- Persistence Helper ---
    const formatHistoryRunTitle = (run: SavedSimulation): string => {
        const raw = run.name || '';
        return raw
            .replace(/^Member Sim\s*-\s*/i, t('Simulación de Campaña — ', 'Campaign Sim — '))
            .replace(/^Acquisition Test\s*-\s*/i, t('Simulación de Promociones — ', 'Promotions Sim — '))
            .replace(/^Creative Test\s*(\([^)]*\))?\s*-\s*/i, t('Evaluación de Imagen / Banner — ', 'Creative Sim — '))
            .replace(/^A\/B Test\s*-\s*/i, t('Prueba A/B — ', 'A/B Test — '));
    };

    const getHistoryRunBadge = (type: SavedSimulation['type']) => {
        switch (type) {
            case 'ACQUISITION_SIMULATION':
                return {
                    label: t('Promociones', 'Promotions'),
                    className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                };
            case 'MEMBER_SIMULATION':
                return {
                    label: t('Brief / Email / Estudios', 'Brief / Email / Studies'),
                    className: 'bg-[#EFF6FF] text-[#0066FF] border-blue-200'
                };
            case 'CREATIVE_SIMULATION':
                return {
                    label: t('Imagen / Banner', 'Image / Banner'),
                    className: 'bg-purple-50 text-purple-700 border-purple-200'
                };
            case 'AB_TEST_SIMULATION':
                return {
                    label: t('A/B Test', 'A/B Test'),
                    className: 'bg-amber-50 text-amber-700 border-amber-200'
                };
            default:
                return {
                    label: t('Simulación', 'Simulation'),
                    className: 'bg-slate-100 text-slate-700 border-slate-200'
                };
        }
    };

    const autoSaveRun = (run: SavedSimulation) => {
        const newHistory = [run, ...savedHistory];
        setSavedHistory(newHistory);

        // Save to Server
        fetch('/api/save-run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ featureId: 'synthetic_focus_group', data: newHistory })
        }).catch(err => console.error("Failed to save history to server:", err));
    };

    const loadRun = (run: SavedSimulation) => {
        if (run.type === 'MEMBER_SIMULATION') {
            setMemberResults(run.results);
            if (run.emailBodies) {
                setEmailBodies(run.emailBodies);
            }
            if (Array.isArray(run.marketingMessages) && run.marketingMessages.length > 0) {
                setMarketingMessages(run.marketingMessages);
            } else {
                const inferredMsgs = Array.from(
                    new Set(
                        (run.results || [])
                            .flatMap((r: any) => (r.messageReactions || []).map((mr: any) => mr?.message))
                            .filter(Boolean)
                    )
                );
                if (inferredMsgs.length > 0) setMarketingMessages(inferredMsgs);
            }

            if (Array.isArray(run.simulationProducts) && run.simulationProducts.length > 0) {
                setSimulationProducts(run.simulationProducts);
            } else {
                const inferredProds = Array.from(
                    new Set(
                        (run.results || [])
                            .flatMap((r: any) => (r.cart || []).map((c: any) => c?.productName))
                            .filter(Boolean)
                    )
                );
                if (inferredProds.length > 0) setSimulationProducts(inferredProds);
            }

            if (Array.isArray(run.emailDrafts) && run.emailDrafts.length > 0) {
                setEmailDrafts(run.emailDrafts);
            } else if (run.emailBodies && Object.keys(run.emailBodies).length > 0) {
                const inferredDrafts = Object.entries(run.emailBodies).map(([subject, body]) => ({
                    subject,
                    body: String(body || '')
                }));
                if (inferredDrafts.length > 0) setEmailDrafts(inferredDrafts);
            }

            if (activeTab !== 'BRIEF' && activeTab !== 'EMAIL' && activeTab !== 'PURCHASE') {
                setActiveTab('BRIEF');
            }
        } else if (run.type === 'ACQUISITION_SIMULATION') {
            setAcquisitionResults(run.results);
            if (Array.isArray(run.offers) && run.offers.length > 0) {
                setAcquisitionOffers(run.offers);
            } else {
                const inferredOffers = Array.from(
                    new Set(
                        (run.results || [])
                            .map((r: any) => r?.winningOffer)
                            .filter((o: any) => o && o !== 'None' && o !== 'Ninguna')
                    )
                );
                if (inferredOffers.length > 0) {
                    setAcquisitionOffers(inferredOffers);
                }
            }
            setActiveTab('ACQUISITION');
        } else if (run.type === 'CREATIVE_SIMULATION') {
            setCreativeResults(run.results);
            setActiveTab('CREATIVE');
        } else if (run.type === 'AB_TEST_SIMULATION') {
            setAbTestResults(run.results);
            setRegionalVariants(run.variants as any);
            setActiveTab('AB_TEST');
        }
    };

    const handleClearHistory = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(t("¿Estás seguro de que deseas borrar todo el historial de simulaciones? Esta acción no se puede deshacer.", "Are you sure you want to clear all simulation history? This cannot be undone."))) return;

        setSavedHistory([]);
        try {
            await fetch('/api/save-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureId: 'synthetic_focus_group', data: [] })
            });
        } catch (err) {
            console.error("Failed to clear history:", err);
            alert(t("Error al borrar el historial en el servidor.", "Failed to clear history on server."));
        }
    };

    const handleLoadLast = (type: 'ACQUISITION_SIMULATION' | 'MEMBER_SIMULATION' | 'CREATIVE_SIMULATION' | 'AB_TEST_SIMULATION') => {
        const lastRun = savedHistory.find(r => r.type === type);
        if (lastRun) {
            loadRun(lastRun);
        } else {
            alert(t("No se encontró ninguna ejecución previa para este tipo de simulación.", "No previous run found for this type."));
        }
    };

    // --- Audience Management ---
    const handleAddAudience = async (criteria?: string) => {
        setIsAddAudienceModalOpen(false); // Close modal if open
        setIsGeneratingWildcard(true);
        setStatus(criteria ? t("Generando perfil a partir de tus criterios...", "Generating audience from your criteria...") : t("Creando un nuevo Perfil Exploratorio...", "Brainstorming a completely new 'Wildcard' audience..."));

        try {
            let seedAudience;
            if (criteria) {
                seedAudience = await generateAudienceFromCriteria(name, criteria);
            } else {
                const existingNames = personas.map(p => p.name);
                seedAudience = await generateWildcardAudience(name, existingNames);
            }

            if (seedAudience) {
                setStatus(t(`Desarrollando perfil para: ${seedAudience.name}...`, `Developing profile for: ${seedAudience.name}...`));
                const details = await generateSyntheticPersona(seedAudience.personaName, seedAudience.name, `${brandConfig.companyName} - ${seedAudience.bio || ""}`);
                let imageUrl = "";
                try {
                    imageUrl = await generateImageFromPrompt(seedAudience.imagePrompt + " professional portrait, high quality, studio lighting");
                } catch (e) { console.error(e); }

                const newPersona = {
                    ...seedAudience,
                    track: inferPersonaTrack(seedAudience),
                    age: details?.age || 40,
                    job_title: details?.job_title || 'Paciente / Profesional',
                    pain_points: details?.pain_points || ['Busca atención rápida y precios transparentes en línea'],
                    goals: details?.goals || ['Resultados digitales confiables en App Chopo'],
                    details,
                    imageUrl,
                    isWildcard: !criteria
                };
                const updated = [...personas, newPersona];
                await persistPersonasAllChannels(updated, `Perfil IA generado: ${newPersona.personaName || newPersona.name}`);
            }
        } catch (error) { console.error(error); alert(t("Error al generar el perfil de audiencia.", "Failed to generate audience.")); }
        finally { setIsGeneratingWildcard(false); setStatus(""); }
    };

    const deletePersona = (index: number) => {
        const removed = personas[index];
        const updated = personas.filter((_, i) => i !== index);
        persistPersonasAllChannels(updated, `Eliminación de perfil: ${removed?.personaName || removed?.name || index}`);
    };

    // --- Acquisition Logic ---
    const handleRunAcquisition = async () => {
        setIsAcquisitionLoading(true);
        setStatus(t("Simulando promociones y captación de nuevos pacientes...", "Simulating Net-New Acquisition..."));
        try {
            let pool = [...syntheticUsers];
            const results = await simulateAcquisitionFocusGroup(pool, acquisitionOffers, name, description, selectedChannelKey);
            setAcquisitionResults(results);

            // Auto Save
            const studyLabel = brief?.productName || t('Campaña Chopo', 'Chopo Campaign');
            autoSaveRun({
                type: 'ACQUISITION_SIMULATION',
                id: `acq_${Date.now()}`,
                name: `${studyLabel} (${acquisitionOffers.length} promociones)`,
                timestamp: new Date().toISOString(),
                results: results,
                stats: {}, // Calculate stats if needed for summary
                offers: [...acquisitionOffers]
            });
        } catch (e) { console.error(e); }
        finally { setIsAcquisitionLoading(false); setStatus(""); }
    };

    // Load saved campaigns on mount only if Brief has not already populated emailDrafts
    useEffect(() => {
        fetch('/api/load-email-campaigns')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setEmailDrafts(prev => (prev.length > 0 ? prev : data));
                }
            })
            .catch(err => console.error("Failed to load email campaigns:", err));
    }, []);

    const updateEmailDrafts = (newDrafts: EmailDraftItem[]) => {
        setEmailDrafts(newDrafts);
        fetch('/api/save-email-campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDrafts)
        }).catch(err => console.error("Failed to save email campaigns:", err));
    };

    // --- Member Simulation Logic ---
    const handleRunMemberSim = async () => {
        if (!brief || personas.length === 0) return;
        setIsMemberLoading(true);
        setStatus(t("Preparando simulación de campaña...", "Preparing Member Simulation..."));
        try {
            const { generateEmailBodies } = await import('../services/geminiService');
            let bodies = emailBodies;
            let campaigns = emailDrafts;

            // Generate initial drafts only if emailDrafts is completely empty
            if (campaigns.length === 0) {
                if (Object.keys(bodies).length === 0) {
                    bodies = await generateEmailBodies(EMAIL_HEADLINES, brief);
                    setEmailBodies(bodies);
                }
                campaigns = EMAIL_HEADLINES.map(h => ({ subject: h, body: bodies[h] || "Loading..." }));
                updateEmailDrafts(campaigns);
            }

            const emailCampaigns = campaigns;

            let pool = [...syntheticUsers];

            setStatus(t(`Simulando respuestas de ${pool.length} participantes...`, `Simulating ${pool.length} members...`));
            const briefWithChannel = { ...brief, channelKey: selectedChannelKey };
            const results = await simulateMarketingFocusGroup(pool, briefWithChannel, simulationProducts, emailCampaigns, marketingMessages, selectedChannelKey);
            setMemberResults(results);

            // Auto Save
            const studyLabel = brief?.productName || t('Campaña Chopo', 'Chopo Campaign');
            autoSaveRun({
                type: 'MEMBER_SIMULATION',
                id: `mem_${Date.now()}`,
                name: `${studyLabel} (${emailCampaigns.length} emails, ${simulationProducts.length} estudios)`,
                timestamp: new Date().toISOString(),
                results: results,
                emailBodies: bodies,
                marketingMessages: [...marketingMessages],
                simulationProducts: [...simulationProducts],
                emailDrafts: [...emailCampaigns]
            });
        } catch (e) { console.error(e); }
        finally { setIsMemberLoading(false); setStatus(""); }
    };

    // --- Custom Creative Upload & Sync ---
    const handleUploadCustomCreative = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingCreative(true);
        setStatus(t("Subiendo imagen / banner propio...", "Uploading custom creative image..."));

        try {
            const base64DataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });

            let uploadedUrl = base64DataUrl;
            try {
                const safeFilename = `custom_creative_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
                console.warn("Backend image upload failed, falling back to local base64 data URL:", uploadErr);
            }

            const headlineText = customCreativeHeadline.trim();
            const captionText = customCreativeCaption.trim();

            const customAsset = {
                isCustomUpload: true,
                fileName: file.name,
                image: uploadedUrl,
                social: {
                    caption: captionText,
                    hashtags: captionText ? ["#Chopo", "#SaludPreventiva"] : []
                },
                search: {
                    headline: headlineText,
                    description: captionText,
                    url: "chopo.com.mx"
                },
                email: {
                    subject: headlineText,
                    preheader: "Estudios clínicos y de gabinete en Laboratorio Médico del Chopo",
                    body: captionText
                },
                youtube: {
                    title: headlineText,
                    script: captionText
                },
                website: {
                    recommendations: ["Agendar cita en línea en chopo.com.mx", "Resultados digitales en App Chopo"]
                }
            };

            const existingCustomCount = Object.keys(customCreativesMap).length;
            const targetKey = (selectedCreativeAudience && customCreativesMap[selectedCreativeAudience])
                ? selectedCreativeAudience
                : (existingCustomCount === 0
                    ? t("Imagen Propia", "Custom Creative")
                    : t(`Imagen Propia ${existingCustomCount + 1}`, `Custom Creative ${existingCustomCount + 1}`));

            setCustomCreativesMap(prev => ({
                ...prev,
                [targetKey]: customAsset
            }));
            setSelectedCreativeAudience(targetKey);
        } catch (err) {
            console.error("Failed to read custom creative file:", err);
            alert(t("No se pudo cargar el archivo de imagen seleccionado.", "Could not load the selected image file."));
        } finally {
            setIsUploadingCreative(false);
            setStatus("");
            if (customCreativeInputRef.current) {
                customCreativeInputRef.current.value = "";
            }
        }
    };

    const handleCustomCopyChange = (newHeadline: string, newCaption: string) => {
        setCustomCreativeHeadline(newHeadline);
        setCustomCreativeCaption(newCaption);

        const activeCustomKey = (selectedCreativeAudience && customCreativesMap[selectedCreativeAudience])
            ? selectedCreativeAudience
            : Object.keys(customCreativesMap)[0];

        if (activeCustomKey && customCreativesMap[activeCustomKey]) {
            const headlineText = newHeadline.trim();
            const captionText = newCaption.trim();

            setCustomCreativesMap(prev => ({
                ...prev,
                [activeCustomKey]: {
                    ...prev[activeCustomKey],
                    social: {
                        ...prev[activeCustomKey].social,
                        caption: captionText,
                        hashtags: captionText ? ["#Chopo", "#SaludPreventiva"] : []
                    },
                    search: {
                        ...prev[activeCustomKey].search,
                        headline: headlineText,
                        description: captionText
                    },
                    email: {
                        ...prev[activeCustomKey].email,
                        subject: headlineText,
                        body: captionText
                    }
                }
            }));
        }
    };

    // --- Creative Simulation Logic ---
    const handleRunCreativeSim = async () => {
        console.log("handleRunCreativeSim clicked");
        const hasCustomCreatives = Object.keys(customCreativesMap).length > 0;
        const hasBriefAssets = Boolean(brief?.campaignAssetsMap && Object.keys(brief.campaignAssetsMap).length > 0) || Boolean(brief?.campaignAssets);

        if (!hasCustomCreatives && !brief) {
            alert(t("Por favor sube una imagen o banner propio, o genera un Brief de Marketing primero.", "Please upload a custom creative image or generate a Marketing Brief first."));
            return;
        }

        const effectivePersonas = personas.length > 0 ? personas : STANDARD_AUDIENCES;
        const effectiveUsers = syntheticUsers.length > 0 ? syntheticUsers : effectivePersonas;

        setIsCreativeLoading(true);
        setStatus(t("Preparando materiales de campaña...", "Preparing campaign assets..."));
        try {
            let testQueue: { name: string | null, assets: any }[] = [];

            if (Object.keys(combinedCreativeAssetsMap).length > 0) {
                Object.entries(combinedCreativeAssetsMap).forEach(([variantName, assets]) => {
                    testQueue.push({ name: variantName, assets });
                });
            } else if (brief?.campaignAssets) {
                testQueue.push({ name: t('Campaña Principal', 'Default'), assets: brief.campaignAssets });
            } else if (brief) {
                setStatus(t("Generando nuevos materiales de campaña...", "Generating new campaign assets..."));
                const productName = brief.productName || "Estudio Clínico de Laboratorio Médico del Chopo";
                const targetAudience = brief.audiences?.[0]?.name || "Audiencia General";
                const combinedGoal = `Goal: ${brief.campaignGoal}. Persona: ${targetAudience}. Context: ${description}`;

                const generatedAssets = await generateMarketingCampaignAssets(productName, combinedGoal, combinedGoal, { channelKey: selectedChannelKey });
                if (!generatedAssets) throw new Error("Failed to generate assets");

                const updatedBrief = { ...brief, campaignAssets: generatedAssets };
                setBrief(updatedBrief);
                testQueue.push({ name: t('Campaña Principal', 'Default'), assets: generatedAssets });
            }

            if (testQueue.length === 0) {
                throw new Error("No creative assets available to test");
            }

            setStatus(t("Simulando reacciones del focus group...", "Simulating focus group reactions..."));

            let allResults: any[] = [];

            // Loop through each creative variant
            for (const { name: variantKey, assets } of testQueue) {
                const variantName = variantKey || t('Campaña Principal', 'Default');
                setStatus(t(`Evaluando variante para: ${variantName}...`, `Testing variant for: ${variantName}...`));

                let pool = effectiveUsers.map((u, i) => ({
                    ...u,
                    id: `${u.id}_creative_${variantName}_${i}`
                }));

                // Run Sim with Dynamic Rubrics and Evaluated Channel (Manual V4)
                const results = await simulateCreativeFocusGroup(
                    pool,
                    assets,
                    name,
                    rubrics,
                    brief?.productName || assets?.search?.headline || "Material Visual de Laboratorio Médico del Chopo",
                    selectedChannelKey
                );

                // Tag results with the audience group
                const taggedResults = results.map(r => ({ ...r, audienceGroup: variantName }));
                allResults.push(...taggedResults);
            }

            setCreativeResults(allResults);

            // Auto Save
            const studyLabel = brief?.productName || t('Imagen / Banner Personalizado', 'Custom Creative');
            autoSaveRun({
                type: 'CREATIVE_SIMULATION',
                id: `creative_${Date.now()}`,
                name: `${studyLabel} (${testQueue.length} variantes)`,
                timestamp: new Date().toISOString(),
                results: allResults
            });
        } catch (error) {
            console.error("Creative sim failed:", error);
            alert(t("Error al ejecutar la evaluación de imágenes de campaña.", "Failed to run campaign image testing."));
        } finally {
            setIsCreativeLoading(false);
            setStatus("");
        }
    };

    // --- A/B Test Logic ---
    const handleRunABTestSim = async () => {
        if (!activeCreativeAssets || !activeCreativeAssets.image) { alert(t("No se encontró una imagen base. Sube una imagen en la pestaña Imagen / Banner o genera materiales en el Brief primero.", "No base image found. Upload a custom creative in the Creative Tab or generate assets in the Brief Tab first.")); return; }

        const effectiveUsers = syntheticUsers.length > 0 ? syntheticUsers : (personas.length > 0 ? personas : STANDARD_AUDIENCES);

        setIsABTestingLoading(true);
        setStatus(t("Generando 5 variantes visuales estratégicas. Esto tomará unos segundos...", "Generating 5 Strategic Ad Variants. This will take a moment..."));
        try {
            const { generateRegionalVariants, simulateABTestFocusGroup } = await import('../services/geminiService');

            // Generate Variants based on the current brief or custom creative
            const productName = brief?.productName || activeCreativeAssets?.search?.headline || "Material Visual de Laboratorio Médico del Chopo";
            const campaignGoal = brief?.campaignGoal || activeCreativeAssets?.social?.caption || "Impulsar citas en línea y conciencia sobre salud preventiva";
            const valueProp = brief?.valueProp?.main?.es || brief?.valueProp?.main?.en || "Precisión clínica acreditada y entrega rápida de resultados digitales";
            const basePrompt = `Product: ${productName}. Goal: ${campaignGoal}. Value Prop: ${valueProp}. Asset Context: ${activeCreativeAssets?.social?.caption || ''}`;

            const variants = await generateRegionalVariants(basePrompt, name, description);
            setRegionalVariants(variants);

            setStatus(t("Simulando evaluación A/B en focus group...", "Simulating A/B Test focus group..."));

            let pool = effectiveUsers.map((u, i) => ({
                ...u,
                id: `${u.id}_ab_${i}`
            }));

            // Simulate A/B Test
            const results = await simulateABTestFocusGroup(pool, variants.map(v => ({ region: v.region, image: v.image })), name, description, selectedChannelKey);
            setAbTestResults(results);

            // Auto Save
            const studyLabel = brief?.productName || productName || t('Campaña Chopo', 'Chopo Campaign');
            autoSaveRun({
                type: 'AB_TEST_SIMULATION',
                id: `ab_${Date.now()}`,
                name: `${studyLabel} (5 variantes A/B)`,
                timestamp: new Date().toISOString(),
                results: results,
                variants: variants.map(v => ({ region: v.region, image: v.image || "" }))
            });

        } catch (error) {
            console.error(error);
            alert(t("Error al ejecutar la simulación de prueba A/B.", "A/B test simulation failed."));
        } finally {
            setIsABTestingLoading(false);
            setStatus("");
        }
    };

    // Filter results for display based on selection
    const getFilteredCreativeResults = () => {
        if (!creativeResults.length) return [];

        // If we have a selection and it exists in results
        if (selectedCreativeAudience) {
            const filtered = creativeResults.filter(r => r.audienceGroup === selectedCreativeAudience);
            if (filtered.length > 0) return filtered;
        }

        // Fallback: If combined map exists, try first key
        const combinedKeys = Object.keys(combinedCreativeAssetsMap);
        if (combinedKeys.length > 0) {
            const firstKey = combinedKeys[0];
            const filtered = creativeResults.filter(r => r.audienceGroup === firstKey);
            if (filtered.length > 0) return filtered;
        }

        // Fallback: Return all (legacy behavior for single runs)
        return creativeResults;
    };

    const displayedCreativeResults = getFilteredCreativeResults();

    // --- Stats Helpers ---
    const getAcquisitionStats = () => {
        if (!acquisitionResults.length) return null;
        const total = acquisitionResults.length;
        const joined = acquisitionResults.filter(r => r.likelihoodToJoin > 70).length;
        const winningOffers: Record<string, number> = {};
        acquisitionResults.forEach(r => { if (r.winningOffer && r.winningOffer !== "None") winningOffers[r.winningOffer] = (winningOffers[r.winningOffer] || 0) + 1; });
        const topOffer = Object.entries(winningOffers).sort((a, b) => b[1] - a[1])[0];
        return {
            conversion: (joined / total) * 100,
            avgValue: acquisitionResults.reduce((acc, r) => acc + r.perceivedValue, 0) / total,
            topOffer
        };
    };
    const acqStats = getAcquisitionStats();

    const getEmailStats = () => {
        if (!memberResults.length) return [];
        const total = memberResults.length;

        // Group by subject line
        const stats: Record<string, { opens: number, clicks: number }> = {};

        memberResults.forEach(r => {
            r.emailEngagement.forEach(e => {
                if (!stats[e.subjectLine]) stats[e.subjectLine] = { opens: 0, clicks: 0 };
                if (e.opened) stats[e.subjectLine].opens++;
                if (e.clicked) stats[e.subjectLine].clicks++;
            });
        });

        const fallbackAssets: any = (brief?.campaignAssetsMap && Object.values(brief.campaignAssetsMap)[0]) || brief?.campaignAssets;
        return Object.entries(stats).map(([subject, counts]) => {
            const draft = emailDrafts.find(d => d.subject === subject);
            const bodies = emailBodies[subject];
            return {
                subject,
                openRate: Math.round((counts.opens / total) * 100),
                clickRate: Math.round((counts.clicks / total) * 100),
                body: (draft?.body || bodies || "Loading...").replace(/\s*Incluye pie legal:[\s\S]*$/i, '').trim(),
                bannerHeadline: draft?.bannerHeadline || fallbackAssets?.email?.bannerHeadline || fallbackAssets?.search?.headline || subject,
                bannerSubheadline: draft?.bannerSubheadline || brief?.productName || "Laboratorios Chopo",
                image: draft?.image || fallbackAssets?.email?.image || fallbackAssets?.image || undefined,
                ctaText: draft?.ctaText || "Agendar Estudio en Línea",
                legalFooter: draft?.legalFooter || "Consulte a su médico. Permiso de Publicidad COFEPRIS No. 2609152002A00518."
            };
        }).sort((a, b) => b.openRate - a.openRate);
    };
    const emailStats = getEmailStats();

    const getPurchasedStats = () => {
        if (!memberResults.length) return [];
        const counts: Record<string, number> = {};
        memberResults.forEach(r => {
            r.cart.forEach(c => {
                if (c.purchased) {
                    counts[c.productName] = (counts[c.productName] || 0) + 1;
                }
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    };
    const purchasedStats = getPurchasedStats();

    // --- Executive Report Export Helpers ---
    const showExportFeedback = (message: string) => {
        setExportFeedback(message);
        if (exportFeedbackTimerRef.current) {
            clearTimeout(exportFeedbackTimerRef.current);
        }
        exportFeedbackTimerRef.current = setTimeout(() => {
            setExportFeedback('');
        }, 4500);
    };

    const getEvaluatedChannelLabel = (channelKeyOverride?: string): string => {
        const targetKey = channelKeyOverride || selectedChannelKey;
        const resolved = resolveChannelLabelFromManual(targetKey, activeBrandManual);
        if (resolved && resolved !== targetKey) {
            return resolved;
        }
        const found = evaluatedChannelOptions.find((ch) => ch.key === targetKey);
        return found ? found.label : String(targetKey || 'Redes Sociales');
    };

    const resolveParticipantMeta = (personaId?: string, personaName?: string) => {
        const pool = [...syntheticUsers, ...personas, ...allCatalogPersonas];
        const matched = pool.find(
            (u: any) =>
                (personaId && u.id && (personaId === u.id || personaId.includes(String(u.id)))) ||
                (personaName && (u.name === personaName || u.personaName === personaName))
        );
        const track = inferPersonaTrack(matched || { name: personaName });
        const segmentLabel =
            track === 'physician'
                ? 'Médico B2D'
                : track === 'enterprise'
                    ? 'Empresa B2B'
                    : 'Paciente B2C';
        const ageVal = matched?.age || matched?.details?.age;
        const jobVal = matched?.job_title || matched?.details?.job_title || matched?.demographics;
        const profileParts: string[] = [];
        if (ageVal) {
            profileParts.push(typeof ageVal === 'number' ? `${ageVal} años` : String(ageVal));
        }
        if (jobVal) {
            profileParts.push(String(jobVal));
        }
        return {
            segmentLabel,
            profileDetail: profileParts.join(' · ')
        };
    };

    const summarizeSegmentsLabel = (opinions: FocusGroupParticipantOpinion[]): string => {
        const unique = Array.from(new Set(opinions.map((o) => o.segmentLabel).filter(Boolean))) as string[];
        if (unique.length === 0) return 'Paciente B2C';
        if (unique.length === 1) return unique[0];
        return `Multisegmento (${unique.join(', ')})`;
    };

    const uniqueCleanStrings = (items: Array<string | undefined | null>, maxItems: number = 5): string[] => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const raw of items) {
            const cleaned = String(raw || '').trim();
            if (!cleaned || /^none$|^ninguna$/i.test(cleaned)) continue;
            const key = cleaned.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                out.push(cleaned);
                if (out.length >= maxItems) break;
            }
        }
        return out;
    };

    const buildFocusGroupPayloadForActiveTab = (): FocusGroupExecutiveReportPayload | null => {
        const channelLabel = getEvaluatedChannelLabel();
        const studyName = brief?.productName || brief?.studyName || 'Campaña Laboratorio Médico del Chopo';

        if (activeTab === 'CREATIVE' && displayedCreativeResults.length > 0) {
            const count = displayedCreativeResults.length;
            const avgVisual = Math.round(displayedCreativeResults.reduce((a, b) => a + (Number(b.visualAppeal) || 0), 0) / count);
            const avgBrand = Math.round(displayedCreativeResults.reduce((a, b) => a + (Number(b.brandFit) || 0), 0) / count);
            const avgConv = Math.round(displayedCreativeResults.reduce((a, b) => a + (Number(b.conversionLikelihood) || 0), 0) / count);
            const avgStop = Math.round(displayedCreativeResults.reduce((a, b) => a + (Number(b.stoppingPower) || 0), 0) / count);
            const weightedScores = displayedCreativeResults
                .map((r) => Number(r.weightedOverallScore))
                .filter((n) => Number.isFinite(n) && n > 0);
            const avgOverall =
                weightedScores.length > 0
                    ? Math.round(weightedScores.reduce((a, b) => a + b, 0) / weightedScores.length)
                    : Math.round((avgVisual + avgBrand + avgConv + avgStop) / 4);

            const rubricMap: Record<string, { name: string; weight?: number; total: number; count: number; rationales: string[] }> = {};
            displayedCreativeResults.forEach((r) => {
                (r.rubricScores || []).forEach((rs: any) => {
                    const key = rs.rubricId || rs.rubricKey || rs.name || rs.rubricName;
                    if (!key) return;
                    if (!rubricMap[key]) {
                        const matchedRubric = rubrics.find((rub) => rub.id === rs.rubricId || (rub as any).key === rs.rubricKey);
                        rubricMap[key] = {
                            name: rs.name || rs.rubricName || matchedRubric?.name || key,
                            weight: Number.isFinite(Number(rs.weight)) ? Number(rs.weight) : matchedRubric?.weight,
                            total: 0,
                            count: 0,
                            rationales: []
                        };
                    }
                    rubricMap[key].total += Number(rs.score) || 0;
                    rubricMap[key].count += 1;
                    if (rs.rationale && rubricMap[key].rationales.length < 2) {
                        rubricMap[key].rationales.push(String(rs.rationale).trim());
                    }
                });
            });

            const rubricBreakdown: FocusGroupRubricSummaryItem[] = Object.values(rubricMap).map((item) => ({
                name: item.name,
                weight: item.weight,
                score: Math.round(item.total / (item.count || 1)),
                rationale: item.rationales[0] || ''
            }));

            const opinions: FocusGroupParticipantOpinion[] = displayedCreativeResults.map((r) => {
                const meta = resolveParticipantMeta(r.personaId, r.personaName);
                const scoreVal = Number.isFinite(Number(r.weightedOverallScore))
                    ? Math.round(Number(r.weightedOverallScore))
                    : Math.round(Number(r.conversionLikelihood) || 0);
                return {
                    name: formatDisplayPersonaLabel(localizePersonaLabel(r.personaName, 'es')),
                    segmentLabel: meta.segmentLabel,
                    profileDetail: meta.profileDetail,
                    sentiment: r.sentiment,
                    score: scoreVal,
                    scoreMax: 100,
                    opinion: r.feedback || 'Sin comentario textual registrado.',
                    barriers: r.barriersOrConcerns,
                    suggestedImprovement: r.suggestedImprovement || r.copyEdit
                };
            });

            const sortedRubrics = [...rubricBreakdown].sort((a, b) => b.score - a.score);
            const strengths = sortedRubrics
                .filter((rb) => rb.score >= 75)
                .map((rb) => `${rb.name}: calificación destacada de ${rb.score} sobre 100.`);
            if (strengths.length === 0 && avgBrand >= 70) {
                strengths.push(`Sólida afinidad con la marca Chopo (${avgBrand} sobre 100).`);
            }

            const keyFindings: string[] = [
                `Calificación general consolidada de ${avgOverall} sobre 100 con ${count} participantes evaluados en ${channelLabel}.`
            ];
            if (sortedRubrics.length > 0) {
                keyFindings.push(`Criterio mejor evaluado: ${sortedRubrics[0].name} (${sortedRubrics[0].score} / 100).`);
                if (sortedRubrics.length > 1) {
                    const lowest = sortedRubrics[sortedRubrics.length - 1];
                    keyFindings.push(`Principal foco de atención: ${lowest.name} (${lowest.score} / 100).`);
                }
            }

            const improvements = uniqueCleanStrings(
                displayedCreativeResults.map((r) => r.barriersOrConcerns),
                4
            );
            const agencyAdjustments = uniqueCleanStrings(
                displayedCreativeResults.flatMap((r) => [r.suggestedImprovement, r.copyEdit, r.suggestedMessaging]),
                4
            );

            return {
                title: `Evaluación Creativa: ${studyName}`,
                testMode: 'campaign',
                studyName,
                channelKey: selectedChannelKey,
                channelLabel,
                segmentLabel: summarizeSegmentsLabel(opinions),
                evaluatedCount: count,
                averageScore: avgOverall,
                averageScoreLabel: 'Calificación Promedio',
                averageScoreSuffix: ' / 100',
                extraMetrics: [
                    { label: 'Diseño y Atractivo Visual', value: `${avgVisual} / 100` },
                    { label: 'Afinidad con la Marca', value: `${avgBrand} / 100` },
                    { label: 'Intención de Agendar', value: `${avgConv} / 100` },
                    { label: 'Impacto Visual y Claridad', value: `${avgStop} / 100` }
                ],
                evaluatedMaterial: activeCreativeAssets
                    ? {
                        headline:
                            activeCreativeAssets.search?.headline ||
                            activeCreativeAssets.email?.bannerHeadline ||
                            studyName,
                        subheadline: selectedCreativeAudience
                            ? formatDisplayPersonaLabel(localizePersonaLabel(selectedCreativeAudience, 'es'))
                            : undefined,
                        copy: activeCreativeAssets.social?.caption || activeCreativeAssets.search?.description || '',
                        imageUrl: activeCreativeAssets.image || null,
                        ctaText: activeCreativeAssets.email?.ctaText
                    }
                    : undefined,
                rubricBreakdown,
                strategicSummary: {
                    keyFindings,
                    strengths,
                    improvements,
                    agencyAdjustments
                },
                opinions
            };
        }

        if (activeTab === 'AB_TEST' && abTestResults.length > 0) {
            const count = abTestResults.length;
            const variantScores: Record<string, { total: number; count: number; votes: number; rationales: string[] }> = {};
            abTestResults.forEach((r) => {
                if (r.selectedVariant) {
                    if (!variantScores[r.selectedVariant]) {
                        variantScores[r.selectedVariant] = { total: 0, count: 0, votes: 0, rationales: [] };
                    }
                    variantScores[r.selectedVariant].votes += 1;
                }
                (r.rankings || []).forEach((rank) => {
                    if (!variantScores[rank.variantName]) {
                        variantScores[rank.variantName] = { total: 0, count: 0, votes: 0, rationales: [] };
                    }
                    variantScores[rank.variantName].total += Number(rank.score) || 0;
                    variantScores[rank.variantName].count += 1;
                    if (rank.rationale && variantScores[rank.variantName].rationales.length < 2) {
                        variantScores[rank.variantName].rationales.push(rank.rationale);
                    }
                });
            });

            const sortedVariants = Object.entries(variantScores).sort((a, b) => {
                const avgA = a[1].count > 0 ? a[1].total / a[1].count : 0;
                const avgB = b[1].count > 0 ? b[1].total / b[1].count : 0;
                if (avgB !== avgA) return avgB - avgA;
                return b[1].votes - a[1].votes;
            });

            const winnerName = sortedVariants[0]?.[0] || '';
            const winnerAvg =
                sortedVariants[0] && sortedVariants[0][1].count > 0
                    ? Number((sortedVariants[0][1].total / sortedVariants[0][1].count).toFixed(1))
                    : 0;

            const abVariants: FocusGroupVariantItem[] = sortedVariants.map(([variantName, data], idx) => {
                const matchedRegional = regionalVariants.find((v) => v.region === variantName);
                const avg = data.count > 0 ? Number((data.total / data.count).toFixed(1)) : 0;
                return {
                    label: variantName,
                    imageUrl: matchedRegional?.image || null,
                    score: avg,
                    scoreScale: 10,
                    votes: data.votes,
                    isWinner: idx === 0,
                    summary: data.rationales[0] || ''
                };
            });

            const opinions: FocusGroupParticipantOpinion[] = abTestResults.map((r) => {
                const meta = resolveParticipantMeta(r.personaId, r.personaName);
                const bestRank = (r.rankings || []).find((rk) => rk.variantName === r.selectedVariant) || r.rankings?.[0];
                return {
                    name: formatDisplayPersonaLabel(localizePersonaLabel(r.personaName, 'es')),
                    segmentLabel: meta.segmentLabel,
                    profileDetail: meta.profileDetail,
                    sentiment: r.sentiment,
                    score: bestRank ? Number(bestRank.score) : null,
                    scoreMax: 10,
                    selectedOption: r.selectedVariant,
                    opinion: r.overallFeedback || (r as any).rationale || 'Sin comentario textual registrado.'
                };
            });

            const winnerVotes = sortedVariants[0]?.[1]?.votes || 0;
            const keyFindings = [
                winnerName
                    ? `La variante ganadora fue ${winnerName} con puntaje promedio de ${winnerAvg} sobre 10 y ${winnerVotes} preferencias directas.`
                    : `Se evaluaron ${abVariants.length} variantes con ${count} participantes.`
            ];
            if (sortedVariants.length > 1) {
                const second = sortedVariants[1];
                const secondAvg = second[1].count > 0 ? (second[1].total / second[1].count).toFixed(1) : '0.0';
                keyFindings.push(`Segunda posición: ${second[0]} (${secondAvg} / 10).`);
            }

            return {
                title: `Prueba A/B de Campaña: ${studyName}`,
                testMode: 'ab_test',
                studyName,
                channelKey: selectedChannelKey,
                channelLabel,
                segmentLabel: summarizeSegmentsLabel(opinions),
                evaluatedCount: count,
                averageScore: winnerAvg,
                averageScoreLabel: 'Puntaje Variante Ganadora',
                averageScoreSuffix: ' / 10',
                extraMetrics: [
                    { label: 'Variante Ganadora', value: winnerName || 'Sin definir' },
                    { label: 'Preferencia Directa', value: `${winnerVotes} de ${count}` },
                    { label: 'Variantes Evaluadas', value: `${abVariants.length}` }
                ],
                abVariants,
                strategicSummary: {
                    keyFindings,
                    strengths: uniqueCleanStrings(sortedVariants[0]?.[1]?.rationales || [], 3),
                    improvements: uniqueCleanStrings(
                        sortedVariants.slice(1).flatMap(([, d]) => d.rationales),
                        3
                    )
                },
                opinions
            };
        }

        if (activeTab === 'BRIEF' && memberResults.length > 0) {
            const count = memberResults.length;
            const avgInterest = Math.round(memberResults.reduce((a, b) => a + (Number(b.briefMetrics?.interestScore) || 0), 0) / count);
            const avgClarity = Math.round(memberResults.reduce((a, b) => a + (Number(b.briefMetrics?.clarityScore) || 0), 0) / count);
            const avgRel = Math.round(memberResults.reduce((a, b) => a + (Number(b.briefMetrics?.relevanceScore) || 0), 0) / count);
            const avgOverall = Math.round((avgInterest + avgClarity + avgRel) / 3);

            const msgScoreMap: Record<string, { total: number; count: number }> = {};
            memberResults.forEach((r) => {
                (r.messageReactions || []).forEach((mr) => {
                    if (!mr?.message) return;
                    if (!msgScoreMap[mr.message]) msgScoreMap[mr.message] = { total: 0, count: 0 };
                    msgScoreMap[mr.message].total += Number(mr.score) || 0;
                    msgScoreMap[mr.message].count += 1;
                });
            });

            const opinions: FocusGroupParticipantOpinion[] = memberResults.map((r) => {
                const meta = resolveParticipantMeta(r.personaId, r.personaName);
                const combined = Math.round(
                    ((Number(r.briefMetrics?.interestScore) || 0) +
                        (Number(r.briefMetrics?.clarityScore) || 0) +
                        (Number(r.briefMetrics?.relevanceScore) || 0)) / 3
                );
                const derivedSentiment = combined >= 75 ? 'Positivo' : combined >= 50 ? 'Neutral' : 'Negativo';
                return {
                    name: formatDisplayPersonaLabel(localizePersonaLabel(r.personaName, 'es')),
                    segmentLabel: meta.segmentLabel,
                    profileDetail: meta.profileDetail,
                    sentiment: derivedSentiment,
                    score: combined,
                    scoreMax: 100,
                    opinion: r.briefMetrics?.feedback || 'Sin comentario textual registrado.',
                    barriers: r.briefMetrics?.negativeFeedback
                };
            });

            return {
                title: `Evaluación de Mensajes Clave: ${studyName}`,
                testMode: 'messages',
                studyName,
                channelKey: selectedChannelKey,
                channelLabel,
                segmentLabel: summarizeSegmentsLabel(opinions),
                evaluatedCount: count,
                averageScore: avgOverall,
                averageScoreLabel: 'Calificación Promedio',
                averageScoreSuffix: ' / 100',
                extraMetrics: [
                    { label: 'Nivel de Interés', value: `${avgInterest} / 100` },
                    { label: 'Claridad del Mensaje', value: `${avgClarity} / 100` },
                    { label: 'Relevancia Clínica', value: `${avgRel} / 100` }
                ],
                evaluatedMaterial: {
                    itemsListTitle: 'Mensajes Clave Evaluados',
                    itemsList: marketingMessages.map((msg) => {
                        const stat = msgScoreMap[msg];
                        const avgMsg = stat && stat.count > 0 ? Math.round(stat.total / stat.count) : null;
                        return {
                            title: msg,
                            detail: 'Mensaje clave de campaña',
                            badge: avgMsg !== null ? `${avgMsg} / 100` : 'Evaluado'
                        };
                    })
                },
                strategicSummary: {
                    keyFindings: [
                        `Claridad promedio de ${avgClarity} sobre 100, interés de ${avgInterest} y relevancia clínica de ${avgRel}.`
                    ],
                    strengths: [
                        avgClarity >= 75 ? 'Alta comprensión inmediata de la propuesta de valor.' : 'Oportunidad de reforzar la claridad del mensaje principal.'
                    ],
                    improvements: uniqueCleanStrings(memberResults.map((r) => r.briefMetrics?.negativeFeedback), 4)
                },
                opinions
            };
        }

        if (activeTab === 'ACQUISITION' && acquisitionResults.length > 0) {
            const count = acquisitionResults.length;
            const convPct = Math.round(acqStats?.conversion || 0);
            const avgValue = Math.round(acqStats?.avgValue || 0);
            const topOfferLabel = acqStats?.topOffer?.[0] || 'Sin oferta dominante';

            const offerCounts: Record<string, number> = {};
            acquisitionResults.forEach((r) => {
                if (r.winningOffer && r.winningOffer !== 'None' && r.winningOffer !== 'Ninguna') {
                    offerCounts[r.winningOffer] = (offerCounts[r.winningOffer] || 0) + 1;
                }
            });

            const opinions: FocusGroupParticipantOpinion[] = acquisitionResults.map((r) => {
                const meta = resolveParticipantMeta(r.personaId, r.personaName);
                const derivedSentiment =
                    r.likelihoodToJoin > 70 ? 'Positivo' : r.likelihoodToJoin >= 45 ? 'Neutral' : 'Negativo';
                return {
                    name: formatDisplayPersonaLabel(localizePersonaLabel(r.personaName, 'es')),
                    segmentLabel: meta.segmentLabel,
                    profileDetail: meta.profileDetail,
                    sentiment: derivedSentiment,
                    score: Math.round(Number(r.likelihoodToJoin) || 0),
                    scoreMax: 100,
                    selectedOption: r.winningOffer,
                    opinion: r.feedback || 'Sin comentario textual registrado.',
                    barriers: r.barriers
                };
            });

            return {
                title: `Evaluación de Oferta de Captación: ${studyName}`,
                testMode: 'acquisition',
                studyName,
                channelKey: selectedChannelKey,
                channelLabel,
                segmentLabel: summarizeSegmentsLabel(opinions),
                evaluatedCount: count,
                averageScore: convPct,
                averageScoreLabel: 'Tasa de Conversión Estimada',
                averageScoreSuffix: '%',
                extraMetrics: [
                    { label: 'Valor Percibido', value: `${avgValue} / 100` },
                    { label: 'Oferta Ganadora', value: topOfferLabel },
                    { label: 'Promociones Evaluadas', value: `${acquisitionOffers.length}` }
                ],
                evaluatedMaterial: {
                    itemsListTitle: 'Promociones y Beneficios Evaluados',
                    itemsList: acquisitionOffers.map((offer) => ({
                        title: offer,
                        detail: 'Beneficio de captación evaluado',
                        badge: `${offerCounts[offer] || 0} votos`
                    }))
                },
                strategicSummary: {
                    keyFindings: [
                        `Tasa de intención de conversión estimada en ${convPct}% con un valor percibido promedio de ${avgValue} sobre 100.`,
                        `Oferta con mayor preferencia: ${topOfferLabel}.`
                    ],
                    improvements: uniqueCleanStrings(acquisitionResults.map((r) => r.barriers), 4)
                },
                opinions
            };
        }

        if (activeTab === 'EMAIL' && memberResults.length > 0 && emailStats.length > 0) {
            const count = memberResults.length;
            const avgOpen = Math.round(emailStats.reduce((a, b) => a + b.openRate, 0) / emailStats.length);
            const avgClick = Math.round(emailStats.reduce((a, b) => a + b.clickRate, 0) / emailStats.length);
            const topEmail = emailStats[0];

            const opinions: FocusGroupParticipantOpinion[] = memberResults.map((r) => {
                const meta = resolveParticipantMeta(r.personaId, r.personaName);
                const topEngage = r.emailEngagement.find((e) => e.subjectLine === topEmail.subject) || r.emailEngagement[0];
                const derivedSentiment = topEngage?.clicked
                    ? 'Positivo'
                    : topEngage?.opened
                        ? 'Neutral'
                        : 'Negativo';
                const opinionText =
                    topEngage?.feedback ||
                    (topEngage?.clicked ? r.briefMetrics?.feedback : r.briefMetrics?.negativeFeedback || r.briefMetrics?.feedback) ||
                    'Sin comentario textual registrado.';
                return {
                    name: formatDisplayPersonaLabel(localizePersonaLabel(r.personaName, 'es')),
                    segmentLabel: meta.segmentLabel,
                    profileDetail: meta.profileDetail,
                    sentiment: derivedSentiment,
                    selectedOption: topEngage
                        ? `${topEngage.subjectLine} (${topEngage.clicked ? 'Clic' : topEngage.opened ? 'Abierto' : 'Omitido'})`
                        : undefined,
                    opinion: opinionText
                };
            });

            return {
                title: `Evaluación de Correo Electrónico: ${studyName}`,
                testMode: 'email',
                studyName,
                channelKey: 'mailing_ecommerce',
                channelLabel: getEvaluatedChannelLabel('mailing_ecommerce'),
                segmentLabel: summarizeSegmentsLabel(opinions),
                evaluatedCount: count,
                averageScore: avgOpen,
                averageScoreLabel: 'Tasa de Apertura Promedio',
                averageScoreSuffix: '%',
                extraMetrics: [
                    { label: 'Tasa de Clics Promedio (CTR)', value: `${avgClick}%` },
                    { label: 'Mejor Asunto', value: topEmail.subject },
                    { label: 'Correos Evaluados', value: `${emailStats.length}` }
                ],
                evaluatedMaterial: {
                    headline: topEmail.bannerHeadline || topEmail.subject,
                    subheadline: `Asunto líder: ${topEmail.subject}`,
                    copy: topEmail.body,
                    imageUrl: topEmail.image || null,
                    ctaText: topEmail.ctaText,
                    itemsListTitle: 'Desempeño por Pieza de Correo Electrónico',
                    itemsList: emailStats.map((st) => ({
                        title: st.subject,
                        detail: st.bannerHeadline || '',
                        badge: `Apertura ${st.openRate}% · Clics ${st.clickRate}%`
                    }))
                },
                strategicSummary: {
                    keyFindings: [
                        `Tasa promedio de apertura de ${avgOpen}% y tasa de clics de ${avgClick}% en ${emailStats.length} correos evaluados.`,
                        `Asunto con mejor desempeño: "${topEmail.subject}" (${topEmail.openRate}% apertura, ${topEmail.clickRate}% clics).`
                    ],
                    improvements: uniqueCleanStrings(memberResults.map((r) => r.briefMetrics?.negativeFeedback), 4)
                },
                opinions
            };
        }

        if (activeTab === 'PURCHASE' && memberResults.length > 0) {
            const count = memberResults.length;
            const totalBookings = memberResults.reduce((acc, r) => acc + r.cart.filter((c) => c.purchased).length, 0);
            const buyersCount = memberResults.filter((r) => r.cart.some((c) => c.purchased)).length;
            const bookingRate = Math.round((buyersCount / count) * 100);
            const topStudyName = purchasedStats[0]?.[0]?.split(':')[0]?.replace(/\s*\[.*?\]\s*/g, '').trim() || studyName;

            const studyBookingMap: Record<string, number> = {};
            memberResults.forEach((r) => {
                r.cart.forEach((c) => {
                    if (c.purchased) {
                        const cleanTitle = parseSimulationProduct(c.productName).title;
                        studyBookingMap[cleanTitle] = (studyBookingMap[cleanTitle] || 0) + 1;
                    }
                });
            });

            const opinions: FocusGroupParticipantOpinion[] = memberResults.map((r) => {
                const meta = resolveParticipantMeta(r.personaId, r.personaName);
                const bought = r.cart.filter((c) => c.purchased);
                const skipped = r.cart.filter((c) => !c.purchased);
                const derivedSentiment = bought.length >= 2 ? 'Positivo' : bought.length === 1 ? 'Neutral' : 'Negativo';
                const opinionText =
                    bought.find((b) => b.reason)?.reason ||
                    r.briefMetrics?.feedback ||
                    skipped.find((s) => s.reason)?.reason ||
                    'Sin comentario textual registrado.';
                return {
                    name: formatDisplayPersonaLabel(localizePersonaLabel(r.personaName, 'es')),
                    segmentLabel: meta.segmentLabel,
                    profileDetail: meta.profileDetail,
                    sentiment: derivedSentiment,
                    selectedOption: bought.length > 0
                        ? bought.map((b) => parseSimulationProduct(b.productName).title).join(', ')
                        : 'Sin estudio agendado',
                    opinion: opinionText,
                    barriers: r.briefMetrics?.negativeFeedback || skipped[0]?.reason
                };
            });

            return {
                title: `Evaluación de Estudio y Demanda: ${studyName}`,
                testMode: 'product',
                studyName,
                channelKey: selectedChannelKey,
                channelLabel,
                segmentLabel: summarizeSegmentsLabel(opinions),
                evaluatedCount: count,
                averageScore: bookingRate,
                averageScoreLabel: 'Intención de Agendamiento',
                averageScoreSuffix: '%',
                extraMetrics: [
                    { label: 'Total Estudios Agendados', value: `${totalBookings}` },
                    { label: 'Estudio Más Solicitado', value: topStudyName },
                    { label: 'Estudios Evaluados', value: `${simulationProducts.length}` }
                ],
                evaluatedMaterial: {
                    itemsListTitle: 'Catálogo de Estudios Evaluados',
                    itemsList: simulationProducts.map((raw) => {
                        const parsed = parseSimulationProduct(raw);
                        const bookings = studyBookingMap[parsed.title] || 0;
                        return {
                            title: parsed.title,
                            detail: `${parsed.modality}${parsed.description ? ` · ${parsed.description}` : ''}`,
                            badge: `${bookings} agendamientos`
                        };
                    })
                },
                strategicSummary: {
                    keyFindings: [
                        `${buyersCount} de ${count} participantes (${bookingRate}%) mostraron intención de agendar al menos un estudio clínico.`,
                        `Estudio con mayor demanda: ${topStudyName}.`
                    ],
                    improvements: uniqueCleanStrings(memberResults.map((r) => r.briefMetrics?.negativeFeedback), 4)
                },
                opinions
            };
        }

        return null;
    };

    const handleExportFocusGroupReport = (format: 'pdf' | 'html') => {
        if (isBusy) return;
        const payload = buildFocusGroupPayloadForActiveTab();
        if (!payload) return;

        const html = buildFocusGroupExecutiveReportHtml(payload);
        const filename = buildSafeReportFilename(
            `reporte_focus_group_${payload.testMode}`,
            payload.studyName || payload.title
        );

        if (format === 'html') {
            downloadHtmlReport(html, filename);
            showExportFeedback('Reporte HTML descargado en tu equipo.');
        } else {
            const outcome = openPrintableReport(html, filename);
            showExportFeedback(
                outcome === 'print_window'
                    ? 'Vista de impresión lista para guardar como PDF.'
                    : 'Reporte HTML descargado en tu equipo.'
            );
        }
    };

    const renderReportExportActions = () => (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                disabled={isBusy}
                onClick={() => handleExportFocusGroupReport('pdf')}
                title="Abrir vista ejecutiva lista para imprimir o guardar como PDF"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004699] hover:bg-[#003575] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Printer size={14} />
                <span>Exportar Reporte (PDF)</span>
            </button>
            <button
                type="button"
                disabled={isBusy}
                onClick={() => handleExportFocusGroupReport('html')}
                title="Descargar archivo HTML autónomo del reporte ejecutivo"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EFF9FE] hover:bg-[#BDD4F2]/60 text-[#004699] border border-[#BDD4F2] text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download size={14} />
                <span>Descargar HTML</span>
            </button>
            {exportFeedback && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                    <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                    <span>{exportFeedback}</span>
                </span>
            )}
        </div>
    );


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* --- Top Section: Audience & Context Manager --- */}
            <div className="page-header">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <Users className="text-[#0066FF]" />
                            <h1 className="page-title">{t('Centro de Focus Group Sintético', 'Synthetic Focus Group Hub')}</h1>
                        </div>
                        <div className="flex gap-2">
                            {/* Dynamic Rubrics Button */}
                            <button
                                disabled={isBusy}
                                onClick={openRubricsModal}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-colors bg-blue-50 text-[#003B7A] border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ClipboardList size={16} className="text-[#0066FF]" />
                                {t('📋 Criterios de Evaluación (Rúbricas)', '📋 Evaluation Rubrics')}
                                <span className="px-1.5 py-0.5 rounded-full bg-white text-[#0066FF] text-[10px] font-black">
                                    {rubrics.length}
                                </span>
                            </button>

                            {/* History Dropdown */}
                            <div className="relative" ref={historyDropdownRef}>
                                <button
                                    disabled={isBusy}
                                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                                    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-bold rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isHistoryOpen ? 'bg-[#EFF6FF] text-[#0066FF] border-blue-200' : 'bg-white border-slate-200 text-[#003B7A] hover:bg-slate-50'}`}
                                >
                                    <History size={16} className="text-[#0066FF]" /> {t('Historial', 'History')}
                                    {savedHistory.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[#003B7A] text-[10px] font-black">
                                            {savedHistory.length}
                                        </span>
                                    )}
                                </button>
                                {isHistoryOpen && !isBusy && (
                                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 max-h-[28rem] overflow-y-auto z-50 space-y-2">
                                        <div className="flex justify-between items-center px-2 pb-2 border-b border-slate-100">
                                            <div>
                                                <div className="text-xs font-bold text-[#003B7A] uppercase tracking-wider">{t('Ejecuciones Guardadas', 'Saved Runs')}</div>
                                                <div className="text-[10px] text-slate-500">{t('Haz clic para abrir los resultados en su pestaña', 'Click to open results in their corresponding tab')}</div>
                                            </div>
                                            {savedHistory.length > 0 && (
                                                <button
                                                    onClick={handleClearHistory}
                                                    className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
                                                >
                                                    <Trash2 size={12} /> {t('Limpiar Todo', 'Clear All')}
                                                </button>
                                            )}
                                        </div>
                                        {savedHistory.length === 0 && (
                                            <div className="text-xs text-slate-500 py-6 text-center italic">
                                                {t('Sin simulaciones guardadas aún.', 'No saved simulation runs yet.')}
                                            </div>
                                        )}
                                        {savedHistory.map((run, i) => {
                                            const badge = getHistoryRunBadge(run.type);
                                            const formattedTitle = formatHistoryRunTitle(run);
                                            const formattedDate = run.timestamp
                                                ? new Date(run.timestamp).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                                                : '';
                                            return (
                                                <button
                                                    key={run.id || i}
                                                    onClick={() => { loadRun(run); setIsHistoryOpen(false); }}
                                                    className="w-full text-left p-3 hover:bg-[#F8FAFC] rounded-xl border border-slate-100 hover:border-[#0066FF]/40 transition-all flex flex-col gap-1.5"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}>
                                                            {badge.label}
                                                        </span>
                                                        {formattedDate && (
                                                            <span className="text-[10px] font-medium text-slate-400">
                                                                {formattedDate}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs font-bold text-[#003B7A] line-clamp-1">
                                                        {formattedTitle}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Tabs */}
                    <div className={`tab-scroll-container ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                        <button disabled={isBusy} onClick={() => setActiveTab('CHAT')} className={`tab-button ${activeTab === 'CHAT' ? 'active' : 'inactive'}`}>
                            <MessageSquare size={18} className={activeTab === 'CHAT' ? 'text-[#0066FF]' : ''} /> {t('Chat', 'Chat')}
                        </button>
                        <button disabled={isBusy} onClick={() => setActiveTab('BRIEF')} className={`tab-button ${activeTab === 'BRIEF' ? 'active' : 'inactive'}`}>
                            <MessageCircle size={18} className={activeTab === 'BRIEF' ? 'text-[#0066FF]' : ''} /> {t('Mensajes Clave', 'Key Messages')}
                        </button>
                        <button disabled={isBusy} onClick={() => setActiveTab('ACQUISITION')} className={`tab-button ${activeTab === 'ACQUISITION' ? 'active' : 'inactive'}`}>
                            <UserPlus size={18} className={activeTab === 'ACQUISITION' ? 'text-[#0066FF]' : ''} /> {t('Promociones', 'Acquisition')}
                        </button>
                        <button disabled={isBusy} onClick={() => setActiveTab('EMAIL')} className={`tab-button ${activeTab === 'EMAIL' ? 'active' : 'inactive'}`}>
                            <Mail size={18} className={activeTab === 'EMAIL' ? 'text-[#0066FF]' : ''} /> Email
                        </button>
                        <button disabled={isBusy} onClick={() => setActiveTab('PURCHASE')} className={`tab-button ${activeTab === 'PURCHASE' ? 'active' : 'inactive'}`}>
                            <ShoppingBag size={18} className={activeTab === 'PURCHASE' ? 'text-[#0066FF]' : ''} /> {t('Compra de Estudios', 'Purchase')}
                        </button>
                        <button disabled={isBusy} onClick={() => setActiveTab('CREATIVE')} className={`tab-button ${activeTab === 'CREATIVE' ? 'active' : 'inactive'}`}>
                            <Sparkles size={18} className={activeTab === 'CREATIVE' ? 'text-[#0066FF]' : ''} /> {t('Imagen / Banner', 'Creative')}
                        </button>
                        <button disabled={isBusy} onClick={() => setActiveTab('AB_TEST')} className={`tab-button ${activeTab === 'AB_TEST' ? 'active' : 'inactive'}`}>
                            <BarChart2 size={18} className={activeTab === 'AB_TEST' ? 'text-[#0066FF]' : ''} /> A/B Test
                        </button>
                    </div>

                    {/* Audience List & Evaluated Channel Selector (Inside Header for Context) */}
                    <div className={`flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 mt-2 ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex-shrink-0 text-xs font-bold text-subtext uppercase tracking-wider mr-1">{t('Contexto de Audiencias')}</div>
                            {personas.map((p, i) => {
                                const userCountForPersona = syntheticUsers.filter(
                                    (u: any) => (u.baseAudienceName || u.name) === p.name || u.personaName === p.personaName
                                ).length;
                                const segMeta = getPersonaSegmentMeta(p);
                                return (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            if (isBusy) return;
                                            setSelectedAudience(p);
                                            setIsEditingSelectedAudience(false);
                                            setEditAudienceForm({
                                                name: p.name || '',
                                                personaName: p.personaName || '',
                                                track: inferPersonaTrack(p),
                                                age: p.age || parseInt(String(p.details?.age || '42'), 10) || 42,
                                                job_title: p.job_title || p.details?.job_title || '',
                                                demographics: p.demographics || '',
                                                bio: p.bio || p.details?.bio || '',
                                                pain_points_text: (p.pain_points || p.details?.pain_points || []).join('\n'),
                                                goals_text: (p.goals || p.details?.goals || []).join('\n')
                                            });
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white border-slate-200 text-[#003B7A] text-sm cursor-pointer hover:border-[#0066FF] hover:shadow-sm transition-all"
                                        title={t('Ver detalles del perfil')}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Users size={12} />}
                                        </div>
                                        <span className="font-bold text-xs">{formatDisplayPersonaLabel(localizePersonaLabel(p.name, language))}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${segMeta.badgeClass}`}>
                                            {segMeta.shortLabel}
                                        </span>
                                        {userCountForPersona > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0066FF] text-[10px] font-black border border-blue-200">
                                                {userCountForPersona}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                            {activeTab === 'CHAT' && (
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setIsSyntheticUsersModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#003B7A] hover:bg-blue-100 text-xs font-bold whitespace-nowrap transition-colors"
                                    title={t('Ver e inspeccionar los participantes sintéticos evaluados en esta sesión')}
                                >
                                    <span>{t(`👥 Ver / Inspeccionar Participantes Evaluados (${syntheticUsers.length})`)}</span>
                                </button>
                            )}
                        </div>

                        {/* Compact Evaluated Channel Selector (Manual V4) */}
                        <div className="flex items-center gap-2 bg-[#EFF9FE] border border-[#BDD4F2] rounded-xl px-3 py-1.5 shrink-0">
                            <Radio size={14} className="text-[#005FFC] shrink-0" />
                            <label htmlFor="fg-evaluated-channel" className="text-[11px] font-bold text-[#004699] uppercase tracking-wider whitespace-nowrap">
                                {t('Canal Evaluado:')}
                            </label>
                            <select
                                id="fg-evaluated-channel"
                                disabled={isBusy}
                                value={selectedChannelKey}
                                onChange={(e) => setSelectedChannelKey(e.target.value as BrandChannelKey)}
                                className="bg-white border border-[#BDD4F2] rounded-lg px-2.5 py-1 text-xs font-bold text-[#004699] focus:outline-none focus:ring-2 focus:ring-[#005FFC] cursor-pointer disabled:opacity-50"
                            >
                                {evaluatedChannelOptions.map((ch) => (
                                    <option key={ch.key} value={ch.key}>
                                        {ch.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>




            {/* --- Content Area --- */}
            <div className={`flex-1 bg-gray-50 p-6 ${activeTab === 'CHAT' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
                <div className="max-w-7xl mx-auto">
                    {isBusy && (
                        <div className="mb-6 p-4 rounded-xl bg-[#EFF6FF] border border-[#0066FF]/30 flex items-center justify-between gap-4 shadow-sm animate-fadeIn">
                            <div className="flex items-center gap-3">
                                <Loader2 className="animate-spin text-[#0066FF] shrink-0" size={20} />
                                <div>
                                    <p className="text-sm font-bold text-[#003B7A]">
                                        {status || t('Ejecutando simulación y análisis con IA...', 'Running AI simulation and analysis...')}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        {t(
                                            'Los campos de edición, pestañas y selectores de audiencia están bloqueados temporalmente hasta finalizar el proceso.',
                                            'Editing fields, tabs, and audience selectors are temporarily locked until processing completes.'
                                        )}
                                    </p>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-md bg-white border border-blue-200 text-[11px] font-bold text-[#0066FF] shrink-0">
                                {t('Edición Bloqueada', 'Editing Locked')}
                            </span>
                        </div>
                    )}
                    {activeTab === 'ACQUISITION' && (
                        <div className={`space-y-6 ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                            {/* Acquisition Controls - Top */}
                            <div className="content-card flex flex-wrap justify-between items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-heading">{t('Simulación de Promociones y Captación', 'Acquisition Simulation')}</h3>
                                    <p className="text-sm text-subtext">{t(`Evalúa ofertas de captación con ${syntheticUsers.length} prospectos sintéticos.`, `Test offers against ${syntheticUsers.length} non-member prospects.`)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => setIsSyntheticUsersModalOpen(true)}
                                        title={t("Ver e inspeccionar la lista de participantes sintéticos activos", "View and inspect the list of active synthetic participants")}
                                        className="flex items-center gap-2 bg-[#EFF6FF] hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 text-xs font-bold text-[#003B7A] transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <span>{t(`👥 Ver / Inspeccionar Participantes Evaluados (${syntheticUsers.length})`, `👥 View / Inspect Evaluated Participants (${syntheticUsers.length})`)}</span>
                                    </button>
                                    <button
                                        onClick={() => refreshBriefData(true)}
                                        disabled={isBusy}
                                        className="btn-secondary flex items-center gap-2 text-xs font-bold"
                                        title={t("Recupera las promociones, mensajes clave, correos, estudios e imágenes generados en el último Brief de Marketing", "Loads the promotions, key messages, emails, studies, and images generated in the latest Marketing Brief")}
                                    >
                                        <RotateCcw size={16} />
                                        {t('Traer datos del último Brief', 'Load from latest Brief')}
                                    </button>
                                    <button
                                        onClick={handleRunAcquisition}
                                        disabled={isBusy || syntheticUsers.length === 0}
                                        className="btn-primary flex items-center gap-2"
                                        title={syntheticUsers.length === 0 ? t("Primero debes generar usuarios en la pestaña Usuarios Sintéticos.", "You must generate users in the Synthetic Users tab first.") : ""}
                                    >
                                        {isAcquisitionLoading ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" /> : <Play size={20} />}
                                        {t('Ejecutar Simulación', 'Run Simulation')}
                                    </button>
                                </div>
                            </div>

                            {/* Acquisition Config & Results */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left: Config */}
                                <div className="content-card">
                                    <h3 className="text-lg font-bold text-heading mb-4 flex items-center gap-2"><Zap size={20} className="text-yellow-500" /> {t('Promociones y Beneficios de Captación', 'Acquisition Offers')}</h3>
                                    <div className="space-y-4 mb-6">
                                        <div className="flex gap-2">
                                            <input
                                                disabled={isBusy}
                                                className="flex-1 border border-slate-200 bg-white text-heading rounded-xl px-3.5 py-2.5 text-sm placeholder-subtext outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all disabled:opacity-60"
                                                placeholder={t("ej. Toma a domicilio sin costo", "e.g. Free Home Blood Draw")}
                                                value={newOffer}
                                                onChange={e => setNewOffer(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && newOffer.trim()) {
                                                        e.preventDefault();
                                                        setAcquisitionOffers([...acquisitionOffers, newOffer.trim()]);
                                                        setNewOffer("");
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                disabled={isBusy || !newOffer.trim()}
                                                onClick={() => {
                                                    if (newOffer.trim()) {
                                                        setAcquisitionOffers([...acquisitionOffers, newOffer.trim()]);
                                                        setNewOffer("");
                                                    }
                                                }}
                                                className="bg-[#0066FF] hover:bg-[#004ECC] text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 shrink-0"
                                            >
                                                <Plus size={16} />
                                                {t('Agregar', 'Add')}
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {acquisitionOffers.map((o, i) => (
                                                <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-heading">
                                                    {editingOfferIndex === i ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                disabled={isBusy}
                                                                value={editingOfferText}
                                                                onChange={e => setEditingOfferText(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter' && editingOfferText.trim()) {
                                                                        const updated = [...acquisitionOffers];
                                                                        updated[i] = editingOfferText.trim();
                                                                        setAcquisitionOffers(updated);
                                                                        setEditingOfferIndex(null);
                                                                    }
                                                                }}
                                                                className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm font-medium text-[#003B7A] focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={isBusy}
                                                                    onClick={() => setEditingOfferIndex(null)}
                                                                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-100"
                                                                >
                                                                    {t('Cancelar', 'Cancel')}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isBusy || !editingOfferText.trim()}
                                                                    onClick={() => {
                                                                        const updated = [...acquisitionOffers];
                                                                        updated[i] = editingOfferText.trim();
                                                                        setAcquisitionOffers(updated);
                                                                        setEditingOfferIndex(null);
                                                                    }}
                                                                    className="px-3 py-1 rounded-md bg-[#0066FF] text-white text-xs font-bold hover:bg-[#004ECC]"
                                                                >
                                                                    {t('Guardar', 'Save')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="leading-snug flex-1">{o}</span>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    disabled={isBusy}
                                                                    onClick={() => {
                                                                        setEditingOfferIndex(i);
                                                                        setEditingOfferText(o);
                                                                    }}
                                                                    className="p-1 rounded text-slate-400 hover:text-[#0066FF] hover:bg-blue-50 transition-colors disabled:opacity-50"
                                                                    title={t('Editar Promoción', 'Edit Offer')}
                                                                >
                                                                    <Edit2 size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isBusy}
                                                                    onClick={() => setAcquisitionOffers(acquisitionOffers.filter((_, idx) => idx !== i))}
                                                                    className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                                    title={t('Eliminar Promoción', 'Delete Offer')}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Results */}
                                <div className="lg:col-span-2 space-y-6">
                                    {acqStats && (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="content-card text-center">
                                                <div className="text-4xl font-bold text-heading mb-1">{Math.round(acqStats.conversion)}%</div>
                                                <div className="text-xs font-bold text-subtext uppercase">{t('Tasa de Conversión', 'Conversion Rate')}</div>
                                            </div>
                                            <div className="content-card text-center relative group cursor-help">
                                                <div className="text-4xl font-bold text-heading mb-1">{Math.round(acqStats.avgValue)}</div>
                                                <div className="text-xs font-bold text-subtext uppercase flex items-center justify-center gap-1">
                                                    {t('Valor Percibido', 'Perceived Value')} <Info size={12} />
                                                </div>
                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-56 bg-heading text-white text-xs font-medium p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    {t('El valor promedio que la audiencia asigna a esta oferta según sus beneficios clínicos y utilidad.', 'The average monetary value the audience assigns to this offer based on psychological benefits and utility.')}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-heading"></div>
                                                </div>
                                            </div>
                                            <div className="content-card text-center">
                                                {acqStats.topOffer ? (
                                                    <>
                                                        <div className="text-lg font-bold text-[#0066FF] mb-1 truncate px-2" title={acqStats.topOffer[0]}>"{acqStats.topOffer[0]}"</div>
                                                        <div className="text-xs font-bold text-yellow-500 uppercase">{t('Oferta Ganadora', 'Winning Offer')}</div>
                                                    </>
                                                ) : <div className="text-subtext py-4">{t('Sin Datos', 'No Data')}</div>}
                                            </div>
                                        </div>
                                    )}

                                    {acquisitionResults.length > 0 && (
                                        <div className="content-card p-0 overflow-hidden shadow-xl border-blue-100">
                                            <div className="p-6 border-b border-gray-100 bg-white flex flex-wrap justify-between items-center gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 rounded-lg">
                                                        <MessageSquare className="text-[#0066FF]" size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-heading uppercase tracking-widest text-sm">{t('Retroalimentación de Prospectos', 'Prospect Feedback Loop')}</h3>
                                                        <p className="text-[10px] text-subtext font-bold">{t(`Análisis de sentimiento profundo de ${acquisitionResults.length} interacciones simuladas`, `In-depth sentiment analysis from ${acquisitionResults.length} simulated interactions`)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="badge badge-blue">{acquisitionResults.length} {t('participantes', 'participants')}</div>
                                                    {renderReportExportActions()}
                                                </div>
                                            </div>
                                            <div className="max-h-[600px] overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/30">
                                                {acquisitionResults.map((r, i) => (
                                                    <div key={i} className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                                                        <div className={`w-1.5 h-16 rounded-full flex-shrink-0 transition-colors ${r.likelihoodToJoin > 75 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : r.likelihoodToJoin > 45 ? 'bg-yellow-500' : 'bg-red-400'}`} />
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="font-black text-heading text-sm uppercase tracking-wider">{localizePersonaLabel(r.personaName, language)}</div>
                                                                    <div className="text-[10px] font-bold text-subtext opacity-60">{t('Prospecto Clínico', 'Clinical Prospect')}</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-lg font-black text-heading leading-none">{r.likelihoodToJoin}%</div>
                                                                    <div className="text-[8px] font-black text-subtext uppercase tracking-widest">{t('Probabilidad', 'Likelihood')}</div>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-heading italic font-medium leading-relaxed mb-4 border-l-2 border-gray-100 pl-3">"{r.feedback}"</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {r.barriers && r.barriers !== "None" && (
                                                                    <span className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black border border-red-100 flex items-center gap-1">
                                                                        <XCircle size={12} /> {r.barriers}
                                                                    </span>
                                                                )}
                                                                {r.winningOffer && r.winningOffer !== "None" && (
                                                                    <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-[10px] font-black border border-green-100 flex items-center gap-1 shadow-sm">
                                                                        <CheckCircle2 size={12} /> {t('Oferta elegida:', 'Won by:')} {r.winningOffer}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'CHAT' && (
                        <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <SyntheticChat channelKey={selectedChannelKey} />
                        </div>
                    )}

                    {/* SHARED CONTROLS FOR EMAIL, BRIEF, PURCHASE */}
                    {(activeTab === 'EMAIL' || activeTab === 'BRIEF' || activeTab === 'PURCHASE') && (
                        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap justify-between items-center gap-4 mb-6 ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                            <div className="">
                                <h3 className="text-lg font-black text-heading">
                                    {activeTab === 'EMAIL' ? t('Simulación de Campaña de Email', 'Email Campaign Simulation') :
                                        activeTab === 'BRIEF' ? t('Evaluación de Mensajes Clave de Campaña', 'Key Campaign Messages Evaluation') :
                                            t('Comportamiento de Compra y Mix de Estudios', 'Purchase Behavior & Product Mix')}
                                </h3>
                                <p className="text-sm text-subtext font-medium outline-none">
                                    {activeTab === 'BRIEF'
                                        ? t(`Evalúa el impacto y claridad de tus mensajes clave con ${syntheticUsers.length} usuarios sintéticos.`, `Evaluate the impact and clarity of your key messages with ${syntheticUsers.length} synthetic users.`)
                                        : activeTab === 'EMAIL'
                                            ? t(`Simula la tasa de apertura, clics (CTR) y opiniones de tus correos con ${syntheticUsers.length} usuarios sintéticos.`, `Simulate open rates, click-through rates (CTR), and feedback for your emails with ${syntheticUsers.length} synthetic users.`)
                                            : t('Descubre qué estudios clínicos agendaría cada perfil en sucursal o a domicilio.', 'Discover which clinical studies each persona would book at a branch or at home.')}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setIsSyntheticUsersModalOpen(true)}
                                    title={t("Ver e inspeccionar la lista de participantes sintéticos activos", "View and inspect the list of active synthetic participants")}
                                    className="flex items-center gap-2 bg-[#EFF6FF] hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 text-xs font-bold text-[#003B7A] transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <span>{t(`👥 Ver / Inspeccionar Participantes Evaluados (${syntheticUsers.length})`, `👥 View / Inspect Evaluated Participants (${syntheticUsers.length})`)}</span>
                                </button>
                                {activeTab === 'EMAIL' && (
                                    <button
                                        disabled={isBusy}
                                        onClick={() => setIsEmailEditorOpen(true)}
                                        className="btn-secondary flex items-center gap-2"
                                    >
                                        <Edit2 size={16} /> {t('Crear/Editar Emails', 'Create/Edit Emails')}
                                    </button>
                                )}
                                {activeTab === 'PURCHASE' && (
                                    <button
                                        disabled={isBusy}
                                        onClick={() => setShowProducts(true)}
                                        className="btn-secondary flex items-center gap-2"
                                    >
                                        <Edit2 size={16} /> {t('Crear/Editar Estudios', 'Create/Edit Products')}
                                    </button>
                                )}
                                <button
                                    onClick={() => refreshBriefData(true)}
                                    disabled={isBusy}
                                    className="btn-secondary flex items-center gap-2 text-xs font-bold"
                                    title={t("Recupera las promociones, mensajes clave, correos, estudios e imágenes generados en el último Brief de Marketing", "Loads the promotions, key messages, emails, studies, and images generated in the latest Marketing Brief")}
                                >
                                    <RotateCcw size={16} />
                                    {t('Traer datos del último Brief', 'Load from latest Brief')}
                                </button>
                                <button
                                    onClick={() => handleRunMemberSim()}
                                    disabled={isBusy || syntheticUsers.length === 0}
                                    title={syntheticUsers.length === 0 ? t("Primero debes generar usuarios en la pestaña Usuarios Sintéticos.", "You must generate users in the Synthetic Users tab first.") : ""}
                                    className="btn-primary px-6 py-3 flex items-center gap-2"
                                >
                                    {isMemberLoading ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" /> : <Play size={20} />}
                                    {t('Ejecutar Simulación', 'Run Simulation')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Email Editor Modal */}
                    {isEmailEditorOpen && activeTab === 'EMAIL' && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border border-slate-200">
                                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
                                    <div>
                                        <h3 className="font-bold text-xl text-[#003B7A] flex items-center gap-2">
                                            <Mail className="text-[#0066FF]" />
                                            {t('Editor de Campañas de Email (Banner Visual)', 'Visual Banner Email Campaign Editor')}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {t('Personaliza la imagen del banner, el titular no invasivo sobre la imagen y el mensaje corto de 2 a 3 líneas.', 'Customize the banner image, non-invasive overlay headline, and concise 2-3 line companion message.')}
                                        </p>
                                    </div>
                                    <button disabled={isBusy} onClick={() => setIsEmailEditorOpen(false)} className="text-subtext hover:text-heading transition-colors disabled:opacity-50"><X /></button>
                                </div>
                                <div className={`flex-1 overflow-y-auto p-6 bg-[#F8FAFC] ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                                    {editingEmailIndex !== null ? (
                                        <div className="space-y-5">
                                            {/* Live Visual Banner Preview + Image Upload */}
                                            <div>
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                    <label className="block text-xs font-bold text-[#003B7A] uppercase">
                                                        {t('Vista Previa en Vivo del Banner del Correo', 'Live Email Banner Preview')}
                                                    </label>
                                                    <div>
                                                        <input
                                                            ref={emailDraftImageInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleUploadEmailDraftImage}
                                                            className="hidden"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => emailDraftImageInputRef.current?.click()}
                                                            className="px-3.5 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-blue-100 text-[#0066FF] border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                                        >
                                                            <Upload size={14} />
                                                            {isUploadingEmailDraftImage
                                                                ? t('Subiendo imagen...', 'Uploading image...')
                                                                : t('Subir / Cambiar Imagen del Correo', 'Upload / Change Email Image')}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/9] max-h-64 w-full shadow-sm">
                                                    {editingEmailImage ? (
                                                        <img
                                                            src={editingEmailImage}
                                                            alt={editingEmailSubject}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 bg-gradient-to-br from-slate-100 to-blue-50/50">
                                                            <Image size={32} className="text-[#0066FF]/50" />
                                                            <span className="text-xs font-semibold text-slate-500">
                                                                {t('Haz clic en "Subir / Cambiar Imagen del Correo" para agregar tu arte o banner', 'Click "Upload / Change Email Image" to add your banner artwork')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#003B7A]/90 via-[#003B7A]/45 to-transparent p-4 flex flex-col justify-end">
                                                        <span className="bg-white/95 text-[#003B7A] text-[11px] font-bold px-2.5 py-0.5 rounded-full w-fit mb-1 shadow-sm">
                                                            {editingEmailBannerSubheadline || brief?.productName || 'Laboratorios Chopo'}
                                                        </span>
                                                        <h4 className="text-white font-bold text-base sm:text-lg leading-snug drop-shadow">
                                                            {editingEmailBannerHeadline || editingEmailSubject || t('Titular del Banner', 'Banner Headline')}
                                                        </h4>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                                                        {t('Asunto del Correo (Subject Line)', 'Email Subject Line')}
                                                    </label>
                                                    <input
                                                        disabled={isBusy}
                                                        value={editingEmailSubject}
                                                        onChange={e => setEditingEmailSubject(e.target.value)}
                                                        placeholder={t('ej. Tu salud no espera: agenda tu estudio hoy', 'e.g. Your health cannot wait: book your study today')}
                                                        className="w-full border border-slate-200 bg-white rounded-lg p-2.5 text-sm font-bold text-[#003B7A] focus:ring-2 focus:ring-[#0066FF] shadow-sm outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                                                        {t('Subtítulo / Cintillo del Banner', 'Banner Subheadline / Pill Badge')}
                                                    </label>
                                                    <input
                                                        disabled={isBusy}
                                                        value={editingEmailBannerSubheadline}
                                                        onChange={e => setEditingEmailBannerSubheadline(e.target.value)}
                                                        placeholder={t('ej. Precio Especial en Línea • App Chopo', 'e.g. Online Special Price • Chopo App')}
                                                        className="w-full border border-slate-200 bg-white rounded-lg p-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-[#0066FF] shadow-sm outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                                                    {t('Titular en el Banner (Texto corto no invasivo sobre la imagen)', 'Banner Headline (Short non-invasive overlay text on image)')}
                                                </label>
                                                <input
                                                    disabled={isBusy}
                                                    value={editingEmailBannerHeadline}
                                                    onChange={e => setEditingEmailBannerHeadline(e.target.value)}
                                                    placeholder={t('ej. Tranquilidad y precisión diagnóstica en tus manos', 'e.g. Peace of mind and diagnostic precision in your hands')}
                                                    className="w-full border border-slate-200 bg-white rounded-lg p-2.5 text-sm font-bold text-[#003B7A] focus:ring-2 focus:ring-[#0066FF] shadow-sm outline-none transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                                                    {t('Mensaje Corto de Acompañamiento (2 a 3 líneas)', 'Short Companion Copy (2 to 3 lines)')}
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    disabled={isBusy}
                                                    value={editingEmailBody}
                                                    onChange={e => setEditingEmailBody(e.target.value)}
                                                    placeholder={t('Mensaje breve, empático y directo que invita a agendar en chopo.com.mx o App Chopo...', 'Short, empathetic message inviting the user to book on chopo.com.mx or Chopo App...')}
                                                    className="w-full border border-slate-200 bg-white rounded-lg p-3 text-sm leading-relaxed focus:ring-2 focus:ring-[#0066FF] shadow-sm outline-none resize-none text-slate-800 transition-all"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => setEditingEmailIndex(null)}
                                                    className="btn-secondary"
                                                >
                                                    {t('Cancelar', 'Cancel')}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isBusy || !editingEmailSubject.trim()}
                                                    onClick={() => {
                                                        const updated = [...emailDrafts];
                                                        const prev = updated[editingEmailIndex] || { subject: '', body: '' };
                                                        updated[editingEmailIndex] = {
                                                            ...prev,
                                                            subject: editingEmailSubject.trim(),
                                                            bannerHeadline: editingEmailBannerHeadline.trim() || editingEmailSubject.trim(),
                                                            bannerSubheadline: editingEmailBannerSubheadline.trim() || brief?.productName || 'Laboratorios Chopo',
                                                            body: editingEmailBody.trim(),
                                                            image: editingEmailImage || prev.image || activeCreativeAssets?.image || undefined,
                                                            ctaText: prev.ctaText || 'Agendar Estudio en Línea',
                                                            legalFooter: prev.legalFooter || 'Consulte a su médico. Permiso de Publicidad COFEPRIS No. 2609152002A00518.'
                                                        };
                                                        updateEmailDrafts(updated);
                                                        setEditingEmailIndex(null);
                                                    }}
                                                    className="btn-primary flex items-center gap-2"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    {t('Guardar Cambios', 'Save Changes')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            {emailDrafts.length === 0 && (
                                                <div className="text-center py-10">
                                                    <p className="text-slate-500 mb-4">{t('Aún no hay borradores.', 'No drafts yet.')}</p>
                                                    <button
                                                        onClick={async () => {
                                                            setIsGeneratingEmails(true);
                                                            try {
                                                                const { generateEmailBodies } = await import('../services/geminiService');
                                                                const bodies = await generateEmailBodies(EMAIL_HEADLINES, brief!);
                                                                const campaigns: EmailDraftItem[] = EMAIL_HEADLINES.map(h => ({
                                                                    subject: h,
                                                                    bannerHeadline: h,
                                                                    bannerSubheadline: brief?.productName || 'Laboratorios Chopo',
                                                                    body: bodies[h] || "Loading...",
                                                                    image: activeCreativeAssets?.image || undefined,
                                                                    ctaText: 'Agendar Estudio en Línea'
                                                                }));
                                                                updateEmailDrafts(campaigns);
                                                            } catch (e) {
                                                                console.error(e);
                                                                alert(t("Error al generar los correos.", "Failed to generate emails."));
                                                            } finally {
                                                                setIsGeneratingEmails(false);
                                                            }
                                                        }}
                                                        disabled={isBusy}
                                                        className="text-[#0066FF] font-bold underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center hover:opacity-80 transition-opacity mx-auto"
                                                    >
                                                        {isGeneratingEmails ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0066FF] border-t-transparent" />
                                                                {t('Generando...', 'Generating...')}
                                                            </>
                                                        ) : (
                                                            t("Generar Borradores Base", "Generate Defaults")
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                            {emailDrafts.map((draft, i) => {
                                                const bannerImg = draft.image || activeCreativeAssets?.image;
                                                return (
                                                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-[#0066FF] transition-all">
                                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                                            <div className="w-28 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative">
                                                                {bannerImg ? (
                                                                    <img src={bannerImg} alt={draft.subject} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                        <Image size={18} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold text-[#003B7A] text-sm truncate">{draft.subject}</div>
                                                                <div className="text-[11px] font-semibold text-[#0066FF] truncate mt-0.5">
                                                                    {t('Banner:', 'Banner:')} {draft.bannerHeadline || draft.subject}
                                                                </div>
                                                                <div className="text-xs text-subtext line-clamp-1 mt-0.5">{draft.body}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={isBusy}
                                                                onClick={() => openEmailEditorForDraft(i, draft)}
                                                                className="px-3 py-1.5 bg-[#EFF6FF] hover:bg-blue-100 rounded-lg text-[#0066FF] text-xs font-bold flex items-center gap-1.5 transition-colors"
                                                            >
                                                                <Edit2 size={14} />
                                                                {t('Editar / Imagen', 'Edit / Image')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isBusy}
                                                                onClick={() => updateEmailDrafts(emailDrafts.filter((_, idx) => idx !== i))}
                                                                className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => {
                                                    const defaultSubj = t("Nueva Campaña de Email", "New Email Campaign");
                                                    const defaultHeadline = brief?.productName || t("Prevención y precisión diagnóstica en tus manos", "Prevention and diagnostic precision in your hands");
                                                    const defaultSubhead = brief?.productName || "Laboratorios Chopo";
                                                    const defaultBody = t("Agenda tu estudio en línea en chopo.com.mx o desde la App Chopo con precio especial y consulta tus resultados digitales.", "Schedule your study online at chopo.com.mx or in the Chopo App with special online pricing and digital results.");
                                                    const newDraft: EmailDraftItem = {
                                                        subject: defaultSubj,
                                                        bannerHeadline: defaultHeadline,
                                                        bannerSubheadline: defaultSubhead,
                                                        body: defaultBody,
                                                        image: activeCreativeAssets?.image || undefined,
                                                        ctaText: 'Agendar Estudio en Línea'
                                                    };
                                                    const newIdx = emailDrafts.length;
                                                    updateEmailDrafts([...emailDrafts, newDraft]);
                                                    openEmailEditorForDraft(newIdx, newDraft);
                                                }}
                                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-subtext font-bold hover:border-[#0066FF]/50 hover:text-heading transition-colors flex items-center justify-center gap-2 bg-white"
                                            >
                                                <Plus size={20} /> {t('Agregar Nuevo Correo con Banner', 'Add New Visual Banner Email')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                                    <button
                                        disabled={isBusy}
                                        onClick={() => setIsEmailEditorOpen(false)}
                                        className="btn-secondary disabled:opacity-50"
                                    >
                                        {t('Cerrar', 'Close')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEmailEditorOpen(false);
                                            handleRunMemberSim();
                                        }}
                                        disabled={isBusy || emailDrafts.length === 0}
                                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Play size={18} /> {t(`Evaluar ${emailDrafts.length} Correos`, `Run Test with ${emailDrafts.length} Emails`)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'EMAIL' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Active Email Drafts Preview & Quick Edit/Delete */}
                            <div className={`content-card ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h3 className="font-bold text-[#003B7A] flex items-center gap-2">
                                            <Mail size={18} className="text-[#0066FF]" />
                                            {t('Correos a Evaluar en la Simulación (Formato Banner Visual)', 'Visual Banner Emails Queued for Simulation')} ({emailDrafts.length})
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {t('Cada correo combina una imagen con titular corto no invasivo + mensaje de 2 a 3 líneas. Puedes subir/cambiar la imagen, editar o eliminar cualquier correo.', 'Each email combines a banner image with a short non-invasive headline + 2-3 line message. You can upload/change the image, edit, or delete any email.')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => {
                                            const defaultSubj = t("Nueva Campaña de Email", "New Email Campaign");
                                            const defaultHeadline = brief?.productName || t("Prevención y precisión diagnóstica en tus manos", "Prevention and diagnostic precision in your hands");
                                            const defaultSubhead = brief?.productName || "Laboratorios Chopo";
                                            const defaultBody = t("Agenda tu estudio en línea en chopo.com.mx o desde la App Chopo con precio especial y consulta tus resultados digitales.", "Schedule your study online at chopo.com.mx or in the Chopo App with special online pricing and digital results.");
                                            const newDraft: EmailDraftItem = {
                                                subject: defaultSubj,
                                                bannerHeadline: defaultHeadline,
                                                bannerSubheadline: defaultSubhead,
                                                body: defaultBody,
                                                image: activeCreativeAssets?.image || undefined,
                                                ctaText: 'Agendar Estudio en Línea'
                                            };
                                            const newIndex = emailDrafts.length;
                                            updateEmailDrafts([...emailDrafts, newDraft]);
                                            openEmailEditorForDraft(newIndex, newDraft);
                                        }}
                                        className="px-3.5 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#004ECC] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                                    >
                                        <Plus size={14} />
                                        {t('Agregar Correo', 'Add Email')}
                                    </button>
                                </div>

                                {emailDrafts.length === 0 ? (
                                    <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                                        {t('No hay correos cargados. Haz clic en "Sincronizar con Brief" o en "Agregar Correo" para configurar tus campañas.', 'No emails loaded. Click "Sync with Brief" or "Add Email" to configure your campaigns.')}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {emailDrafts.map((draft, i) => {
                                            const bannerImage = draft.image || activeCreativeAssets?.image;
                                            const cleanBody = (draft.body || '').replace(/\s*Incluye pie legal:[\s\S]*$/i, '').trim();
                                            return (
                                                <div key={i} className="rounded-xl bg-white border border-slate-200 hover:border-[#0066FF]/60 shadow-sm overflow-hidden transition-all flex flex-col justify-between">
                                                    {/* Visual Banner Preview */}
                                                    <div className="relative aspect-[16/9] bg-slate-100 border-b border-slate-100 overflow-hidden group">
                                                        {bannerImage ? (
                                                            <img
                                                                src={bannerImage}
                                                                alt={draft.subject}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 bg-gradient-to-br from-slate-100 to-blue-50/40">
                                                                <Image size={24} className="text-[#0066FF]/50" />
                                                                <span className="text-[11px] font-medium">{t('Sin imagen de banner', 'No banner image')}</span>
                                                            </div>
                                                        )}

                                                        {/* Quick Upload / Edit Image Button on Banner */}
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => openEmailEditorForDraft(i, draft)}
                                                            className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-lg bg-white/95 hover:bg-white text-[#003B7A] border border-slate-200 text-[11px] font-bold shadow-sm flex items-center gap-1 transition-all"
                                                        >
                                                            <Upload size={12} className="text-[#0066FF]" />
                                                            {t('Imagen / Editar', 'Image / Edit')}
                                                        </button>

                                                        {/* Non-invasive overlay headline */}
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#003B7A]/90 via-[#003B7A]/45 to-transparent p-3.5 flex flex-col justify-end">
                                                            <span className="bg-white/95 text-[#003B7A] text-[10px] font-bold px-2 py-0.5 rounded-full w-fit mb-1 shadow-sm">
                                                                {draft.bannerSubheadline || brief?.productName || 'Laboratorios Chopo'}
                                                            </span>
                                                            <div className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow">
                                                                {draft.bannerHeadline || draft.subject}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Subject + Short Companion Copy + Actions */}
                                                    <div className="p-3.5 flex items-start justify-between gap-3 bg-[#F8FAFC] flex-1">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">
                                                                {t('Asunto:', 'Subject:')}
                                                            </div>
                                                            <div className="text-sm font-bold text-[#003B7A] truncate" title={draft.subject}>
                                                                {draft.subject}
                                                            </div>
                                                            <p className="text-xs text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
                                                                {cleanBody}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={isBusy}
                                                                onClick={() => openEmailEditorForDraft(i, draft)}
                                                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 transition-colors"
                                                                title={t('Editar Correo e Imagen', 'Edit Email & Image')}
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isBusy}
                                                                onClick={() => updateEmailDrafts(emailDrafts.filter((_, idx) => idx !== i))}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                title={t('Eliminar Correo', 'Delete Email')}
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Email Performance Analytics */}
                            <div className="content-card">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <h3 className="font-bold text-heading flex items-center gap-2">
                                        <Mail size={18} className="text-[#0066FF]" /> {t('Desempeño de Campaña de Email', 'Campaign Performance')}
                                    </h3>
                                    {emailStats.length > 0 && renderReportExportActions()}
                                </div>
                                <div className="space-y-4 h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {emailStats.length > 0 ? emailStats.map((stat, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedEmailStats(selectedEmailStats?.subject === stat.subject ? null : stat)}
                                            className="group border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer bg-white hover:border-[#0066FF]"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="font-bold text-heading group-hover:text-[#0066FF] transition-colors line-clamp-1">
                                                    {stat.subject}
                                                </div>
                                                <ChevronDown size={16} className={`text-subtext transform transition-transform ${selectedEmailStats?.subject === stat.subject ? 'rotate-180' : ''}`} />
                                            </div>

                                            {/* Stats Bars */}
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1.5">
                                                        <span className="font-medium text-subtext uppercase tracking-wider">{t('Tasa de Apertura', 'Open Rate')}</span>
                                                        <span className="font-bold text-heading">{stat.openRate}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                                        <div className="h-full bg-[#0066FF] rounded-full transition-all duration-500" style={{ width: `${stat.openRate}%` }} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1.5">
                                                        <span className="font-medium text-subtext uppercase tracking-wider">{t('Tasa de Clics (CTR)', 'Click-Through Rate')}</span>
                                                        <span className="font-bold text-green-600">{stat.clickRate}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                                        <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${stat.clickRate}%` }} />
                                                    </div>
                                                </div>
                                            </div>


                                            {/* Audience Breakdown */}
                                            {selectedEmailStats?.subject === stat.subject && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn cursor-default" onClick={(e) => e.stopPropagation()}>
                                                    {/* Visual Banner Email Preview inside Performance Breakdown */}
                                                    <div className="mb-5 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm max-w-xl mx-auto">
                                                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs text-slate-600 flex justify-between items-center">
                                                            <span className="font-bold text-[#003B7A]">{t('Vista Previa del Correo Evaluado', 'Evaluated Email Preview')}</span>
                                                            <span className="text-[11px] text-slate-400">{brandConfig.companyName}</span>
                                                        </div>
                                                        <div className="p-4">
                                                            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/9] mb-3.5">
                                                                {stat.image ? (
                                                                    <img src={stat.image} alt={stat.subject} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gradient-to-br from-slate-100 to-blue-50/40">
                                                                        <Image size={28} className="text-[#0066FF]/40" />
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#003B7A]/90 via-[#003B7A]/45 to-transparent p-3.5 flex flex-col justify-end">
                                                                    <span className="bg-white/95 text-[#003B7A] text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit mb-1 shadow-sm">
                                                                        {stat.bannerSubheadline || brief?.productName || 'Laboratorios Chopo'}
                                                                    </span>
                                                                    <h5 className="text-white font-bold text-sm sm:text-base leading-snug drop-shadow">
                                                                        {stat.bannerHeadline || stat.subject}
                                                                    </h5>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">
                                                                {stat.body}
                                                            </p>
                                                            <div className="w-full py-2 rounded-full bg-[#0066FF] text-white text-center text-xs font-bold">
                                                                {stat.ctaText || t('Agendar Estudio en Línea', 'Book Lab Study Online')}
                                                            </div>
                                                            {stat.legalFooter && (
                                                                <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 mt-3">
                                                                    {stat.legalFooter}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <h4 className="text-xs font-bold text-heading uppercase mb-3 tracking-wider">{t('Resultados por Perfil', 'Audience Insights')}</h4>
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {Object.entries(memberResults.reduce((acc, r) => {
                                                                const engage = r.emailEngagement.find(e => e.subjectLine === stat.subject);
                                                                if (!engage) return acc;
                                                                const groupName = r.personaName;
                                                                if (!acc[groupName]) acc[groupName] = { sent: 0, opened: 0, clicked: 0, feedback: [] };
                                                                acc[groupName].sent++;
                                                                if (engage.opened) acc[groupName].opened++;
                                                                if (engage.clicked) acc[groupName].clicked++;
                                                                const specificFeedback =
                                                                    engage.feedback ||
                                                                    (engage.clicked
                                                                        ? r.briefMetrics?.feedback
                                                                        : (r.briefMetrics?.negativeFeedback || r.briefMetrics?.feedback));
                                                                if (specificFeedback && !acc[groupName].feedback.some(f => f.text === specificFeedback)) {
                                                                    acc[groupName].feedback.push({
                                                                        text: specificFeedback,
                                                                        clicked: engage.clicked,
                                                                        opened: engage.opened
                                                                    });
                                                                }
                                                                return acc;
                                                            }, {} as Record<string, { sent: number, opened: number, clicked: number, feedback: { text: string; clicked: boolean; opened: boolean }[] }>)).map(([name, s], idx) => (
                                                                <div key={idx} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                                                                    <div className="font-bold text-heading mb-3 border-b border-gray-50 pb-2">{localizePersonaLabel(name, language)}</div>
                                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                                        <div>
                                                                            <div className="text-[10px] text-subtext uppercase font-bold tracking-tight">{t('Tasa de Apertura', 'Open Rate')}</div>
                                                                            <div className="text-lg font-bold text-heading">{Math.round((s.opened / s.sent) * 100)}%</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[10px] text-subtext uppercase font-bold tracking-tight">{t('Tasa de Clics (CTR)', 'Click-Through Rate')}</div>
                                                                            <div className={`text-lg font-bold ${s.clicked > 0 ? 'text-green-600' : 'text-subtext'}`}>{Math.round((s.clicked / s.sent) * 100)}%</div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Feedback snippets */}
                                                                    <div className="space-y-2">
                                                                        {s.feedback.length > 0 ? (
                                                                            s.feedback.map((f, fIdx) => (
                                                                                <div
                                                                                    key={fIdx}
                                                                                    className={`flex gap-2 items-start p-2.5 rounded-lg border ${
                                                                                        f.clicked
                                                                                            ? 'bg-green-50 border-green-100'
                                                                                            : f.opened
                                                                                                ? 'bg-[#EFF6FF] border-blue-200'
                                                                                                : 'bg-red-50 border-red-100'
                                                                                    }`}
                                                                                >
                                                                                    <div
                                                                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 shadow-sm shrink-0 text-white ${
                                                                                            f.clicked
                                                                                                ? 'bg-green-600'
                                                                                                : f.opened
                                                                                                    ? 'bg-[#0066FF]'
                                                                                                    : 'bg-red-500'
                                                                                        }`}
                                                                                    >
                                                                                        {f.clicked ? t('CLIC', 'CLICK') : f.opened ? t('ABIERTO', 'OPENED') : t('OMITIDO', 'SKIPPED')}
                                                                                    </div>
                                                                                    <span
                                                                                        className={`text-xs italic leading-relaxed ${
                                                                                            f.clicked
                                                                                                ? 'text-green-800'
                                                                                                : f.opened
                                                                                                    ? 'text-[#003B7A]'
                                                                                                    : 'text-red-800'
                                                                                        }`}
                                                                                    >
                                                                                        "{f.text}"
                                                                                    </span>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="text-xs text-slate-400 italic">
                                                                                {t('Sin comentario específico.', 'No specific feedback recorded.')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="text-subtext italic text-sm text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                            {t('Ejecuta la simulación para ver las métricas de desempeño de email.', 'Run simulation to see email performance metrics.')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                    {activeTab === 'BRIEF' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Export Action Bar for Key Messages Results */}
                            {memberResults.length > 0 && (
                                <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
                                    <span className="text-xs font-bold text-[#003B7A] uppercase tracking-wider">
                                        Resultados de Evaluación de Mensajes Clave ({memberResults.length} participantes)
                                    </span>
                                    {renderReportExportActions()}
                                </div>
                            )}

                            {/* Score Cards - MOVED TO TOP */}
                            {memberResults.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                                    {(() => {
                                        const interest = memberResults.reduce((a, b) => a + b.briefMetrics.interestScore, 0) / memberResults.length;
                                        return (
                                            <div className="content-card text-center relative group cursor-help p-6 border-t-4 border-[#0066FF]">
                                                <div className="text-5xl font-bold text-heading mb-2">{Math.round(interest)}</div>
                                                <div className="text-xs font-bold text-subtext uppercase tracking-widest">{t('Nivel de Interés', 'Interest Score')}</div>
                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-gray-900 text-white text-xs font-medium p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    {t('Mide qué tan atractivo e interesante resulta el brief para la audiencia objetivo.', 'Measures how engaging and appealing the brief is to the target audience.')}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                    {(() => {
                                        const clarity = memberResults.reduce((a, b) => a + b.briefMetrics.clarityScore, 0) / memberResults.length;
                                        return (
                                            <div className="content-card text-center relative group cursor-help p-6 border-t-4 border-green-500">
                                                <div className="text-5xl font-bold text-green-500 mb-2">{Math.round(clarity)}</div>
                                                <div className="text-xs font-bold text-subtext uppercase tracking-widest">{t('Claridad del Mensaje', 'Clarity Score')}</div>
                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-gray-900 text-white text-xs font-medium p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    {t('Evalúa qué tan fácil se comprende el mensaje principal por parte de la audiencia.', 'Evaluates how easily the key message is understood by the audience.')}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                    {(() => {
                                        const rel = memberResults.reduce((a, b) => a + b.briefMetrics.relevanceScore, 0) / memberResults.length;
                                        return (
                                            <div className="content-card text-center relative group cursor-help p-6 border-t-4 border-red-500">
                                                <div className="text-5xl font-bold text-red-500 mb-2">{Math.round(rel)}</div>
                                                <div className="text-xs font-bold text-subtext uppercase tracking-widest">{t('Relevancia Clínica', 'Relevance Score')}</div>
                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-gray-900 text-white text-xs font-medium p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    {t('Evalúa qué tan bien responde el brief a las necesidades clínicas y puntos de dolor del perfil.', "Assess how well the brief addresses the audience's specific needs and pain points.")}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            )}

                            {/* Key Messages Config */}
                            <div className={`content-card ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                    <div className="text-sm font-bold text-[#003B7A] flex items-center gap-2">
                                        <MessageCircle size={18} className="text-[#0066FF]" />
                                        {t('Mensajes Clave de Campaña (Evaluados en Simulación)', 'Key Marketing Messages (Tested in Simulation)')} ({marketingMessages.length})
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {t('Sincronizados del Brief. Puedes editar, eliminar o agregar mensajes.', 'Synced from Brief. You can edit, delete, or add messages.')}
                                    </span>
                                </div>
                                <div className="space-y-2 mb-4">
                                    {marketingMessages.map((msg, i) => (
                                        <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-heading">
                                            {editingMessageIndex === i ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        disabled={isBusy}
                                                        value={editingMessageText}
                                                        onChange={e => setEditingMessageText(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && editingMessageText.trim()) {
                                                                const updated = [...marketingMessages];
                                                                updated[i] = editingMessageText.trim();
                                                                setMarketingMessages(updated);
                                                                setEditingMessageIndex(null);
                                                            }
                                                        }}
                                                        className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm font-medium text-[#003B7A] focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => setEditingMessageIndex(null)}
                                                            className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-100"
                                                        >
                                                            {t('Cancelar', 'Cancel')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy || !editingMessageText.trim()}
                                                            onClick={() => {
                                                                const updated = [...marketingMessages];
                                                                updated[i] = editingMessageText.trim();
                                                                setMarketingMessages(updated);
                                                                setEditingMessageIndex(null);
                                                            }}
                                                            className="px-3 py-1 rounded-md bg-[#0066FF] text-white text-xs font-bold hover:bg-[#004ECC]"
                                                        >
                                                            {t('Guardar', 'Save')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-start justify-between gap-3">
                                                    <span className="leading-snug flex-1">{msg}</span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => {
                                                                setEditingMessageIndex(i);
                                                                setEditingMessageText(msg);
                                                            }}
                                                            className="p-1 rounded text-slate-400 hover:text-[#0066FF] hover:bg-blue-50 transition-colors disabled:opacity-50"
                                                            title={t('Editar Mensaje', 'Edit Message')}
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => setMarketingMessages(marketingMessages.filter((_, idx) => idx !== i))}
                                                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                            title={t('Eliminar Mensaje', 'Delete Message')}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        disabled={isBusy}
                                        className="flex-1 text-sm px-3.5 py-2 border border-slate-200 bg-white text-heading rounded-xl outline-none focus:ring-2 focus:ring-[#0066FF] transition-all disabled:opacity-60"
                                        placeholder={t('Agregar nuevo mensaje clave...', 'Add new key message...')}
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && newMessage.trim()) {
                                                e.preventDefault();
                                                setMarketingMessages([...marketingMessages, newMessage.trim()]);
                                                setNewMessage("");
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        disabled={isBusy || !newMessage.trim()}
                                        onClick={() => {
                                            if (newMessage.trim()) {
                                                setMarketingMessages([...marketingMessages, newMessage.trim()]);
                                                setNewMessage("");
                                            }
                                        }}
                                        className="bg-[#0066FF] hover:bg-[#004ECC] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                                    >
                                        <Plus size={15} />
                                        {t('Agregar', 'Add')}
                                    </button>
                                </div>
                            </div>

                            {/* Detailed Feedback */}
                            {memberResults.length > 0 && (
                                <div className="content-card max-h-[600px] overflow-y-auto custom-scrollbar">
                                    <h3 className="font-bold text-heading mb-4">{t('Comentarios Detallados por Perfil', 'Detailed Feedback')}</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {memberResults.slice(0, 50).map((r, i) => (
                                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                <div className="flex justify-between font-bold text-sm mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-heading">{localizePersonaLabel(r.personaName, language)}</span>
                                                        <span className="text-[10px] text-subtext font-black uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                            {(() => {
                                                                const user = syntheticUsers.find(u => r.personaId.includes(u.id)) || 
                                                                             syntheticUsers.find(u => u.name === r.personaName);
                                                                return localizePersonaLabel(user?.baseAudienceName, language) || t('Audiencia Estándar', 'Standard Audience');
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <span className="text-[#0066FF] flex items-center gap-1">{t('Interés', 'Interest')}: {r.briefMetrics.interestScore}/10</span>
                                                </div>
                                                <div className="text-sm text-subtext leading-relaxed">"{r.briefMetrics.feedback}"</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'PURCHASE' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
                            {/* Products Preview */}
                            <div className="content-card">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-heading flex items-center gap-2">
                                        <ShoppingCart size={18} className="text-[#0066FF]" /> {t('Catálogo de Estudios a Evaluar', 'Target Diagnostic Studies')}
                                    </h3>
                                    <button disabled={isBusy} onClick={() => setShowProducts(true)} className="text-xs font-bold text-[#0066FF] hover:opacity-80 transition-opacity uppercase tracking-wider disabled:opacity-50">
                                        {t('Ver Todos / Editar', 'View All / Edit')} ({simulationProducts.length})
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                                    {simulationProducts.map((p, i) => {
                                        const parsed = parseSimulationProduct(p);
                                        const badgeClass =
                                            parsed.modality === 'Disponible solo en Sucursal'
                                                ? 'bg-indigo-50 text-[#003B7A] border-indigo-100'
                                                : parsed.modality === 'Disponible solo a Domicilio'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-[#EFF6FF] text-[#0066FF] border-blue-100';
                                        const badgeLabel =
                                            parsed.modality === 'Disponible solo en Sucursal'
                                                ? t('Disponible solo en Sucursal', 'Branch Only')
                                                : parsed.modality === 'Disponible solo a Domicilio'
                                                    ? t('Disponible solo a Domicilio', 'Home Draw Only')
                                                    : t('Disponible en Sucursal y Domicilio', 'Branch & Home Service');
                                        return (
                                            <div key={i} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-gray-100 text-[#0066FF] shadow-sm shrink-0">
                                                        <ShoppingCart size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                                        <div className="text-sm font-bold text-heading truncate" title={parsed.title}>{parsed.title}</div>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeClass}`}>
                                                                {badgeLabel}
                                                            </span>
                                                            {parsed.description && (
                                                                <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={parsed.description}>
                                                                    • {parsed.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => {
                                                            setEditingProductIndex(i);
                                                            setEditingProductTitle(parsed.title);
                                                            setEditingProductDescription(parsed.description);
                                                            setEditingProductModality(parsed.modality);
                                                            setShowProducts(true);
                                                        }}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0066FF] hover:bg-blue-50 transition-colors"
                                                        title={t('Editar Estudio', 'Edit Study')}
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => setSimulationProducts(simulationProducts.filter((_, idx) => idx !== i))}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title={t('Eliminar Estudio', 'Remove Study')}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Products Purchased Summary */}
                            <div className="content-card">
                                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                                    <h3 className="font-bold text-heading flex items-center gap-2">
                                        <ShoppingBag size={18} className="text-green-500" /> {t('Resumen de Estudios Seleccionados', 'Purchased Summary')}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {purchasedStats.length > 0 && <span className="badge badge-green">{memberResults.reduce((acc, r) => acc + r.cart.filter(c => c.purchased).length, 0)} {t('Estudios Agendados', 'Total Bookings')}</span>}
                                        {memberResults.length > 0 && renderReportExportActions()}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {purchasedStats.length > 0 ? purchasedStats.map(([product, count], i) => (
                                        <div key={i} className="flex gap-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 font-bold text-xs border border-green-100 shadow-sm">
                                                {count}x
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="text-sm font-bold text-heading truncate" title={product}>{product.split(':')[0].replace(/\s*\[.*?\]\s*/g, '').trim()}</div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-subtext italic text-sm text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                            {t('Ejecuta la simulación para ver la intención de compra de estudios.', 'Run simulation to see purchase data.')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'PURCHASE' && memberResults.length > 0 && (
                        <div className="mt-8 space-y-6 animate-fadeIn">
                            <h3 className="text-xl font-bold text-heading flex items-center gap-2">
                                <Users size={24} className="text-[#0066FF]" /> {t('Insights por Perfil y Oportunidades de Crecimiento', 'Audience Insights & Growth Opportunities')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(memberResults.reduce((acc, r) => {
                                    // Group by Persona
                                    if (!acc[r.personaName]) acc[r.personaName] = [];
                                    acc[r.personaName].push(r);
                                    return acc;
                                }, {} as Record<string, typeof memberResults>)).map(([personaName, results], i) => {
                                    const purchasedItems = results.flatMap(r => r.cart.filter(c => c.purchased));
                                    const notPurchasedItems = results.flatMap(r => r.cart.filter(c => !c.purchased).map(c => ({ ...c, originalResult: r })));

                                    // Calculate top product
                                    const productCounts = purchasedItems.reduce((acc, item) => {
                                        acc[item.productName] = (acc[item.productName] || 0) + 1;
                                        return acc;
                                    }, {} as Record<string, number>);
                                    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

                                    // Get a random "Why I bought"
                                    const positiveReason = purchasedItems.find(p => p.reason && p.reason.length > 5)?.reason;
                                    // Get a "Barrier" from negative feedback or non-purchase reason
                                    const barrier = results.find(r => r.briefMetrics.negativeFeedback)?.briefMetrics.negativeFeedback;

                                    return (
                                        <div key={i} className="content-card p-0 overflow-hidden flex flex-col bg-white">
                                            <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                                                <h4 className="font-bold text-[#0066FF]">{localizePersonaLabel(personaName, language)}</h4>
                                                <span className="badge badge-blue">
                                                    {purchasedItems.length} {t('Agendamientos', 'Purchases')}
                                                </span>
                                            </div>

                                            <div className="p-4 flex-1 space-y-4">
                                                {/* Top Product */}
                                                <div>
                                                    <div className="text-xs font-bold text-subtext uppercase mb-1 tracking-wider">{t('Estudio Más Solicitado', 'Top Choice')}</div>
                                                    <div className="font-bold text-heading text-sm">
                                                        {topProduct ? `${topProduct[0]} (${topProduct[1]}x)` : <span className="text-subtext italic">{t('Sin estudios seleccionados aún', 'No purchases yet')}</span>}
                                                    </div>
                                                </div>

                                                {/* Why They Buy */}
                                                {positiveReason && (
                                                    <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                                        <div className="text-xs font-bold text-green-700 uppercase mb-1.5 flex items-center gap-1"><CheckCircle2 size={12} /> {t('Motivo de Elección', 'Why They Buy')}</div>
                                                        <p className="text-xs text-green-800 italic leading-relaxed">"{positiveReason}"</p>
                                                    </div>
                                                )}

                                                {/* Barrier / Missed Opp */}
                                                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                                    <div className="text-xs font-bold text-red-700 uppercase mb-1.5 flex items-center gap-1"><XCircle size={12} /> {t('Barrera / Oportunidad de Mejora', 'Growth Opportunity')}</div>
                                                    <p className="text-xs text-red-800 leading-relaxed italic">
                                                        {barrier || t("Aumenta la relevancia clínica del mensaje para activar este segmento.", "Increase brief relevance to unlock this segment.")}
                                                    </p>
                                                </div>

                                                {/* Potential Upsell - Random non-purchased item with reason */}
                                                {notPurchasedItems.length > 0 && notPurchasedItems[0].reason && (
                                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
                                                        <div className="text-[10px] font-bold text-subtext uppercase mb-1 tracking-tight">{t('Estudio Descartado:', 'Missed Sale:')} {notPurchasedItems[0].productName}</div>
                                                        <div className="text-[11px] text-subtext italic leading-snug">"{notPurchasedItems[0].reason}"</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'CREATIVE' && (
                        <div className={`space-y-6 ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                            {/* Creative Controls */}
                            <div className="content-card flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-[#003B7A]">{t('Evaluación de Banners y Materiales Visuales', 'Campaign Images Focus Group')}</h3>
                                    <p className="text-sm text-subtext">{t(`Evalúa materiales visuales generados o subidos manualmente con ${syntheticUsers.length} usuarios sintéticos.`, `Test generated or custom uploaded assets against ${syntheticUsers.length} synthetic users.`)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => setIsSyntheticUsersModalOpen(true)}
                                        title={t("Ver e inspeccionar la lista de participantes sintéticos activos", "View and inspect the list of active synthetic participants")}
                                        className="flex items-center gap-2 bg-[#EFF6FF] hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 text-xs font-bold text-[#003B7A] transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <span>{t(`👥 Ver / Inspeccionar Participantes Evaluados (${syntheticUsers.length})`, `👥 View / Inspect Evaluated Participants (${syntheticUsers.length})`)}</span>
                                    </button>
                                    <button
                                        disabled={isBusy}
                                        onClick={openRubricsModal}
                                        className="btn-secondary flex items-center gap-2 text-xs font-bold border-blue-200 text-[#003B7A] hover:bg-blue-50 disabled:opacity-50"
                                    >
                                        <ClipboardList size={16} className="text-[#0066FF]" />
                                        {t('📋 Criterios de Evaluación (Rúbricas)', '📋 Evaluation Rubrics')}
                                    </button>
                                    <button
                                        onClick={() => refreshBriefData(true)}
                                        disabled={isBusy}
                                        className="btn-secondary flex items-center gap-2 text-xs font-bold"
                                        title={t("Recupera las promociones, mensajes clave, correos, estudios e imágenes generados en el último Brief de Marketing", "Loads the promotions, key messages, emails, studies, and images generated in the latest Marketing Brief")}
                                    >
                                        <RotateCcw size={16} />
                                        {t('Traer datos del último Brief', 'Load from latest Brief')}
                                    </button>
                                    <button
                                        onClick={handleRunCreativeSim}
                                        disabled={isBusy || (Object.keys(combinedCreativeAssetsMap).length === 0 && !brief)}
                                        title={(Object.keys(combinedCreativeAssetsMap).length === 0 && !brief) ? t("Sube una imagen o banner propio abajo o genera un Brief de Marketing primero.", "Upload a custom creative image below or generate a Marketing Brief first.") : ""}
                                        className="btn-primary px-6 py-3 flex items-center gap-2"
                                    >
                                        {isCreativeLoading ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" /> : <Play size={20} />}
                                        {t('Evaluar Imagen / Banner', 'Run Creative Simulation')}
                                    </button>
                                </div>
                            </div>

                            {/* Upload Custom Creative Card */}
                            <div className="content-card border-l-4 border-l-[#78D600]">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[#78D600]" />
                                            <h3 className="font-bold text-[#003B7A] text-base">{t('Subir Imagen / Banner Propio', 'Upload Custom Creative')}</h3>
                                        </div>
                                        <p className="text-xs text-subtext mt-0.5">
                                            {t(
                                                'Sube tu propio post de redes sociales, banner clínico o arte promocional desde tu computadora para evaluarlo directamente con el focus group sintético — incluso sin haber generado un Brief de Marketing antes.',
                                                'Upload your own social media post, clinical banner, or promotional artwork from your computer to evaluate it directly with the synthetic focus group — even without generating a Marketing Brief first.'
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <input
                                            ref={customCreativeInputRef}
                                            type="file"
                                            disabled={isBusy}
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleUploadCustomCreative}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => customCreativeInputRef.current?.click()}
                                            disabled={isBusy}
                                            className="btn-secondary px-4 py-2.5 flex items-center gap-2 text-xs font-bold border-[#0066FF] text-[#0066FF] hover:bg-blue-50 disabled:opacity-50"
                                        >
                                            {isUploadingCreative ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                            {isUploadingCreative ? t("Subiendo...", "Uploading...") : t("Cargar Imagen / Banner", "Upload Custom Image")}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#003B7A] uppercase tracking-wider mb-1">
                                            {t('Titular / Encabezado (Opcional)', 'Custom Headline / Title (Optional)')}
                                        </label>
                                        <input
                                            type="text"
                                            disabled={isBusy}
                                            value={customCreativeHeadline}
                                            onChange={(e) => handleCustomCopyChange(e.target.value, customCreativeCaption)}
                                            placeholder={t("ej. Controla tu diabetes a tiempo — Resultados de HbA1c el mismo día", "e.g., Control your diabetes on time — Same-day HbA1c results")}
                                            className="input-field text-sm py-2 disabled:opacity-60"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#003B7A] uppercase tracking-wider mb-1">
                                            {t('Copy / Pie de Publicación (Opcional)', 'Social Copy / Caption (Optional)')}
                                        </label>
                                        <input
                                            type="text"
                                            disabled={isBusy}
                                            value={customCreativeCaption}
                                            onChange={(e) => handleCustomCopyChange(customCreativeHeadline, e.target.value)}
                                            placeholder={t("ej. Agenda tu Perfil Control Diabetes en chopo.com.mx y recibe resultados por WhatsApp.", "e.g., Book your Diabetes Control Panel at chopo.com.mx and receive results via WhatsApp.")}
                                            className="input-field text-sm py-2 disabled:opacity-60"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Creative Assets Preview */}
                            <div className="content-card">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-4">
                                    <h3 className="font-bold text-[#003B7A]">{t('Materiales Visuales a Evaluar', 'Assets being Tested')}</h3>
                                    {Object.keys(combinedCreativeAssetsMap).length > 0 && (
                                        <div className="flex flex-wrap bg-gray-50 rounded-full p-1 border border-gray-100 gap-1">
                                            {Object.keys(combinedCreativeAssetsMap).map(aud => (
                                                <button
                                                    key={aud}
                                                    disabled={isBusy}
                                                    onClick={() => setSelectedCreativeAudience(aud)}
                                                    className={`px-4 py-1.5 rounded-full text-xs font-black transition-all disabled:opacity-50 ${selectedCreativeAudience === aud || (!selectedCreativeAudience && Object.keys(combinedCreativeAssetsMap)[0] === aud)
                                                        ? 'bg-white text-[#0066FF] shadow-sm'
                                                        : 'text-subtext hover:text-heading'
                                                        }`}
                                                >
                                                    {localizePersonaLabel(aud, language)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {(Object.keys(combinedCreativeAssetsMap).length === 0 && !brief?.campaignAssets) ? (
                                    <div className="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                            <Sparkles className="text-[#0066FF]" size={32} />
                                        </div>
                                        <h4 className="text-lg font-black text-[#003B7A] mb-2">{t('Aún no hay imágenes o banners cargados', 'No Campaign Assets Loaded Yet')}</h4>
                                        <p className="text-subtext mb-6 max-w-md mx-auto font-medium">
                                            {t(
                                                'Sube un banner o imagen arriba para evaluarlo de inmediato, o carga los materiales desde tu Brief de Marketing.',
                                                'Upload a custom creative image above to test it immediately, or refresh/generate assets from your Marketing Brief.'
                                            )}
                                        </p>
                                        <div className="flex flex-wrap gap-4 justify-center">
                                            <button
                                                type="button"
                                                onClick={() => customCreativeInputRef.current?.click()}
                                                className="btn-primary flex items-center gap-2"
                                            >
                                                <Upload size={18} />
                                                {t('Cargar Imagen / Banner', 'Upload Custom Image')}
                                            </button>
                                            <button
                                                onClick={() => refreshBriefData()}
                                                className="btn-secondary flex items-center gap-2"
                                            >
                                                <History size={20} />
                                                {t('Actualizar Datos del Brief', 'Refresh Brief Data')}
                                            </button>
                                            {brief && (
                                                <button
                                                    onClick={handleRunCreativeSim}
                                                    disabled={isCreativeLoading}
                                                    className="btn-secondary flex items-center gap-2"
                                                >
                                                    {isCreativeLoading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                                                    {t('Generar Materiales del Brief y Evaluar', 'Generate Brief Assets & Run Test')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                        <div className="flex flex-col md:flex-row gap-6 w-full items-stretch">
                                        {activeCreativeAssets?.image && (
                                                <div className="w-full md:w-1/3 flex-shrink-0">
                                                    <img src={activeCreativeAssets?.image} className="w-full aspect-square object-cover rounded-xl border border-gray-100 shadow-sm" />
                                                    <p className="text-[10px] text-center mt-3 font-black text-subtext uppercase tracking-widest">{t('Imagen Principal del Concepto', 'Main Concept Image')}</p>
                                            </div>
                                        )}
                                            <div className="flex-1 p-6 bg-gray-50 rounded-xl border border-gray-100 text-sm shadow-sm flex flex-col justify-center">
                                                <p className="font-black text-[#003B7A] text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
                                                {t('Copy para Redes Sociales', 'Social Caption')}
                                            </p>
                                                <p className={`mb-6 leading-relaxed text-base ${activeCreativeAssets?.social?.caption ? 'italic text-heading font-medium' : 'text-subtext text-sm'}`}>
                                                    {activeCreativeAssets?.social?.caption
                                                        ? `"${activeCreativeAssets.social.caption}"`
                                                        : t('Sin copy adicional. Al evaluar, el focus group analizará directamente el diseño y los textos incluidos dentro de tu imagen.', 'No additional copy. The focus group will evaluate the design and text inside your uploaded image directly.')}
                                                </p>
                                            <p className="font-black text-[#003B7A] text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
                                                {t('Anuncio de Buscador', 'Search Ad copy')}
                                            </p>
                                                <p className={`text-base mb-1 ${activeCreativeAssets?.search?.headline ? 'text-heading font-black' : 'text-subtext font-semibold text-sm'}`}>
                                                    {activeCreativeAssets?.search?.headline || t('Sin titular adicional (opcional)', 'No additional headline (optional)')}
                                                </p>
                                                <p className="text-subtext text-sm leading-relaxed font-medium">
                                                    {activeCreativeAssets?.search?.description || t('Si deseas evaluar también textos complementarios, escríbelos arriba en Titular y Copy.', 'If you also want to evaluate complementary copy, enter it in the Headline and Copy fields above.')}
                                                </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Results */}
                            {creativeResults.length > 0 && (
                                <div className="content-card lg:col-span-2">
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                        <h3 className="font-black text-heading flex items-center gap-2 uppercase tracking-widest text-sm">
                                            {t('Resumen de Retroalimentación del Focus Group', 'Focus Group Feedback Summary')}
                                            <div className="group relative">
                                                <Info size={16} className="text-subtext cursor-help" />
                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 bg-heading text-white text-[10px] p-4 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none border border-white/10 leading-relaxed font-medium">
                                                    {t('Calificaciones agregadas de todos los perfiles sintéticos de esta cohorte.', 'Aggregated scoring insights from all synthetic personas in this cohort.')}
                                                    <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-heading" />
                                                </div>
                                            </div>
                                        </h3>
                                        {renderReportExportActions()}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-gray-50 p-5 rounded-2xl text-center relative group cursor-help transition-all border border-gray-100 hover:border-[#0066FF] shadow-sm">
                                            <div className="text-3xl font-black text-heading">{Math.round(displayedCreativeResults.reduce((a, b) => a + b.visualAppeal, 0) / displayedCreativeResults.length) || 0}</div>
                                            <div className="text-[10px] font-black text-subtext uppercase tracking-widest mt-1">{t('Diseño y Atractivo Visual', 'Visual Appeal')}</div>
                                            {/* Tooltip */}
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-48 bg-heading text-white text-[10px] font-medium p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none border border-white/10 leading-relaxed">
                                                {t('Qué tan bien se alinea la estética con las expectativas clínicas modernas.', 'How aesthetics align with expectations for modern healthcare experiences.')}
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-heading" />
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 p-5 rounded-2xl text-center relative group cursor-help transition-all border border-blue-100 hover:border-[#0066FF] shadow-sm">
                                            <div className="text-3xl font-black text-[#0066FF]">{Math.round(displayedCreativeResults.reduce((a, b) => a + b.brandFit, 0) / displayedCreativeResults.length) || 0}</div>
                                            <div className="text-[10px] font-black text-[#003B7A] uppercase tracking-widest mt-1">{t('Afinidad con la Marca', 'Brand Fit')}</div>
                                            {/* Tooltip */}
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-48 bg-heading text-white text-[10px] font-medium p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none border border-white/10 leading-relaxed">
                                                {t('Qué tan bien se alinea el material con la identidad clínica de Chopo.', 'How well the creative aligns with Chopo core brand identity.')}
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-heading" />
                                            </div>
                                        </div>
                                        <div className="bg-green-50 p-5 rounded-2xl text-center relative group cursor-help transition-all border border-green-100 hover:border-green-500 shadow-sm">
                                            <div className="text-3xl font-black text-green-600">{Math.round(displayedCreativeResults.reduce((a, b) => a + (b.conversionLikelihood || 0), 0) / displayedCreativeResults.length) || 0}</div>
                                            <div className="text-[10px] font-black text-green-700 uppercase tracking-widest mt-1">{t('Intención de Agendar', 'Conversion Likelihood')}</div>
                                            {/* Tooltip */}
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-48 bg-heading text-white text-[10px] font-medium p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none border border-white/10 leading-relaxed">
                                                {t('Probabilidad de que la audiencia agende o contrate el estudio propuesto.', 'Likelihood of the audience engaging with the proposed plan or service.')}
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-heading" />
                                            </div>
                                        </div>
                                        <div className="bg-purple-50 p-5 rounded-2xl text-center relative group cursor-help transition-all border border-purple-100 hover:border-purple-500 shadow-sm">
                                            <div className="text-3xl font-black text-purple-600">{Math.round(displayedCreativeResults.reduce((a, b) => a + (b.stoppingPower || 0), 0) / displayedCreativeResults.length) || 0}</div>
                                            <div className="text-[10px] font-black text-purple-700 uppercase tracking-widest mt-1">{t('Impacto Visual y Claridad', 'Visual Impact & Clarity')}</div>
                                            {/* Tooltip */}
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-48 bg-heading text-white text-[10px] font-medium p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none border border-white/10 leading-relaxed">
                                                {t('Capacidad del mensaje e imagen para captar la atención y entenderse al instante.', 'Ability for the messaging to be understood clearly and instantly.')}
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-heading" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dynamic Rubrics Aggregated Breakdown Card */}
                                    {displayedCreativeResults.some(r => Array.isArray(r.rubricScores) && r.rubricScores.length > 0) && (
                                        <div className="mt-6 pt-6 border-t border-gray-100">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                                <h4 className="font-black text-[#003B7A] text-xs uppercase tracking-widest flex items-center gap-2">
                                                    <ClipboardList size={16} className="text-[#0066FF]" />
                                                    {t('Desempeño por Criterio de Evaluación (Rúbricas Dinámicas)', 'Performance by Evaluation Criterion (Dynamic Rubrics)')}
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={openRubricsModal}
                                                    className="text-xs font-bold text-[#0066FF] hover:underline flex items-center gap-1"
                                                >
                                                    <Settings size={12} />
                                                    {t('Editar Rúbricas', 'Edit Rubrics')}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(() => {
                                                    const rubricMap: Record<string, { name: string; total: number; count: number; weight?: number }> = {};
                                                    displayedCreativeResults.forEach(r => {
                                                        (r.rubricScores || []).forEach((rs: any) => {
                                                            const key = rs.rubricId || rs.rubricKey || rs.rubricName;
                                                            if (!rubricMap[key]) {
                                                                const matchedRubric = rubrics.find(rub => rub.id === rs.rubricId || (rub as any).key === rs.rubricKey);
                                                                rubricMap[key] = {
                                                                    name: rs.rubricName || matchedRubric?.name || key,
                                                                    total: 0,
                                                                    count: 0,
                                                                    weight: matchedRubric?.weight
                                                                };
                                                            }
                                                            rubricMap[key].total += Number(rs.score) || 0;
                                                            rubricMap[key].count += 1;
                                                        });
                                                    });
                                                    return Object.entries(rubricMap).map(([key, item]) => {
                                                        const avg = Math.round(item.total / (item.count || 1));
                                                        return (
                                                            <div key={key} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                                <div className="flex justify-between items-center text-xs mb-1.5">
                                                                    <span className="font-bold text-heading">
                                                                        {item.name}
                                                                        {item.weight !== undefined && (
                                                                            <span className="ml-1.5 text-[10px] text-subtext font-semibold">({item.weight}%)</span>
                                                                        )}
                                                                    </span>
                                                                    <span className={`font-black ${avg >= 80 ? 'text-green-600' : avg >= 55 ? 'text-[#0066FF]' : 'text-amber-600'}`}>
                                                                        {avg} / 100
                                                                    </span>
                                                                </div>
                                                                <div className="h-2.5 w-full bg-white rounded-full overflow-hidden border border-gray-200">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-500 ${avg >= 80 ? 'bg-green-500' : avg >= 55 ? 'bg-[#0066FF]' : 'bg-amber-500'}`}
                                                                        style={{ width: `${Math.min(100, Math.max(0, avg))}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Optimization Insights */}
                            <div className="content-card">
                                <h3 className="font-black text-heading mb-6 flex items-center gap-2 uppercase tracking-widest text-sm">
                                    <Zap size={20} className="text-yellow-500" />
                                    {t('Recomendaciones de Optimización por Perfil', 'Persona Optimization Insights')}
                                </h3>
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {/* Group by Persona Name to show 1 idea per audience type if multiple per type, or just map if 1:1 */
                                        Object.values(displayedCreativeResults.reduce((acc, r) => {
                                            if (!acc[r.personaName]) acc[r.personaName] = r;
                                            return acc;
                                        }, {} as Record<string, typeof displayedCreativeResults[0]>)).map((r: any, i) => (
                                            <div key={i} className="border border-gray-100 rounded-2xl p-5 bg-gray-50 shadow-sm space-y-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0066FF] font-black text-xs border border-blue-100 shadow-sm">
                                                            {getPersonaInitial(localizePersonaLabel(r.personaName, language))}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-heading text-sm uppercase tracking-widest">{localizePersonaLabel(r.personaName, language)}</div>
                                                            {r.weightedOverallScore !== undefined && (
                                                                <div className="text-[11px] font-bold text-[#0066FF]">
                                                                    {t('Calificación Ponderada:', 'Weighted Score:')} {r.weightedOverallScore}/100
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#0066FF]/20" />
                                                        <div className="text-[10px] font-black text-subtext uppercase mb-2 flex items-center gap-2 opacity-60">
                                                            <MessageSquare size={12} /> {t('Estrategia de Mensaje', 'Messaging Strategy')}
                                                        </div>
                                                        <p className="text-xs text-heading italic font-medium leading-relaxed">"{r.suggestedImprovement || r.suggestedMessaging || t('Sin sugerencia específica.', 'No specific suggestion.')}"</p>
                                                    </div>

                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#0066FF]/20" />
                                                        <div className="text-[10px] font-black text-subtext uppercase mb-2 flex items-center gap-2 opacity-60">
                                                            <Image size={12} /> {t('Dirección Visual / Barreras Detectadas', 'Visual Direction / Barriers Detected')}
                                                        </div>
                                                        <p className="text-xs text-heading italic font-medium leading-relaxed">"{r.barriersOrConcerns || r.suggestedImage || t('Sin sugerencia visual específica.', 'No specific visual suggestion.')}"</p>
                                                    </div>
                                                </div>

                                                {Array.isArray(r.rubricScores) && r.rubricScores.length > 0 && (
                                                    <div className="pt-2 border-t border-gray-200/70">
                                                        <div className="text-[10px] font-black text-[#003B7A] uppercase tracking-wider mb-2">
                                                            {t('Evaluación Detallada por Rúbrica', 'Detailed Evaluation by Rubric')}
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                            {r.rubricScores.map((rs: any, idx: number) => (
                                                                <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 text-xs">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="font-bold text-slate-800">{rs.rubricName || rs.rubricKey}</span>
                                                                        <span className="font-black text-[#0066FF]">{rs.score}/100</span>
                                                                    </div>
                                                                    <p className="text-[11px] text-subtext leading-snug italic">"{rs.rationale}"</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Copy & Product Suggestions */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="content-card max-h-[500px] overflow-y-auto custom-scrollbar">
                                    <h3 className="font-black text-heading mb-6 flex items-center gap-2 uppercase tracking-widest text-sm">
                                        <Edit2 size={20} className="text-[#0066FF]" />
                                        {t('Ideas de Mejora de Copy', 'Copy Enhancement ideas')}
                                    </h3>
                                    <div className="space-y-4">
                                        {displayedCreativeResults.filter(r => r.copyEdit && r.copyEdit !== "None").map((r, i) => (
                                            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#0066FF]" />
                                                <div className="text-[10px] font-black text-[#0066FF] mb-2 uppercase tracking-widest">{localizePersonaLabel(r.personaName, language)}</div>
                                                <p className="text-xs text-heading font-medium leading-relaxed italic">"{r.copyEdit}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="content-card max-h-[500px] overflow-y-auto custom-scrollbar">
                                    <h3 className="font-bold text-heading mb-4 flex items-center gap-2">
                                        <ShoppingBag size={18} className="text-[#0066FF]" />
                                        {t('Estudios Alternativos Sugeridos', 'Product Alternatives')}
                                    </h3>
                                    <div className="space-y-3">
                                        {displayedCreativeResults.filter(r => r.suggestedProduct && r.suggestedProduct !== "None").slice(0, 20).map((r, i) => (
                                            <div key={i} className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                                <span className="text-sm text-subtext font-bold">{localizePersonaLabel(r.personaName, language)}</span>
                                                <span className="text-sm font-black text-[#0066FF]">{r.suggestedProduct}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Existing Verbatim Feedback - moved down */}
                            <div className="content-card max-h-[400px] overflow-y-auto custom-scrollbar">
                                <h3 className="font-bold text-heading mb-4 uppercase tracking-widest text-xs">{t('Comentarios Textuales', 'Verbatim Feedback')}</h3>
                                <div className="space-y-3">
                                    {displayedCreativeResults.map((r, i) => (
                                        <div key={i} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex justify-between text-[10px] font-black text-subtext mb-2 uppercase tracking-widest">
                                                <span>{localizePersonaLabel(r.personaName, language)}</span>
                                                <span className={r.sentiment === 'Positive' ? 'text-green-600' : r.sentiment === 'Negative' ? 'text-red-600' : 'text-subtext'}>
                                                    {r.sentiment === 'Positive' ? t('Positivo', 'Positive') : r.sentiment === 'Negative' ? t('Negativo', 'Negative') : t('Neutral', 'Neutral')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-heading leading-relaxed italic">"{r.feedback}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'AB_TEST' && (
                        <div className={`space-y-6 ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                            <div className="content-card flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-heading">{t('Pruebas A/B Estratégicas de Campaña', 'Campaign Strategic A/B Testing')}</h3>
                                    <p className="text-sm text-subtext">{t(`Genera variantes estratégicas y simula pruebas multivariante con ${syntheticUsers.length} usuarios sintéticos.`, `Generate strategic variants & simulate multi-variant testing on ${syntheticUsers.length} synthetic users.`)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => setIsSyntheticUsersModalOpen(true)}
                                        title={t("Ver e inspeccionar la lista de participantes sintéticos activos", "View and inspect the list of active synthetic participants")}
                                        className="flex items-center gap-2 bg-[#EFF6FF] hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 text-xs font-bold text-[#003B7A] transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <span>{t(`👥 Ver / Inspeccionar Participantes Evaluados (${syntheticUsers.length})`, `👥 View / Inspect Evaluated Participants (${syntheticUsers.length})`)}</span>
                                    </button>
                                    <button
                                        onClick={() => refreshBriefData(true)}
                                        disabled={isBusy}
                                        className="btn-secondary flex items-center gap-2 text-xs font-bold"
                                        title={t("Recupera las promociones, mensajes clave, correos, estudios e imágenes generados en el último Brief de Marketing", "Loads the promotions, key messages, emails, studies, and images generated in the latest Marketing Brief")}
                                    >
                                        <RotateCcw size={16} />
                                        {t('Traer datos del último Brief', 'Load from latest Brief')}
                                    </button>
                                    <button
                                        onClick={handleRunABTestSim}
                                        disabled={isBusy || syntheticUsers.length === 0}
                                        title={syntheticUsers.length === 0 ? t("Primero debes generar usuarios en la pestaña Usuarios Sintéticos.", "You must generate users in the Synthetic Users tab first.") : ""}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        {isABTestingLoading ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" /> : <Play size={20} />}
                                        {t('Ejecutar Simulación', 'Run Simulation')}
                                    </button>
                                </div>
                            </div>

                            {/* Show Variants if any */}
                            {regionalVariants.length > 0 && (
                                <div className="content-card">
                                    <h3 className="font-black text-heading mb-6 flex items-center gap-2 uppercase tracking-widest text-sm">
                                        <Image size={20} className="text-[#0066FF]" />
                                        {t('Variantes Generadas', 'Regional Variants Generated')}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {regionalVariants.map((v, i) => (
                                            <div key={i} className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                {v.image ? (
                                                    <img src={v.image} alt={v.region} className="w-full aspect-square object-cover rounded-lg mb-2" />
                                                ) : (
                                                    <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                                                        <Image className="text-gray-400" />
                                                    </div>
                                                )}
                                                <span className="text-xs font-black text-heading text-center">{v.region}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Show Results if any */}
                            {abTestResults.length > 0 && (
                                <div className="space-y-4">
                                    <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                                        <span className="text-xs font-bold text-[#003B7A] uppercase tracking-wider">
                                            Resultados de Prueba A/B ({abTestResults.length} participantes)
                                        </span>
                                        {renderReportExportActions()}
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Stats Column */}
                                    <div className="content-card">
                                        <h3 className="font-black text-heading mb-4 uppercase tracking-widest text-sm">{t('Desempeño por Variante (Promedio)', 'Variant Performance (Avg Score)')}</h3>
                                        <div className="space-y-3">
                                            {/* Calculate Average Scores */}
                                            {(() => {
                                                const scores: Record<string, { total: number, count: number }> = {};
                                                abTestResults.forEach(r => {
                                                    r.rankings?.forEach(rank => {
                                                        if (!scores[rank.variantName]) scores[rank.variantName] = { total: 0, count: 0 };
                                                        scores[rank.variantName].total += rank.score;
                                                        scores[rank.variantName].count += 1;
                                                    });
                                                });
                                                const sortedScores = Object.entries(scores).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count));

                                                if (sortedScores.length === 0) {
                                                    return <div className="text-sm text-subtext">{t('No hay datos de ranking disponibles.', 'No ranking data available for this run.')}</div>;
                                                }

                                                return sortedScores.map(([variant, data]) => {
                                                    const avg = (data.total / data.count).toFixed(1);
                                                    return (
                                                        <div key={variant} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                            <span className="font-bold text-sm text-heading">{variant}</span>
                                                            <span className="font-black text-[#0066FF]">{avg} / 10</span>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* Feedback Column */}
                                    <div className="lg:col-span-2 content-card max-h-[600px] overflow-y-auto custom-scrollbar">
                                        <h3 className="font-black text-heading mb-4 uppercase tracking-widest text-sm">{t('Retroalimentación por Perfil', 'Persona Feedback')}</h3>
                                        <div className="space-y-4">
                                            {abTestResults.map((r, i) => (
                                                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                                                    <div className={`absolute top-0 left-0 w-1 h-full ${r.sentiment === 'Positive' ? 'bg-green-500' : r.sentiment === 'Negative' ? 'bg-red-500' : 'bg-blue-500'} `} />
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="text-[10px] font-black text-subtext uppercase tracking-widest">{localizePersonaLabel(r.personaName, language)}</div>
                                                            <div className="text-sm font-bold text-heading mt-1">{t('Mejor Opción:', 'Top Choice:')} <span className="text-[#0066FF]">{r.selectedVariant}</span></div>
                                                        </div>
                                                        <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded ${r.sentiment === 'Positive' ? 'bg-green-100 text-green-700' : r.sentiment === 'Negative' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                                                            {r.sentiment === 'Positive' ? t('Positivo', 'Positive') : r.sentiment === 'Negative' ? t('Negativo', 'Negative') : t('Neutral', 'Neutral')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-heading italic font-medium mt-2 mb-4">"{// @ts-ignore
                                                        r.overallFeedback || r.rationale || t('Sin retroalimentación', 'No feedback')}"</p>

                                                    {r.rankings && r.rankings.length > 0 && (
                                                        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                                                            <div className="text-[10px] font-black text-subtext uppercase tracking-widest mb-2">{t('Calificación de Variantes', 'Variant Rankings')}</div>
                                                            {r.rankings.map((rank, idx) => (
                                                                <div key={idx} className="flex flex-col gap-1 bg-white p-3 rounded-lg border border-gray-100">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="font-bold text-sm text-heading">{rank.variantName}</span>
                                                                        <span className="font-black text-[#0066FF]">{rank.score}/10</span>
                                                                    </div>
                                                                    <p className="text-xs text-subtext leading-relaxed">"{rank.rationale}"</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Footer */}
            {status && (
                <div className="fixed bottom-6 right-6 bg-white text-heading px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-5 z-50 animate-bounce-in border border-blue-100 backdrop-blur-md">
                    <div className="animate-spin h-5 w-5 border-2 border-[#0066FF] border-t-transparent rounded-full" />
                    <span className="font-black text-[10px] uppercase tracking-widest text-[#0066FF]">{status}</span>
                </div>
            )}

            {/* Add & Manage Audience Modal (Fixed Schema + AI + Rollback) */}
            {isAddAudienceModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden relative">
                        <div className="w-full h-1.5 bg-[#0066FF]" />
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
                            <div className="flex items-center gap-3">
                                <Users className="text-[#0066FF]" size={26} />
                                <div>
                                    <h3 className="text-xl font-bold text-[#003B7A]">{t('Agregar o Restaurar Perfiles de Audiencia')}</h3>
                                    <p className="text-xs text-subtext">{t('Esquema estandarizado (Paciente B2C / Médico B2D / Empresa B2B) con respaldo y restauración de versiones.')}</p>
                                </div>
                            </div>
                            <button disabled={isSavingPersonas || isGeneratingWildcard} onClick={() => setIsAddAudienceModalOpen(false)} className="text-subtext hover:text-heading transition-colors p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"><X size={22} /></button>
                        </div>

                        <div className={`p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar ${(isSavingPersonas || isGeneratingWildcard) ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                            <div className="flex flex-col gap-2">
                                <label className="block text-[10px] font-black text-subtext uppercase tracking-widest">{t('Seleccionar Perfil Base Oficial', 'Select From Official Standards')}</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {STANDARD_AUDIENCES.map((std) => (
                                        <button
                                            key={std.id}
                                            disabled={isSavingPersonas || isGeneratingWildcard}
                                            onClick={() => {
                                                const updated = [...personas, { ...std, isWildcard: false }];
                                                persistPersonasAllChannels(updated, `Agregado perfil estándar: ${std.personaName}`);
                                                setIsAddAudienceModalOpen(false);
                                            }}
                                            className="text-left p-3 rounded-2xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center gap-3 group disabled:opacity-50"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform">
                                                <img src={std.imageUrl} className="w-full h-full object-cover" alt={std.name} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[11px] font-black text-heading truncate">{formatDisplayPersonaLabel(std.name)}</div>
                                                <div className="text-[10px] font-bold text-subtext truncate">{std.personaName} • {std.job_title}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mode Toggle: Fixed Schema Form vs AI Criteria */}
                            <div className="flex gap-2 border-b border-gray-100 pb-3">
                                <button
                                    type="button"
                                    disabled={isSavingPersonas || isGeneratingWildcard}
                                    onClick={() => setShowManualPersonaForm(false)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!showManualPersonaForm ? 'bg-[#0066FF] text-white' : 'bg-gray-100 text-subtext hover:text-heading'}`}
                                >
                                    {t('✨ Generar con IA por Criterios', '✨ AI Generate from Criteria')}
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingPersonas || isGeneratingWildcard}
                                    onClick={() => setShowManualPersonaForm(true)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${showManualPersonaForm ? 'bg-[#0066FF] text-white' : 'bg-gray-100 text-subtext hover:text-heading'}`}
                                >
                                    {t('📝 Crear con Esquema Fijo Estandarizado', '📝 Create with Fixed Standardized Schema')}
                                </button>
                            </div>

                            {showManualPersonaForm ? (
                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Nombre del Segmento', 'Segment Name')}</label>
                                            <input
                                                type="text"
                                                value={newManualPersona.name}
                                                onChange={e => setNewManualPersona({ ...newManualPersona, name: e.target.value })}
                                                placeholder={t('ej. [Paciente B2C] Control Diabetes', 'e.g. [B2C Patient] Diabetes Control')}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Nombre y Edad/Ciudad', 'Persona Name')}</label>
                                            <input
                                                type="text"
                                                value={newManualPersona.personaName}
                                                onChange={e => setNewManualPersona({ ...newManualPersona, personaName: e.target.value })}
                                                placeholder={t('ej. Laura Méndez (46, CDMX)', 'e.g. Laura Mendez (46, CDMX)')}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Segmento')}</label>
                                            <select
                                                value={newManualPersona.track}
                                                onChange={e => setNewManualPersona({ ...newManualPersona, track: e.target.value as AudienceTrack })}
                                                className="input-field text-xs py-2"
                                            >
                                                <option value="patient">{t('🏥 Paciente (B2C)')}</option>
                                                <option value="physician">{t('🩺 Médico (B2D)')}</option>
                                                <option value="enterprise">{t('🏢 Empresa (B2B)')}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Edad (Numérica)', 'Age (Numeric)')}</label>
                                            <input
                                                type="number"
                                                value={newManualPersona.age}
                                                onChange={e => setNewManualPersona({ ...newManualPersona, age: Number(e.target.value) || 40 })}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Ocupación / Especialidad', 'Job Title / Specialty')}</label>
                                            <input
                                                type="text"
                                                value={newManualPersona.job_title}
                                                onChange={e => setNewManualPersona({ ...newManualPersona, job_title: e.target.value })}
                                                placeholder={t('ej. Médico Internista / Contador', 'e.g. Internist / Accountant')}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Demografía y NSE', 'Demographics & SES')}</label>
                                            <input
                                                type="text"
                                                value={newManualPersona.demographics}
                                                onChange={e => setNewManualPersona({ ...newManualPersona, demographics: e.target.value })}
                                                placeholder={t('ej. 40-55 años, CDMX, NSE C+', 'e.g. 40-55 yrs, CDMX, SES C+')}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Biografía Clínica', 'Clinical Bio')}</label>
                                        <textarea
                                            value={newManualPersona.bio}
                                            onChange={e => setNewManualPersona({ ...newManualPersona, bio: e.target.value })}
                                            className="input-field text-xs h-16"
                                            placeholder={t('Describe su contexto clínico, hábitos digitales y relación con Laboratorios Chopo...', 'Describe their clinical context, digital habits, and relationship with Chopo...')}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Puntos de Dolor (1 por línea)', 'Pain Points (1 per line)')}</label>
                                            <textarea
                                                value={newManualPersona.pain_points_text}
                                                onChange={e => setNewManualPersona({ ...newManualPersona, pain_points_text: e.target.value })}
                                                className="input-field text-xs h-20"
                                                placeholder={t('Incertidumbre sobre horas de ayuno\nFalta de tiempo por las mañanas', 'Uncertainty about fasting hours\nLack of time in the morning')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Objetivos de Salud (1 por línea)', 'Health Goals (1 per line)')}</label>
                                            <textarea
                                                value={newManualPersona.goals_text}
                                                onChange={e => setNewManualPersona({ ...newManualPersona, goals_text: e.target.value })}
                                                className="input-field text-xs h-20"
                                                placeholder={t('Pagar en línea con descuento\nRecibir resultados en App Chopo', 'Pay online with discount\nReceive digital results in Chopo App')}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            disabled={isSavingPersonas}
                                            onClick={handleCreateManualPersona}
                                            className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2"
                                        >
                                            <Save size={14} />
                                            {t('Guardar Perfil')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-subtext uppercase tracking-widest mb-2">{t('Criterios del Perfil', 'Custom Audience Criteria')}</label>
                                        <textarea
                                            className="input-field h-24 text-sm"
                                            placeholder={t("Describe el perfil de paciente o médico que deseas evaluar...", "Describe the audience you want to test...")}
                                            value={audienceCriteria}
                                            onChange={e => setAudienceCriteria(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleAddAudience()}
                                            className="flex-1 btn-secondary py-3 text-sm"
                                        >
                                            {t('Perfil Exploratorio Aleatorio', 'Surprise Me')}
                                        </button>
                                        <button
                                            onClick={() => handleAddAudience(audienceCriteria)}
                                            disabled={!audienceCriteria.trim()}
                                            className="flex-1 btn-primary py-3 text-sm shadow-xl shadow-blue-500/20"
                                        >
                                            {t('Generar Perfil', 'Generate Audience')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Persona Version Rollback Section */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h4 className="text-xs font-black text-[#003B7A] uppercase tracking-wider flex items-center gap-1.5">
                                            <History size={14} className="text-[#0066FF]" />
                                            {t('Historial de Versiones de Perfiles', 'Persona Version History')}
                                        </h4>
                                        <p className="text-[11px] text-subtext">
                                            {t('Restaura cualquier versión previa guardada o vuelve a los perfiles iniciales por defecto.', 'Restore any previous saved snapshot or reset to the default personas.')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isSavingPersonas}
                                        onClick={() => handleRestorePersonas('OFFICIAL_SEED')}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5"
                                    >
                                        <RotateCcw size={13} />
                                        {t('Restaurar Valores por Defecto', 'Restore Default Values')}
                                    </button>
                                </div>
                                {personaVersions.length > 0 && (
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                        {personaVersions.map((ver) => (
                                            <div key={ver.versionId} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-800">{ver.label}</span>
                                                    <span className="text-slate-400 ml-2">{(ver.timestamp || (ver as any).createdAt) ? new Date(ver.timestamp || (ver as any).createdAt).toLocaleString('es-MX') : ''} ({ver.itemCount})</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isSavingPersonas}
                                                    onClick={() => handleRestorePersonas(ver.versionId)}
                                                    className="px-2.5 py-1 rounded bg-blue-50 text-[#0066FF] font-bold hover:bg-blue-100"
                                                >
                                                    {t('Restaurar', 'Restore')}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Audience Details & Fixed-Schema Editor Modal */}
            {selectedAudience && (
                <div className="fixed inset-0 bg-heading/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-[#0066FF]"></div>
                        {/* Header */}
                        <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-start">
                            <div className="flex gap-5">
                                <div className="w-20 h-20 rounded-2xl bg-gray-50 overflow-hidden shadow-sm flex-shrink-0 border border-gray-100">
                                    {selectedAudience.imageUrl ? <img src={selectedAudience.imageUrl} className="w-full h-full object-cover" /> : <Users size={36} className="m-auto mt-6 text-subtext" />}
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h3 className="text-2xl font-black text-heading">{formatDisplayPersonaLabel(localizePersonaLabel(selectedAudience.name, language))}</h3>
                                        <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${getPersonaSegmentMeta(selectedAudience).badgeClass}`}>
                                            {getPersonaSegmentMeta(selectedAudience).label}
                                        </span>
                                    </div>
                                    <div className="text-subtext font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#0066FF]" />
                                        {localizePersonaLabel(selectedAudience.personaName, language)}
                                        {(selectedAudience.age || selectedAudience.details?.age) && (
                                            <span>• {selectedAudience.age ? `${selectedAudience.age} ${t('años', 'yrs')}` : selectedAudience.details?.age}</span>
                                        )}
                                        {(selectedAudience.job_title || selectedAudience.details?.job_title) && (
                                            <span>• {selectedAudience.job_title || selectedAudience.details?.job_title}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={isSavingPersonas}
                                    onClick={() => setIsEditingSelectedAudience(!isEditingSelectedAudience)}
                                    className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-[#0066FF] text-xs font-bold flex items-center gap-1 hover:bg-blue-100 disabled:opacity-50"
                                >
                                    <Edit2 size={13} />
                                    {isEditingSelectedAudience ? t('Cancelar Edición', 'Cancel Edit') : t('Editar Perfil', 'Edit Persona')}
                                </button>
                                <button disabled={isSavingPersonas} onClick={() => setSelectedAudience(null)} className="text-subtext hover:text-heading transition-all p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"><X size={22} /></button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className={`p-8 overflow-y-auto space-y-6 custom-scrollbar ${isSavingPersonas ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                            {isEditingSelectedAudience && editAudienceForm ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Segmento', 'Segment')}</label>
                                            <input
                                                type="text"
                                                value={editAudienceForm.name}
                                                onChange={e => setEditAudienceForm({ ...editAudienceForm, name: e.target.value })}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Nombre Persona', 'Persona Name')}</label>
                                            <input
                                                type="text"
                                                value={editAudienceForm.personaName}
                                                onChange={e => setEditAudienceForm({ ...editAudienceForm, personaName: e.target.value })}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Segmento')}</label>
                                            <select
                                                value={editAudienceForm.track}
                                                onChange={e => setEditAudienceForm({ ...editAudienceForm, track: e.target.value as AudienceTrack })}
                                                className="input-field text-xs py-2"
                                            >
                                                <option value="patient">{t('🏥 Paciente (B2C)')}</option>
                                                <option value="physician">{t('🩺 Médico (B2D)')}</option>
                                                <option value="enterprise">{t('🏢 Empresa (B2B)')}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Edad', 'Age')}</label>
                                            <input
                                                type="number"
                                                value={editAudienceForm.age}
                                                onChange={e => setEditAudienceForm({ ...editAudienceForm, age: Number(e.target.value) || 40 })}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Ocupación / Especialidad', 'Job Title / Specialty')}</label>
                                            <input
                                                type="text"
                                                value={editAudienceForm.job_title}
                                                onChange={e => setEditAudienceForm({ ...editAudienceForm, job_title: e.target.value })}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Demografía', 'Demographics')}</label>
                                            <input
                                                type="text"
                                                value={editAudienceForm.demographics}
                                                onChange={e => setEditAudienceForm({ ...editAudienceForm, demographics: e.target.value })}
                                                className="input-field text-xs py-2"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Biografía', 'Bio')}</label>
                                        <textarea
                                            value={editAudienceForm.bio}
                                            onChange={e => setEditAudienceForm({ ...editAudienceForm, bio: e.target.value })}
                                            className="input-field text-xs h-20"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Puntos de Dolor (1 por línea)', 'Pain Points (1 per line)')}</label>
                                            <textarea
                                                value={editAudienceForm.pain_points_text}
                                                onChange={e => setEditAudienceForm({ ...editAudienceForm, pain_points_text: e.target.value })}
                                                className="input-field text-xs h-24"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-[#003B7A] uppercase mb-1">{t('Objetivos (1 por línea)', 'Goals (1 per line)')}</label>
                                            <textarea
                                                value={editAudienceForm.goals_text}
                                                onChange={e => setEditAudienceForm({ ...editAudienceForm, goals_text: e.target.value })}
                                                className="input-field text-xs h-24"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Bio */}
                                    <div>
                                        <h4 className="text-[10px] font-black text-subtext uppercase tracking-widest mb-2">{t('Biografía y Contexto Clínico', 'Bio & Lifestyle Persona')}</h4>
                                        <p className="text-heading text-base leading-relaxed font-medium italic">"{selectedAudience.bio}"</p>
                                    </div>

                                    {/* Demographics & Job Title */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <h4 className="text-[10px] font-black text-subtext uppercase tracking-widest mb-1">{t('Demografía y Ocupación', 'Demographics & Occupation')}</h4>
                                            <div className="font-bold text-heading text-sm">
                                                {selectedAudience.demographics || "N/A"}
                                            </div>
                                            {(selectedAudience.job_title || selectedAudience.details?.job_title) && (
                                                <div className="text-xs text-[#0066FF] font-bold mt-1">
                                                    {selectedAudience.job_title || selectedAudience.details?.job_title}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <h4 className="text-[10px] font-black text-subtext uppercase tracking-widest mb-2">{t('Etiquetas e Intereses', 'Interest Tags')}</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(selectedAudience.lifestyle_tags || selectedAudience.details?.lifestyle_tags || []).map((tag: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-blue-50 text-[#0066FF] rounded-xl text-xs font-black border border-blue-100">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pain Points & Goals (Fixed Schema) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
                                            <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2">{t('Puntos de Dolor (Pain Points)', 'Pain Points')}</h4>
                                            <ul className="space-y-1.5 text-xs text-slate-700">
                                                {(selectedAudience.pain_points || selectedAudience.details?.pain_points || []).map((pt: string, idx: number) => (
                                                    <li key={idx} className="flex gap-1.5">
                                                        <span className="text-red-500 font-bold">•</span>
                                                        <span>{pt}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                            <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2">{t('Objetivos y Motivadores (Goals)', 'Goals & Drivers')}</h4>
                                            <ul className="space-y-1.5 text-xs text-slate-700">
                                                {(selectedAudience.goals || selectedAudience.details?.goals || []).map((gl: string, idx: number) => (
                                                    <li key={idx} className="flex gap-1.5">
                                                        <span className="text-emerald-600 font-bold">•</span>
                                                        <span>{gl}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                            {isEditingSelectedAudience && (
                                <button
                                    type="button"
                                    disabled={isSavingPersonas}
                                    onClick={handleSaveSelectedAudienceEdits}
                                    className="px-6 py-2 bg-[#0066FF] text-white rounded-lg font-bold hover:bg-[#004ECC] transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    {t('Guardar Cambios')}
                                </button>
                            )}
                            <button
                                disabled={isSavingPersonas}
                                onClick={() => setSelectedAudience(null)}
                                className="btn-secondary px-6 py-2 text-sm font-bold disabled:opacity-50"
                            >
                                {t('Cerrar', 'Close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic Rubrics & Rollback Modal */}
            {isRubricsModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 relative">
                        <div className="w-full h-1.5 bg-[#0066FF]" />
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
                            <div className="flex items-center gap-3">
                                <ClipboardList className="text-[#0066FF]" size={26} />
                                <div>
                                    <h3 className="text-xl font-bold text-[#003B7A]">
                                        {t('Criterios de Evaluación del Focus Group (Rúbricas Dinámicas)', 'Focus Group Evaluation Criteria (Dynamic Rubrics)')}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {t('Configura las rúbricas ponderadas y escalas de calificación (0–100) con respaldo de versiones.')}
                                    </p>
                                </div>
                            </div>
                            <button
                                disabled={isSavingRubrics}
                                onClick={() => setIsRubricsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 disabled:opacity-50"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className={`p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 custom-scrollbar ${isSavingRubrics ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                            {/* Rubric Pills & New Button */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap gap-2">
                                    {rubrics.map((rub) => (
                                        <div
                                            key={rub.id}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                editingRubric?.id === rub.id
                                                    ? 'bg-[#0066FF] text-white border-[#0066FF]'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#0066FF]'
                                            }`}
                                            onClick={() => setEditingRubric({ ...rub, scoringAnchors: { ...rub.scoringAnchors } })}
                                        >
                                            <span>{rub.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${editingRubric?.id === rub.id ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#0066FF]'}`}>
                                                {rub.weight}%
                                            </span>
                                            {rubrics.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteRubric(rub.id);
                                                    }}
                                                    className={`ml-1 hover:text-red-400 ${editingRubric?.id === rub.id ? 'text-white/80' : 'text-slate-400'}`}
                                                    title={t('Eliminar Criterio', 'Delete Criterion')}
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleStartNewRubric}
                                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-[#0066FF] text-[#0066FF]"
                                >
                                    <Plus size={14} />
                                    {t('Nuevo Criterio / Rúbrica', 'New Criterion / Rubric')}
                                </button>
                            </div>

                            {/* Rubric Editor Form */}
                            {editingRubric && (
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                                                {t('Nombre del Criterio', 'Criterion Name')}
                                            </label>
                                            <input
                                                type="text"
                                                value={editingRubric.name}
                                                onChange={(e) => setEditingRubric({ ...editingRubric, name: e.target.value })}
                                                className="input-field text-sm"
                                                placeholder={t('ej. Claridad del Mensaje en 3 Segundos', 'e.g. 3-Second Message Clarity')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                                                {t('Segmento Aplicable')}
                                            </label>
                                            <select
                                                value={editingRubric.track === 'all' ? 'both' : editingRubric.track}
                                                onChange={(e) => setEditingRubric({ ...editingRubric, track: e.target.value as 'both' | 'all' | 'patient' | 'physician' | 'enterprise' })}
                                                className="input-field text-sm"
                                            >
                                                <option value="both">{t('Todos los Segmentos (B2C + B2D + B2B)')}</option>
                                                <option value="patient">{t('Solo Pacientes (B2C)')}</option>
                                                <option value="physician">{t('Solo Médicos (B2D)')}</option>
                                                <option value="enterprise">{t('Solo Empresas (B2B)')}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                                                {t('Peso Ponderado (0–100%)', 'Weight (0–100%)')}
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={editingRubric.weight}
                                                onChange={(e) => setEditingRubric({ ...editingRubric, weight: Number(e.target.value) || 0 })}
                                                className="input-field text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                                            {t('Pregunta de Evaluación para el Participante Sintético', 'Evaluation Question for Synthetic Participant')}
                                        </label>
                                        <textarea
                                            value={editingRubric.evaluationQuestion}
                                            onChange={(e) => setEditingRubric({ ...editingRubric, evaluationQuestion: e.target.value })}
                                            className="input-field text-sm h-20"
                                            placeholder={t('¿En menos de 3 segundos queda claro qué estudio ofrece Chopo y cuál es el beneficio principal?', 'Within 3 seconds, is it clear what study Chopo offers and its primary benefit?')}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-red-700 uppercase mb-1">
                                                {t('Ancla Baja (0 a 40 pts)', 'Low Anchor (0 to 40 pts)')}
                                            </label>
                                            <textarea
                                                value={editingRubric.scoringAnchors.low_0_to_40}
                                                onChange={(e) => setEditingRubric({
                                                    ...editingRubric,
                                                    scoringAnchors: { ...editingRubric.scoringAnchors, low_0_to_40: e.target.value }
                                                })}
                                                className="input-field text-xs h-24"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-amber-700 uppercase mb-1">
                                                {t('Ancla Media (41 a 79 pts)', 'Mid Anchor (41 to 79 pts)')}
                                            </label>
                                            <textarea
                                                value={editingRubric.scoringAnchors.mid_41_to_79}
                                                onChange={(e) => setEditingRubric({
                                                    ...editingRubric,
                                                    scoringAnchors: { ...editingRubric.scoringAnchors, mid_41_to_79: e.target.value }
                                                })}
                                                className="input-field text-xs h-24"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-emerald-700 uppercase mb-1">
                                                {t('Ancla Alta (80 a 100 pts)', 'High Anchor (80 to 100 pts)')}
                                            </label>
                                            <textarea
                                                value={editingRubric.scoringAnchors.high_80_to_100}
                                                onChange={(e) => setEditingRubric({
                                                    ...editingRubric,
                                                    scoringAnchors: { ...editingRubric.scoringAnchors, high_80_to_100: e.target.value }
                                                })}
                                                className="input-field text-xs h-24"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#003B7A] uppercase mb-1">
                                            {t('Etiqueta de Versión (Opcional)', 'Version Label (Optional)')}
                                        </label>
                                        <input
                                            type="text"
                                            value={rubricVersionLabel}
                                            onChange={(e) => setRubricVersionLabel(e.target.value)}
                                            placeholder={t('ej. Mayor peso a claridad en 3s para campaña Diabetes', 'e.g. Higher weight on 3s clarity for Diabetes campaign')}
                                            className="input-field text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Saved Versions & Rollback */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-black text-[#003B7A] flex items-center gap-2 uppercase tracking-wider">
                                            <History size={16} className="text-[#0066FF]" />
                                            {t('🕒 Versiones Guardadas')}
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            {t('Restaura cualquier versión previa o vuelve a los criterios iniciales por defecto.', 'Restore any previous rubric version or reset to the initial default rubrics.')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isSavingRubrics}
                                        onClick={() => handleRestoreRubrics('OFFICIAL_SEED')}
                                        className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                    >
                                        <RotateCcw size={14} />
                                        {t('Restaurar Valores por Defecto', 'Restore Default Values')}
                                    </button>
                                </div>

                                {rubricVersions.length > 0 ? (
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {rubricVersions.map((ver) => (
                                            <div
                                                key={ver.versionId}
                                                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                                            >
                                                <div>
                                                    <span className="font-bold text-slate-800">{ver.label}</span>
                                                    <span className="text-slate-400 ml-2">
                                                        {(ver.timestamp || (ver as any).createdAt) ? new Date(ver.timestamp || (ver as any).createdAt).toLocaleString('es-MX') : ''} ({ver.itemCount} {t('criterios', 'rubrics')})
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isSavingRubrics}
                                                    onClick={() => handleRestoreRubrics(ver.versionId)}
                                                    className="px-3 py-1 rounded-lg bg-white border border-blue-200 text-[#0066FF] font-bold hover:bg-blue-50"
                                                >
                                                    {t('Restaurar', 'Restore')}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">
                                        {t('Aún no hay versiones personalizadas guardadas en el historial.', 'No custom versions saved in history yet.')}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={isSavingRubrics}
                                onClick={() => setIsRubricsModalOpen(false)}
                                className="btn-secondary disabled:opacity-50"
                            >
                                {t('Cerrar', 'Close')}
                            </button>
                            <button
                                type="button"
                                disabled={isSavingRubrics}
                                onClick={handleApplyEditingRubric}
                                className="btn-primary flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSavingRubrics ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {t('Guardar Criterios', 'Save Rubrics')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Details Modal */}
            {selectedCartResult && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] border border-slate-200">
                        <div className="bg-white p-5 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-[#003B7A] flex items-center gap-2">
                                    <ShoppingCart size={18} className="text-[#0066FF]" />
                                    {t(`Estudios Seleccionados por ${selectedCartResult.personaName}`, `${selectedCartResult.personaName}'s Cart`)}
                                </h3>
                                <p className="text-xs text-slate-500">{t('Estudios Agendados', 'Purchased Items')}</p>
                            </div>
                            <button onClick={() => setSelectedCartResult(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-[#F8FAFC]">
                            {selectedCartResult.cart.filter(c => c.purchased).length > 0 ? (
                                selectedCartResult.cart.filter(c => c.purchased).map((item, i) => (
                                    <div key={i} className="flex gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                                        <div className="bg-emerald-50 p-2 rounded-lg h-fit border border-emerald-200">
                                            <ShoppingCart size={16} className="text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-[#003B7A] text-sm">{item.productName}</div>
                                            <div className="text-slate-600 text-xs mt-1 italic">"{item.reason}"</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500 italic">
                                    {t('Ningún estudio seleccionado.', 'No items purchased.')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Products Modal */}
            {showProducts && activeTab === 'PURCHASE' && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[86vh] border border-slate-200">
                        <div className="w-full h-1.5 bg-[#0066FF]" />
                        <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-[#003B7A] flex items-center gap-2 text-xl">
                                    <ShoppingCart size={22} className="text-[#0066FF]" />
                                    {t('Catálogo de Estudios a Evaluar', 'Target Diagnostic Studies')} ({simulationProducts.length})
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    {t('Configura el nombre, descripción y modalidad de atención (Sucursal y Domicilio, Solo en Sucursal o Solo a Domicilio) de cada estudio.', 'Configure the name, description, and service modality (Branch & Home, Branch Only, or Home Only) for each study.')}
                                </p>
                            </div>
                            <button
                                disabled={isBusy}
                                onClick={() => {
                                    setEditingProductIndex(null);
                                    setShowProducts(false);
                                }}
                                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={`p-6 border-b border-slate-200 bg-[#F8FAFC] ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                            <label className="block text-xs font-bold text-[#003B7A] uppercase mb-2">{t('Agregar Nuevo Estudio', 'Add New Diagnostic Study')}</label>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <input
                                    disabled={isBusy}
                                    value={newProduct}
                                    onChange={e => setNewProduct(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newProduct.trim()) {
                                            const formatted = formatSimulationProduct(newProduct.trim(), newProductModality);
                                            setSimulationProducts([...simulationProducts, formatted]);
                                            setNewProduct("");
                                        }
                                    }}
                                    placeholder={t("ej. Check-up Básico o Mastografía Digital: Estudio preventivo", "e.g. Comprehensive Metabolic Panel or Digital Mammography")}
                                    className="md:col-span-6 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-colors"
                                />
                                <select
                                    disabled={isBusy}
                                    value={newProductModality}
                                    onChange={e => setNewProductModality(e.target.value as StudyModality)}
                                    className="md:col-span-4 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-[#003B7A] focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                                >
                                    <option value="Disponible en Sucursal y Domicilio">{t('Disponible en Sucursal y Domicilio', 'Branch & Home Service')}</option>
                                    <option value="Disponible solo en Sucursal">{t('Disponible solo en Sucursal', 'Branch Only')}</option>
                                    <option value="Disponible solo a Domicilio">{t('Disponible solo a Domicilio', 'Home Draw Only')}</option>
                                </select>
                                <button
                                    onClick={() => {
                                        if (newProduct.trim()) {
                                            const formatted = formatSimulationProduct(newProduct.trim(), newProductModality);
                                            setSimulationProducts([...simulationProducts, formatted]);
                                            setNewProduct("");
                                        }
                                    }}
                                    disabled={isBusy || !newProduct.trim()}
                                    className="md:col-span-2 bg-[#0066FF] hover:bg-[#004ECC] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 justify-center"
                                >
                                    <Plus size={16} /> {t('Agregar', 'Add')}
                                </button>
                            </div>
                        </div>

                        <div className={`p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-3 ${isBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                            {simulationProducts.map((p, i) => {
                                const parsed = parseSimulationProduct(p);
                                const isEditingThis = editingProductIndex === i;

                                if (isEditingThis) {
                                    return (
                                        <div key={i} className="p-4 bg-[#EFF6FF]/60 rounded-xl border border-[#0066FF] space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-[#003B7A] uppercase mb-1">
                                                        {t('Nombre del Estudio', 'Study Name')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        disabled={isBusy}
                                                        value={editingProductTitle}
                                                        onChange={e => setEditingProductTitle(e.target.value)}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-[#003B7A] focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-[#003B7A] uppercase mb-1">
                                                        {t('Modalidad de Atención', 'Service Modality')}
                                                    </label>
                                                    <select
                                                        disabled={isBusy}
                                                        value={editingProductModality}
                                                        onChange={e => setEditingProductModality(e.target.value as StudyModality)}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-[#003B7A] focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                                                    >
                                                        <option value="Disponible en Sucursal y Domicilio">{t('Disponible en Sucursal y Domicilio', 'Branch & Home Service')}</option>
                                                        <option value="Disponible solo en Sucursal">{t('Disponible solo en Sucursal', 'Branch Only')}</option>
                                                        <option value="Disponible solo a Domicilio">{t('Disponible solo a Domicilio', 'Home Draw Only')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-[#003B7A] uppercase mb-1">
                                                    {t('Descripción / Parámetros Clínicos (Opcional)', 'Description / Clinical Parameters (Optional)')}
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled={isBusy}
                                                    value={editingProductDescription}
                                                    onChange={e => setEditingProductDescription(e.target.value)}
                                                    placeholder={t('ej. Incluye HbA1c, glucosa en ayuno y microalbuminuria', 'e.g. Includes HbA1c, fasting glucose, and microalbuminuria')}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => setEditingProductIndex(null)}
                                                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50"
                                                >
                                                    {t('Cancelar', 'Cancel')}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isBusy || !editingProductTitle.trim()}
                                                    onClick={() => {
                                                        const updated = [...simulationProducts];
                                                        updated[i] = formatSimulationProduct(editingProductTitle, editingProductModality, editingProductDescription);
                                                        setSimulationProducts(updated);
                                                        setEditingProductIndex(null);
                                                    }}
                                                    className="px-4 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#004ECC] text-white text-xs font-bold flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 size={14} />
                                                    {t('Guardar Cambios', 'Save Changes')}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={i} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-200 hover:border-[#0066FF]/50 transition-colors">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200 text-[#0066FF] flex-shrink-0 mt-0.5">
                                                <ShoppingCart size={16} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-bold text-[#003B7A] truncate" title={parsed.title}>
                                                    {parsed.title}
                                                </div>
                                                {parsed.description && (
                                                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                                        {parsed.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <select
                                                disabled={isBusy}
                                                value={parsed.modality}
                                                onChange={(e) => {
                                                    const newMod = e.target.value as StudyModality;
                                                    const updated = [...simulationProducts];
                                                    updated[i] = formatSimulationProduct(parsed.title, newMod, parsed.description);
                                                    setSimulationProducts(updated);
                                                }}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-[#0066FF] cursor-pointer ${
                                                    parsed.modality === 'Disponible solo en Sucursal'
                                                        ? 'bg-indigo-50 text-[#003B7A] border-indigo-200'
                                                        : parsed.modality === 'Disponible solo a Domicilio'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-[#EFF6FF] text-[#0066FF] border-blue-200'
                                                }`}
                                            >
                                                <option value="Disponible en Sucursal y Domicilio">{t('Disponible en Sucursal y Domicilio', 'Branch & Home Service')}</option>
                                                <option value="Disponible solo en Sucursal">{t('Disponible solo en Sucursal', 'Branch Only')}</option>
                                                <option value="Disponible solo a Domicilio">{t('Disponible solo a Domicilio', 'Home Draw Only')}</option>
                                            </select>

                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => {
                                                    setEditingProductIndex(i);
                                                    setEditingProductTitle(parsed.title);
                                                    setEditingProductDescription(parsed.description);
                                                    setEditingProductModality(parsed.modality);
                                                }}
                                                className="p-2 rounded-lg text-slate-500 hover:text-[#0066FF] hover:bg-blue-50 transition-colors"
                                                title={t("Editar Estudio", "Edit Study")}
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => {
                                                    if (editingProductIndex === i) setEditingProductIndex(null);
                                                    setSimulationProducts(simulationProducts.filter((_, idx) => idx !== i));
                                                }}
                                                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title={t("Eliminar Estudio", "Remove Study")}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                    setEditingProductIndex(null);
                                    setShowProducts(false);
                                }}
                                className="btn-secondary px-5 py-2 text-xs font-bold"
                            >
                                {t('Cerrar', 'Close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Active Synthetic Users Inspector Modal */}
            {isSyntheticUsersModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[86vh] border border-slate-200">
                        <div className="w-full h-1.5 bg-[#0066FF]" />
                        <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-[#003B7A] flex items-center gap-2 text-xl">
                                    <Users size={22} className="text-[#0066FF]" />
                                    {t('Usuarios Sintéticos Activos en Focus Group', 'Active Synthetic Users in Focus Group')} ({syntheticUsers.length})
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {t(
                                        'Estos perfiles generados en el módulo "Usuarios Sintéticos" son los participantes que evalúan tus Promociones, Brief, Emails, Compra de Estudios, Imágenes/Banners y A/B Tests.',
                                        'These profiles generated in the "Synthetic Users" module are the participants evaluating your Promotions, Brief, Emails, Study Purchases, Creative Assets, and A/B Tests.'
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSyntheticUsersModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#F8FAFC] space-y-3">
                            {syntheticUsers.map((u, idx) => {
                                const segMeta = getPersonaSegmentMeta(u);
                                return (
                                <div key={u.id || idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="font-bold text-[#003B7A] text-sm">
                                                    {idx + 1}. {formatDisplayPersonaLabel(localizePersonaLabel(u.name || u.personaName, language))}
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${segMeta.badgeClass}`}>
                                                    {segMeta.label}
                                                </span>
                                            </div>
                                            {u.demographics && (
                                                <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                    {u.demographics}
                                                </div>
                                            )}
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#0066FF] text-[11px] font-bold">
                                            {formatDisplayPersonaLabel(localizePersonaLabel(u.baseAudienceName || u.personaName || u.name, language))}
                                        </span>
                                    </div>
                                    {u.bio && (
                                        <p className="text-xs text-slate-600 italic leading-relaxed border-l-2 border-blue-200 pl-3">
                                            "{u.bio}"
                                        </p>
                                    )}
                                </div>
                                );
                            })}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-500">
                                {t('Para generar otra cantidad o cohorte, ve al módulo "Usuarios Sintéticos" en el menú lateral.', 'To generate a different count or cohort, go to the "Synthetic Users" module in the sidebar.')}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsSyntheticUsersModalOpen(false)}
                                className="btn-secondary px-5 py-2 text-xs font-bold shrink-0"
                            >
                                {t('Cerrar', 'Close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Interview Modal */}
            {interviewPersona && brief && (
                <SyntheticInterview
                    persona={interviewPersona.persona}
                    simulationResult={interviewPersona.result}
                    brief={brief}
                    onClose={() => setInterviewPersona(null)}
                />
            )}
        </div>
    );
};
