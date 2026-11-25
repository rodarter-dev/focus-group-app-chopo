import { Schema, Type } from "@google/genai";
import { brandConfig } from "../config";
import { getCurrentLanguage } from "../context/LanguageContext";
import {
    buildBrandSlices,
    getSubformatsForChannel,
    resolveSegmentKey,
    resolveTrackFromSegment
} from "./brandManualUtils";
import type {
    AudienceTrack,
    AssetStage,
    BrandAudienceSegmentKey,
    BrandChannelKey,
    BrandManualConfig,
    BrandManualSlices,
    FunnelStage,
    MarketingAssets,
    MarketingBriefData,
    CombinedPersona,
    ABTestResult,
    InterviewResult,
    FocusGroupRubric,
    RubricScore,
    ClinicalUseCase,
    ConfigVersionSnapshot
} from "../types";
export type {
    AudienceTrack,
    AssetStage,
    BrandAudienceSegmentKey,
    BrandChannelKey,
    BrandManualConfig,
    BrandManualSlices,
    FunnelStage,
    MarketingAssets,
    FocusGroupRubric,
    RubricScore,
    ClinicalUseCase,
    ConfigVersionSnapshot
};

export interface BrandV4CampaignOptions {
    audienceSegment?: BrandAudienceSegmentKey;
    funnelStage?: FunnelStage;
    channelKey?: BrandChannelKey;
    channelSubformat?: string;
}

export const MODEL_TEXT = "gemini-3.5-flash";

const DEFAULT_OFFICIAL_BRAND_NAME = "Laboratorio Médico del Chopo";

const getLanguageInstruction = (): string => {
    const lang = getCurrentLanguage();
    if (lang === 'es') {
        return `\nCRITICAL LANGUAGE RULE: Write all human-readable text values, bios, feedback, explanations, quotes, suggestions, and responses in natural Mexican Spanish (Español de México). However, you MUST keep all JSON property keys and enum tokens (such as 'Positive', 'Neutral', 'Negative', 'A', 'B') strictly in English ASCII exactly as defined in the output format.`;
    }
    return `\nCRITICAL LANGUAGE RULE: Write all output values and explanations in English.`;
};

// --- Brand Manual V4 Deterministic Track & Segment Detection (B2C = patient, B2D = physician, B2B = enterprise) ---

const PHYSICIAN_TEXT_REGEX = /\bb2d\b|m[eé]dic|doctor|physician|especialista|cardi[oó]log|ginec[oó]log|onc[oó]log|endocrin[oó]log|prescriptor/i;
const ENTERPRISE_TEXT_REGEX = /\bb2b\b|empresa|corporativ|recursos humanos|director(?:a)? de rh|salud ocupacional/i;

const stripPatientDoctorMentions = (text: string): string =>
    text
        .replace(/\b(?:consulte?|consulta|pide|pidi[oó]|recomiend[ae]|indica|mano de)\s+(?:a\s+)?(?:su|tu)\s+m[eé]dic[oa]\b/gi, '')
        .replace(/\b(?:su|tu)\s+m[eé]dic[oa]\b/gi, '');

export const detectTrackAndSegment = (
    input?: {
        audienceSegment?: BrandAudienceSegmentKey | string;
        track?: AudienceTrack | string;
        text?: string;
    } | string
): { track: AudienceTrack; audienceSegment: BrandAudienceSegmentKey } => {
    const opts = typeof input === 'string' ? { text: input } : (input || {});
    const rawSeg = String(opts.audienceSegment || '').trim().toLowerCase();
    if (rawSeg === 'b2c_patients' || rawSeg === 'b2d_doctors' || rawSeg === 'b2b_enterprises') {
        const audienceSegment = resolveSegmentKey(rawSeg);
        return { track: resolveTrackFromSegment(audienceSegment), audienceSegment };
    }

    const rawTrack = String(opts.track || '').trim().toLowerCase();
    const cleanedText = stripPatientDoctorMentions(String(opts.text || ''));

    if (rawTrack === 'physician' || rawTrack === 'b2d' || rawTrack === 'b2d_doctors') {
        return { track: 'physician', audienceSegment: 'b2d_doctors' };
    }
    if (rawTrack === 'enterprise' || rawTrack === 'b2b_enterprises') {
        return { track: 'enterprise', audienceSegment: 'b2b_enterprises' };
    }
    if (rawTrack === 'patient' || rawTrack === 'b2c' || rawTrack === 'b2c_patients') {
        return { track: 'patient', audienceSegment: 'b2c_patients' };
    }
    if (rawTrack === 'b2b') {
        // Legacy personas tagged (Médico B2B) must still map to physician / b2d_doctors
        if (PHYSICIAN_TEXT_REGEX.test(cleanedText)) {
            return { track: 'physician', audienceSegment: 'b2d_doctors' };
        }
        return { track: 'enterprise', audienceSegment: 'b2b_enterprises' };
    }

    if (PHYSICIAN_TEXT_REGEX.test(cleanedText)) {
        return { track: 'physician', audienceSegment: 'b2d_doctors' };
    }
    if (ENTERPRISE_TEXT_REGEX.test(cleanedText)) {
        return { track: 'enterprise', audienceSegment: 'b2b_enterprises' };
    }
    return { track: 'patient', audienceSegment: 'b2c_patients' };
};

const detectPersonaTrack = (persona: any): { track: AudienceTrack; audienceSegment: BrandAudienceSegmentKey } =>
    detectTrackAndSegment({
        track: persona?.track,
        text: `${persona?.name || ''} ${persona?.job_title || persona?.details?.job_title || ''}`
    });

const buildCleanPhotoDirective = (photoSlice?: BrandManualSlices['photoSlice']): string => {
    if (!photoSlice) {
        return 'Fotografía pura y limpia, iluminación natural cálida de día, personas mexicanas reales en actitud tranquila, sin estetoscopio en el cuello de médicos, sin placas radiográficas físicas impresas, sin agujas perforando piel ni sangre explícita, sin texto incrustado, sin logotipos y sin líneas o gráficos vectoriales.';
    }
    const parts: string[] = [];
    if (photoSlice.colorTemperatureRule) parts.push(String(photoSlice.colorTemperatureRule));
    if (photoSlice.cleanBaseImageRuleForAI) parts.push(String(photoSlice.cleanBaseImageRuleForAI));
    if (photoSlice.ambientPromptGuidance) parts.push(String(photoSlice.ambientPromptGuidance));
    if (photoSlice.channelPhotoRules) parts.push(String(photoSlice.channelPhotoRules));
    if (Array.isArray(photoSlice.donts) && photoSlice.donts.length > 0) {
        parts.push(`Restricciones estrictas: ${photoSlice.donts.join('; ')}`);
    }
    return parts.length > 0
        ? parts.join(' ')
        : 'Fotografía pura y limpia, iluminación natural cálida de día, personas mexicanas reales en actitud tranquila, sin estetoscopio en el cuello de médicos, sin placas radiográficas físicas impresas, sin agujas ni sangre, sin texto incrustado, sin logotipos y sin gráficos vectoriales.';
};

const resolveAspectRatioForSubformat = (channelSubformat?: string, channelKey?: BrandChannelKey): string => {
    const sub = String(channelSubformat || '').toLowerCase();
    if (/9:16|historia|reel|tiktok/.test(sub)) return '9:16';
    if (/4:5|p[oó]ster|folleto|d[ií]ptico|tr[ií]ptico/.test(sub)) return '3:4';
    if (/hero|horizontal|banner|mailing|lona|microperforado/.test(sub)) return '16:9';
    if (channelKey === 'web' || channelKey === 'mailing_ecommerce') return '16:9';
    if (channelKey === 'pdv_sucursal') return '3:4';
    return '1:1';
};

// --- Brand Manual V4 API Client + 30s Lightweight Cache ---

const BRAND_MANUAL_CACHE_TTL_MS = 30_000;
let cachedBrandManual: BrandManualConfig | null = null;
let cachedBrandManualFetchedAt = 0;
let inFlightBrandManualPromise: Promise<BrandManualConfig | null> | null = null;

const extractBrandManualCandidate = (payload: any): BrandManualConfig | null => {
    if (!payload || typeof payload !== 'object') return null;
    const candidate = payload.brandManual || payload.manual || payload.data || payload;
    if (
        candidate &&
        typeof candidate === 'object' &&
        !Array.isArray(candidate) &&
        (candidate.identity_and_voice || candidate.photography_and_imagery || candidate.metadata?.id === 'chopo_brand_manual_v4')
    ) {
        return candidate as BrandManualConfig;
    }
    return null;
};

export const invalidateBrandManualCache = (): void => {
    cachedBrandManual = null;
    cachedBrandManualFetchedAt = 0;
    inFlightBrandManualPromise = null;
};

export const fetchBrandManual = async (forceRefresh: boolean = false): Promise<BrandManualConfig | null> => {
    const now = Date.now();
    if (!forceRefresh && cachedBrandManual && (now - cachedBrandManualFetchedAt) < BRAND_MANUAL_CACHE_TTL_MS) {
        return cachedBrandManual;
    }
    if (!forceRefresh && inFlightBrandManualPromise) {
        return inFlightBrandManualPromise;
    }

    const requestPromise = (async (): Promise<BrandManualConfig | null> => {
        try {
            const res = await fetch('/api/config/brand-manual');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const parsed = extractBrandManualCandidate(data);
            if (parsed) {
                cachedBrandManual = parsed;
                cachedBrandManualFetchedAt = Date.now();
                return parsed;
            }
            return null;
        } catch (e) {
            console.warn('Failed to fetch Brand Manual V4 from /api/config/brand-manual:', e);
            return cachedBrandManual || null;
        } finally {
            inFlightBrandManualPromise = null;
        }
    })();

    inFlightBrandManualPromise = requestPromise;
    return requestPromise;
};

export const saveBrandManual = async (
    manual: BrandManualConfig,
    label?: string
): Promise<BrandManualConfig> => {
    const res = await fetch('/api/config/brand-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual, label })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save brand manual');
    }
    const data = await res.json();
    const saved = extractBrandManualCandidate(data) || manual;
    cachedBrandManual = saved;
    cachedBrandManualFetchedAt = Date.now();
    inFlightBrandManualPromise = null;
    return saved;
};

// --- Fallback Official Rubrics (Used if /api/rubrics is unreachable) ---
export const DEFAULT_CHOPO_RUBRICS: FocusGroupRubric[] = [
    {
        id: "clarity_3s",
        name: "Claridad y Concisión (3 seg de Scroll)",
        track: "all",
        weight: 25,
        evaluationQuestion: "¿Se entiende en 3 segundos qué estudio o solución se anuncia y cuál es el beneficio principal sin saturar de texto?",
        scoringAnchors: {
            low_0_to_40: "El texto es demasiado largo (más de 3-4 líneas comerciales en formatos rápidos), parece un folleto denso o instructivo de sucursal y da flojera leerlo.",
            mid_41_to_79: "El mensaje se entiende pero tiene palabras de más o el beneficio principal no destaca en la primera línea.",
            high_80_to_100: "Mensaje directo, ágil y escaneable en segundos: gancho claro en la primera línea y llamado a la acción inmediato."
        }
    },
    {
        id: "visual_trust_warmth",
        name: "Confianza Visual y Calidez Humana",
        track: "all",
        weight: 25,
        evaluationQuestion: "¿La imagen y el tono transmiten la confianza, calidez humana, modernidad digital y cercanía de Laboratorio Médico del Chopo?",
        scoringAnchors: {
            low_0_to_40: "La imagen se ve falsa, fría, oscura, anticuada (ej. placas radiográficas físicas a contraluz), muestra agujas/sangre o tiene inconsistencias clínicas.",
            mid_41_to_79: "Imagen aceptable pero genérica de foto de stock sin calidez o identidad clara.",
            high_80_to_100: "Fotografía auténtica, luminosa y cálida con personas reales en México y enfoque digital moderno que inspira tranquilidad."
        }
    },
    {
        id: "digital_ease_promo",
        name: "Atractivo Promocional y Facilidad Digital",
        track: "patient",
        weight: 25,
        evaluationQuestion: "¿Qué tan fácil y conveniente se percibe agendar/pagar en línea (App Chopo o chopo.com.mx) y recibir resultados digitales?",
        scoringAnchors: {
            low_0_to_40: "No queda claro cómo agendar en línea, no menciona el beneficio de resultados digitales en la App/celular, o parece que hay que ir a hacer fila para cotizar.",
            mid_41_to_79: "Menciona el sitio web pero no resalta la comodidad de pagar en línea o consultar resultados en el celular.",
            high_80_to_100: "Motiva de inmediato a usar la App Chopo o chopo.com.mx por su practicidad (cero filas, precio especial en línea y resultados directo en el celular)."
        }
    },
    {
        id: "patient_action_intent",
        name: "Intención de Agendar Estudio",
        track: "patient",
        weight: 25,
        evaluationQuestion: "Con base en tus necesidades personales y familiares, ¿qué tan probable es que te detengas y entres a la App Chopo o chopo.com.mx para agendar?",
        scoringAnchors: {
            low_0_to_40: "Pasaría de largo el anuncio porque me aburrió, me generó desconfianza o no conecta con mi necesidad de salud.",
            mid_41_to_79: "Me llama la atención el estudio pero lo dejaría para después.",
            high_80_to_100: "Me detendría y entraría en este momento para cotizar o agendar mi estudio en línea."
        }
    },
    {
        id: "clinical_utility_rigor",
        name: "Rigor Clínico y Utilidad Diagnóstica",
        track: "physician",
        weight: 25,
        evaluationQuestion: "Como médico, ¿el mensaje proyecta seriedad científica, precisión analítica y utilidad real para el seguimiento de tus pacientes?",
        scoringAnchors: {
            low_0_to_40: "Tono sensacionalista o comercial superficial, promete diagnósticos mágicos, o carece de seriedad médica para respaldar mis decisiones clínicas.",
            mid_41_to_79: "Mensaje correcto pero demasiado genérico para un profesional de la salud.",
            high_80_to_100: "Comunica precisión diagnóstica, respaldo de especialistas certificados y entrega digital práctica para revisar resultados en consulta."
        }
    },
    {
        id: "physician_prescription_intent",
        name: "Intención de Prescribir / Recomendar a Pacientes",
        track: "physician",
        weight: 25,
        evaluationQuestion: "¿Qué tan probable es que recomiendes o envíes a tus pacientes a realizarse este estudio en Laboratorio Médico del Chopo?",
        scoringAnchors: {
            low_0_to_40: "No lo recomendaría porque el anuncio confunde al paciente o muestra inconsistencias clínicas.",
            mid_41_to_79: "Lo consideraría como una opción más entre varios laboratorios.",
            high_80_to_100: "Lo recomendaría activamente a mis pacientes por su confiabilidad, accesibilidad y facilidad de consulta digital de resultados."
        }
    },
    {
        id: "enterprise_solution_fit",
        name: "Solidez Corporativa y Salud Ocupacional",
        track: "enterprise",
        weight: 25,
        evaluationQuestion: "Como responsable de empresa o Recursos Humanos, ¿el mensaje transmite cobertura, orden operativo y respaldo institucional para cuidar a sus colaboradores?",
        scoringAnchors: {
            low_0_to_40: "Tono informal o genérico que no aborda necesidades corporativas de cobertura, convenios ni reportes claros.",
            mid_41_to_79: "Mensaje comprensible pero poco diferenciado frente a otros proveedores de salud ocupacional.",
            high_80_to_100: "Proyecta solidez institucional, trato respetuoso, cobertura nacional y agilidad en programas preventivos empresariales."
        }
    },
    {
        id: "enterprise_action_intent",
        name: "Intención de Solicitar Cotización o Convenio",
        track: "enterprise",
        weight: 25,
        evaluationQuestion: "¿Qué tan probable es que solicite información o un convenio corporativo en chopo.com.mx/empresas a partir de este material?",
        scoringAnchors: {
            low_0_to_40: "No contactaría porque no explica beneficios concretos para la empresa ni facilita un canal claro.",
            mid_41_to_79: "Lo guardaría como referencia para revisarlo más adelante.",
            high_80_to_100: "Solicitaría una cotización o reunión corporativa de inmediato para evaluar un convenio."
        }
    }
];

