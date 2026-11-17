import { Schema, Type } from "@google/genai";
import { brandConfig } from "../config";
import { getCurrentLanguage } from "../context/LanguageContext";
import type {
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
    MarketingAssets,
    FocusGroupRubric,
    RubricScore,
    ClinicalUseCase,
    ConfigVersionSnapshot
};

export const MODEL_TEXT = "gemini-3.5-flash";

const getLanguageInstruction = (): string => {
    const lang = getCurrentLanguage();
    if (lang === 'es') {
        return `\nCRITICAL LANGUAGE RULE: Write all human-readable text values, bios, feedback, explanations, quotes, suggestions, and responses in natural Mexican Spanish (Español de México). However, you MUST keep all JSON property keys and enum tokens (such as 'Positive', 'Neutral', 'Negative', 'A', 'B') strictly in English ASCII exactly as defined in the output format.`;
    }
    return `\nCRITICAL LANGUAGE RULE: Write all output values and explanations in English.`;
};

// --- Fallback Official Rubrics (Used if /api/rubrics is unreachable) ---
export const DEFAULT_CHOPO_RUBRICS: FocusGroupRubric[] = [
    {
        id: "clarity_3s",
        name: "Claridad y Concisión (3 seg de Scroll)",
        track: "both",
        weight: 25,
        evaluationQuestion: "¿Se entiende en 3 segundos de scroll en el celular qué estudio se anuncia y cuál es el beneficio principal sin saturar de texto?",
        scoringAnchors: {
            low_0_to_40: "El texto es demasiado largo (más de 3-4 líneas comerciales), parece un folleto o instructivo de sucursal (menciona batas, reglas internas o párrafos densos) y da flojera leerlo en redes sociales.",
            mid_41_to_79: "El mensaje se entiende pero tiene palabras de más o el beneficio principal no destaca en la primera línea.",
            high_80_to_100: "Mensaje directo, ágil y escaneable en menos de 3 segundos: gancho claro en la primera línea y llamado a la acción inmediato."
        }
    },
    {
        id: "visual_trust_warmth",
        name: "Confianza Visual y Realismo Clínico",
        track: "both",
        weight: 25,
        evaluationQuestion: "¿La imagen y el tono transmiten la confianza, modernidad tecnológica y calidez de 'Tu laboratorio de cabecera'?",
        scoringAnchors: {
            low_0_to_40: "La imagen se ve falsa, fría, anticuada (ej. doctores viendo placas radiográficas físicas viejas a contraluz), muestra agujas/sangre o tiene errores de vestimenta/equipo médico.",
            mid_41_to_79: "Imagen aceptable pero genérica de foto de stock sin identidad clara de Chopo.",
            high_80_to_100: "Fotografía auténtica, luminosa y moderna (entrega digital en App/tablet, vestimenta y equipo correctos, paleta azul/blanco Chopo) que inspira tranquilidad."
        }
    },
    {
        id: "digital_ease_promo",
        name: "Atractivo Promocional y Facilidad Digital",
        track: "patient",
        weight: 25,
        evaluationQuestion: "¿Qué tan fácil y conveniente se percibe agendar/pagar en línea (chopo.com.mx o App Chopo) y recibir resultados digitales?",
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
        evaluationQuestion: "Con base en tus necesidades personales y familiares, ¿qué tan probable es que detengas el scroll y entres a chopo.com.mx o la App para agendar?",
        scoringAnchors: {
            low_0_to_40: "Pasaría de largo el anuncio ('scroll past') porque me aburrió, me generó desconfianza o no conecta con mi necesidad de salud.",
            mid_41_to_79: "Me llama la atención el estudio pero lo dejaría para después.",
            high_80_to_100: "Detendría el scroll y haría clic en este momento para cotizar o agendar mi estudio en línea."
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
        evaluationQuestion: "¿Qué tan probable es que recomiendes o envíes a tus pacientes a realizarse este estudio en Laboratorios Médicos El Chopo?",
        scoringAnchors: {
            low_0_to_40: "No lo recomendaría porque el anuncio confunde al paciente o muestra inconsistencias clínicas.",
            mid_41_to_79: "Lo consideraría como una opción más entre varios laboratorios.",
            high_80_to_100: "Lo recomendaría activamente a mis pacientes por su confiabilidad, accesibilidad y facilidad de consulta digital de resultados."
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
    entityType: 'personas' | 'rubrics' | 'use_cases' | 'prompts' | 'rag_docs'
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
    entityType: 'personas' | 'rubrics' | 'use_cases' | 'prompts' | 'rag_docs',
    versionId: string
): Promise<any> => {
    const res = await fetch('/api/config-versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, versionId })
    });
    if (!res.ok) throw new Error(`Failed to restore ${entityType} version ${versionId}`);
    return res.json();
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
        '02_chopo_brand_manual.md': '# Manual de Identidad y Marca Laboratorios Médicos El Chopo\n- Paleta Azul Chopo (#004B87 / #0066FF) y Blanco Clínico (#FFFFFF).\n- Precio especial exclusivo pagando en línea en chopo.com.mx o App Chopo.',
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
        - COF-001/002/003: Incluir "Consulte a su médico", Permiso de Publicidad COFEPRIS No. 243300201A1842 y Responsable Sanitario: Dr. Alejandro Rivera Gómez, Médico Cirujano (UNAM), Cédula Profesional 3918472.
        - COF-004/005/006/007: Prohibido prometer curas, autodiagnóstico o tono alarmista. Todo en español claro.
        - BRD-001/004/005: Paleta Azul Chopo (#004B87), Blanco Clínico (#FFFFFF) y Rojo Acento (#E30613). Fotografía auténtica sin agujas ni sangre explícita y sin texto incrustado. Especificar vigencia y exclusividad en línea (chopo.com.mx / App Chopo).
        - CLN-001/002: Check-up Control Diabetes requiere ayuno de 8 a 12 h (HbA1c aislada no requiere ayuno estricto).
        - RLM-001..004: Entrega de resultados 100% digital en App Chopo / tablet / smartphone (PROHIBIDO mostrar placas radiográficas físicas impresas a contraluz). Paciente en ropa casual para toma de muestra sanguínea y bata clínica en estudios de imagenología.
        `
    };
};

export const evaluateCreativeCompliance = async (payload: {
    copyText: string;
    imageUrl?: string | null;
    track?: string;
    clinicalLine?: string;
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
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Eres un experto en investigación de mercados médicos y comportamiento del consumidor en salud en México para Laboratorios Médicos El Chopo ("Tu laboratorio de cabecera").
                    Contexto Institucional: ${context}
                    
                    Tarea: Crea exactamente 3 segmentos de audiencia clínica altamente relevantes para Laboratorios Chopo en México (combinando Pista Paciente B2C y Pista Médico B2B).
                    
                    Reglas estrictas:
                    - 100% datos sintéticos (cero datos personales reales).
                    - Contexto cultural y socioeconómico auténtico de México (CDMX, Guadalajara, Monterrey, Puebla, Querétaro).
                    - Psicología realista de consumidores y médicos reales viendo publicidad en su celular: evalúan claridad comercial, facilidad digital (App Chopo / chopo.com.mx), calidez visual y confianza institucional.
                    
                    Devuelve un arreglo JSON válido con objetos que sigan esta estructura exacta:
                    [
                        {
                            "track": "patient",
                            "name": "[Paciente B2C] Nombre del Segmento",
                            "personaName": "Nombre Completo (Edad, Ciudad)",
                            "bio": "Descripción de 2 oraciones...",
                            "demographics": "Rango de edad, Ciudad, NSE...",
                            "imagePrompt": "Retrato fotográfico realista de una persona mexicana en entorno cotidiano o clínico moderno iluminado, sin texto incrustado..."
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
        const isPhysician = audienceName.toLowerCase().includes('médico') || audienceName.toLowerCase().includes('b2b') || audienceName.toLowerCase().includes('physician');
        const prompt = `
        Eres un analista experto en investigación médica y de salud en México para Laboratorios Médicos El Chopo ("Tu laboratorio de cabecera").
        Genera el perfil detallado para la siguiente persona sintética bajo nuestro esquema fijo depurado.

        **Contexto Institucional:**
        ${context}

        **Segmento de Audiencia:**
        ${audienceName} (${isPhysician ? 'Pista Médico B2B' : 'Pista Paciente B2C'})

        **Nombre de la Persona:**
        ${personaName}

        **Requisitos de Salida (Esquema Fijo Depurado):**
        Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
        {
            "name": "${personaName}",
            "track": "${isPhysician ? 'physician' : 'patient'}",
            "age": 42,
            "job_title": "Ocupación o Especialidad Médica",
            "bio": "Biografía realista en 2 oraciones sobre su relación con el cuidado de la salud, estudios de laboratorio y uso digital.",
            "income": "Nivel de ingreso mensual estimado en MXN",
            "lifestyle_tags": ["tag1", "tag2", "tag3", "tag4"],
            "preferred_products": ["Check-up Control Diabetes", "Hemoglobina Glicosilada (HbA1c)", "Check-up Completo Chopo"],
            "pain_points": [
                "Punto de dolor realista al ver publicidad médica o acudir al laboratorio 1",
                "Punto de dolor 2",
                "Punto de dolor 3"
            ],
            "goals": [
                "Objetivo práctico de salud o consulta digital 1",
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
    track: 'B2C' | 'B2B',
    companyDescription: string
): Promise<CombinedPersona> => {
    const isB2B = track === 'B2B';
    const trackSuffix = isB2B ? '(Médico B2B)' : '(Paciente B2C)';
    const internalTrack: 'physician' | 'patient' = isB2B ? 'physician' : 'patient';

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

    const prompt = `
    Eres el Director de Investigación de Mercados Clínicos y Comportamiento del Consumidor de Laboratorios Médicos El Chopo ("Tu laboratorio de cabecera").
    Construye exactamente 1 perfil de audiencia clínico completo (CombinedPersona) en español de México (es-MX) a partir de la descripción en lenguaje natural del usuario y la pista seleccionada.

    **Contexto Institucional:**
    ${companyDescription || "Laboratorios Médicos El Chopo - Diagnóstico clínico e imagenología en México"}

    **Pista Seleccionada:**
    ${isB2B ? 'B2B — Médico Prescriptor / Especialista / Profesional de la Salud en México' : 'B2C — Paciente / Consumidor de Salud y Prevención en México'}

    **Descripción de la Audiencia Solicitada por el Usuario:**
    "${promptText}"

    **Reglas Estrictas de Construcción:**
    1. "name": Nombre claro y ejecutivo del segmento incluyendo entre paréntesis "${trackSuffix}" al final (ejemplo: "${isB2B ? 'Médico General Recién Egresado (Médico B2B)' : 'Mujer Embarazada Primeriza (Paciente B2C)'}").
    2. "personaName": Nombre representativo mexicano con edad (ejemplo: "${isB2B ? 'Dr. Sebastián Mora, 26' : 'Mariana Ríos, 29'}").
    3. "demographics": Rango de edad, ocupación/especialidad, ciudad/zona en México (CDMX, Guadalajara, Monterrey, Puebla, Querétaro, etc.) y nivel socioeconómico (NSE).
    4. "bio": Historia clínica, contexto profesional y estilo de vida detallado (3 a 4 oraciones realistas).
    5. "imagePrompt": Prompt fotográfico realista para retrato de estudio o entorno clínico/cotidiano iluminado en México, sin texto incrustado, sin agujas perforando la piel y sin placas físicas viejas.
    6. "details":
       - "age": Edad numérica (ej. 26).
       - "income": Rango de ingreso mensual estimado en MXN o nivel socioeconómico (ej. "$28,000 - $45,000 MXN/mes (NSE C+)").
       - "job_title": Ocupación o especialidad médica (con mención de cédula o ámbito clínico si es B2B).
       - "bio": Resumen de su relación con estudios diagnósticos, uso digital (App Chopo / chopo.com.mx) y toma de decisiones (2 a 3 oraciones).
       - "pain_points": 3 a 4 dolores o barreras reales frente a estudios clínicos o publicidad médica en celular.
       - "goals": 3 a 4 motivadores o metas claras de salud / práctica médica.
       - "lifestyle_tags": 4 a 5 etiquetas cortas del perfil.
       - "preferred_products": 3 a 5 estudios diagnósticos o check-ups de Laboratorios Chopo altamente afines al perfil (ej. Check-up Control Diabetes, Hemoglobina Glicosilada HbA1c, Check-up Completo Chopo, Mastografía Digital + Ultrasonido, Ultrasonido Obstétrico / Prenatal, Química Sanguínea de 45 elementos, Perfil Tiroideo, Biomarcadores / Marcadores Tumorales, Rayos X de Tórax Digital).
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
    const normalizedName = /\((?:Paciente\s*B2C|Médico\s*B2B|B2C|B2B)\)/i.test(rawName) || rawName.startsWith('[')
        ? rawName
        : `${rawName} ${trackSuffix}`;

    const age = Number(raw.details?.age) || (isB2B ? 34 : 36);
    const jobTitle = String(raw.details?.job_title || (isB2B ? 'Médico Prescriptor' : 'Profesionista')).trim();
    const personaName = String(raw.personaName || (isB2B ? `Dr. Alejandro Vega, ${age}` : ` Sofía Méndez, ${age}`)).trim();
    const bio = String(raw.bio || raw.details?.bio || promptText).trim();
    const demographics = String(raw.demographics || `${age} años, Urbano México, ${isB2B ? 'Médico B2B' : 'Paciente B2C'}`).trim();
    const painPoints = Array.isArray(raw.details?.pain_points) && raw.details.pain_points.length > 0
        ? raw.details.pain_points
        : ['Falta de tiempo para trámites presenciales', 'Información confusa sobre requisitos de ayuno o preparación'];
    const goals = Array.isArray(raw.details?.goals) && raw.details.goals.length > 0
        ? raw.details.goals
        : ['Recibir resultados digitales confiables en la App Chopo', 'Agendar en línea de forma rápida y con precio transparente'];
    const lifestyleTags = Array.isArray(raw.details?.lifestyle_tags) && raw.details.lifestyle_tags.length > 0
        ? raw.details.lifestyle_tags
        : [isB2B ? 'Práctica Clínica' : 'Salud Preventiva', 'Resultados Digitales', 'App Chopo'];
    const preferredProducts = Array.isArray(raw.details?.preferred_products) && raw.details.preferred_products.length > 0
        ? raw.details.preferred_products
        : ['Check-up Completo Chopo', 'Química Sanguínea de 45 elementos', 'Check-up Control Diabetes'];
    const defaultAffinityData = isB2B ? [96, 76, 92, 85] : [92, 90, 89, 88];

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
            `Retrato fotográfico realista de estudio de ${personaName}, ${jobTitle} en México, iluminación cálida y profesional, sin texto incrustado`
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
        const isPhysician =
            basePersona?.track === 'physician' ||
            /médico|b2b|physician/i.test(String(basePersona?.name || ''));
        const extraContextBlock = additionalClinicalContext && additionalClinicalContext.trim()
            ? `\n        **CONTEXTO CLÍNICO O DE CAMPAÑA ADICIONAL PARA VARIAR LOS PERFILES DEL LOTE:**\n        CONTEXTO CLÍNICO O DE CAMPAÑA ADICIONAL PARA VARIAR LOS PERFILES DEL LOTE: "${additionalClinicalContext.trim()}". Asegúrate de que los ${count} usuarios sintéticos reflejen este contexto con matices individuales distintos sin ser clones idénticos.\n`
            : '';

        const prompt = `
        You are an expert market researcher for Laboratorios Médicos El Chopo. Based on the provided base persona and company context, generate exactly ${count} unique synthetic user profiles. Each user should inherit the high-level traits of the base persona (${isPhysician ? 'B2B Prescribing Physician' : 'B2C Patient'}) but have distinct details.

        **Company Context:**
        ${companyDescription}

        **Base Persona:**
        Name: ${basePersona.name || basePersona.personaName}
        Representative Archetype: ${basePersona.personaName || ''}
        Track: ${isPhysician ? 'physician' : 'patient'}
        Bio: ${basePersona.bio || (basePersona.details ? basePersona.details.bio : '')}
        Demographics: ${basePersona.demographics || (basePersona.details ? basePersona.details.age : '')}
        Pain Points: ${JSON.stringify(basePersona.pain_points || basePersona.details?.pain_points || [])}
        Goals: ${JSON.stringify(basePersona.goals || basePersona.details?.goals || [])}
        Preferred Studies: ${JSON.stringify(basePersona.preferred_products || basePersona.details?.preferred_products || [])}
        ${extraContextBlock}
        **Output Requirements:**
        Generate ONLY a valid JSON array of ${count} objects, with each object following this exact structure:
        {
            "name": "Unique Fake Name",
            "track": "${isPhysician ? 'physician' : 'patient'}",
            "personaName": "${basePersona.name || basePersona.personaName}",
            "bio": "Unique 1-2 sentence bio tailored to this specific generated person${additionalClinicalContext?.trim() ? ' incorporating the additional clinical context' : ''}.",
            "demographics": "Specific age, location in Mexico, and profile",
            "pain_points": ["pain point 1", "pain point 2"],
            "goals": ["goal 1", "goal 2"],
            "cognitiveStyle": {
                "informationDensityPreference": "e.g. Concisa y directa en celular",
                "primaryTrustSignal": "e.g. Prestigio Chopo y resultados digitales en App",
                "decisionVelocity": "e.g. Rápida si el beneficio es claro",
                "riskTolerance": "e.g. Baja ante mensajes alarmistas"
            },
            "lifestyleFriction": {
                "dailyGrindContext": "e.g. Horario laboral ocupado",
                "financialMindset": "e.g. Busca promociones claras pagando en línea",
                "brandLoyaltyQuotient": "e.g. Alta hacia Tu laboratorio de cabecera",
                "householdPowerDynamic": "e.g. Decisor de salud familiar"
            },
            "digitalFootprint": {
                "last3SearchQueries": ["query 1", "query 2", "query 3"],
                "unsubscribeTrigger": "Anuncios largos tipo folleto médico",
                "platformEcosystem": "App Chopo / WhatsApp / Instagram",
                "recentBigLifeEvent": "Check-up preventivo anual"
            },
            "psychographicFlavor": {
                "theOneLuxury": "Salud preventiva sin filas",
                "aspirationVsReality": "Quiere cuidarse sin perder toda la mañana",
                "socialCauseAlignment": "Prevención de diabetes familiar"
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

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    const imgData = await generateImage(prompt, 'gemini-2.5-flash-image');
    if (imgData) {
        return `data:image/jpeg;base64,${imgData}`;
    }
    return "/api/media/chopo_persona_dr_carlos.png";
};

export const generateMarketingCampaignAssets = async (
    productName: string,
    targetAudience: string,
    context: string
): Promise<MarketingAssets> => {
    const isB2B =
        targetAudience.toLowerCase().includes('médico') ||
        targetAudience.toLowerCase().includes('b2b') ||
        targetAudience.toLowerCase().includes('especialista') ||
        targetAudience.toLowerCase().includes('physician');

    const track = isB2B ? 'physician' : 'patient';
    const ragData = await retrieveRagContext(productName, track);
    const useCase = ragData.useCase;

    const cofeprisPermit = isB2B
        ? (useCase?.cofeprisPermitB2B || 'Aviso de Publicidad COFEPRIS No. 243300202A0911')
        : (useCase?.cofeprisPermitB2C || 'Permiso de Publicidad COFEPRIS No. 243300201A1842');
    const mandatoryLegend = isB2B
        ? 'Información exclusiva para profesionales de la salud.'
        : 'Consulte a su médico.';
    const responsableSanitario =
        useCase?.responsableSanitario ||
        'Responsable Sanitario: Dr. Alejandro Rivera Gómez, Médico Cirujano (UNAM), Cédula Profesional 3918472.';
    const promoText =
        useCase?.defaultPromoText ||
        'Precio especial exclusivo pagando en línea en chopo.com.mx o App Chopo. Vigencia al 31 de diciembre de 2026.';

    const copyPromise = callGenAiProxy("generateContent", {
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [{
                text: `
                Eres el Director Creativo y Médico de Laboratorios Chopo ("Tu laboratorio de cabecera").
                Diseña una campaña multicanal de alta conversión y alto impacto emocional para el estudio "${productName}" dirigida a "${targetAudience}" (${isB2B ? 'Pista Médico B2B' : 'Pista Paciente B2C'}).

                **Contexto Institucional:**
                ${brandConfig.companyName || "Laboratorios Chopo"} - ${context}

                **INSTRUCCIÓN OBLIGATORIA DEL USUARIO (REGLA SUPREMA — SEGUIR AL PIE DE LA LETRA):**
                """
                ${targetAudience}
                """
                ⚠️ ATENCIÓN CRÍTICA: Debes obedecer AL 100% Y AL PIE DE LA LETRA todas las instrucciones específicas que el usuario haya escrito arriba (sobre qué debe decir o mostrar el email, el post de redes sociales, la promoción, el tono, el enfoque visual o el mensaje). PROHIBIDO ignorar, contradecir o cambiar lo que el usuario pidió específicamente. Si el usuario pidió incluir algo específico en el email o en la imagen, DEBE aparecer exactamente como lo solicitó.

                === REGLAS OFICIALES DE CUMPLIMIENTO RAG (COFEPRIS, MARCA CHOPO, CLÍNICA Y REALISMO VISUAL) ===
                ${ragData.combinedContext}

                === PARÁMETROS OBLIGATORIOS DEL CASO DE USO ===
                - Estudio / Paquete: ${productName}
                - Condición Promocional (BRD-005): ${promoText}
                - Leyenda Precautoria (COF-002): ${mandatoryLegend}
                - Folio COFEPRIS (COF-001): ${cofeprisPermit}
                - Responsable Sanitario (COF-003): ${responsableSanitario}

                REGLAS CRÍTICAS DE ESTILO PUBLICITARIO (02_campaign_creator):
                1. BREVEDAD, EMPATÍA Y PUNCH COMERCIAL EN REDES SOCIALES (social.caption):
                   - Máximo 35 a 45 palabras comerciales ANTES del pie legal obligatorio (salvo que el usuario pida otra extensión en su instrucción).
                   - Línea 1: Gancho empático/consciente + valor real de "${productName}" siguiendo fielmente la instrucción del usuario.
                   - Línea 2: Llamado a la acción directo con la condición promocional en línea (${promoText}).
                   - Línea 3 (Pie legal obligatorio compacto): "${mandatoryLegend} ${cofeprisPermit}. ${responsableSanitario}"
                2. CORREO ELECTRÓNICO TIPO BANNER VISUAL MODERNO (email):
                   - La mayoría de los correos de marketing modernos NO son bloques largos de texto plano: son un **Banner Visual con texto corto no invasivo integrado** + un mensaje breve y personalizado de 2 a 3 líneas.
                   - OBEDECE AL PIE DE LA LETRA cualquier instrucción que el usuario haya dado para el correo.
                   - Estructura obligatoria del objeto "email":
                     * "subject": Asunto personalizado y directo (fiel al prompt del usuario).
                     * "preheader": Texto corto de vista previa (10 a 15 palabras).
                     * "bannerHeadline": Titular corto y no invasivo que va sobre la imagen/banner del correo (4 a 8 palabras máximo, con alto impacto visual y fiel a la instrucción del usuario).
                     * "bannerSubheadline": Subtítulo breve o beneficio clave en 1 línea corta para el cintillo del banner (ej. "${productName} • Beneficio exclusivo en línea").
                     * "body": Texto breve, cálido y directo de acompañamiento debajo del banner (máximo 25 a 45 palabras, salvo que el usuario haya pedido algo distinto; NUNCA escribas las palabras literales "Incluye pie legal:").
                     * "ctaText": Texto del botón de acción (ej. "Agendar Estudio en Línea").
                     * "legalFooter": "${mandatoryLegend} ${cofeprisPermit}. ${responsableSanitario}"
                3. DIRECCIÓN DE ARTE Y REALISMO VISUAL PARA LA IMAGEN / BANNER (imagePrompt):
                   - OBEDECE PRIMERO Y AL PIE DE LA LETRA EL ENFOQUE CREATIVO DEL USUARIO Y EL SEGMENTO (${isB2B ? 'Médico B2B' : 'Paciente B2C'}):
                   - PROHIBIDO generar fotos genéricas y frías de catálogo donde solo aparece un médico posando junto a una máquina con una tablet, a menos que la audiencia sea exclusivamente Médico B2B o el usuario lo pida expresamente.
                   - Si la audiencia es PACIENTE B2C (ej. Mujeres / Prevención de Cáncer de Mama / Mastografía Digital + Ultrasonido):
                     * El protagonista visual DEBE ser la paciente mujer mexicana (ej. 35-50 años) transmitiendo prevención oportuna, amor propio, tranquilidad familiar y el valor de detectar a tiempo.
                     * Si el objetivo pide "enfoque rosa" o concientización sobre cáncer de mama: usa una dirección de arte editorial cálida y empática con sutiles acentos en tonos rosa suave/cálido combinados con la limpieza clínica de Chopo (luz natural cálida, listón o prenda en tono rosa sutil, abrazo familiar o acompañamiento humano cálido de una especialista mujer, sin ser explícito ni alarmista).
                   - Composición pensada para funcionar también como **Banner de Email Marketing** (con aire visual limpio para que el cintillo de texto no invasivo luzca profesional).
                   - Reglas negativas estrictas (RLM-001 a RLM-004): PROHIBIDO mostrar placas radiográficas físicas impresas a contraluz, PROHIBIDO mostrar agujas perforando la piel o sangre explícita, PROHIBIDO texto deformado incrustado en la foto.

                Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura:
                {
                    "imagePrompt": "Descripción fotográfica editorial detallada en español, 100% fiel a la instrucción del usuario, con composición limpia tipo banner y sin texto incrustado...",
                    "social": {
                        "caption": "...",
                        "hashtags": ["#Chopo", "#TuLaboratorioDeCabecera", "#DetecciónOportuna"]
                    },
                    "search": {
                        "headline": "Título corto (máx 30 caracteres)",
                        "description": "Descripción persuasiva con precio especial en línea en chopo.com.mx. ${mandatoryLegend}",
                        "url": "chopo.com.mx/estudios/${productName.replace(/\s+/g, '-').toLowerCase()}"
                    },
                    "email": {
                        "subject": "...",
                        "preheader": "...",
                        "bannerHeadline": "Titular corto no invasivo para el banner del correo (4-8 palabras)",
                        "bannerSubheadline": "Subtítulo corto del cintillo del banner",
                        "body": "Mensaje corto y personalizado (25-45 palabras, fiel a la instrucción del usuario)...",
                        "ctaText": "Agendar Estudio en Línea",
                        "legalFooter": "${mandatoryLegend} ${cofeprisPermit}. ${responsableSanitario}"
                    },
                    "youtube": {
                        "title": "...",
                        "script": "..."
                    },
                    "recommendations": [
                        { "name": "Estudio o Check-up Complementario 1 acorde a ${productName}", "price": "Precio especial en línea", "imagePrompt": "Fotografía editorial luminosa en México acorde al estudio 1, sin texto incrustado..." },
                        { "name": "Estudio o Check-up Complementario 2 acorde a ${productName}", "price": "Agenda en App Chopo", "imagePrompt": "Fotografía editorial luminosa en México acorde al estudio 2, sin texto incrustado..." },
                        { "name": "Estudio o Check-up Complementario 3 acorde a ${productName}", "price": "Exclusivo en chopo.com.mx", "imagePrompt": "Fotografía editorial luminosa en México acorde al estudio 3, sin texto incrustado..." }
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

        const visualSafetySuffix = ", fotografía editorial hiperrealista en México, iluminación cálida y profesional, estética publicitaria empática, SIN placas radiográficas físicas impresas a contraluz, SIN agujas ni sangre explícita, SIN texto incrustado";

        const allImagePrompts: { type: string, prompt: string, rec?: any }[] = [];

        if (data.imagePrompt) {
            allImagePrompts.push({
                type: 'MAIN',
                prompt: data.imagePrompt + visualSafetySuffix
            });
        }

        for (const rec of (data.recommendations || [])) {
            allImagePrompts.push({
                type: 'REC',
                prompt: (rec.imagePrompt || `${rec.name} en Laboratorios Chopo`) + visualSafetySuffix,
                rec
            });
        }

        const results: any[] = [];
        const imageBatchSize = 4;

        for (let i = 0; i < allImagePrompts.length; i += imageBatchSize) {
            const batch = allImagePrompts.slice(i, i + imageBatchSize);
            const batchResults = await Promise.all(batch.map(async (item) => {
                const img = await generateImageFromPrompt(item.prompt);
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
            search: data.search || { headline: productName, description: "", url: "chopo.com.mx" },
            email: {
                subject: data.email?.subject || productName,
                preheader: data.email?.preheader || "",
                bannerHeadline: data.email?.bannerHeadline || data.search?.headline || productName,
                bannerSubheadline: data.email?.bannerSubheadline || promoText,
                body: data.email?.body || "",
                ctaText: data.email?.ctaText || "Agendar Estudio en Línea",
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
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Product: ${productName}
                    Target Persona: ${personaName}
                    
                    Write a catchy headline and a persuasive subheadline for a landing page targeting this persona.
                    Also provide a Spanish translation for both.
                    
                    Return JSON:
                    {
                        "headline": "English Headline",
                        "subheadline": "English Subhead",
                        "headline_es": "Spanish Headline",
                        "subheadline_es": "Spanish Subhead"
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
        return { headline: "Welcome", subheadline: "Check out our products." };
    }
};

export const generateMarketingBrief = async (
    context: string,
    goal: string,
    sourceAudiences?: any[],
    studyName: string = 'Check-up Control Diabetes',
    track: string = 'both'
): Promise<any> => {
    try {
        const timestamp = new Date().toLocaleString();
        const ragData = await retrieveRagContext(studyName, track, goal);
        const useCase = ragData.useCase;

        const audienceContext = sourceAudiences && sourceAudiences.length > 0 
            ? `\n**Audiencias Objetivo Seleccionadas (${sourceAudiences.length}):**\n${sourceAudiences.map((aud, i) => `\n${i+1}. Nombre: ${aud.name} (${aud.personaName || ''})\n   Pista: ${aud.track || 'patient'}\n   Bio: ${aud.bio}\n   Demografía: ${aud.demographics}`).join('\n')}\n`
            : "";

        const prompt = `
        Eres el Agente Estratégico de Marketing Clínico y Cumplimiento de Laboratorios Médicos El Chopo ("Tu laboratorio de cabecera").
        Crea un Marketing Brief integral anclado en nuestra Base de Conocimiento Oficial (RAG) para el estudio "${useCase?.studyName || studyName}".
        
        **Contexto Institucional:** ${context}
        **Estudio / Caso de Uso Principal:** ${useCase?.studyName || studyName}
        **Estudios que incluye:** ${(useCase?.includedStudies || []).join(', ')}
        **Requisito de Ayuno (CLN-002):** ${useCase?.fastingRequirement || 'Ayuno obligatorio de 8 a 12 horas'}
        **Objetivo de la Campaña:** ${goal}
        ${audienceContext}

        === BASE DE CONOCIMIENTO RAG (COFEPRIS, MANUAL DE MARCA CHOPO, CATÁLOGO CLÍNICO Y REALISMO VISUAL) ===
        ${ragData.combinedContext}
        
        CRÍTICO: Sigue exactamente la estructura de 8 secciones en JSON. Asegura que:
        - "productName" sea exactamente "${useCase?.studyName || studyName}".
        - OBEDECE FIELMENTE las instrucciones creativas, emocionales y de enfoque indicadas en "Objetivo de la Campaña" (${goal}).
        - NO fuerces ni inventes una duración fija de "8 semanas" en "assumptions.timeline" ni en "phases" a menos que el usuario lo haya escrito explícitamente en el Objetivo de la Campaña. Si el usuario no especifica semanas exactas, define un ciclo flexible o por etapas estratégicas ("Etapa Inicial: Concientización", "Etapa Central: Conversión y Agenda Digital", "Etapa Continua: Seguimiento Preventivo") o acorde a la temporalidad natural del estudio (ej. Campaña Mensual / Permanente).
        - "assumptions.mitigationStrategy" detalle explícitamente el cumplimiento de COF-001 (${useCase?.cofeprisPermitB2C || 'Permiso COFEPRIS No. 2609152002A00518'} / ${useCase?.cofeprisPermitB2B || 'Aviso COFEPRIS No. 243300202A0911'}), COF-002 ("Consulte a su médico"), COF-003 (${useCase?.responsableSanitario || 'Responsable Sanitario con Cédula Profesional'}), CLN-002 (preparación exacta) y RLM-001..004 (cero placas físicas a contraluz, cero agujas explícitas, entrega 100% digital en App Chopo).
        
        Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura:
        {
            "title": "Marketing Brief: [Título Estratégico de la Campaña]",
            "timestamp": "${timestamp}",
            "campaignGoal": "${goal}",
            "productName": "${useCase?.studyName || studyName}",
            "studyName": "${useCase?.studyName || studyName}",
            "companyName": "Laboratorios Médicos El Chopo",
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
                    "sourceSegment": "[Pista Paciente B2C o Pista Médico B2B]",
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
        }
        return parsed;
    } catch (error) {
        console.error("Brief generation error:", error);
        return null;
    }
};

export const generatePersonaChatResponse = async (persona: any, brief: any, message: string, chatHistory: { role: string, parts: { text: string }[] }[], simulationContext?: any): Promise<string> => {
    try {
        const personaName = persona.personaName || persona.name || 'Participante';
        const demographics = persona.demographics || `${persona.age || persona.details?.age || 40} años`;
        const bio = persona.bio || persona.details?.bio || '';
        const painPoints = (persona.pain_points || persona.details?.pain_points || []).join('; ');
        const goals = (persona.goals || persona.details?.goals || []).join('; ');
        const studyName = brief?.productName || brief?.studyName || 'Check-up Control Diabetes';

        let rubricSummaryText = '';
        if (simulationContext) {
            if (Array.isArray(simulationContext.rubricScores) && simulationContext.rubricScores.length > 0) {
                rubricSummaryText = simulationContext.rubricScores
                    .map((r: RubricScore) => `- ${r.name} (Peso ${r.weight}%): ${r.score}/100 — "${r.rationale}"`)
                    .join('\n');
            } else {
                rubricSummaryText = `
                - Atractivo Visual / Confianza: ${simulationContext.visualAppeal}/100
                - Apego a Marca Chopo: ${simulationContext.brandFit}/100
                - Claridad en 3 seg (Stopping Power): ${simulationContext.stoppingPower}/100
                - Intención de Acción: ${simulationContext.conversionLikelihood}/100
                `;
            }
        }

        const personaContext = `
        Estás interpretando en primera persona a "${personaName}" (${demographics}).
        Biografía y contexto: ${bio}
        Puntos de dolor: ${painPoints}
        Objetivos: ${goals}

        Acabas de participar en un Focus Group de Laboratorios Médicos El Chopo viendo una campaña para "${studyName}" en tu celular.
        ${simulationContext ? `
        Tu comentario inicial fue: "${simulationContext.feedback || ''}".
        Tu calificación global ponderada fue: ${simulationContext.weightedOverallScore ?? simulationContext.conversionLikelihood ?? 75}/100.
        Tus calificaciones por rúbrica fueron:
        ${rubricSummaryText}
        Dudas o barreras que detectaste: "${simulationContext.barriersOrConcerns || simulationContext.suggestedMessaging || ''}"
        ` : ''}

        REGLAS DE INTERPRETACIÓN (04_focus_group_1on1_chat):
        Responde en primera persona, como un consumidor o médico real viendo redes sociales en su celular (NUNCA actúes como inspector legal ni pidas que un anuncio de redes sociales tenga manuales de procedimiento o batas; prefiere anuncios cortos, claros, con facilidad digital en App Chopo y visualmente atractivos).
        Si te preguntan por qué diste cierta calificación en alguna rúbrica, explícalo desde tu personalidad y tus razones anteriores sin contradecirte. Sé conciso (2 a 3 oraciones).
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
    try {
        const prompt = `
        Eres el Director de Email Marketing de ${brandConfig.companyName || "Laboratorios Chopo"} ("Tu laboratorio de cabecera").
        
        **Estudio / Producto:** ${brief.productName}
        **Audiencia Objetivo:** ${brief.audiences?.[0]?.name || "Paciente / Médico Chopo"}
        **Instrucción / Objetivo del Usuario (SEGUIR AL PIE DE LA LETRA):** ${brief.campaignGoal}

        **Tarea:**
        Para CADA uno de los siguientes asuntos de correo, redacta un mensaje breve, directo y de alto impacto (máximo 35 a 45 palabras, pensado para acompañar un banner visual de correo) siguiendo estrictamente las instrucciones de "${brief.campaignGoal}".

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
        headlines.forEach(h => fallback[h] = `Agenda tu estudio en línea en chopo.com.mx o en la App Chopo con precio especial y recibe tus resultados digitales. Consulte a su médico.`);
        return fallback;
    }
};

export const generateWildcardAudience = async (context: string, existingAudiences: string[]): Promise<any> => {
    try {
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    You are a creative strategist looking for "Blue Ocean" opportunities for Laboratorios Médicos El Chopo.

                    **Company Context:**
                    ${context}

                    **Existing Segments:**
                    ${JSON.stringify(existingAudiences)}

                    **Task:**
                    Identify 1 COMPLETELY DIFFERENT "Wildcard" Audience Segment in Mexico (either Patient B2C or Physician B2B) that is distinct from the existing ones.

                    Return a valid JSON object:
                    {
                        "track": "patient",
                        "name": "[Paciente B2C] Nombre del Segmento",
                        "personaName": "Nombre Completo (Edad, Ciudad)",
                        "bio": "Descripción...",
                        "demographics": "Rango de edad, Ciudad, NSE...",
                        "imagePrompt": "Retrato fotográfico realista en México..."
                    }
                    Do not use markdown code blocks.
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
        const isPhysician = criteria.toLowerCase().includes('médico') || criteria.toLowerCase().includes('especialista') || criteria.toLowerCase().includes('b2b') || criteria.toLowerCase().includes('doctor');
        const response = await callGenAiProxy("generateContent", {
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{
                    text: `
                    Eres un experto en investigación de mercados médicos para Laboratorios Médicos El Chopo ("Tu laboratorio de cabecera").

                    **Contexto Institucional:**
                    ${context}

                    **Criterio del Usuario:**
                    "${criteria}"

                    **Tarea:**
                    Desarrolla un perfil sintético mexicano realista para la pista "${isPhysician ? 'physician' : 'patient'}" que cumpla exactamente con el criterio solicitado.

                    Devuelve un objeto JSON válido:
                    {
                        "track": "${isPhysician ? 'physician' : 'patient'}",
                        "name": "${isPhysician ? '[Médico B2B]' : '[Paciente B2C]'} Nombre del Segmento",
                        "personaName": "Nombre Representativo (Edad, Ciudad)",
                        "bio": "Descripción rica de su perfil, estilo de vida y necesidades diagnósticas...",
                        "demographics": "Edad, Ciudad en México, NSE...",
                        "imagePrompt": "Retrato fotográfico realista en México sin texto incrustado..."
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
    emailCampaigns: { subject: string, body: string }[],
    marketingMessages: string[] = []
): Promise<any[]> => {
    const BATCH_SIZE = 10;
    const results: any[] = [];

    const processBatch = async (batchPersonas: any[]) => {
        try {
            console.log(`Processing batch of ${batchPersonas.length} users...`);
            const prompt = `
            You are a hyper-realistic consumer and physician simulator in Mexico evaluating campaigns for Laboratorios Médicos El Chopo.

            **CONTEXT:**
            You are simulating the behavior of ${batchPersonas.length} distinct synthetic personas scrolling on their mobile phones (3-second attention span).
            
            **CRITICAL INSTRUCTION - REALISM & VARIANCE:**
            - Act as real humans on social media / mobile, NOT as regulatory auditors.
            - Penalize long, boring, text-heavy messages; reward concise, empathetic, digital-first messages (App Chopo / chopo.com.mx).
            - Scores must use the full 0-100 range based on each persona's pain points and goals.
            
            **THE MARKETING MATERIAL:**
            Campaign Goal: ${brief.campaignGoal}
            Value Proposition: ${brief.valueProp?.main?.es || brief.valueProp?.main?.en || "Certeza diagnóstica y prevención"}
            
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
                                track: p.track || 'patient',
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
    companyName: string = "Laboratorios Médicos El Chopo",
    productContext: string = "Diagnóstico Clínico y Check-ups"
): Promise<any[]> => {
    const BATCH_SIZE = 10;
    const results: any[] = [];

    const processBatch = async (batchPersonas: any[]) => {
        try {
            console.log(`Processing acquisition batch of ${batchPersonas.length} users for ${companyName}...`);
            const prompt = `
            You are a hyper-realistic consumer and physician simulator specializing in healthcare and clinical laboratory behaviors in Mexico.
            
            **CONTEXT:**
            You are simulating ${batchPersonas.length} distinct synthetic personas evaluating acquisition offers from ${companyName} (${productContext}).
            
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
                                track: p.track || 'patient',
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
    companyName: string = "Laboratorios Médicos El Chopo",
    activeRubrics?: FocusGroupRubric[],
    studyName: string = "Check-up Control Diabetes"
): Promise<any[]> => {
    const BATCH_SIZE = 5; // Smaller batch for multimodal
    const results: any[] = [];

    const rubricsToUse: FocusGroupRubric[] =
        activeRubrics && activeRubrics.length > 0 ? activeRubrics : await fetchRubrics();

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

    const adCopySummary = `
    - Post Redes Sociales: "${assets.social?.caption || ''}" (${(assets.social?.hashtags || []).join(' ')})
    - Anuncio Buscador: "${assets.search?.headline || ''}" — "${assets.search?.description || ''}"
    - Asunto de Correo: "${assets.email?.subject || ''}"
    `.trim();

    const processBatch = async (batchPersonas: any[]) => {
        try {
            console.log(`Processing creative focus group batch of ${batchPersonas.length} users with dynamic rubrics...`);

            const personasPayload = batchPersonas.map(p => {
                const pTrack =
                    p.track === 'physician' ||
                    String(p.name || '').toLowerCase().includes('médico') ||
                    String(p.name || '').toLowerCase().includes('b2b')
                        ? 'physician'
                        : 'patient';
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
                        .filter(r => r.track === 'both' || r.track === pTrack)
                        .map(r => r.id)
                };
            });

            const prompt = `
            Simula un Focus Group de consumidores y médicos reales en México viendo este material publicitario de ${companyName} para "${studyName}" mientras hacen scroll en su teléfono celular (Instagram / Facebook / LinkedIn / Email):

            === MATERIAL PUBLICITARIO A EVALUAR ===
            ${adCopySummary}
            (Imagen promocional adjunta si está disponible)

            === PERFILES DEL FOCUS GROUP ===
            ${JSON.stringify(personasPayload, null, 2)}

            === CATÁLOGO DE RÚBRICAS DINÁMICAS DE EVALUACIÓN (CON ANCLAS DE CALIFICACIÓN) ===
            ${JSON.stringify(rubricsToUse, null, 2)}

            REGLAS CRÍTICAS DE REALISMO Y CALIBRACIÓN EN EL FOCUS GROUP (03_focus_group_simulator):
            1. ACTÚA COMO UN HUMANO REAL EN REDES SOCIALES (ATENCIÓN DE 3 SEGUNDOS), NO COMO UN AUDITOR REGULATORIO NI UN TÉCNICO DE LABORATORIO:
               - Un consumidor real NUNCA pide que un anuncio de Instagram le explique el proceso interno de la sucursal, ni si le van a dar bata, ni pide más cláusulas legales.
               - Al contrario: si el anuncio tiene demasiado texto, explicaciones operativas innecesarias o parece un instructivo médico aburrido, el participante DEBE penalizarlo severamente siguiendo las anclas "low_0_to_40" de la rúbrica de Claridad.
            2. APLICA ESTRICTAMENTE LAS ANCLAS DE CALIFICACIÓN (scoringAnchors) DE CADA RÚBRICA:
               - No regales calificaciones de 85-95 por cortesía. Usa todo el rango (0 a 100) guiándote por "low_0_to_40", "mid_41_to_79" y "high_80_to_100" de cada rúbrica aplicable al track del participante ("applicableRubricIds").
            3. Para cada perfil participante:
               - Evalúa CADA UNA de sus rúbricas aplicables ("applicableRubricIds") devolviendo el arreglo "rubricScores" con { rubricId, name, weight, score, rationale }.
               - Calcula "weightedOverallScore" (0 a 100) como el promedio ponderado de sus "rubricScores".
               - Redacta su opinión general en primera persona ("feedback"), sus dudas/barreras reales ("barriersOrConcerns") y su sugerencia comercial ("suggestedImprovement").
               - Incluye también los campos de compatibilidad ("visualAppeal", "brandFit", "stoppingPower", "conversionLikelihood", "sentiment": "Positive" | "Neutral" | "Negative", "suggestedProduct", "suggestedMessaging", "suggestedImage", "copyEdit").

            Devuelve ÚNICAMENTE un arreglo JSON válido con exactamente ${batchPersonas.length} objetos:
            [
                {
                    "personaId": "id exacto del input",
                    "personaName": "name exacto del input",
                    "track": "patient o physician",
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
                    r.brandFit ?? findRubricScore('clinical_utility') ?? findRubricScore('visual_trust') ?? weightedOverallScore
                );
                const conversionLikelihood = Number(
                    r.conversionLikelihood ??
                    findRubricScore('patient_action_intent') ??
                    findRubricScore('physician_prescription_intent') ??
                    weightedOverallScore
                );

                return {
                    ...r,
                    personaId: r.personaId || inputPersona.id,
                    personaName: r.personaName || inputPersona.name,
                    track: r.track || inputPersona.track || 'patient',
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
                track: p.track || 'patient',
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

export const conductQualitativeInterview = async (persona: CombinedPersona, context: string, initialQuestion: string, companyName: string = "Laboratorios Médicos El Chopo"): Promise<InterviewResult> => {
    try {
        const prompt = `
        You are simulating a qualitative user interview regarding "${context}" and ${companyName} ("Tu laboratorio de cabecera"). Let your answers reflect your specific needs and concerns as a real Mexican patient or physician.
        
        **Role**: act as ${persona.name} (${persona.personaName}), with the following details:
        - Track: ${persona.track || 'patient'}
        - Bio: ${persona.bio || persona.details?.bio || "No bio available"}
        - Job: ${persona.job_title || persona.details?.job_title || "Unknown"}
        - Age: ${persona.age || persona.details?.age || "Unknown"}
        - Pain Points: ${(persona.pain_points || persona.details?.pain_points || []).join('; ')}
        - Goals: ${(persona.goals || persona.details?.goals || []).join('; ')}
        - Context: ${context}

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

export const generateRegionalVariants = async (basePrompt: string, companyName: string = "Laboratorios Médicos El Chopo", productContext: string = "Check-up Control Diabetes"): Promise<{ region: string, imagePrompt: string, image: string | null }[]> => {
    try {
        const categories = ["Lifestyle & Context", "Benefit & Feature-First", "Social-First & Aesthetic", "Value & Urgency-Based", "Aspirational Luxury"];

        const prompt = `
        Take the following marketing concept for ${companyName} (${productContext}): "${basePrompt}"
        
        Adapt this concept for the following variations/themes, adding specific imagery relevant to Mexico and enforcing Chopo's visual realism rules (RLM-001: 100% digital results on App Chopo/tablet, NO physical X-ray films, NO needles or blood, Chopo blue #004B87 and clinical white #FFFFFF palette, no embedded text):
        ${categories.join(", ")}
        
        Return a JSON object mapping each category name exactly as written to a highly detailed image generation prompt.
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
                const imageUrl = await generateImageFromPrompt(promptForRegion + ", fotografía realista en México, iluminación clínica limpia azul #004B87 y blanco #FFFFFF, sin placas físicas, sin agujas, sin texto incrustado");
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
    variants: { region: string, image: string | null }[],
    companyName: string = "Laboratorios Médicos El Chopo",
    productContext: string = "Check-up Control Diabetes"
): Promise<ABTestResult[]> => {
    if (!variants || variants.length === 0) return [];

    const promises = pool.map(async (persona) => {
        try {
            const prompt = `
            You are evaluating marketing creative variants for ${companyName} (${productContext}) as a synthetic user in Mexico.
            
            Persona Profile:
            Name: ${persona.name}
            Track: ${persona.track || 'patient'}
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
                rationale: "Simulation failed.",
                sentiment: "Neutral",
                rankings: [],
                overallFeedback: "Simulation failed."
            };
        }
    });

    return Promise.all(promises);
};