// --- Dynamic Catalog, Rubrics, Use Cases, Versioning & RAG Client Functions ---

export const fetchPersonas = async (): Promise<CombinedPersona[]> => {
    try {
        const res = await fetch('/api/personas');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : (data?.personas || []);
    } catch (e) {
        console.warn("Failed to fetch personas from /api/personas:", e);
        return [];
    }
};

export const savePersonas = async (personas: CombinedPersona[], label?: string): Promise<CombinedPersona[]> => {
    const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personas, label })
    });
    if (!res.ok) throw new Error('Failed to save personas');
    const data = await res.json();
    return data?.personas || personas;
};

export const fetchRubrics = async (): Promise<FocusGroupRubric[]> => {
    try {
        const res = await fetch('/api/rubrics');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.rubrics || []);
        return list.length > 0 ? list : DEFAULT_CHOPO_RUBRICS;
    } catch (e) {
        console.warn("Failed to fetch rubrics from /api/rubrics, using default seed rubrics:", e);
        return DEFAULT_CHOPO_RUBRICS;
    }
};

export const saveRubrics = async (rubrics: FocusGroupRubric[], label?: string): Promise<FocusGroupRubric[]> => {
    const res = await fetch('/api/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubrics, label })
    });
    if (!res.ok) throw new Error('Failed to save rubrics');
    const data = await res.json();
    return data?.rubrics || rubrics;
};

export const fetchUseCases = async (): Promise<ClinicalUseCase[]> => {
    try {
        const res = await fetch('/api/use-cases');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : (data?.useCases || []);
    } catch (e) {
        console.warn("Failed to fetch use cases from /api/use-cases:", e);
        return [];
    }
};

export const saveUseCases = async (useCases: ClinicalUseCase[], label?: string): Promise<ClinicalUseCase[]> => {
    const res = await fetch('/api/use-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCases, label })
    });
    if (!res.ok) throw new Error('Failed to save use cases');
    const data = await res.json();
    return data?.useCases || useCases;
};

export const fetchConfigVersions = async (
    entityType: 'personas' | 'rubrics' | 'use_cases' | 'prompts' | 'rag_docs' | 'brand_manual'
): Promise<ConfigVersionSnapshot[]> => {
    try {
        const res = await fetch(`/api/config-versions/${entityType}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn(`Failed to fetch config versions for ${entityType}:`, e);
        return [];
    }
};

export const restoreConfigVersion = async (
    entityType: 'personas' | 'rubrics' | 'use_cases' | 'prompts' | 'rag_docs' | 'brand_manual',
    versionId: string
): Promise<any> => {
    const res = await fetch('/api/config-versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, versionId })
    });
    if (!res.ok) throw new Error(`Failed to restore ${entityType} version ${versionId}`);
    const result = await res.json();
    if (entityType === 'brand_manual') {
        invalidateBrandManualCache();
    }
    return result;
};

export const fetchRagDocs = async (): Promise<Record<string, string>> => {
    try {
        const res = await fetch('/api/rag/docs');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const docs = data?.documents || data?.docs || data;
        if (docs && typeof docs === 'object' && !Array.isArray(docs) && Object.keys(docs).length > 0) {
            return docs;
        }
    } catch (e) {
        console.warn('Failed to fetch RAG docs from server:', e);
    }
    return {
        '01_cofepris_lineamientos.md': '# Lineamientos COFEPRIS\n- Permiso de Publicidad COFEPRIS No. 2609152002A00518\n- Consulte a su médico.\n- Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.',
        '03_catalogo_estudios_diabetes.md': '# Catálogo de Estudios y Preparación Clínica\n- Check-up Control Diabetes (HbA1c, Química Sanguínea y EGO/Microalbuminuria).\n- Ayuno obligatorio de 8 a 12 horas.',
        '04_reglas_realismo_clinico_y_operativo.md': '# Reglas de Imagen y Realismo Clínico\n- Resultados 100% digitales en App Chopo / smartphone / tablet (prohibido placas físicas a contraluz).\n- Prohibido mostrar agujas perforando la piel o sangre explícita.'
    };
};

export const saveRagDocs = async (
    docs: Record<string, string>,
    label?: string
): Promise<Record<string, string>> => {
    const res = await fetch('/api/rag/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docs, label })
    });
    if (!res.ok) throw new Error('Failed to save RAG documents');
    const data = await res.json();
    return data?.documents || docs;
};

export const uploadRagFile = async (payload: {
    filename: string;
    mimeType: string;
    base64Data?: string;
    textContent?: string;
}): Promise<{ filename: string; content: string }> => {
    const res = await fetch('/api/rag/upload-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to upload RAG file');
    return res.json();
};

export const retrieveRagContext = async (
    studyName: string = 'Check-up Control Diabetes',
    track: string = 'patient',
    query: string = ''
): Promise<{
    studyName: string;
    track: string;
    useCase: ClinicalUseCase | null;
    chunks: Array<{ id: string; title: string; content: string }>;
    combinedContext: string;
}> => {
    try {
        const res = await fetch('/api/rag/retrieve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studyName, track, query })
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.warn("Fallback to local RAG rules summary:", e);
    }
    return {
        studyName,
        track,
        useCase: null,
        chunks: [],
        combinedContext: `
        - COF-001/002/003: Incluir leyenda precautoria del segmento, Permiso/Aviso de Publicidad COFEPRIS vigente y Responsable Sanitario con Cédula Profesional.
        - COF-004/005/006/007: Prohibido prometer curas, autodiagnóstico o tono alarmista. Todo en español claro.
        - CLN-001/002: Check-up Control Diabetes requiere ayuno de 8 a 12 h (HbA1c aislada no requiere ayuno estricto).
        - RLM-001..004: Entrega de resultados 100% digital en App Chopo / tablet / smartphone (PROHIBIDO mostrar placas radiográficas físicas impresas a contraluz, PROHIBIDO agujas perforando la piel o sangre explícita). Paciente en ropa casual para toma de muestra sanguínea y bata clínica en estudios de imagenología.
        `
    };
};

export const evaluateCreativeCompliance = async (payload: {
    copyText: string;
    imageUrl?: string | null;
    track?: string;
    clinicalLine?: string;
    audienceSegment?: BrandAudienceSegmentKey;
    funnelStage?: FunnelStage;
    channelKey?: BrandChannelKey;
    channelSubformat?: string;
    assetStage?: AssetStage;
}): Promise<any> => {
    const res = await fetch('/api/evaluator/single-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to run compliance check');
    }
    return res.json();
};

// --- Proxy Call Helper ---
const callGenAiProxy = async (endpoint: string, payload: any): Promise<any> => {
    const response = await fetch(`/api/genai/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to call GenAI proxy ${endpoint}: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
    }
    
    return response.json();
};

// --- Helper for Text Extraction ---
export const extractTextFromResponse = (response: any): string => {
    if (response?.text) return response.text; // SDK native
    const candidates = response?.candidates || response?.response?.candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0]?.content?.parts;
        if (parts && parts.length > 0) {
            return parts.map((p: any) => p.text || '').join('');
        }
    }
    return '';
};

// --- Helper for Image Extraction ---
const extractImageFromResponse = (response: any): string | null => {
    if (!response) {
        console.warn("Gemini response is null or undefined.");
        return null;
    }

    const candidates = response?.candidates || response?.response?.candidates;

    if (!candidates || !candidates.length) {
        console.warn("No candidates found in Gemini response. Keys:", Object.keys(response));
        return null;
    }

    for (const candidate of candidates) {
        const parts = candidate?.content?.parts;
        if (parts) {
            for (const part of parts) {
                // @ts-ignore
                if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                    // @ts-ignore
                    return part.inlineData.data;
                }
            }
        }
    }
    return null;
};

/**
 * Generates text using Gemini.
 */
export const generateText = async (prompt: string, model: string = "gemini-3-flash-preview"): Promise<string> => {
    try {
        const response = await callGenAiProxy("generateContent", {
            model: model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        return extractTextFromResponse(response) || "";
    } catch (error) {
        console.error("Error generating text:", error);
        throw error;
    }
};

/**
 * Generates JSON using Gemini with a schema.
 */
export const generateJson = async (prompt: string, schema: Schema, model: string = "gemini-3-flash-preview"): Promise<any> => {
    try {
        const response = await callGenAiProxy("generateContent", {
            model: model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        const text = extractTextFromResponse(response);
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error("Error generating JSON:", error);
        throw error;
    }
};

/**
 * Generates an image using Gemini (Vertex AI normalized to gemini-2.5-flash-image).
 * Returns base64 string of the image.
 */
export const generateImage = async (prompt: string, model: string = "gemini-2.5-flash-image", aspectRatio: string = "1:1"): Promise<string | null> => {
    try {
        console.log(`Generating image with model ${model} and prompt: ${prompt}`);

        const response = await callGenAiProxy("generateContent", {
            model: model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseModalities: ["IMAGE", "TEXT"],
                // @ts-ignore
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: "1K",
                    // @ts-ignore
                    outputMimeType: "image/jpeg"
                }
            }
        });

        const imageBase64 = extractImageFromResponse(response);
        if (imageBase64) return imageBase64;

        console.warn("No image found in response parts.");
        return null;
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
};

/**
 * Generates an image using Gemini with a reference image.
 */
export const generateImageWithReference = async (prompt: string, referenceImageBase64s: string[], mimeType: string = "image/png", model: string = "gemini-2.5-flash-image", aspectRatio: string = "1:1"): Promise<string | null> => {
    try {
        console.log(`Generating image with reference, model ${model}. Prompt: ${prompt}, Aspect: ${aspectRatio}`);
        console.log(`Reference Images count: ${referenceImageBase64s.length}`);

        const response = await callGenAiProxy("generateContent", {
            model: model,
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    ...referenceImageBase64s.map(img => ({ 
                        inlineData: { mimeType: mimeType, data: img.replace(/^data:image\/\w+;base64,/, '') } 
                    }))
                ]
            }],
            config: {
                responseModalities: ["IMAGE"],
                // @ts-ignore
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: "1K",
                    // @ts-ignore
                    outputMimeType: "image/jpeg"
                }
            }
        });

        const imageBase64 = extractImageFromResponse(response);
        if (imageBase64) return imageBase64;

        console.warn("No image found in response parts.");
        return null;
    } catch (error) {
        console.error("Error generating image with reference:", error);
        return null;
    }
};

/**
 * Helper to convert File to base64
 */
export const fileToGenerativePart = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- Chopo Diagnostics (Grupo PROA) Logic ---

export const generateAudienceSegments = async (context: string): Promise<any[]> => {
    try {
        const brandManual = await fetchBrandManual();
        const b2cSlices = buildBrandSlices(brandManual, { audienceSegment: 'b2c_patients' });
        const b2dSlices = buildBrandSlices(brandManual, { audienceSegment: 'b2d_doctors' });
        const b2bSlices = buildBrandSlices(brandManual, { audienceSegment: 'b2b_enterprises' });
        const officialName = b2cSlices.dynamicVars.officialName;
        const slogan = b2cSlices.dynamicVars.slogan;

        const segmentsOverview = {
            purpose: b2cSlices.segmentContext.purpose,
            segments: [
                b2cSlices.segmentContext.segment,
                b2dSlices.segmentContext.segment,
                b2bSlices.segmentContext.segment
            ].filter(Boolean)
        };

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Eres un experto en investigación de mercados médicos y comportamiento del consumidor en salud en México para ${officialName} ("${slogan}").
                    Contexto Institucional: ${context}

                    Contexto estratégico de segmentos extraído del Manual de Marca:
                    ${JSON.stringify(segmentsOverview, null, 2)}

                    Tarea: Crea exactamente 3 segmentos de audiencia clínica altamente relevantes en México cubriendo los 3 tracks oficiales: Paciente B2C ("patient"), Médico B2D ("physician") y Empresa B2B ("enterprise").

                    Reglas estrictas:
                    - 100% datos sintéticos (cero datos personales reales).
                    - Contexto cultural, clínico y socioeconómico auténtico de México (CDMX, Guadalajara, Monterrey, Puebla, Querétaro, Mérida, Hermosillo, Tuxtla Gutiérrez, etc.).
                    - Psicología realista de pacientes, médicos o responsables de salud empresarial reales viendo comunicación en su celular, correo o sucursal: evalúan claridad comercial, facilidad digital (App Chopo / chopo.com.mx), calidez visual y confianza diagnóstica (nunca hablan con voz corporativa de marca ni actúan como inspectores legales).

                    Devuelve un arreglo JSON válido con objetos que sigan esta estructura exacta:
                    [
                        {
                            "track": "patient",
                            "name": "Nombre del Segmento (Paciente B2C)",
                            "personaName": "Nombre Completo (Edad, Ciudad)",
                            "bio": "Descripción de 2 oraciones...",
                            "demographics": "Rango de edad, Ciudad, NSE...",
                            "imagePrompt": "Retrato fotográfico realista y cálido de una persona mexicana en entorno cotidiano o clínico luminoso, sin estetoscopio en médicos y sin texto incrustado..."
                        }
                    ]
                    No uses bloques markdown.
                    ${getLanguageInstruction()}
                `
                }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "[]";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Audience generation error:", error);
        return [];
    }
};

export const generateSyntheticPersona = async (personaName: string, audienceName: string, context: string): Promise<any> => {
    try {
        const { track: resolvedTrack, audienceSegment } = detectTrackAndSegment({ text: audienceName });
        const brandManual = await fetchBrandManual();
        const slices = buildBrandSlices(brandManual, { audienceSegment, track: resolvedTrack });
        const { officialName, slogan, segmentLabel } = slices.dynamicVars;

        const prompt = `
        Eres un analista experto en investigación médica y comportamiento del consumidor en salud en México para ${officialName} ("${slogan}").
        Genera el perfil detallado para la siguiente persona sintética bajo nuestro esquema fijo depurado.

        Contexto estratégico del segmento objetivo extraído del Manual de Marca:
        ${JSON.stringify(slices.segmentContext, null, 2)}

        **Contexto Institucional:**
        ${context}

        **Segmento de Audiencia:**
        ${audienceName} (${segmentLabel} — track "${resolvedTrack}")

        **Nombre de la Persona:**
        ${personaName}

        Reglas estrictas:
        - 100% datos sintéticos (cero datos personales reales).
        - Contexto cultural, clínico y socioeconómico auténtico de México.
        - Psicología realista viendo comunicación en su celular, correo o sucursal (nunca hablan con voz corporativa de marca ni actúan como inspectores legales).

        **Requisitos de Salida (Esquema Fijo Depurado):**
        Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
        {
            "name": "${personaName}",
            "track": "${resolvedTrack}",
            "age": 42,
            "job_title": "Ocupación, Especialidad Médica o Cargo Corporativo",
            "bio": "Biografía realista en 2 oraciones sobre su relación con el cuidado de la salud, estudios diagnósticos y uso digital.",
            "income": "Nivel de ingreso mensual estimado en MXN",
            "lifestyle_tags": ["tag1", "tag2", "tag3", "tag4"],
            "preferred_products": ["Check-up Control Diabetes", "Hemoglobina Glicosilada (HbA1c)", "Check-up Completo Chopo"],
            "pain_points": [
                "Punto de dolor realista al ver comunicación de salud o coordinar estudios 1",
                "Punto de dolor 2",
                "Punto de dolor 3"
            ],
            "goals": [
                "Objetivo práctico de salud, clínica o salud ocupacional 1",
                "Objetivo 2"
            ]
        }
        No uses bloques markdown.
        ${getLanguageInstruction()}
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Persona generation error:", error);
        return null;
    }
};

export const generateSingleAudienceFromPrompt = async (
    promptText: string,
    track: 'B2C' | 'B2D' | 'B2B',
    companyDescription: string
): Promise<CombinedPersona> => {
    const normalizedTrackCode: 'B2C' | 'B2D' | 'B2B' =
        track === 'B2D' ? 'B2D' : track === 'B2B' ? 'B2B' : 'B2C';
    const internalTrack: AudienceTrack =
        normalizedTrackCode === 'B2D'
            ? 'physician'
            : normalizedTrackCode === 'B2B'
                ? 'enterprise'
                : 'patient';
    const audienceSegment: BrandAudienceSegmentKey = resolveSegmentKey(internalTrack);
    const trackSuffix =
        internalTrack === 'physician'
            ? '(Médico B2D)'
            : internalTrack === 'enterprise'
                ? '(Empresa B2B)'
                : '(Paciente B2C)';

    const brandManual = await fetchBrandManual();
    const slices = buildBrandSlices(brandManual, { audienceSegment, track: internalTrack });
    const { officialName, slogan, segmentLabel, primaryDestination } = slices.dynamicVars;

    const singleAudienceSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            personaName: { type: Type.STRING },
            demographics: { type: Type.STRING },
            bio: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            details: {
                type: Type.OBJECT,
                properties: {
                    age: { type: Type.NUMBER },
                    income: { type: Type.STRING },
                    job_title: { type: Type.STRING },
                    bio: { type: Type.STRING },
                    pain_points: { type: Type.ARRAY, items: { type: Type.STRING } },
                    goals: { type: Type.ARRAY, items: { type: Type.STRING } },
                    lifestyle_tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    preferred_products: { type: Type.ARRAY, items: { type: Type.STRING } },
                    charts: {
                        type: Type.OBJECT,
                        properties: {
                            brand_affinity: {
                                type: Type.OBJECT,
                                properties: {
                                    labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    data: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                                },
                                required: ["labels", "data"]
                            }
                        },
                        required: ["brand_affinity"]
                    }
                },
                required: [
                    "age",
                    "income",
                    "job_title",
                    "bio",
                    "pain_points",
                    "goals",
                    "lifestyle_tags",
                    "preferred_products",
                    "charts"
                ]
            }
        },
        required: ["name", "personaName", "demographics", "bio", "imagePrompt", "details"]
    };

    const trackRoleExample =
        internalTrack === 'physician'
            ? {
                trackDesc: `B2D (${segmentLabel}) — Médico Prescriptor / Especialista / Profesional de la Salud en México (track: "physician")`,
                nameEx: `Médico General Recién Egresado ${trackSuffix}`,
                personaEx: 'Dr. Sebastián Mora, 26',
                jobHint: 'Especialidad o práctica clínica en México (consultorio, hospital o clínica).',
                productsHint: 'Check-up Control Diabetes, Hemoglobina Glicosilada HbA1c, Perfil Cardiometabólico, Rayos X de Tórax Digital, Resonancia Magnética, Biomarcadores Especializados'
            }
            : internalTrack === 'enterprise'
                ? {
                    trackDesc: `B2B (${segmentLabel}) — Responsable de Recursos Humanos / Salud Ocupacional / Compras Corporativas en Empresas de México (track: "enterprise")`,
                    nameEx: `Directora de Recursos Humanos Manufactura ${trackSuffix}`,
                    personaEx: 'Lic. Claudia Herrera, 41',
                    jobHint: 'Cargo corporativo (Dirección de RH, Salud Ocupacional, Bienestar Organizacional o Compras Corporativas).',
                    productsHint: 'Check-up Ejecutivo Corporativo, Exámenes Médicos de Admisión y Periódicos, Check-up Control Diabetes Corporativo, Convenio Alianza por tu Bienestar, Campañas de Prevención en Sitio'
                }
                : {
                    trackDesc: `B2C (${segmentLabel}) — Paciente / Consumidor de Salud y Prevención en México (track: "patient")`,
                    nameEx: `Mujer Embarazada Primeriza ${trackSuffix}`,
                    personaEx: 'Mariana Ríos, 29',
                    jobHint: 'Ocupación realista en México.',
                    productsHint: 'Check-up Control Diabetes, Hemoglobina Glicosilada HbA1c, Check-up Completo Chopo, Mastografía Digital + Ultrasonido, Ultrasonido Obstétrico, Química Sanguínea de 45 elementos, Perfil Tiroideo'
                };

    const prompt = `
    Eres un experto en investigación de mercados médicos y comportamiento del consumidor en salud en México para ${officialName} ("${slogan}").
    Construye exactamente 1 perfil de audiencia sintético completo (CombinedPersona) en español de México (es-MX) para la pista "${internalTrack}" a partir de la descripción del usuario.

    Contexto estratégico del segmento objetivo extraído del Manual de Marca:
    ${JSON.stringify(slices.segmentContext, null, 2)}

    **Contexto Institucional:**
    ${companyDescription || `${officialName} - Diagnóstico clínico e imagenología en México`}

    **Pista Seleccionada:**
    ${trackRoleExample.trackDesc}

    **Descripción de la Audiencia Solicitada por el Usuario:**
    "${promptText}"

    **Reglas Estrictas de Construcción:**
    - 100% datos sintéticos (cero datos personales reales).
    - Contexto cultural, clínico y socioeconómico auténtico de México (CDMX, Guadalajara, Monterrey, Puebla, Querétaro, Mérida, Hermosillo, Tuxtla Gutiérrez, etc.).
    - Psicología realista de pacientes, médicos o responsables de salud empresarial reales viendo comunicación en su celular, correo o sucursal: evalúan claridad comercial, facilidad digital (App Chopo / ${primaryDestination}), calidez visual y confianza diagnóstica (nunca hablan con voz corporativa de marca ni actúan como inspectores legales).
    1. "name": Nombre claro y ejecutivo del segmento incluyendo al final exactamente "${trackSuffix}" (ejemplo: "${trackRoleExample.nameEx}").
    2. "personaName": Nombre representativo mexicano con edad (ejemplo: "${trackRoleExample.personaEx}").
    3. "demographics": Rango de edad, ocupación/especialidad/cargo, ciudad/zona en México y nivel socioeconómico (NSE).
    4. "bio": Historia, contexto profesional/familiar y relación con la salud detallada (3 a 4 oraciones realistas).
    5. "imagePrompt": Prompt fotográfico realista y cálido para retrato natural de esta persona mexicana en entorno cotidiano, consultorio luminoso u oficina en México, sin estetoscopio en el cuello si es médico, sin texto incrustado, sin agujas perforando la piel y sin placas físicas viejas.
    6. "details":
       - "age": Edad numérica realista.
       - "income": Rango de ingreso mensual estimado en MXN o nivel socioeconómico.
       - "job_title": ${trackRoleExample.jobHint}
       - "bio": Resumen de su relación con estudios diagnósticos, uso digital (App Chopo / ${primaryDestination}) y toma de decisiones (2 a 3 oraciones).
       - "pain_points": 3 a 4 dolores o barreras reales frente a estudios clínicos, convenios o publicidad de salud.
       - "goals": 3 a 4 motivadores o metas claras de salud, práctica clínica o bienestar corporativo.
       - "lifestyle_tags": 4 a 5 etiquetas cortas del perfil.
       - "preferred_products": 3 a 5 estudios, check-ups o programas afines (${trackRoleExample.productsHint}).
       - "charts": { "brand_affinity": { "labels": ["Calidad Analítica", "Precio / Promoción", "Rapidez Digital", "Cercanía Sucursal"], "data": [n1, n2, n3, n4] } } con valores numéricos realistas de 0 a 100.

    Devuelve únicamente el objeto JSON válido.
    ${getLanguageInstruction()}
    `;

    const response = await callGenAiProxy("generateContent", {
        model: MODEL_TEXT,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: singleAudienceSchema
        }
    });

    const text = extractTextFromResponse(response) || "{}";
    const cleanText = text.replace(/```json|```/g, '').trim();
    const raw = JSON.parse(cleanText);

    const rawName = String(raw.name || promptText.slice(0, 48)).trim();
    const hasExpectedTag =
        internalTrack === 'physician'
            ? /\((?:M[eé]dico\s*B2D|B2D)\)/i.test(rawName)
            : internalTrack === 'enterprise'
                ? /\((?:Empresa\s*B2B|B2B)\)/i.test(rawName)
                : /\((?:Paciente\s*B2C|B2C)\)/i.test(rawName);
    const cleanedRawName = rawName
        .replace(/\s*\((?:Paciente\s*B2C|M[eé]dico\s*B2[BD]|Empresa\s*B2B|B2C|B2D|B2B)\)\s*$/i, '')
        .trim();
    const normalizedName = hasExpectedTag ? rawName : `${cleanedRawName || rawName} ${trackSuffix}`;

    const age = Number(raw.details?.age) || (internalTrack === 'enterprise' ? 40 : internalTrack === 'physician' ? 34 : 36);
    const defaultJobTitle =
        internalTrack === 'physician'
            ? 'Médico Prescriptor'
            : internalTrack === 'enterprise'
                ? 'Director de Recursos Humanos y Salud Ocupacional'
                : 'Profesionista';
    const jobTitle = String(raw.details?.job_title || defaultJobTitle).trim();
    const defaultPersonaName =
        internalTrack === 'physician'
            ? `Dr. Alejandro Vega, ${age}`
            : internalTrack === 'enterprise'
                ? `Lic. Claudia Herrera, ${age}`
                : `Sofía Méndez, ${age}`;
    const personaName = String(raw.personaName || defaultPersonaName).trim();
    const bio = String(raw.bio || raw.details?.bio || promptText).trim();
    const defaultDemographicsLabel =
        internalTrack === 'physician'
            ? 'Médico B2D'
            : internalTrack === 'enterprise'
                ? 'Empresa B2B'
                : 'Paciente B2C';
    const demographics = String(raw.demographics || `${age} años, Urbano México, ${defaultDemographicsLabel}`).trim();
    const painPoints = Array.isArray(raw.details?.pain_points) && raw.details.pain_points.length > 0
        ? raw.details.pain_points
        : ['Falta de tiempo para trámites presenciales', 'Información confusa sobre requisitos de ayuno o preparación'];
    const goals = Array.isArray(raw.details?.goals) && raw.details.goals.length > 0
        ? raw.details.goals
        : internalTrack === 'enterprise'
            ? ['Implementar convenios preventivos ágiles para colaboradores', 'Contar con reportes claros y cobertura nacional confiable']
            : ['Recibir resultados digitales confiables en la App Chopo', 'Agendar en línea de forma rápida y con precio transparente'];
    const lifestyleTags = Array.isArray(raw.details?.lifestyle_tags) && raw.details.lifestyle_tags.length > 0
        ? raw.details.lifestyle_tags
        : internalTrack === 'physician'
            ? ['Práctica Clínica', 'Resultados Digitales', 'Precisión Diagnóstica']
            : internalTrack === 'enterprise'
                ? ['Salud Ocupacional', 'Bienestar Corporativo', 'Cobertura Nacional']
                : ['Salud Preventiva', 'Resultados Digitales', 'App Chopo'];
    const preferredProducts = Array.isArray(raw.details?.preferred_products) && raw.details.preferred_products.length > 0
        ? raw.details.preferred_products
        : internalTrack === 'enterprise'
            ? ['Check-up Ejecutivo Corporativo', 'Exámenes Médicos Periódicos', 'Check-up Control Diabetes']
            : ['Check-up Completo Chopo', 'Química Sanguínea de 45 elementos', 'Check-up Control Diabetes'];
    const defaultAffinityData =
        internalTrack === 'physician'
            ? [96, 76, 92, 85]
            : internalTrack === 'enterprise'
                ? [94, 88, 93, 90]
                : [92, 90, 89, 88];

    return {
        id: `aud_${internalTrack}_${Date.now()}`,
        track: internalTrack,
        name: normalizedName,
        personaName,
        age,
        job_title: jobTitle,
        demographics,
        bio,
        pain_points: painPoints,
        goals,
        lifestyle_tags: lifestyleTags,
        preferred_products: preferredProducts,
        imagePrompt: String(
            raw.imagePrompt ||
            `Retrato fotográfico realista y cálido de ${personaName}, ${jobTitle} en México, luz natural de día, sin estetoscopio en médicos, sin texto incrustado`
        ).trim(),
        imageUrl: '',
        isStandard: false,
        details: {
            name: personaName.split(',')[0].split('(')[0].trim(),
            age,
            income: String(raw.details?.income || 'Medio-Alto ($35,000 - $60,000 MXN/mes)').trim(),
            job_title: jobTitle,
            bio: String(raw.details?.bio || bio).trim(),
            pain_points: painPoints,
            goals,
            lifestyle_tags: lifestyleTags,
            preferred_products: preferredProducts,
            charts: {
                brand_affinity: {
                    labels: ['Calidad Analítica', 'Precio / Promoción', 'Rapidez Digital', 'Cercanía Sucursal'],
                    data: Array.isArray(raw.details?.charts?.brand_affinity?.data) && raw.details.charts.brand_affinity.data.length === 4
                        ? raw.details.charts.brand_affinity.data.map((n: any) => Number(n) || 85)
                        : defaultAffinityData
                }
            }
        }
    };
};

export const generateSyntheticUsersBatch = async (
    basePersona: CombinedPersona | any,
    count: number = 5,
    companyDescription: string = '',
    additionalClinicalContext?: string
): Promise<any[]> => {
    try {
        const { track: resolvedTrack, audienceSegment } = detectPersonaTrack(basePersona);
        const brandManual = await fetchBrandManual();
        const slices = buildBrandSlices(brandManual, { audienceSegment, track: resolvedTrack });
        const { officialName, slogan, segmentLabel, segmentCode, primaryDestination } = slices.dynamicVars;

        const extraContextBlock = additionalClinicalContext && additionalClinicalContext.trim()
            ? `\n        **CONTEXTO CLÍNICO O DE CAMPAÑA ADICIONAL PARA VARIAR LOS PERFILES DEL LOTE:**\n        "${additionalClinicalContext.trim()}". Asegúrate de que los ${count} usuarios sintéticos reflejen este contexto con matices individuales distintos sin ser clones idénticos.\n`
            : '';

        const prompt = `
        Eres un experto en investigación de mercados médicos y comportamiento del consumidor en salud en México para ${officialName} ("${slogan}").
        Con base en la audiencia semilla y el contexto del segmento, genera exactamente ${count} perfiles sintéticos únicos para la pista "${resolvedTrack}" (${segmentCode} — ${segmentLabel}). Cada perfil hereda el arquetipo general pero con historia, ciudad de México, edad y matices individuales distintos.

        Contexto estratégico del segmento objetivo extraído del Manual de Marca:
        ${JSON.stringify(slices.segmentContext, null, 2)}

        **Contexto Institucional:**
        ${companyDescription || officialName}

        **Audiencia Base:**
        Name: ${basePersona.name || basePersona.personaName}
        Representative Archetype: ${basePersona.personaName || ''}
        Track: ${resolvedTrack}
        Bio: ${basePersona.bio || (basePersona.details ? basePersona.details.bio : '')}
        Demographics: ${basePersona.demographics || (basePersona.details ? basePersona.details.age : '')}
        Pain Points: ${JSON.stringify(basePersona.pain_points || basePersona.details?.pain_points || [])}
        Goals: ${JSON.stringify(basePersona.goals || basePersona.details?.goals || [])}
        Preferred Studies: ${JSON.stringify(basePersona.preferred_products || basePersona.details?.preferred_products || [])}
        ${extraContextBlock}

        Reglas estrictas:
        - 100% datos sintéticos (cero datos personales reales).
        - Contexto cultural, clínico y socioeconómico auténtico de México (CDMX, Guadalajara, Monterrey, Puebla, Querétaro, Mérida, Hermosillo, Tuxtla Gutiérrez, etc.).
        - Psicología realista de pacientes, médicos o responsables de salud empresarial reales viendo comunicación en su celular, correo o sucursal (nunca hablan con voz corporativa de marca ni actúan como inspectores legales).

        **Output Requirements:**
        Generate ONLY a valid JSON array of ${count} objects, with each object following this exact structure:
        {
            "name": "Unique Fake Name",
            "track": "${resolvedTrack}",
            "personaName": "${basePersona.name || basePersona.personaName}",
            "bio": "Unique 1-2 sentence bio tailored to this specific generated person${additionalClinicalContext?.trim() ? ' incorporating the additional clinical context' : ''}.",
            "demographics": "Specific age, location in Mexico, and profile",
            "pain_points": ["pain point 1", "pain point 2"],
            "goals": ["goal 1", "goal 2"],
            "cognitiveStyle": {
                "informationDensityPreference": "e.g. Concisa y directa en celular",
                "primaryTrustSignal": "e.g. Trayectoria diagnóstica y resultados digitales en App Chopo",
                "decisionVelocity": "e.g. Rápida si el beneficio es claro",
                "riskTolerance": "e.g. Baja ante mensajes alarmistas"
            },
            "lifestyleFriction": {
                "dailyGrindContext": "e.g. Horario laboral ocupado",
                "financialMindset": "e.g. Busca promociones claras o convenios transparentes",
                "brandLoyaltyQuotient": "e.g. Alta hacia ${officialName}",
                "householdPowerDynamic": "e.g. Decisor de salud familiar, clínico o corporativo"
            },
            "digitalFootprint": {
                "last3SearchQueries": ["query 1", "query 2", "query 3"],
                "unsubscribeTrigger": "Anuncios largos tipo folleto denso",
                "platformEcosystem": "App Chopo / ${primaryDestination} / WhatsApp / Redes",
                "recentBigLifeEvent": "Check-up preventivo o evaluación clínica reciente"
            },
            "psychographicFlavor": {
                "theOneLuxury": "Salud preventiva sin filas",
                "aspirationVsReality": "Quiere resultados confiables sin perder toda la mañana",
                "socialCauseAlignment": "Prevención oportuna y bienestar integral"
            }
        }
        ${getLanguageInstruction()}
        `;

        const response = await callGenAiProxy("generateContent", {
            model: MODEL_TEXT,
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "[]";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Synthetic users batch generation error:", error);
        return [];
    }
};

export const generateImageFromPrompt = async (
    prompt: string,
    aspectRatio: string = "1:1",
    channelKey?: BrandChannelKey
): Promise<string> => {
    const brandManual = await fetchBrandManual();
    const slices = buildBrandSlices(brandManual, { channelKey });
    const cleanDirective = buildCleanPhotoDirective(slices.photoSlice);
    const trimmedPrompt = String(prompt || '').trim();
    const finalPrompt = trimmedPrompt.includes(cleanDirective.slice(0, 48))
        ? trimmedPrompt
        : `${trimmedPrompt}. ${cleanDirective}`;
    const imgData = await generateImage(finalPrompt, 'gemini-2.5-flash-image', aspectRatio);
    if (imgData) {
        return `data:image/jpeg;base64,${imgData}`;
    }
    return "/api/media/chopo_persona_dr_carlos.png";
};

export const generateMarketingCampaignAssets = async (
    productName: string,
    targetAudience: string,
    context: string,
    brandV4Options?: BrandV4CampaignOptions
): Promise<MarketingAssets> => {
    const { track: resolvedTrack, audienceSegment } = detectTrackAndSegment({
        audienceSegment: brandV4Options?.audienceSegment,
        text: `${targetAudience || ''} ${context || ''}`
    });
    const funnelStage: FunnelStage = brandV4Options?.funnelStage || 'performance';
    const channelKey: BrandChannelKey = brandV4Options?.channelKey || 'social_media';

    const [brandManual, ragData] = await Promise.all([
        fetchBrandManual(),
        retrieveRagContext(productName, resolvedTrack, targetAudience)
    ]);
    const slices = buildBrandSlices(brandManual, {
        audienceSegment,
        track: resolvedTrack,
        funnelStage,
        channelKey
    });
    const channelSubformat =
        brandV4Options?.channelSubformat ||
        getSubformatsForChannel(slices.channelKey, brandManual)[0] ||
        'Post / Carrusel 4:5';
    const isStorySubformat = /historia|story/i.test(channelSubformat);

    const {
        officialName,
        slogan,
        contactBar,
        pronoun,
        segmentCode,
        segmentLabel,
        primaryDestination,
        precautionaryLegend,
        channelLabel
    } = slices.dynamicVars;

    const useCase = ragData.useCase;
    const isPhysician = resolvedTrack === 'physician';

    const cofeprisPermit = isPhysician
        ? (useCase?.cofeprisPermitB2B || 'Aviso de Publicidad COFEPRIS No. 243300202A0911')
        : (useCase?.cofeprisPermitB2C || 'Permiso de Publicidad COFEPRIS No. 2609152002A00518');
    const mandatoryLegend = precautionaryLegend;
    const responsableSanitario =
        useCase?.responsableSanitario ||
        'Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.';
    const promoText =
        useCase?.defaultPromoText ||
        `Precio especial exclusivo pagando en línea en ${primaryDestination} o App Chopo.`;

    const funnelRule = slices.voiceAndFunnelSlice.funnelStage || {};
    const citationRule = slices.voiceAndFunnelSlice.medicalCitationsRule || {};

    const copyPromise = callGenAiProxy("generateContent", {
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [{
                text: `
                Eres el Director Creativo y Médico de ${officialName} ("${slogan}").
                Debes diseñar los activos multicanal y el prompt de fotografía base limpia para el estudio o paquete "${productName}" cumpliendo de forma estricta e innegociable con los 2 bloques determinísticos del Manual de Marca V4 y el contexto clínico/regulatorio RAG.

                === 1. REGLAS VERBALES, DE FUNNEL Y DE CANAL DEL MANUAL DE MARCA (${officialName}) ===
                ${JSON.stringify(slices.voiceAndFunnelSlice, null, 2)}

                === 2. REGLAS DE FOTOGRAFÍA BASE E ILUMINACIÓN DEL MANUAL DE MARCA ===
                ${JSON.stringify(slices.photoSlice, null, 2)}

                === 3. CATÁLOGO CLÍNICO, COFEPRIS Y REALISMO MÉDICO OPERATIVO (RAG) ===
                ${ragData.combinedContext}

                **Contexto Institucional:**
                ${officialName} (${brandConfig.companyName || officialName}) - ${context}

                **INSTRUCCIÓN OBLIGATORIA DEL USUARIO (REGLA SUPREMA — SEGUIR AL PIE DE LA LETRA SIN VIOLAR INVARIANTES DE MARCA NI COFEPRIS):**
                """
                ${targetAudience}
                """

                === PARÁMETROS ACTIVOS DE LA CAMPAÑA ===
                - Estudio / Paquete: ${productName}
                - Segmento de Audiencia: ${slices.audienceSegment} (${segmentCode} — ${segmentLabel})
                - Pronombre Obligatorio del Segmento: ${pronoun}
                - Destino Digital Principal: ${primaryDestination}
                - Etapa del Funnel: ${slices.funnelStage}
                - Canal y Subformato Seleccionado: ${slices.channelKey} (${channelLabel}) — ${channelSubformat}
                - Slogan Obligatorio (incluir una sola vez): "${slogan}"
                - Barra Oficial de Contacto (sin numerar): ${contactBar}
                - Condición Promocional: ${promoText}
                - Leyenda Precautoria del Segmento: ${mandatoryLegend}
                - Permiso / Aviso COFEPRIS a incluir textualmente: ${cofeprisPermit}
                - Responsable Sanitario a incluir textualmente: ${responsableSanitario}

                REGLAS OBLIGATORIAS DE EJECUCIÓN (02_campaign_creator):
                1. INVARIANTES VERBALES DE MARCA (CERO EXCEPCIONES):
                   - CERO SIGNOS DE ADMIRACIÓN: Queda estrictamente prohibido usar "¡" o "!" en titulares, cuerpos, correos, asuntos, preheaders, botones CTA o guiones, incluso en Performance o descuentos.
                   - PRIMERA PERSONA PLURAL ("NOSOTROS"): Habla siempre desde "nosotros" (ej. "Te acompañamos...", "Cuidamos..."). Prohibido hablar de la marca en tercera persona.
                   - PRONOMBRE EXACTO SEGÚN SEGMENTO (${segmentCode}): Usa estrictamente "${pronoun}" respetando las guías de tono de este segmento en la sección 1.
                   - TITULAR SEGÚN ETAPA DEL FUNNEL (${slices.funnelStage}): ${funnelRule.headlineRule || 'Respeta estrictamente las reglas de titular de la etapa del funnel seleccionada sin signos de admiración.'}
                   - FOCO Y CTA DEL FUNNEL: ${funnelRule.bodyFocus || ''} ${funnelRule.ctaPlacementAndStyle || ''}
                   - SLOGAN Y CONTACTO: Incluye exactamente el slogan "${slogan}" una sola vez. ${isStorySubformat ? 'Por ser Historia, NO incluyas teléfonos ni barra completa de contacto.' : `Cuando incluyas canales de contacto, escríbelos en una barra limpia y natural (sin numerarlos con 1., 2., 3., 4.) respetando el orden oficial: ${contactBar}.`}
                   - CITAS MÉDICAS: Si citas datos o estadísticas médicas, usa fuente verificable <= ${citationRule.maxAgeYears ?? 5} años en formato ${citationRule.citationStandard || 'APA 7'}.
                   - Prohibido meter instructivos operativos internos de sucursal ("te damos bata desechable", "quítate objetos metálicos") en copies comerciales.
                2. REDES SOCIALES (social.caption) Y ADAPTACIÓN AL CANAL (${channelSubformat}):
                   - Aplica las reglas de copy del canal: ${slices.voiceAndFunnelSlice.channelCopyRules || 'Textos sintéticos y escaneables.'}
                   - En redes sociales, mantén 35 a 45 palabras comerciales ANTES de la barra de contacto y pie legal compacto: "${mandatoryLegend} ${cofeprisPermit}. ${responsableSanitario}"
                3. CORREO ELECTRÓNICO TIPO BANNER VISUAL MODERNO (email):
                   - Obedece las reglas verbales (cero signos de admiración, 1a persona plural, pronombre "${pronoun}", slogan "${slogan}") y cualquier instrucción específica del usuario.
                   - Estructura obligatoria de "email":
                     * "subject": Asunto directo y claro (sin signos de admiración).
                     * "preheader": Texto corto de vista previa (10 a 15 palabras, sin signos de admiración).
                     * "bannerHeadline": Titular corto no invasivo (4 a 8 palabras, acorde a la etapa "${slices.funnelStage}", sin signos de admiración).
                     * "bannerSubheadline": Subtítulo breve o beneficio clave (sin signos de admiración).
                     * "body": Mensaje breve, cálido y directo (25 a 45 palabras, salvo instrucción distinta del usuario; sin signos de admiración; nunca escribas "Incluye pie legal:").
                     * "ctaText": Texto del botón CTA en verbo concreto sin signos de admiración (ej. "Cotiza y agenda en línea").
                     * "legalFooter": "${mandatoryLegend} ${cofeprisPermit}. ${responsableSanitario}"
                4. PROMPT DE FOTOGRAFÍA BASE LIMPIA ("imagePrompt" para Flujo 2B — SIN ELEMENTOS DE DISEÑO GRÁFICO):
                   - Aplica ÚNICAMENTE las reglas fotográficas de la sección 2 (fotografía pura, realista, tonos cálidos con luz natural de día, personas mexicanas/latinas reales en actitud tranquila y relajada, ambientación acorde a ambientPromptGuidance y reglas fotográficas del canal "${channelSubformat}").
                   - Si aparecen médicos, deben portar bata blanca impecable usando tablet o pantalla digital, y PROHÍBE EXPLÍCITAMENTE cualquier estetoscopio colgado en el cuello.
                   - Exige el equipo médico exacto para "${productName}" y resultados 100% digitales (cero placas radiográficas físicas impresas a contraluz, cero agujas perforando piel o sangre explícita, cero cabezas o rostros cortados).
                   - PROHÍBE EXPLÍCITAMENTE texto incrustado, letras, logotipos, círculos de descuento y líneas verdes vectoriales en la foto generada, dejando aire visual limpio y margen interior de seguridad acorde a "${channelSubformat}".

                Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura:
                {
                    "imagePrompt": "Descripción fotográfica base pura y limpia en español siguiendo la sección 2, sin texto incrustado, sin logotipos, sin línea basal vectorial y sin estetoscopios en médicos...",
                    "social": {
                        "caption": "...",
                        "hashtags": ["#Chopo", "#CuidandoLaVida", "#PrevencionOportuna"]
                    },
                    "search": {
                        "headline": "Título corto sin signos de admiración (máx 30 caracteres)",
                        "description": "Descripción persuasiva en 1a persona plural sin signos de admiración hacia ${primaryDestination}. ${mandatoryLegend}",
                        "url": "${primaryDestination}/estudios/${productName.replace(/\s+/g, '-').toLowerCase()}"
                    },
                    "email": {
                        "subject": "...",
                        "preheader": "...",
                        "bannerHeadline": "Titular corto no invasivo para el banner del correo (sin signos de admiración)",
                        "bannerSubheadline": "Subtítulo corto del cintillo del banner (sin signos de admiración)",
                        "body": "Mensaje breve y personalizado en 1a persona plural sin signos de admiración...",
                        "ctaText": "Cotiza y agenda en línea",
                        "legalFooter": "${mandatoryLegend} ${cofeprisPermit}. ${responsableSanitario}"
                    },
                    "youtube": {
                        "title": "...",
                        "script": "..."
                    },
                    "recommendations": [
                        { "name": "Estudio o Check-up Complementario 1 acorde a ${productName}", "price": "Precio especial en línea", "imagePrompt": "Fotografía base limpia y cálida en México acorde al estudio 1, sin texto ni logotipos incrustados..." },
                        { "name": "Estudio o Check-up Complementario 2 acorde a ${productName}", "price": "Agenda en App Chopo", "imagePrompt": "Fotografía base limpia y cálida en México acorde al estudio 2, sin texto ni logotipos incrustados..." },
                        { "name": "Estudio o Check-up Complementario 3 acorde a ${productName}", "price": "Exclusivo en ${primaryDestination}", "imagePrompt": "Fotografía base limpia y cálida en México acorde al estudio 3, sin texto ni logotipos incrustados..." }
                    ]
                }
                No uses bloques markdown.
                ${getLanguageInstruction()}
            `
            }]
        },
        config: { responseMimeType: "application/json" }
    });

    try {
        const copyResponse = await copyPromise;
        const copyText = extractTextFromResponse(copyResponse) || "{}";
        const cleanCopyText = copyText.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanCopyText);

        const cleanPhotoDirective = buildCleanPhotoDirective(slices.photoSlice);
        const mainAspectRatio = resolveAspectRatioForSubformat(channelSubformat, slices.channelKey);

        const allImagePrompts: { type: string; prompt: string; aspectRatio: string; rec?: any }[] = [];

        if (data.imagePrompt) {
            allImagePrompts.push({
                type: 'MAIN',
                prompt: `${data.imagePrompt}. ${cleanPhotoDirective}`,
                aspectRatio: mainAspectRatio
            });
        }

        for (const rec of (data.recommendations || [])) {
            allImagePrompts.push({
                type: 'REC',
                prompt: `${rec.imagePrompt || `Escena cálida y luminosa en México para ${rec.name}`}. ${cleanPhotoDirective}`,
                aspectRatio: '1:1',
                rec
            });
        }

        const results: any[] = [];
        const imageBatchSize = 4;

        for (let i = 0; i < allImagePrompts.length; i += imageBatchSize) {
            const batch = allImagePrompts.slice(i, i + imageBatchSize);
            const batchResults = await Promise.all(batch.map(async (item) => {
                const img = await generateImageFromPrompt(item.prompt, item.aspectRatio, slices.channelKey);
                if (item.type === 'MAIN') return { type: 'MAIN', img };
                return {
                    type: 'REC',
                    img,
                    name: item.rec.name,
                    price: item.rec.price
                };
            }));
            results.push(...batchResults);
        }

        const mainImageObj = results.find(r => r.type === 'MAIN');
        const mainImage = mainImageObj ? mainImageObj.img : null;
        const recommendations = results.filter(r => r.type === 'REC').map(r => ({
            name: r.name,
            price: r.price,
            image: r.img
        }));

        return {
            image: mainImage,
            social: data.social || { caption: "", hashtags: [] },
            search: data.search || { headline: productName, description: "", url: primaryDestination },
            email: {
                subject: data.email?.subject || productName,
                preheader: data.email?.preheader || "",
                bannerHeadline: data.email?.bannerHeadline || data.search?.headline || productName,
                bannerSubheadline: data.email?.bannerSubheadline || promoText,
                body: data.email?.body || "",
                ctaText: data.email?.ctaText || "Cotiza y agenda en línea",
                legalFooter: data.email?.legalFooter || `${mandatoryLegend} ${cofeprisPermit}. ${responsableSanitario}`,
                image: mainImage || undefined
            },
            youtube: data.youtube || { title: productName, script: "" },
            website: { recommendations }
        };

    } catch (error) {
        console.error("Campaign generation error:", error);
        throw new Error("Failed to generate campaign assets.");
    }
};

export const generateMarketingCopy = async (productName: string, personaName: string): Promise<any> => {
    try {
        const { track: resolvedTrack, audienceSegment } = detectTrackAndSegment({ text: personaName });
        const brandManual = await fetchBrandManual();
        const slices = buildBrandSlices(brandManual, { audienceSegment, track: resolvedTrack, channelKey: 'web' });
        const { officialName, slogan, pronoun } = slices.dynamicVars;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Marca: ${officialName} ("${slogan}")
                    Producto / Estudio: ${productName}
                    Audiencia Objetivo: ${personaName} (Pronombre obligatorio: ${pronoun})

                    Reglas verbales:
                    ${JSON.stringify(slices.voiceAndFunnelSlice, null, 2)}

                    Redacta un titular claro y un subtítulo persuasivo para página web dirigidos a esta audiencia en 1a persona plural ("nosotros"), usando el pronombre "${pronoun}" y con CERO signos de admiración (¡!). Proporciona también su versión en inglés.

                    Return JSON:
                    {
                        "headline": "English Headline without exclamation marks",
                        "subheadline": "English Subhead without exclamation marks",
                        "headline_es": "Titular en español sin signos de admiración",
                        "subheadline_es": "Subtítulo en español sin signos de admiración"
                    }
                    Do not use markdown.
                ` }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Copy generation error:", error);
        return { headline: "Preventive care you can trust", subheadline: "Schedule your diagnostic study online." };
    }
};

export const generateMarketingBrief = async (
    context: string,
    goal: string,
    sourceAudiences?: any[],
    studyName: string = 'Check-up Control Diabetes',
    track: string = 'both',
    brandV4Options?: BrandV4CampaignOptions
): Promise<MarketingBriefData | null> => {
    try {
        const timestamp = new Date().toLocaleString();
        const firstAudience = Array.isArray(sourceAudiences) && sourceAudiences.length > 0 ? sourceAudiences[0] : null;
        const explicitTrack = track && track !== 'both' && track !== 'all' ? track : firstAudience?.track;
        const detectionText = [
            firstAudience?.name || '',
            firstAudience?.job_title || firstAudience?.details?.job_title || '',
            goal || ''
        ].join(' ');

        const { track: resolvedTrack, audienceSegment } = detectTrackAndSegment({
            audienceSegment: brandV4Options?.audienceSegment,
            track: explicitTrack,
            text: detectionText
        });
        const funnelStage: FunnelStage = brandV4Options?.funnelStage || 'performance';
        const channelKey: BrandChannelKey = brandV4Options?.channelKey || 'social_media';

        const [brandManual, ragData] = await Promise.all([
            fetchBrandManual(),
            retrieveRagContext(studyName, resolvedTrack, goal)
        ]);
        const slices = buildBrandSlices(brandManual, {
            audienceSegment,
            track: resolvedTrack,
            funnelStage,
            channelKey
        });
        const channelSubformat =
            brandV4Options?.channelSubformat ||
            getSubformatsForChannel(slices.channelKey, brandManual)[0] ||
            'Post / Carrusel 4:5';
        const isStorySubformat = /historia|story/i.test(channelSubformat);

        const {
            officialName,
            slogan,
            contactBar,
            pronoun,
            segmentCode,
            segmentLabel,
            primaryDestination,
            precautionaryLegend,
            channelLabel
        } = slices.dynamicVars;

        const useCase = ragData.useCase;
        const effectiveStudyName = useCase?.studyName || studyName;
        const cofeprisPermit = resolvedTrack === 'physician'
            ? (useCase?.cofeprisPermitB2B || 'Aviso de Publicidad COFEPRIS No. 243300202A0911')
            : (useCase?.cofeprisPermitB2C || 'Permiso de Publicidad COFEPRIS No. 2609152002A00518');
        const responsableSanitario =
            useCase?.responsableSanitario ||
            'Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.';
        const promoText =
            useCase?.defaultPromoText ||
            `Precio especial exclusivo pagando en línea en ${primaryDestination} o App Chopo.`;

        const funnelRule = slices.voiceAndFunnelSlice.funnelStage || {};
        const citationRule = slices.voiceAndFunnelSlice.medicalCitationsRule || {};

        const audienceContext = sourceAudiences && sourceAudiences.length > 0
            ? `\n**Audiencias Objetivo Seleccionadas (${sourceAudiences.length}):**\n${sourceAudiences.map((aud, i) => `\n${i + 1}. Nombre: ${aud.name} (${aud.personaName || ''})\n   Pista: ${detectPersonaTrack(aud).track}\n   Bio: ${aud.bio}\n   Demografía: ${aud.demographics}`).join('\n')}\n`
            : "";

        const prompt = `
        Eres el Director Estratégico de Marketing Clínico, Creatividad y Cumplimiento de ${officialName} ("${slogan}").
        Crea un Marketing Brief integral y la pieza principal adaptada al canal ("channelAdaptedCopy") para el estudio o paquete "${effectiveStudyName}", cumpliendo de forma estricta e innegociable con los 2 bloques determinísticos del Manual de Marca V4 y la base clínica/regulatoria RAG.

        === 1. REGLAS VERBALES, DE FUNNEL Y DE CANAL DEL MANUAL DE MARCA (${officialName}) ===
        ${JSON.stringify(slices.voiceAndFunnelSlice, null, 2)}

        === 2. REGLAS DE FOTOGRAFÍA BASE E ILUMINACIÓN DEL MANUAL DE MARCA ===
        ${JSON.stringify(slices.photoSlice, null, 2)}

        === 3. CATÁLOGO CLÍNICO, COFEPRIS Y REALISMO MÉDICO OPERATIVO (RAG) ===
        ${ragData.combinedContext}

        **Contexto Institucional:** ${context}
        **Estudio / Caso de Uso Principal:** ${effectiveStudyName}
        **Estudios que incluye:** ${(useCase?.includedStudies || []).join(', ')}
        **Requisito de Ayuno (CLN-002):** ${useCase?.fastingRequirement || 'Consultar preparación clínica aplicable'}
        **Segmento de Audiencia Activo:** ${slices.audienceSegment} (${segmentCode} — ${segmentLabel} | Pronombre obligatorio: "${pronoun}" | Destino: ${primaryDestination})
        **Etapa del Funnel:** ${slices.funnelStage}
        **Canal y Subformato:** ${slices.channelKey} (${channelLabel}) — ${channelSubformat}
        **Condición Promocional:** ${promoText}
        **Permiso / Aviso COFEPRIS:** ${cofeprisPermit}
        **Leyenda Precautoria del Segmento:** ${precautionaryLegend}
        **Responsable Sanitario:** ${responsableSanitario}
        **Objetivo de la Campaña:** ${goal}
        ${audienceContext}

        REGLAS OBLIGATORIAS DE EJECUCIÓN (02_campaign_creator):
        1. INVARIANTES VERBALES DE MARCA (CERO EXCEPCIONES):
           - CERO SIGNOS DE ADMIRACIÓN: Queda estrictamente prohibido usar "¡" o "!" en titulares, messaging, hooks, channelAdaptedCopy, llamadas a la acción o textos comerciales, incluso en Performance o descuentos.
           - PRIMERA PERSONA PLURAL ("NOSOTROS"): Habla siempre desde "nosotros" en mensajes comerciales y channelAdaptedCopy (prohibido hablar de la marca en tercera persona).
           - PRONOMBRE EXACTO SEGÚN AUDIENCIA (${segmentCode}): Usa estrictamente "${pronoun}".
           - TITULAR Y HOOK SEGÚN ETAPA DEL FUNNEL (${slices.funnelStage}): ${funnelRule.headlineRule || 'Alinea el titular a la etapa del funnel seleccionada sin signos de admiración.'}
           - FOCO Y CTA DEL FUNNEL: ${funnelRule.bodyFocus || ''} ${funnelRule.ctaPlacementAndStyle || ''}
           - SLOGAN Y BARRA DE CONTACTO: Incluye exactamente el slogan "${slogan}" una sola vez. ${isStorySubformat ? 'Por ser Historia, NO incluyas teléfonos ni barra de contacto.' : `Cuando incluyas puntos de contacto, escríbelos en barra limpia y natural (sin numerar 1., 2., 3., 4.) en orden oficial: ${contactBar}.`}
           - CITAS MÉDICAS: Si citas estadísticas médicas, usa fuente verificable <= ${citationRule.maxAgeYears ?? 5} años en formato ${citationRule.citationStandard || 'APA 7'}.
        2. ADAPTACIÓN AL CANAL EN "channelAdaptedCopy" (${slices.channelKey} — ${channelSubformat}):
           - Redacta en "channelAdaptedCopy" una pieza completa y autocontenida lista para evaluarse tal cual: titular arriba una sola vez (acorde a "${slices.funnelStage}"), slogan "${slogan}" una sola vez, cuerpo conciso acorde a "${channelSubformat}" (${slices.voiceAndFunnelSlice.channelCopyRules || ''}), ${isStorySubformat ? 'sin teléfonos por ser Historia,' : `barra de contacto oficial (${contactBar}),`} y pie legal completo al cierre (${cofeprisPermit}. ${precautionaryLegend} ${responsableSanitario}).
           - Prohibido meter instructivos operativos internos de sucursal ("te damos bata desechable", "quítate objetos metálicos") en copies comerciales.
        3. ESTRUCTURA DEL BRIEF:
           - "productName" y "studyName" deben ser exactamente "${effectiveStudyName}".
           - "companyName" debe ser exactamente "${officialName}".
           - OBEDECE FIELMENTE las instrucciones creativas y de enfoque indicadas en "Objetivo de la Campaña" (${goal}) respetando siempre las invariantes de marca y COFEPRIS.
           - NO fuerces ni inventes una duración fija de "8 semanas" en "assumptions.timeline" ni en "phases" a menos que el usuario lo haya escrito explícitamente en el Objetivo de la Campaña.
           - "assumptions.mitigationStrategy" debe detallar explícitamente el cumplimiento de COFEPRIS (${cofeprisPermit}, "${precautionaryLegend}", ${responsableSanitario}), preparación clínica (CLN-002), invariantes verbales del Manual de Marca V4 (cero signos de admiración, 1a persona plural, pronombre "${pronoun}", slogan "${slogan}") y fotografía base limpia (tonos cálidos, cero estetoscopios en médicos, cero placas físicas a contraluz, cero agujas/sangre, cero texto o vectores incrustados).
           - "preFlightComplianceCheck" debe listar de 5 a 7 verificaciones concretas confirmando el cumplimiento verbal, de funnel, de canal, COFEPRIS, clínico y de fotografía base limpia.

        Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura:
        {
            "title": "Marketing Brief: [Título Estratégico de la Campaña]",
            "timestamp": "${timestamp}",
            "campaignGoal": "${goal}",
            "productName": "${effectiveStudyName}",
            "studyName": "${effectiveStudyName}",
            "companyName": "${officialName}",
            "track": "${resolvedTrack}",
            "audienceSegment": "${slices.audienceSegment}",
            "funnelStage": "${slices.funnelStage}",
            "channelKey": "${slices.channelKey}",
            "channelSubformat": "${channelSubformat}",
            "slogan": "${slogan}",
            "channelAdaptedCopy": "Pieza completa y autocontenida lista para el canal ${channelSubformat} sin signos de admiración...",
            "preFlightComplianceCheck": [
                "Cero signos de admiración verificados en titulares, cuerpo y CTA",
                "Primera persona plural (Nosotros) y pronombre ${pronoun} verificados para ${segmentCode}",
                "Titular alineado a etapa ${slices.funnelStage} y slogan oficial incluido una sola vez",
                "Pie legal COFEPRIS, leyenda precautoria del segmento y Responsable Sanitario incluidos",
                "Fotografía base limpia (luz cálida, sin estetoscopios en médicos, sin placas físicas ni texto incrustado)"
            ],
            "assumptions": {
                "budget": "...",
                "timeline": "...",
                "primarySalesFocus": "...",
                "mitigationStrategy": "..."
            },
            "objective": {
                "goal": { "en": "...", "es": "..." },
                "targetKpi": { "en": "...", "es": "..." }
            },
            "audiences": [
                {
                    "name": "[Nombre de la Audiencia]",
                    "sourceSegment": "${segmentLabel}",
                    "ageRange": "...",
                    "painPoints": ["...", "..."],
                    "drivers": ["...", "..."],
                    "messagingAngle": { "en": "...", "es": "..." }
                }
            ],
            "kpis": [
                { "title": "[KPI Title]", "description": "..." }
            ],
            "valueProp": {
                "main": { "en": "...", "es": "..." },
                "againstCompetitors": "...",
                "addressingTrends": "..."
            },
            "messaging": {
                "primaryHook": { "en": "...", "es": "..." },
                "supporting1": { "title": "...", "content": { "en": "...", "es": "..." } },
                "supporting2": { "title": "...", "content": { "en": "...", "es": "..." } }
            },
            "channels": [
                { "name": "[Canal]", "justification": "..." }
            ],
            "phases": [
                {
                    "title": "Fase 1: [Nombre]",
                    "dates": "[Fechas]",
                    "focus": "...",
                    "action": "...",
                    "goal": "..."
                }
            ]
        }
        ${getLanguageInstruction()}
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanText);
        if (parsed && typeof parsed === 'object') {
            parsed.campaignGoal = goal;
            parsed.companyName = parsed.companyName || officialName;
            parsed.productName = parsed.productName || effectiveStudyName;
            parsed.studyName = parsed.studyName || effectiveStudyName;
            parsed.track = brandV4Options?.audienceSegment
                ? resolvedTrack
                : (['both', 'all', 'patient', 'physician', 'enterprise'].includes(track) ? track : resolvedTrack);
            parsed.audienceSegment = parsed.audienceSegment || slices.audienceSegment;
            parsed.funnelStage = parsed.funnelStage || slices.funnelStage;
            parsed.channelKey = parsed.channelKey || slices.channelKey;
            parsed.channelSubformat = parsed.channelSubformat || channelSubformat;
            parsed.slogan = parsed.slogan || slogan;
            parsed.channelAdaptedCopy = parsed.channelAdaptedCopy || '';
            parsed.preFlightComplianceCheck = Array.isArray(parsed.preFlightComplianceCheck)
                ? parsed.preFlightComplianceCheck
                : [];
        }
        return parsed as MarketingBriefData;
    } catch (error) {
        console.error("Brief generation error:", error);
        return null;
    }
};

export const generatePersonaChatResponse = async (
    persona: any,
    brief: any,
    message: string,
    chatHistory: { role: string; parts: { text: string }[] }[],
    simulationContext?: any,
    channelKey?: BrandChannelKey
): Promise<string> => {
    try {
        const personaName = persona.personaName || persona.name || 'Participante';
        const demographics = persona.demographics || `${persona.age || persona.details?.age || 40} años`;
        const bio = persona.bio || persona.details?.bio || '';
        const painPoints = (persona.pain_points || persona.details?.pain_points || []).join('; ');
        const goals = (persona.goals || persona.details?.goals || []).join('; ');
        const studyName = brief?.productName || brief?.studyName || 'Check-up Control Diabetes';
        const { track: personaTrack, audienceSegment } = detectPersonaTrack(persona);

        const effectiveChannelKey: BrandChannelKey = channelKey || brief?.channelKey || 'social_media';
        const brandManual = await fetchBrandManual();
        const slices = buildBrandSlices(brandManual, {
            audienceSegment,
            track: personaTrack,
            channelKey: effectiveChannelKey
        });
        const { officialName } = slices.dynamicVars;
        const { channelLabel } = slices.focusGroupSlice;
        const adCopy = brief?.channelAdaptedCopy || brief?.campaignAssets?.social?.caption || '';

        let rubricSummaryText = '';
        if (simulationContext) {
            if (Array.isArray(simulationContext.rubricScores) && simulationContext.rubricScores.length > 0) {
                rubricSummaryText = simulationContext.rubricScores
                    .map((r: RubricScore) => `- ${r.name} (Peso ${r.weight}%): ${r.score}/100 — "${r.rationale}"`)
                    .join('\n');
            } else {
                rubricSummaryText = `
                - Atractivo Visual / Confianza: ${simulationContext.visualAppeal}/100
                - Apego a Marca: ${simulationContext.brandFit}/100
                - Claridad en 3 seg (Stopping Power): ${simulationContext.stoppingPower}/100
                - Intención de Acción: ${simulationContext.conversionLikelihood}/100
                `;
            }
        }

        const personaContext = `
        Estás interpretando en primera persona a "${personaName}" (${demographics}, pista: ${personaTrack}).
        Biografía y contexto: ${bio}
        Puntos de dolor: ${painPoints}
        Objetivos: ${goals}

        Acabas de participar en un Focus Group de ${officialName} evaluando este material para "${studyName}" en el canal "${channelLabel}".
        === CONTEXTO DEL CANAL Y ESENCIA DE MARCA ===
        ${JSON.stringify(slices.focusGroupSlice, null, 2)}
        ${adCopy ? `
        === MATERIAL EVALUADO ===
        ${adCopy}
        ` : ''}
        ${simulationContext ? `
        Tu comentario inicial fue: "${simulationContext.feedback || ''}".
        Tu calificación global ponderada fue: ${simulationContext.weightedOverallScore ?? simulationContext.conversionLikelihood ?? 75}/100.
        Tus calificaciones por rúbrica fueron:
        ${rubricSummaryText}
        Dudas o barreras que detectaste: "${simulationContext.barriersOrConcerns || simulationContext.suggestedMessaging || ''}"
        ` : ''}

        REGLAS DE INTERPRETACIÓN (04_focus_group_1on1_chat):
        Responde en primera persona, en español natural de México acorde a tu perfil real (paciente, médico o directivo empresarial en México), manteniendo coherencia con tus calificaciones anteriores.
        NUNCA actúes como inspector legal de COFEPRIS ni diseñador gráfico corporativo; habla desde tu experiencia humana y práctica en el canal "${channelLabel}". Sé directo y conciso (2 a 4 oraciones).
        ${getLanguageInstruction()}
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: [
                { role: "user", parts: [{ text: personaContext }] },
                { role: "model", parts: [{ text: `Entendido. Estoy en personaje como ${personaName}.` }] },
                ...chatHistory,
                { role: "user", parts: [{ text: message }] }
            ]
        });

        return extractTextFromResponse(response) || "Lo siento, no pude procesar esa pregunta.";
    } catch (error) {
        console.error("Chat error:", error);
        return "Tengo problemas para responder en este momento.";
    }
};

// --- Synthetic Focus Group & Simulation Logic ---

export const generateEmailBodies = async (headlines: string[], brief: MarketingBriefData): Promise<{ [headline: string]: string }> => {
    const { track: resolvedTrack, audienceSegment } = detectTrackAndSegment({
        audienceSegment: brief.audienceSegment,
        track: brief.track,
        text: `${brief.audiences?.[0]?.name || ''} ${brief.campaignGoal || ''}`
    });
    const brandManual = await fetchBrandManual();
    const slices = buildBrandSlices(brandManual, {
        audienceSegment,
        track: resolvedTrack,
        funnelStage: brief.funnelStage || 'performance',
        channelKey: 'mailing_ecommerce'
    });
    const { officialName, slogan, pronoun, primaryDestination, precautionaryLegend } = slices.dynamicVars;

    try {
        const prompt = `
        Eres el Director de Email Marketing de ${officialName} ("${slogan}").

        === REGLAS VERBALES Y DE CANAL DEL MANUAL DE MARCA ===
        ${JSON.stringify(slices.voiceAndFunnelSlice, null, 2)}

        **Estudio / Producto:** ${brief.productName}
        **Audiencia Objetivo:** ${brief.audiences?.[0]?.name || slices.dynamicVars.segmentLabel} (Pronombre obligatorio: ${pronoun})
        **Instrucción / Objetivo del Usuario (SEGUIR AL PIE DE LA LETRA):** ${brief.campaignGoal}

        **Tarea:**
        Para CADA uno de los siguientes asuntos de correo, redacta un mensaje breve, empático y directo en primera persona plural ("nosotros") usando el pronombre "${pronoun}" y con CERO signos de admiración (¡!) (máximo 35 a 45 palabras, pensado para acompañar un banner visual de correo) siguiendo estrictamente las instrucciones de "${brief.campaignGoal}".

        **Asuntos de Correo:**
        ${JSON.stringify(headlines)}

        **Salida:**
        Devuelve un objeto JSON válido donde las llaves sean exactamente los asuntos de correo y los valores sean los textos generados.
        No uses markdown.
        ${getLanguageInstruction()}
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Email body generation error:", error);
        const fallback: any = {};
        headlines.forEach(h => fallback[h] = `Te acompañamos con estudios confiables en línea a través de ${primaryDestination} o App Chopo, con resultados digitales. ${precautionaryLegend}`);
        return fallback;
    }
};

export const generateWildcardAudience = async (context: string, existingAudiences: string[]): Promise<any> => {
    try {
        const brandManual = await fetchBrandManual();
        const b2cSlices = buildBrandSlices(brandManual, { audienceSegment: 'b2c_patients' });
        const b2dSlices = buildBrandSlices(brandManual, { audienceSegment: 'b2d_doctors' });
        const b2bSlices = buildBrandSlices(brandManual, { audienceSegment: 'b2b_enterprises' });
        const { officialName, slogan } = b2cSlices.dynamicVars;

        const segmentsOverview = {
            purpose: b2cSlices.segmentContext.purpose,
            segments: [
                b2cSlices.segmentContext.segment,
                b2dSlices.segmentContext.segment,
                b2bSlices.segmentContext.segment
            ].filter(Boolean)
        };

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Eres un estratega de investigación de mercados en salud buscando oportunidades "Océano Azul" en México para ${officialName} ("${slogan}").

                    Contexto estratégico de segmentos extraído del Manual de Marca:
                    ${JSON.stringify(segmentsOverview, null, 2)}

                    **Contexto Institucional:**
                    ${context}

                    **Segmentos Existentes:**
                    ${JSON.stringify(existingAudiences)}

                    **Tarea:**
                    Identifica 1 segmento de audiencia sintético COMPLETAMENTE DIFERENTE ("Wildcard") en México para cualquiera de los 3 tracks oficiales: Paciente B2C ("patient"), Médico B2D ("physician") o Empresa B2B ("enterprise").

                    Devuelve un objeto JSON válido:
                    {
                        "track": "patient",
                        "name": "Nombre del Segmento (Paciente B2C)",
                        "personaName": "Nombre Completo (Edad, Ciudad)",
                        "bio": "Descripción realista...",
                        "demographics": "Rango de edad, Ciudad en México, NSE...",
                        "imagePrompt": "Retrato fotográfico realista y cálido en México sin estetoscopio en médicos y sin texto incrustado..."
                    }
                    No uses bloques markdown.
                    ${getLanguageInstruction()}
                `
                }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Wildcard generation error:", error);
        return null;
    }
};

export const generateAudienceFromCriteria = async (context: string, criteria: string): Promise<any> => {
    try {
        const { track: resolvedTrack, audienceSegment } = detectTrackAndSegment({ text: criteria });
        const brandManual = await fetchBrandManual();
        const slices = buildBrandSlices(brandManual, { audienceSegment, track: resolvedTrack });
        const { officialName, slogan } = slices.dynamicVars;
        const trackTag =
            resolvedTrack === 'physician'
                ? '(Médico B2D)'
                : resolvedTrack === 'enterprise'
                    ? '(Empresa B2B)'
                    : '(Paciente B2C)';

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Eres un experto en investigación de mercados médicos y comportamiento del consumidor en salud en México para ${officialName} ("${slogan}").

                    Contexto estratégico del segmento objetivo extraído del Manual de Marca:
                    ${JSON.stringify(slices.segmentContext, null, 2)}

                    **Contexto Institucional:**
                    ${context}

                    **Criterio del Usuario:**
                    "${criteria}"

                    **Tarea:**
                    Desarrolla un perfil sintético mexicano realista para la pista "${resolvedTrack}" que cumpla exactamente con el criterio solicitado.
                    Psicología realista (100% datos sintéticos; nunca habla con voz corporativa de marca ni actúa como inspector legal).

                    Devuelve un objeto JSON válido:
                    {
                        "track": "${resolvedTrack}",
                        "name": "Nombre del Segmento ${trackTag}",
                        "personaName": "Nombre Representativo (Edad, Ciudad)",
                        "bio": "Descripción rica de su perfil, estilo de vida y necesidades diagnósticas...",
                        "demographics": "Edad, Ciudad en México, NSE...",
                        "imagePrompt": "Retrato fotográfico realista y cálido en México sin estetoscopio en médicos y sin texto incrustado..."
                    }
                    No uses bloques markdown.
                    ${getLanguageInstruction()}
                `
                }]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Audience generation error:", error);
        return null;
    }
};

export const simulateMarketingFocusGroup = async (
    personas: any[],
    brief: any,
    productsList: string[],
    emailCampaigns: { subject: string; body: string }[],
    marketingMessages: string[] = [],
    channelKey?: BrandChannelKey
): Promise<any[]> => {
    const BATCH_SIZE = 10;
    const results: any[] = [];

    const effectiveChannelKey: BrandChannelKey =
        channelKey ||
        brief?.channelKey ||
        (emailCampaigns?.length > 0 && (!marketingMessages || marketingMessages.length === 0)
            ? 'mailing_ecommerce'
            : 'social_media');

    const brandManual = await fetchBrandManual();
    const slices = buildBrandSlices(brandManual, { channelKey: effectiveChannelKey });
    const { officialName } = slices.dynamicVars;
    const { channelLabel } = slices.focusGroupSlice;

    const processBatch = async (batchPersonas: any[]) => {
        try {
            console.log(`Processing batch of ${batchPersonas.length} users...`);
            const prompt = `
            Simula un Focus Group hiperrealista de personas reales en México (pacientes, médicos o responsables corporativos de Recursos Humanos según cada perfil) reaccionando a esta campaña de ${officialName} en el canal "${channelLabel}".

            === CONTEXTO DEL CANAL Y ESENCIA DE MARCA ===
            ${JSON.stringify(slices.focusGroupSlice, null, 2)}

            **REGLAS CRÍTICAS DE REALISMO Y CALIBRACIÓN:**
            - Estás simulando ${batchPersonas.length} personas sintéticas reales en México viendo este material en "${channelLabel}".
            - ACTÚA COMO UN HUMANO REAL (paciente, médico o comprador corporativo de RH en México), NUNCA como un auditor regulatorio de COFEPRIS ni como diseñador gráfico de agencia.
            - Un humano real evalúa si el mensaje se entiende rápido, le transmite calidez, tranquilidad y confianza, y le facilita cotizar o agendar; NUNCA pide más cláusulas legales ni instructivos internos de sucursal.
            - Adapta tus expectativas al canal ("${channelLabel}"): en canales rápidos penaliza textos largos o aburridos y premia mensajes claros, empáticos y prácticos (App Chopo / chopo.com.mx).
            - Usa todo el rango de 0 a 100 según los dolores y objetivos reales de cada persona.

            **THE MARKETING MATERIAL:**
            Campaign Goal: ${brief.campaignGoal}
            Value Proposition: ${brief.valueProp?.main?.es || brief.valueProp?.main?.en || "Certeza diagnóstica y prevención"}
            ${brief.channelAdaptedCopy ? `Channel Adapted Copy: ${brief.channelAdaptedCopy}` : ''}

            **THE PRODUCTS TO EVALUATE:**
            ${JSON.stringify(productsList)}

            **THE EMAIL CAMPAIGNS TO TEST:**
            ${JSON.stringify(emailCampaigns)}

            **MARKETING MESSAGES TO TEST:**
            ${JSON.stringify(marketingMessages)}

            **OUTPUT FORMAT:**
            Return a JSON array with exactly ${batchPersonas.length} objects:
            [
                {
                    "personaId": "id from input (MANDATORY: must match input ID exactly)",
                    "personaName": "name from input (MANDATORY: must match input name exactly)",
                    "briefMetrics": {
                        "interestScore": 85,
                        "clarityScore": 90,
                        "relevanceScore": 80,
                        "feedback": "...",
                        "negativeFeedback": "..."
                    },
                    "cart": [
                        { "productName": "Product 1", "purchased": true, "reason": "..." }
                    ],
                    "emailEngagement": [
                        { "subjectLine": "Exact subject from THE EMAIL CAMPAIGNS TO TEST", "opened": true, "clicked": false, "feedback": "Unique 1-sentence first-person explanation from this specific persona explaining why they opened/clicked or ignored this specific email based on their personal bio, age, and pain points (NEVER repeat the same comment across different personas)" }
                    ],
                    "messageReactions": [
                        { "message": "Msg 1", "score": 85, "sentiment": "Positive" }
                    ]
                }
            ]
            Do not use markdown.
            ${getLanguageInstruction()}
            `;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        {
                            text: JSON.stringify(batchPersonas.map(p => ({
                                id: p.id,
                                name: p.name,
                                track: detectPersonaTrack(p).track,
                                bio: p.bio,
                                demographics: p.demographics,
                                pain_points: p.pain_points || p.details?.pain_points || [],
                                goals: p.goals || p.details?.goals || [],
                                traits: p.lifestyle_tags || p.details?.lifestyle_tags || []
                            })))
                        },
                        { text: prompt }
                    ]
                },
                config: { responseMimeType: "application/json" }
            });

            const text = extractTextFromResponse(response) || "[]";
            const cleanText = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanText);

        } catch (error) {
            console.error("Batch simulation error:", error);
            return batchPersonas.map(p => ({
                personaId: p.id,
                personaName: p.name,
                briefMetrics: { interestScore: 0, clarityScore: 0, relevanceScore: 0, feedback: "Simulation failed", negativeFeedback: "" },
                cart: [],
                emailEngagement: [],
                messageReactions: []
            }));
        }
    };

    const batches = [];
    for (let i = 0; i < personas.length; i += BATCH_SIZE) {
        batches.push(personas.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(batch => processBatch(batch));
    const allResults = await Promise.all(batchPromises);
    results.push(...allResults.flat());

    return results;
};

export const simulateAcquisitionFocusGroup = async (
    personas: any[],
    offers: string[],
    companyName: string = DEFAULT_OFFICIAL_BRAND_NAME,
    productContext: string = "Diagnóstico Clínico y Check-ups",
    channelKey: BrandChannelKey = 'social_media'
): Promise<any[]> => {
    const BATCH_SIZE = 10;
    const results: any[] = [];

    const brandManual = await fetchBrandManual();
    const slices = buildBrandSlices(brandManual, { channelKey });
    const effectiveCompanyName = companyName || slices.dynamicVars.officialName;
    const { channelLabel } = slices.focusGroupSlice;

    const processBatch = async (batchPersonas: any[]) => {
        try {
            console.log(`Processing acquisition batch of ${batchPersonas.length} users for ${effectiveCompanyName}...`);
            const prompt = `
            Simula un Focus Group hiperrealista de personas reales en México (pacientes, médicos o responsables corporativos de Recursos Humanos según cada perfil) evaluando propuestas de adquisición de ${effectiveCompanyName} (${productContext}) en el canal "${channelLabel}".

            === CONTEXTO DEL CANAL Y ESENCIA DE MARCA ===
            ${JSON.stringify(slices.focusGroupSlice, null, 2)}

            **REGLAS CRÍTICAS DE REALISMO:**
            - Simula ${batchPersonas.length} personas sintéticas reales en México.
            - Reacciona estrictamente como paciente, médico o comprador corporativo de RH real en México, NUNCA como auditor legal de COFEPRIS ni diseñador gráfico.
            - Evalúa claridad, valor percibido, confianza humana y conveniencia práctica en el contexto del canal "${channelLabel}".

            **THE ACQUISITION OFFERS:**
            ${JSON.stringify(offers)}

            **OUTPUT FORMAT:**
            Return a JSON array with exactly ${batchPersonas.length} objects:
            [
                {
                    "personaId": "id from input (MANDATORY: must match input ID exactly)",
                    "personaName": "name from input (MANDATORY: must match input name exactly)",
                    "likelihoodToJoin": 0-100,
                    "perceivedValue": 0-100,
                    "barriers": "...",
                    "winningOffer": "Offer Text or None",
                    "feedback": "..."
                }
            ]
            Do not use markdown.
            ${getLanguageInstruction()}
            `;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        {
                            text: JSON.stringify(batchPersonas.map(p => ({
                                id: p.id,
                                name: p.name,
                                track: detectPersonaTrack(p).track,
                                bio: p.bio,
                                demographics: p.demographics,
                                pain_points: p.pain_points || p.details?.pain_points || [],
                                goals: p.goals || p.details?.goals || [],
                                traits: p.lifestyle_tags || p.details?.lifestyle_tags || []
                            })))
                        },
                        { text: prompt }
                    ]
                },
                config: { responseMimeType: "application/json" }
            });

            const text = extractTextFromResponse(response) || "[]";
            const cleanText = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanText);

        } catch (error) {
            console.error("Batch acquisition simulation error:", error);
            return batchPersonas.map(p => ({
                personaId: p.id,
                personaName: p.name,
                likelihoodToJoin: 0,
                perceivedValue: 0,
                barriers: "Simulation Failed",
                winningOffer: "None",
                feedback: "Error"
            }));
        }
    };

    const batches = [];
    for (let i = 0; i < personas.length; i += BATCH_SIZE) {
        batches.push(personas.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(batch => processBatch(batch));
    const allResults = await Promise.all(batchPromises);
    results.push(...allResults.flat());

    return results;
};

export const simulateCreativeFocusGroup = async (
    personas: any[],
    assets: MarketingAssets,
    companyName: string = DEFAULT_OFFICIAL_BRAND_NAME,
    activeRubrics?: FocusGroupRubric[],
    studyName: string = "Check-up Control Diabetes",
    channelKey: BrandChannelKey = 'social_media'
): Promise<any[]> => {
    const BATCH_SIZE = 5; // Smaller batch for multimodal
    const results: any[] = [];

    const [rubricsToUse, brandManual] = await Promise.all([
        activeRubrics && activeRubrics.length > 0 ? Promise.resolve(activeRubrics) : fetchRubrics(),
        fetchBrandManual()
    ]);

    const slices = buildBrandSlices(brandManual, { channelKey });
    const effectiveCompanyName = companyName || slices.dynamicVars.officialName;
    const { channelLabel } = slices.focusGroupSlice;

    // Load multimodal image part if available
    let mainImagePart: any = null;
    if (assets.image) {
        if (assets.image.startsWith('data:')) {
            const matches = assets.image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                mainImagePart = { inlineData: { mimeType: matches[1], data: matches[2] } };
            }
        } else if (assets.image.startsWith('/api/media/') || assets.image.startsWith('http') || assets.image.startsWith('/images/')) {
            try {
                const imgRes = await fetch(assets.image);
                if (imgRes.ok) {
                    const blob = await imgRes.blob();
                    const base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const resStr = String(reader.result || '');
                            const m = resStr.match(/^data:([^;]+);base64,(.+)$/);
                            resolve(m ? m[2] : '');
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    if (base64Data) {
                        mainImagePart = { inlineData: { mimeType: blob.type || 'image/jpeg', data: base64Data } };
                    }
                }
            } catch (e) {
                console.warn("Could not load image URL for multimodal creative focus group:", e);
            }
        }
    }

    const adaptedCopy = (assets as any)?.channelAdaptedCopy;
    const socialCaption = (assets.social?.caption || '').trim();
    const searchHeadline = (assets.search?.headline || '').trim();
    const searchDesc = (assets.search?.description || '').trim();
    const emailSubject = (assets.email?.subject || '').trim();
    const emailBody = (assets.email?.body || '').trim();

    const copyLines = [
        adaptedCopy ? `- Pieza Principal del Canal (${channelLabel}): "${adaptedCopy}"` : '',
        socialCaption ? `- Post Redes Sociales: "${socialCaption}"${(assets.social?.hashtags || []).length > 0 ? ` (${(assets.social?.hashtags || []).join(' ')})` : ''}` : '',
        (searchHeadline || searchDesc) ? `- Anuncio Buscador: "${searchHeadline}"${searchDesc ? ` — "${searchDesc}"` : ''}` : '',
        (emailSubject || assets.email?.bannerHeadline || emailBody) ? `- Correo: "${emailSubject}"${assets.email?.bannerHeadline ? ` | Banner: "${assets.email.bannerHeadline}"` : ''}${emailBody ? ` | Cuerpo: "${emailBody}"` : ''}` : ''
    ].filter(Boolean);

    const adCopySummary = copyLines.length > 0
        ? copyLines.join('\n').trim()
        : `- Material visual cargado sin copy externo adicional. Evalúa directamente el diseño, los textos visibles dentro de la imagen adjunta, la identidad visual de ${effectiveCompanyName} y el cumplimiento regulatorio.`;

    const processBatch = async (batchPersonas: any[]) => {
        try {
            console.log(`Processing creative focus group batch of ${batchPersonas.length} users with dynamic rubrics...`);

            const personasPayload = batchPersonas.map(p => {
                const pTrack = detectPersonaTrack(p).track;
                return {
                    id: p.id,
                    name: p.name,
                    personaName: p.personaName || p.name,
                    track: pTrack,
                    bio: p.bio || p.details?.bio || '',
                    demographics: p.demographics || '',
                    pain_points: p.pain_points || p.details?.pain_points || [],
                    goals: p.goals || p.details?.goals || [],
                    applicableRubricIds: rubricsToUse
                        .filter(r => r.track === 'all' || r.track === 'both' || r.track === pTrack)
                        .map(r => r.id)
                };
            });

            const prompt = `
            Simula un Focus Group de personas reales en México (pacientes, médicos o responsables de empresas/Recursos Humanos según cada perfil) reaccionando a este material publicitario de ${effectiveCompanyName} para "${studyName}" en el formato "${channelLabel}".

            === CONTEXTO DEL CANAL Y ESENCIA DE MARCA ===
            ${JSON.stringify(slices.focusGroupSlice, null, 2)}

            === MATERIAL PUBLICITARIO A EVALUAR ===
            ${adCopySummary}
            (Imagen promocional adjunta si está disponible)

            === PERFILES DEL FOCUS GROUP ===
            ${JSON.stringify(personasPayload, null, 2)}

            === CATÁLOGO DE RÚBRICAS DINÁMICAS DE EVALUACIÓN (CON ANCLAS DE CALIFICACIÓN) ===
            ${JSON.stringify(rubricsToUse, null, 2)}

            REGLAS CRÍTICAS DE REALISMO Y CALIBRACIÓN EN EL FOCUS GROUP (03_focus_group_simulator):
            1. ACTÚA COMO UN HUMANO REAL EN EL CONTEXTO DEL CANAL ("${channelLabel}"), NO COMO UN AUDITOR REGULATORIO DE COFEPRIS NI UN DISEÑADOR GRÁFICO DE AGENCIA:
               - Un paciente, médico o comprador corporativo de RH real evalúa si el mensaje se entiende rápido, le transmite calidez, tranquilidad y confianza, y le facilita cotizar/agendar; NUNCA pide más cláusulas legales ni instructivos operativos de batas.
               - Adapta tu expectativa al canal ("${channelLabel}"): en Redes Sociales, Banners Web o un Póster Exterior de sucursal penaliza textos largos que no se leen en 3 segundos; en un Folleto interior o Correo espera información clara y bien estructurada sin saturar.
            2. APLICA ESTRICTAMENTE LAS ANCLAS DE CALIFICACIÓN (scoringAnchors) DE CADA RÚBRICA:
               - No regales calificaciones de 85-95 por cortesía. Usa todo el rango (0 a 100) guiándote por "low_0_to_40", "mid_41_to_79" y "high_80_to_100" de cada rúbrica aplicable al track del participante ("applicableRubricIds").
            3. Para cada perfil participante:
               - Evalúa CADA UNA de sus rúbricas aplicables ("applicableRubricIds") devolviendo el arreglo "rubricScores" con { rubricId, name, weight, score, rationale }.
               - Calcula "weightedOverallScore" (0 a 100) como el promedio ponderado de sus "rubricScores".
               - Redacta su opinión general en primera persona ("feedback"), sus dudas/barreras reales ("barriersOrConcerns") y su sugerencia práctica ("suggestedImprovement").
               - Incluye también los campos de compatibilidad ("visualAppeal", "brandFit", "stoppingPower", "conversionLikelihood", "sentiment": "Positive" | "Neutral" | "Negative", "suggestedProduct", "suggestedMessaging", "suggestedImage", "copyEdit").

            Devuelve ÚNICAMENTE un arreglo JSON válido con exactamente ${batchPersonas.length} objetos:
            [
                {
                    "personaId": "id exacto del input",
                    "personaName": "name exacto del input",
                    "track": "patient, physician o enterprise",
                    "weightedOverallScore": 0-100,
                    "rubricScores": [
                        {
                            "rubricId": "clarity_3s",
                            "name": "Claridad y Concisión (3 seg de Scroll)",
                            "weight": 25,
                            "score": 0-100,
                            "rationale": "Razón en primera persona (1 oración)..."
                        }
                    ],
                    "barriersOrConcerns": "Duda o barrera principal...",
                    "suggestedImprovement": "Sugerencia concreta de mejora...",
                    "visualAppeal": 0-100,
                    "brandFit": 0-100,
                    "stoppingPower": 0-100,
                    "conversionLikelihood": 0-100,
                    "sentiment": "Positive",
                    "feedback": "Opinión en primera persona...",
                    "suggestedProduct": "${studyName}",
                    "suggestedMessaging": "...",
                    "suggestedImage": "...",
                    "copyEdit": "..."
                }
            ]
            No uses bloques markdown.
            ${getLanguageInstruction()}
            `;

            const parts: any[] = [{ text: prompt }];
            if (mainImagePart) {
                parts.unshift(mainImagePart);
            }

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3-flash-preview',
                contents: { parts },
                config: { responseMimeType: "application/json" }
            });

            const text = extractTextFromResponse(response) || "[]";
            const cleanText = text.replace(/```json|```/g, '').trim();
            const rawResults = JSON.parse(cleanText);

            return (Array.isArray(rawResults) ? rawResults : []).map((r: any, idx: number) => {
                const inputPersona = batchPersonas[idx] || {};
                const detectedTrack = detectPersonaTrack(inputPersona).track;
                const rubricScores: RubricScore[] = Array.isArray(r.rubricScores) ? r.rubricScores : [];

                const findRubricScore = (idPrefix: string): number | undefined => {
                    const found = rubricScores.find(rs => rs.rubricId?.includes(idPrefix));
                    return found ? Number(found.score) : undefined;
                };

                const totalWeight = rubricScores.reduce((acc, rs) => acc + (Number(rs.weight) || 25), 0);
                const computedWeighted =
                    rubricScores.length > 0 && totalWeight > 0
                        ? Math.round(
                              rubricScores.reduce((acc, rs) => acc + Number(rs.score || 0) * (Number(rs.weight) || 25), 0) /
                                  totalWeight
                          )
                        : Number(r.weightedOverallScore ?? r.conversionLikelihood ?? 75);

                const weightedOverallScore = Number.isFinite(Number(r.weightedOverallScore))
                    ? Math.round(Number(r.weightedOverallScore))
                    : computedWeighted;

                const visualAppeal = Number(
                    r.visualAppeal ?? findRubricScore('visual_trust') ?? weightedOverallScore
                );
                const stoppingPower = Number(
                    r.stoppingPower ?? findRubricScore('clarity_3s') ?? weightedOverallScore
                );
                const brandFit = Number(
                    r.brandFit ??
                    findRubricScore('clinical_utility') ??
                    findRubricScore('enterprise_solution') ??
                    findRubricScore('visual_trust') ??
                    weightedOverallScore
                );
                const conversionLikelihood = Number(
                    r.conversionLikelihood ??
                    findRubricScore('patient_action_intent') ??
                    findRubricScore('physician_prescription_intent') ??
                    findRubricScore('enterprise_action_intent') ??
                    findRubricScore('action_intent') ??
                    weightedOverallScore
                );

                return {
                    ...r,
                    personaId: r.personaId || inputPersona.id,
                    personaName: r.personaName || inputPersona.name,
                    track: r.track || detectedTrack,
                    weightedOverallScore,
                    rubricScores,
                    barriersOrConcerns: r.barriersOrConcerns || '',
                    suggestedImprovement: r.suggestedImprovement || r.suggestedMessaging || '',
                    visualAppeal,
                    brandFit,
                    stoppingPower,
                    conversionLikelihood,
                    sentiment: r.sentiment || (weightedOverallScore >= 75 ? 'Positive' : weightedOverallScore >= 45 ? 'Neutral' : 'Negative'),
                    feedback: r.feedback || '',
                    suggestedProduct: r.suggestedProduct || studyName,
                    suggestedMessaging: r.suggestedMessaging || r.suggestedImprovement || '',
                    suggestedImage: r.suggestedImage || '',
                    copyEdit: r.copyEdit || ''
                };
            });

        } catch (error) {
            console.error("Batch creative simulation error:", error);
            return batchPersonas.map(p => ({
                personaId: p.id,
                personaName: p.name,
                track: detectPersonaTrack(p).track,
                weightedOverallScore: 0,
                rubricScores: [],
                barriersOrConcerns: "Simulation Failed",
                suggestedImprovement: "None",
                visualAppeal: 0,
                brandFit: 0,
                stoppingPower: 0,
                sentiment: "Neutral",
                feedback: "Simulation Failed",
                conversionLikelihood: 0,
                suggestedProduct: "None",
                suggestedMessaging: "None",
                copyEdit: "None"
            }));
        }
    };

    const batches = [];
    for (let i = 0; i < personas.length; i += BATCH_SIZE) {
        batches.push(personas.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(batch => processBatch(batch));
    const allResults = await Promise.all(batchPromises);
    results.push(...allResults.flat());

    return results;
};

export const conductQualitativeInterview = async (
    persona: CombinedPersona,
    context: string,
    initialQuestion: string,
    companyName: string = DEFAULT_OFFICIAL_BRAND_NAME,
    channelKey: BrandChannelKey = 'social_media'
): Promise<InterviewResult> => {
    try {
        const { track: personaTrack, audienceSegment } = detectPersonaTrack(persona);
        const brandManual = await fetchBrandManual();
        const slices = buildBrandSlices(brandManual, { audienceSegment, track: personaTrack, channelKey });
        const effectiveCompanyName = companyName || slices.dynamicVars.officialName;
        const { channelLabel } = slices.focusGroupSlice;

        const prompt = `
        Simula una entrevista cualitativa profunda en español natural de México sobre "${context}" y ${effectiveCompanyName} en el contexto del canal "${channelLabel}".

        === CONTEXTO DEL CANAL Y ESENCIA DE MARCA ===
        ${JSON.stringify(slices.focusGroupSlice, null, 2)}

        **Perfil del Entrevistado:**
        - Nombre: ${persona.name} (${persona.personaName})
        - Pista: ${personaTrack}
        - Biografía: ${persona.bio || persona.details?.bio || "Sin biografía"}
        - Ocupación / Cargo: ${persona.job_title || persona.details?.job_title || "No especificado"}
        - Edad: ${persona.age || persona.details?.age || "No especificada"}
        - Puntos de dolor: ${(persona.pain_points || persona.details?.pain_points || []).join('; ')}
        - Objetivos: ${(persona.goals || persona.details?.goals || []).join('; ')}
        - Contexto de la entrevista: ${context}

        **Regla de Realismo:**
        Responde estrictamente como un paciente, médico o directivo empresarial real en México desde tu experiencia cotidiana y práctica (NUNCA actúes como auditor regulatorio de COFEPRIS ni diseñador gráfico corporativo).

        **Task**:
        1. Answer the Initial Question from the interviewer in natural first-person speech.
        2. Then, simulate a "Researcher" asking you a follow-up question based on your answer.
        3. Answer the follow-up.
        4. Simulate one final follow-up from the Researcher.
        5. Answer the final follow-up.

        **Initial Question**: "${initialQuestion}"

        **Output Format**:
        Return a JSON object with this exact structure:
        {
            "transcript": [
                { "role": "interviewer", "content": "${initialQuestion}" },
                { "role": "interviewee", "content": "..." },
                { "role": "interviewer", "content": "..." },
                { "role": "interviewee", "content": "..." },
                { "role": "interviewer", "content": "..." },
                { "role": "interviewee", "content": "..." }
            ],
            "summary": "Brief 1-sentence summary of the key insight from this user.",
            "quote": "The most impactful sentence said by the user.",
            "sentiment": "Positive" | "Neutral" | "Negative"
        }

        Do not output markdown code blocks. Just the raw JSON.
        ${getLanguageInstruction()}
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanText);

        return {
            personaId: persona.id || `p_${Date.now()}`,
            personaName: persona.name,
            transcript: data.transcript || [],
            summary: data.summary || "No summary generated.",
            quote: data.quote || "No quote generated.",
            sentiment: data.sentiment || "Neutral"
        };
    } catch (error) {
        console.error("Interview simulation error:", error);
        return {
            personaId: persona.id || `p_err`,
            personaName: persona.name,
            transcript: [],
            summary: "Error during interview simulation.",
            quote: "Error.",
            sentiment: "Neutral"
        };
    }
};

export const generateRegionalVariants = async (
    basePrompt: string,
    companyName: string = DEFAULT_OFFICIAL_BRAND_NAME,
    productContext: string = "Check-up Control Diabetes",
    channelKey: BrandChannelKey = 'social_media'
): Promise<{ region: string; imagePrompt: string; image: string | null }[]> => {
    try {
        const categories = ["Lifestyle & Context", "Benefit & Feature-First", "Social-First & Aesthetic", "Value & Urgency-Based", "Aspirational Luxury"];
        const brandManual = await fetchBrandManual();
        const slices = buildBrandSlices(brandManual, { channelKey });
        const effectiveCompanyName = companyName || slices.dynamicVars.officialName;
        const aspectRatio = resolveAspectRatioForSubformat('', slices.channelKey);

        const prompt = `
        Toma el siguiente concepto fotográfico de campaña para ${effectiveCompanyName} (${productContext}): "${basePrompt}"

        === REGLAS DE FOTOGRAFÍA BASE LIMPIA DEL MANUAL DE MARCA ===
        ${JSON.stringify(slices.photoSlice, null, 2)}

        Adapta este concepto para las siguientes 5 variantes visuales en México, respetando estrictamente las reglas fotográficas anteriores (iluminación natural cálida, personas mexicanas reales, SIN estetoscopio en médicos, resultados 100% digitales en tablet/App, SIN placas radiográficas físicas, SIN agujas ni sangre explícita, SIN texto incrustado, SIN logotipos y SIN gráficos o líneas vectoriales):
        ${categories.join(", ")}

        Devuelve un objeto JSON que mapee cada nombre de categoría exactamente como está escrito a un prompt fotográfico detallado de fotografía base limpia.
        `;

        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        const text = extractTextFromResponse(response) || "{}";
        const cleanText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanText);

        const results = [];
        const BATCH_SIZE = 2;

        for (let i = 0; i < categories.length; i += BATCH_SIZE) {
            const batch = categories.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (category) => {
                const promptForRegion = data[category] || basePrompt;
                const imageUrl = await generateImageFromPrompt(promptForRegion, aspectRatio, slices.channelKey);
                return {
                    region: category,
                    imagePrompt: promptForRegion,
                    image: imageUrl
                };
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        return results;
    } catch (error) {
        console.error("Regional variants error:", error);
        return [{ region: "Standard", imagePrompt: basePrompt, image: null }];
    }
};

export const simulateABTestFocusGroup = async (
    pool: any[],
    variants: { region: string; image: string | null }[],
    companyName: string = DEFAULT_OFFICIAL_BRAND_NAME,
    productContext: string = "Check-up Control Diabetes",
    channelKey: BrandChannelKey = 'social_media'
): Promise<ABTestResult[]> => {
    if (!variants || variants.length === 0) return [];

    const brandManual = await fetchBrandManual();
    const slices = buildBrandSlices(brandManual, { channelKey });
    const effectiveCompanyName = companyName || slices.dynamicVars.officialName;
    const { channelLabel } = slices.focusGroupSlice;

    const promises = pool.map(async (persona) => {
        try {
            const personaTrack = detectPersonaTrack(persona).track;
            const prompt = `
            Estás evaluando variantes creativas para ${effectiveCompanyName} (${productContext}) en el canal "${channelLabel}" como una persona real en México (paciente, médico o responsable de empresa/RH según tu perfil).

            === CONTEXTO DEL CANAL Y ESENCIA DE MARCA ===
            ${JSON.stringify(slices.focusGroupSlice, null, 2)}

            **Regla de Realismo:**
            Reacciona como un ser humano real en México viendo estas propuestas en "${channelLabel}", NUNCA como un auditor regulatorio de COFEPRIS ni un diseñador gráfico corporativo. Evalúa calidez humana, claridad visual, tranquilidad y relevancia práctica para ti.

            Persona Profile:
            Name: ${persona.name}
            Track: ${personaTrack}
            Bio: ${persona.bio}
            Pain Points: ${(persona.pain_points || persona.details?.pain_points || []).join(", ")}
            Goals: ${(persona.goals || persona.details?.goals || []).join(", ")}

            Variants presented to you:
            ${variants.map(v => `- Variant: ${v.region}`).join("\n\n")}

            Task: Review the variants presented.
            For EACH variant, provide a score from 1 to 10 on how strongly it resonates with your persona. Explain your rationale for that score.
            Then, determine the overall best variant.

            Return ONLY a JSON object:
            {
                "rankings": [
                    { "variantName": "Variant Name", "score": 8, "rationale": "Why you gave this score..." }
                ],
                "selectedVariant": "The top scoring variant name",
                "overallFeedback": "Overall thoughts on the options presented.",
                "sentiment": "Positive/Neutral/Critical"
            }
            ${getLanguageInstruction()}
            `;

            const response = await callGenAiProxy("generateContent", {
                model: 'gemini-3-flash-preview',
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { responseMimeType: "application/json" }
            });

            const text = extractTextFromResponse(response) || "{}";
            const cleanText = text.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanText);

            return {
                personaId: persona.id,
                personaName: persona.name,
                rankings: data.rankings || [],
                selectedVariant: data.selectedVariant || "Generic",
                overallFeedback: data.overallFeedback || "No rationale provided.",
                sentiment: data.sentiment || "Neutral"
            };
        } catch (err) {
            console.error(`Simulation error for persona ${persona.name}:`, err);
            return {
                personaId: persona.id,
                personaName: persona.name,
                selectedVariant: "Error",
                sentiment: "Neutral",
                rankings: [],
                overallFeedback: "Simulation failed."
            };
        }
    });

    return Promise.all(promises);
};
