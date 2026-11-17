import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { AuthClient } from 'google-auth-library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
const port = process.env.PORT || 8080;

// Load local .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const line of envLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) process.env[key] = val;
        }
    }
}

// --- GCP Configuration (100% Remote: Vertex AI + Cloud Firestore + Cloud Storage) ---
const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'gsd-appmod';
const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.GCP_REGION || 'us-central1';
const vertexLocation = process.env.VERTEX_AI_LOCATION || 'global';
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE || 'default';
const bucketName = process.env.GCS_BUCKET_NAME || `${project}-chopo-assets`;

const VERTEX_TEXT_MODEL = process.env.VERTEX_TEXT_MODEL || 'gemini-3.5-flash';
const VERTEX_EVALUATOR_MODEL = process.env.VERTEX_EVALUATOR_MODEL || 'gemini-3.1-pro-preview';
const VERTEX_IMAGE_MODEL = process.env.VERTEX_IMAGE_MODEL || 'gemini-3-pro-image';
const VERTEX_VIDEO_MODEL = process.env.VERTEX_VIDEO_MODEL || 'veo-3.1-lite-generate-001';

let ai;
let firestore;
let storage;
let firestoreCircuitBrokenUntil = 0;

const adcFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
let lastAdcMtimeMs = fs.existsSync(adcFilePath) ? fs.statSync(adcFilePath).mtimeMs : 0;

class GcloudCliAuthClient extends AuthClient {
    constructor() {
        super();
        this.cachedToken = null;
        this.expiresAt = 0;
    }
    async getAccessToken() {
        if (this.cachedToken && Date.now() < this.expiresAt) {
            return { token: this.cachedToken, res: null };
        }
        const token = execFileSync('gcloud', ['auth', 'print-access-token'], {
            encoding: 'utf8',
            timeout: 5000
        }).trim();
        this.cachedToken = token;
        this.expiresAt = Date.now() + 40 * 60 * 1000;
        return { token, res: null };
    }
    async getRequestHeaders() {
        const { token } = await this.getAccessToken();
        const h = new Headers({ Authorization: `Bearer ${token}` });
        h.Authorization = `Bearer ${token}`;
        return h;
    }
    async request(opts) {
        const { token } = await this.getAccessToken();
        const bodyPayload = opts.body || opts.data;
        const res = await fetch(opts.url, {
            method: opts.method || 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                ...(opts.headers || {})
            },
            body: bodyPayload
                ? (typeof bodyPayload === 'string' || Buffer.isBuffer(bodyPayload)
                    ? bodyPayload
                    : JSON.stringify(bodyPayload))
                : undefined
        });
        const text = await res.text();
        let data = text;
        try {
            data = JSON.parse(text);
        } catch {}
        return { data, status: res.status, headers: res.headers };
    }
}

function initGcpClients(reason = 'startup') {
    try {
        console.log(`[${reason}] Initializing GCP clients (Project: ${project}, Vertex Location: ${vertexLocation}, Firestore DB: ${firestoreDatabaseId})`);
        const isCloudRun = Boolean(process.env.K_SERVICE);
        const customDbId = (firestoreDatabaseId && firestoreDatabaseId !== 'default' && firestoreDatabaseId !== '(default)')
            ? firestoreDatabaseId
            : undefined;

        let localCliAuth = null;
        if (!isCloudRun) {
            try {
                execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', timeout: 4000 });
                localCliAuth = new GcloudCliAuthClient();
            } catch {
                localCliAuth = null;
            }
        }

        ai = new GoogleGenAI({
            vertexai: true,
            project,
            location: vertexLocation,
            ...(localCliAuth ? { googleAuthOptions: { authClient: localCliAuth } } : {})
        });
        firestore = new Firestore({
            projectId: project,
            ...(customDbId ? { databaseId: customDbId } : {}),
            ...(localCliAuth ? { authClient: localCliAuth } : {}),
            ignoreUndefinedProperties: true,
            preferRest: true
        });
        storage = new Storage({
            projectId: project,
            ...(localCliAuth ? { authClient: localCliAuth } : {})
        });
        firestoreCircuitBrokenUntil = 0;
    } catch (e) {
        console.error("Failed to initialize GCP clients:", e);
    }
}

initGcpClients('startup');

// Hot-reload GCP clients automatically whenever `gcloud auth application-default login` updates the ADC file
app.use((req, res, next) => {
    try {
        if (fs.existsSync(adcFilePath)) {
            const currentMtime = fs.statSync(adcFilePath).mtimeMs;
            if (currentMtime > lastAdcMtimeMs) {
                lastAdcMtimeMs = currentMtime;
                initGcpClients('ADC credentials refreshed on disk');
            }
        }
    } catch (e) {
        // Ignore stat errors
    }
    next();
});

const checkAi = (req, res, next) => {
    if (!ai) return res.status(500).json({ error: "GoogleGenAI Vertex AI client not initialized on server." });
    next();
};

function withTimeout(promiseOrFn, ms = 1800, label = 'GCP operation') {
    if (Date.now() < firestoreCircuitBrokenUntil && !label.startsWith('GCS')) {
        if (typeof promiseOrFn?.catch === 'function') {
            promiseOrFn.catch(() => {});
        }
        return Promise.reject(new Error(`${label} skipped (Firestore circuit open)`));
    }
    const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
    if (typeof promise?.catch === 'function') {
        promise.catch(() => {});
    }
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        )
    ]).catch(err => {
        if (!label.startsWith('GCS')) {
            firestoreCircuitBrokenUntil = Date.now() + 60000;
        }
        throw err;
    });
}

// --- Official Seed Loader (Immutable Seed Templates in data/seeds/) ---

const SEEDS_DIR = path.join(__dirname, 'data', 'seeds');

function loadSeedJson(filename) {
    try {
        const filePath = path.join(SEEDS_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        console.error(`Error loading seed file ${filename}:`, e.message);
        return null;
    }
}

function loadSeedRagDocs() {
    const ragDir = path.join(SEEDS_DIR, 'rag_docs');
    const docs = {};
    try {
        const files = fs.readdirSync(ragDir).filter(f => f.endsWith('.md')).sort();
        for (const file of files) {
            docs[file] = fs.readFileSync(path.join(ragDir, file), 'utf8');
        }
    } catch (e) {
        console.error('Error loading RAG seed docs:', e.message);
    }
    return docs;
}

// --- Strict Schema Sanitizers ---

const LEGACY_IMAGE_BUCKET_MAP = {
    '/images/personas/home_chef.jpg': '/api/media/chopo_persona_roberto.jpg',
    '/images/personas/tech_guru.jpg': '/api/media/chopo_persona_laura.jpg',
    '/images/personas/gen_z_trendsetter.jpg': '/api/media/chopo_persona_alejandro.jpg',
    '/images/personas/beauty_guru.jpg': '/api/media/chopo_persona_dra_valeria.jpg',
    '/images/multi_image_healthcare.png': '/api/media/chopo_persona_dr_carlos.png',
    '/images/content_version_healthcare.png': '/api/media/chopo_persona_dr_carlos.png',
    '/images/pdp_family.png': '/api/media/chopo_persona_laura.jpg'
};

function sanitizeStringArray(arr, fallback = []) {
    if (!Array.isArray(arr)) return fallback;
    return arr
        .map(item => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
        .filter(Boolean);
}

function sanitizePersona(p, idx = 0) {
    if (!p || typeof p !== 'object') p = {};
    const rawName = String(p.name || p.personaName || 'Segmento Clínico Chopo').trim();
    const inferredTrack =
        p.track === 'physician' ||
        p.track === 'B2B' ||
        rawName.toLowerCase().includes('médico') ||
        rawName.toLowerCase().includes('b2b') ||
        String(p.job_title || p.details?.job_title || '').toLowerCase().includes('médic') ||
        String(p.job_title || p.details?.job_title || '').toLowerCase().includes('oncólog') ||
        String(p.job_title || p.details?.job_title || '').toLowerCase().includes('ginecólog') ||
        String(p.job_title || p.details?.job_title || '').toLowerCase().includes('endocrin')
            ? 'physician'
            : 'patient';

    const rawAge = Number(p.age ?? p.details?.age ?? 40);
    const age = Number.isFinite(rawAge) && rawAge >= 18 && rawAge <= 100 ? Math.round(rawAge) : 40;

    const jobTitle = String(
        p.job_title ||
        p.details?.job_title ||
        (inferredTrack === 'physician' ? 'Médico Especialista' : 'Profesionista')
    ).trim();

    const personaName = String(
        p.personaName ||
        p.details?.name ||
        rawName.replace(/^\[.*?\]\s*/, '').replace(/\s*\((?:Paciente\s*B2C|Médico\s*B2B|B2C|B2B)\)\s*$/i, '') ||
        'Perfil Sintético Chopo'
    ).trim();

    const bio = String(p.bio || p.details?.bio || 'Perfil sintético para validación de campañas clínicas.').trim();
    const demographics = String(
        p.demographics || `${age} años, Urbano México, ${inferredTrack === 'physician' ? 'Médico Prescriptor' : 'Paciente'}`
    ).trim();
    const income = String(p.income || p.details?.income || 'Medio').trim();

    const painPoints = sanitizeStringArray(p.pain_points || p.details?.pain_points, [
        'Anuncios con exceso de texto o poca claridad en el beneficio principal'
    ]);
    const goals = sanitizeStringArray(p.goals || p.details?.goals, [
        'Agendar estudios de forma ágil y consultar resultados digitales en la App Chopo'
    ]);
    const lifestyleTags = sanitizeStringArray(p.lifestyle_tags || p.details?.lifestyle_tags, [
        inferredTrack === 'physician' ? 'Rigor Clínico' : 'Prevención Oportuna',
        'Resultados Digitales'
    ]);
    const preferredProducts = sanitizeStringArray(p.preferred_products || p.details?.preferred_products, [
        'Check-up Control Diabetes',
        'Hemoglobina Glicosilada (HbA1c)'
    ]);

    const isSeedOrStandard =
        Boolean(p.isStandard) ||
        String(p.id || '').startsWith('chopo_pat_') ||
        String(p.id || '').startsWith('chopo_phy_');

    let imageUrl = String(p.imageUrl || '').trim();
    if (LEGACY_IMAGE_BUCKET_MAP[imageUrl]) {
        imageUrl = LEGACY_IMAGE_BUCKET_MAP[imageUrl];
    } else if (!imageUrl || imageUrl === '/images/chopo-checkup.png') {
        if (isSeedOrStandard) {
            imageUrl = inferredTrack === 'physician'
                ? '/api/media/chopo_persona_dra_valeria.jpg'
                : '/api/media/chopo_persona_roberto.jpg';
        } else {
            imageUrl = '';
        }
    } else if (imageUrl.startsWith('/images/') && imageUrl !== '/images/chopo-logo.svg') {
        imageUrl = inferredTrack === 'physician'
            ? '/api/media/chopo_persona_dra_valeria.jpg'
            : '/api/media/chopo_persona_roberto.jpg';
    }

    const hasTrackTag =
        rawName.startsWith('[') ||
        /\((?:Paciente\s*B2C|Médico\s*B2B|B2C|B2B)\)/i.test(rawName);
    const namePrefix = inferredTrack === 'physician' ? '[Médico B2B]' : '[Paciente B2C]';
    const normalizedName = hasTrackTag ? rawName : `${namePrefix} ${rawName}`;

    const defaultCharts = {
        brand_affinity: {
            labels: ['Calidad Analítica', 'Precio / Promoción', 'Rapidez Digital', 'Cercanía Sucursal'],
            data: inferredTrack === 'physician' ? [96, 72, 92, 84] : [92, 90, 88, 86]
        }
    };
    const charts = p.details?.charts?.brand_affinity ? p.details.charts : defaultCharts;

    return {
        id: String(p.id || `chopo_${inferredTrack}_${Date.now()}_${idx}`).trim(),
        track: inferredTrack,
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
            p.imagePrompt ||
            `Retrato fotográfico realista de ${personaName}, ${jobTitle} en México, iluminación natural cálida.`
        ).trim(),
        imageUrl,
        isStandard: Boolean(p.isStandard),
        details: {
            name: personaName.split('(')[0].split(',')[0].trim(),
            age,
            job_title: jobTitle,
            bio: String(p.details?.bio || bio).trim(),
            income,
            lifestyle_tags: lifestyleTags,
            preferred_products: preferredProducts,
            pain_points: painPoints,
            goals,
            charts
        }
    };
}

function sanitizeRubric(r, idx = 0) {
    if (!r || typeof r !== 'object') r = {};
    const track = ['both', 'patient', 'physician'].includes(r.track) ? r.track : 'both';
    const rawWeight = Number(r.weight ?? 25);
    const weight = Number.isFinite(rawWeight) ? Math.max(1, Math.min(100, Math.round(rawWeight))) : 25;

    return {
        id: String(r.id || `rubric_${Date.now()}_${idx}`).trim(),
        name: String(r.name || `Criterio de Evaluación ${idx + 1}`).trim(),
        track,
        weight,
        evaluationQuestion: String(
            r.evaluationQuestion || '¿Qué tan claro, confiable y relevante resulta este material publicitario?'
        ).trim(),
        scoringAnchors: {
            low_0_to_40: String(
                r.scoringAnchors?.low_0_to_40 ||
                'Mensaje confuso, saturado de texto o con errores de realismo visual.'
            ).trim(),
            mid_41_to_79: String(
                r.scoringAnchors?.mid_41_to_79 ||
                'Mensaje comprensible pero genérico o con oportunidad de mayor impacto.'
            ).trim(),
            high_80_to_100: String(
                r.scoringAnchors?.high_80_to_100 ||
                'Mensaje claro en 3 segundos, visualmente confiable y altamente persuasivo.'
            ).trim()
        }
    };
}

function sanitizeUseCase(uc, idx = 0) {
    if (!uc || typeof uc !== 'object') uc = {};
    const track = ['both', 'patient', 'physician'].includes(uc.track) ? uc.track : 'both';
    return {
        id: String(uc.id || `uc_${Date.now()}_${idx}`).trim(),
        studyName: String(uc.studyName || 'Check-up Control Diabetes').trim(),
        category: String(uc.category || 'Línea Diabetes (MVP Oficial)').trim(),
        track,
        isDefault: Boolean(uc.isDefault),
        includedStudies: sanitizeStringArray(uc.includedStudies, [
            'Hemoglobina Glicosilada (HbA1c)',
            'Química Sanguínea',
            'Examen General de Orina (EGO)'
        ]),
        fastingRequirement: String(
            uc.fastingRequirement || 'Ayuno obligatorio de 8 a 12 horas.'
        ).trim(),
        visualRealismRules: String(
            uc.visualRealismRules ||
            'RLM-001 y RLM-004: Resultados 100% digitales en App Chopo (prohibido placas físicas a contraluz y agujas explícitas).'
        ).trim(),
        defaultPromoText: String(
            uc.defaultPromoText ||
            'Precio especial exclusivo pagando en línea en chopo.com.mx o App Chopo. Vigencia al 31 de diciembre de 2026.'
        ).trim(),
        cofeprisPermitB2C: String(
            uc.cofeprisPermitB2C || 'Permiso de Publicidad COFEPRIS No. 2609152002A00518'
        ).trim(),
        cofeprisPermitB2B: String(
            uc.cofeprisPermitB2B || 'Aviso de Publicidad COFEPRIS No. 243300202A0911'
        ).trim(),
        responsableSanitario: String(
            uc.responsableSanitario ||
            'Responsable Sanitario: Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644, Univ. Simón Bolívar.'
        ).trim()
    };
}

// --- In-Memory Hot Cache (Synchronized with Firestore + Pre-warmed from Official Seeds) ---

const initialPersonasSeed = (loadSeedJson('personas_seed.json')?.personas || []).map((p, i) => sanitizePersona(p, i));
const initialRubricsSeed = (loadSeedJson('rubrics_seed.json')?.rubrics || []).map((r, i) => sanitizeRubric(r, i));
const initialUseCasesSeed = (loadSeedJson('use_cases_seed.json')?.useCases || []).map((u, i) => sanitizeUseCase(u, i));
const initialRagDocsSeed = loadSeedRagDocs();

const memoryStore = {
    personas: [...initialPersonasSeed],
    rubrics: [...initialRubricsSeed],
    useCases: [...initialUseCasesSeed],
    ragDocs: { ...initialRagDocsSeed },
    runs: {
        audience_generator: { personas: [...initialPersonasSeed] }
    },
    config: {},
    versions: [
        {
            versionId: 'v_seed_initial_personas',
            entityType: 'personas',
            timestamp: '2026-11-01T12:00:00.000Z',
            label: 'Configuración Inicial por Defecto',
            itemCount: initialPersonasSeed.length,
            data: [...initialPersonasSeed]
        },
        {
            versionId: 'v_seed_initial_rubrics',
            entityType: 'rubrics',
            timestamp: '2026-11-01T12:00:00.000Z',
            label: 'Configuración Inicial por Defecto',
            itemCount: initialRubricsSeed.length,
            data: [...initialRubricsSeed]
        },
        {
            versionId: 'v_seed_initial_use_cases',
            entityType: 'use_cases',
            timestamp: '2026-11-01T12:00:00.000Z',
            label: 'Configuración Inicial por Defecto',
            itemCount: initialUseCasesSeed.length,
            data: [...initialUseCasesSeed]
        },
        {
            versionId: 'v_seed_initial_rag_docs',
            entityType: 'rag_docs',
            timestamp: '2026-11-01T12:00:00.000Z',
            label: 'Configuración Inicial por Defecto',
            itemCount: Object.keys(initialRagDocsSeed).length,
            data: { ...initialRagDocsSeed }
        }
    ],
    mediaBuffers: new Map()
};

// --- Cloud Storage Helpers (Prevents Firestore 1 MiB Document Limit) ---

async function uploadBase64ToGCS(base64DataUrl, prefix = 'generated') {
    if (!base64DataUrl || typeof base64DataUrl !== 'string') {
        throw new Error('Invalid base64 image payload');
    }

    let mimeType = 'image/jpeg';
    let base64Data = base64DataUrl;

    const match = base64DataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (match) {
        mimeType = match[1];
        base64Data = match[2];
    } else {
        base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
    }

    const extMap = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/svg+xml': 'svg'
    };
    const ext = extMap[mimeType] || 'jpg';
    const safePrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '_') || 'generated';
    const filename = `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const gcsObjectPath = `chopo-media/${filename}`;
    const buffer = Buffer.from(base64Data, 'base64');

    // Keep in memory cache for instant serving
    memoryStore.mediaBuffers.set(filename, { buffer, mimeType });

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsObjectPath);

    try {
        await withTimeout(
            file.save(buffer, {
                metadata: { contentType: mimeType },
                resumable: false
            }),
            4000,
            'GCS upload'
        );
    } catch (err) {
        if (err.code === 404) {
            try {
                console.log(`GCS Bucket ${bucketName} not found. Creating bucket in ${location}...`);
                await withTimeout(storage.createBucket(bucketName, { location }), 4000, 'GCS createBucket');
                await withTimeout(
                    file.save(buffer, {
                        metadata: { contentType: mimeType },
                        resumable: false
                    }),
                    4000,
                    'GCS retry upload'
                );
            } catch (retryErr) {
                console.warn(`GCS upload fallback to memory cache (${filename}):`, retryErr.message);
            }
        } else {
            console.warn(`GCS upload fallback to memory cache (${filename}):`, err.message);
        }
    }

    return `/api/media/${filename}`;
}

async function extractAndUploadImages(obj, prefix = 'asset') {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        if (obj.startsWith('data:image/') && obj.length > 10240) {
            return await uploadBase64ToGCS(obj, prefix);
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return await Promise.all(
            obj.map((item, idx) => extractAndUploadImages(item, `${prefix}_${idx}`))
        );
    }

    if (typeof obj === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            cleaned[key] = await extractAndUploadImages(value, key);
        }
        return cleaned;
    }

    return obj;
}

// --- Config Versioning & Auto-Seeding ---

async function saveConfigVersionSnapshot(entityType, dataArray, label, customVersionId = null) {
    const versionId = customVersionId || `v_${entityType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toISOString();
    const snapshot = {
        versionId,
        entityType,
        timestamp,
        label: label || `Actualización (${entityType})`,
        itemCount: Array.isArray(dataArray) ? dataArray.length : Object.keys(dataArray || {}).length,
        data: dataArray
    };

    memoryStore.versions = [
        snapshot,
        ...memoryStore.versions.filter(v => v.versionId !== versionId)
    ];

    try {
        await withTimeout(
            firestore.collection('chopo_config_versions').doc(versionId).set(snapshot),
            2500,
            'Firestore saveConfigVersionSnapshot'
        );
    } catch (e) {
        console.warn(`Cached version snapshot ${versionId} in memory (Firestore: ${e.message})`);
    }
    syncMemoryStoreToGCS();
    return snapshot;
}

let gcsStateSyncTimer = null;
function syncMemoryStoreToGCS() {
    if (gcsStateSyncTimer) clearTimeout(gcsStateSyncTimer);
    gcsStateSyncTimer = setTimeout(async () => {
        try {
            const statePayload = {
                updatedAt: new Date().toISOString(),
                personas: memoryStore.personas,
                rubrics: memoryStore.rubrics,
                useCases: memoryStore.useCases,
                ragDocs: memoryStore.ragDocs,
                runs: memoryStore.runs,
                config: memoryStore.config,
                versions: memoryStore.versions
            };
            await withTimeout(
                storage.bucket(bucketName).file('db/chopo_state.json').save(JSON.stringify(statePayload), {
                    contentType: 'application/json; charset=utf-8',
                    resumable: false
                }),
                4000,
                'GCS state sync'
            );
        } catch (err) {
            console.warn('GCS state backup warning:', err.message);
        }
    }, 300);
}

async function loadMemoryStoreFromGCS() {
    try {
        const file = storage.bucket(bucketName).file('db/chopo_state.json');
        const [exists] = await withTimeout(file.exists(), 3000, 'GCS state exists');
        if (!exists) return false;
        const [buf] = await withTimeout(file.download(), 4000, 'GCS state download');
        const parsed = JSON.parse(buf.toString('utf8'));
        if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.personas) && parsed.personas.length > 0) memoryStore.personas = parsed.personas;
            if (Array.isArray(parsed.rubrics) && parsed.rubrics.length > 0) memoryStore.rubrics = parsed.rubrics;
            if (Array.isArray(parsed.useCases) && parsed.useCases.length > 0) memoryStore.useCases = parsed.useCases;
            if (Array.isArray(parsed.prompts) && parsed.prompts.length > 0) memoryStore.prompts = parsed.prompts;
            if (parsed.ragDocs && typeof parsed.ragDocs === 'object') memoryStore.ragDocs = { ...memoryStore.ragDocs, ...parsed.ragDocs };
            if (parsed.runs && typeof parsed.runs === 'object') memoryStore.runs = { ...memoryStore.runs, ...parsed.runs };
            if (parsed.config && typeof parsed.config === 'object') memoryStore.config = { ...memoryStore.config, ...parsed.config };
            if (Array.isArray(parsed.versions) && parsed.versions.length > 0) memoryStore.versions = parsed.versions;
            console.log(`Loaded persistent state from gs://${bucketName}/db/chopo_state.json`);
            return true;
        }
    } catch (err) {
        console.warn('GCS state load skipped:', err.message);
    }
    return false;
}

async function seedFirestoreIfEmpty() {
    await loadMemoryStoreFromGCS();
    try {
        console.log('Checking Firestore catalogs for initial official seeds...');
        const now = new Date().toISOString();

        // 1. Personas Catalog
        const personasRef = firestore.collection('chopo_config').doc('personas_catalog');
        const personasSnap = await withTimeout(personasRef.get(), 3000, 'Firestore personas_catalog check');

        if (!personasSnap.exists && initialPersonasSeed.length > 0) {
            console.log(`Seeding chopo_config/personas_catalog with ${initialPersonasSeed.length} official personas...`);
            await withTimeout(personasRef.set({ personas: initialPersonasSeed, updatedAt: now }), 3000);
            await withTimeout(firestore.collection('chopo_config').doc('audiences').set({ personas: initialPersonasSeed, updatedAt: now }), 3000);
            await saveConfigVersionSnapshot(
                'personas',
                initialPersonasSeed,
                'Configuración Inicial por Defecto',
                'v_seed_initial_personas'
            );
        } else if (personasSnap.exists && Array.isArray(personasSnap.data()?.personas)) {
            memoryStore.personas = personasSnap.data().personas.map((p, i) => sanitizePersona(p, i));
        }

        // 2. Rubrics Catalog
        const rubricsRef = firestore.collection('chopo_config').doc('rubrics_catalog');
        const rubricsSnap = await withTimeout(rubricsRef.get(), 3000, 'Firestore rubrics_catalog check');

        if (!rubricsSnap.exists && initialRubricsSeed.length > 0) {
            console.log(`Seeding chopo_config/rubrics_catalog with ${initialRubricsSeed.length} official rubrics...`);
            await withTimeout(rubricsRef.set({ rubrics: initialRubricsSeed, updatedAt: now }), 3000);
            await saveConfigVersionSnapshot(
                'rubrics',
                initialRubricsSeed,
                'Configuración Inicial por Defecto',
                'v_seed_initial_rubrics'
            );
        } else if (rubricsSnap.exists && Array.isArray(rubricsSnap.data()?.rubrics)) {
            memoryStore.rubrics = rubricsSnap.data().rubrics.map((r, i) => sanitizeRubric(r, i));
        }

        // 3. Use Cases Catalog
        const useCasesRef = firestore.collection('chopo_config').doc('use_cases_catalog');
        const useCasesSnap = await withTimeout(useCasesRef.get(), 3000, 'Firestore use_cases_catalog check');

        if (!useCasesSnap.exists && initialUseCasesSeed.length > 0) {
            console.log(`Seeding chopo_config/use_cases_catalog with ${initialUseCasesSeed.length} official clinical use cases...`);
            await withTimeout(useCasesRef.set({ useCases: initialUseCasesSeed, updatedAt: now }), 3000);
            await saveConfigVersionSnapshot(
                'use_cases',
                initialUseCasesSeed,
                'Configuración Inicial por Defecto',
                'v_seed_initial_use_cases'
            );
        } else if (useCasesSnap.exists && Array.isArray(useCasesSnap.data()?.useCases)) {
            memoryStore.useCases = useCasesSnap.data().useCases.map((u, i) => sanitizeUseCase(u, i));
        }

        // 4. RAG Docs Catalog
        const ragDocsRef = firestore.collection('chopo_config').doc('rag_docs_catalog');
        const ragDocsSnap = await withTimeout(ragDocsRef.get(), 3000, 'Firestore rag_docs_catalog check');
        if (!ragDocsSnap.exists && Object.keys(initialRagDocsSeed).length > 0) {
            await withTimeout(ragDocsRef.set({ documents: initialRagDocsSeed, updatedAt: now }), 3000);
            await saveConfigVersionSnapshot(
                'rag_docs',
                initialRagDocsSeed,
                'Configuración Inicial por Defecto',
                'v_seed_initial_rag_docs'
            );
        } else if (ragDocsSnap.exists && ragDocsSnap.data()?.documents && typeof ragDocsSnap.data().documents === 'object') {
            memoryStore.ragDocs = { ...initialRagDocsSeed, ...ragDocsSnap.data().documents };
        }

        console.log('Firestore seed synchronization complete.');
    } catch (e) {
        console.warn('Firestore initial seed check using pre-warmed seed cache:', e.message);
    }
}

// Trigger non-blocking seed check on startup
seedFirestoreIfEmpty();

console.log(`Starting server configuration. Port: ${port}, Project: ${project}, Bucket: ${bucketName}`);

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        project,
        location,
        firestoreDatabase: firestoreDatabaseId,
        bucket: bucketName,
        vertexAiInitialized: Boolean(ai),
        models: {
            text: VERTEX_TEXT_MODEL,
            evaluator: VERTEX_EVALUATOR_MODEL,
            image: VERTEX_IMAGE_MODEL,
            video: VERTEX_VIDEO_MODEL
        }
    });
});

// --- Vertex AI Proxy Routes ---

function normalizeVertexModel(requestedModel) {
    if (!requestedModel) return VERTEX_TEXT_MODEL;
    if (
        requestedModel === 'gemini-3-flash-preview' ||
        requestedModel === 'gemini-3.5-flash'
    ) {
        return VERTEX_TEXT_MODEL;
    }
    if (requestedModel === 'gemini-3.1-pro-preview') {
        return VERTEX_EVALUATOR_MODEL;
    }
    if (
        requestedModel === 'gemini-2.5-flash-image' ||
        requestedModel === 'gemini-3-pro-image' ||
        requestedModel === 'gemini-3.1-flash-image-preview' ||
        requestedModel === 'gemini-3.1-flash-image'
    ) {
        return VERTEX_IMAGE_MODEL;
    }
    return requestedModel;
}

app.post('/api/genai/generateContent', checkAi, async (req, res) => {
    try {
        let { model, contents, config } = req.body;
        const originalModel = model;
        model = normalizeVertexModel(model);

        console.log(`\n--- [Vertex AI Proxy] /api/genai/generateContent ---`);
        console.log(`Model: ${model} (requested: ${originalModel}) | Project: ${project} | Location: ${location}`);
        if (contents) {
            const preview = JSON.stringify(contents).substring(0, 300);
            console.log(`Contents preview: ${preview}${preview.length >= 300 ? '...' : ''}`);
        }
        console.log(`----------------------------------------------------\n`);

        // Normalize contents array to satisfy Vertex AI strict role requirements
        if (contents && !Array.isArray(contents) && contents.parts) {
            contents = [{ role: "user", parts: contents.parts }];
        } else if (Array.isArray(contents)) {
            contents = contents.map(c => {
                if (!c.role && c.parts) {
                    return { ...c, role: "user" };
                }
                if (!c.parts && !c.role) {
                    return { role: "user", parts: [c] };
                }
                return c;
            });
        }

        // Clean config for image generation models so unsupported googleSearch tools don't cause 400 errors on Vertex AI
        if (model && model.includes('image') && config) {
            const { tools, ...restImgConfig } = config;
            config = restImgConfig;
        }

        // Inject Vertex AI Search / RAG Datastore if configured via environment and requested
        if (process.env.VERTEX_RAG_DATASTORE_ID && config?.enableRag) {
            const { enableRag, ...restConfig } = config;
            config = {
                ...restConfig,
                tools: [
                    ...(restConfig.tools || []),
                    {
                        retrieval: {
                            vertexAiSearch: {
                                datastore: process.env.VERTEX_RAG_DATASTORE_ID
                            }
                        }
                    }
                ]
            };
        }

        let response;
        try {
            response = await ai.models.generateContent({ model, contents, config });
        } catch (primaryErr) {
            const fallbackModel = (model && model.includes('image'))
                ? 'gemini-2.5-flash-image'
                : 'gemini-3-flash-preview';
            if (model !== fallbackModel) {
                console.warn(`Primary model ${model} returned error (${primaryErr.message}), retrying with ${fallbackModel}...`);
                response = await ai.models.generateContent({ model: fallbackModel, contents, config });
            } else {
                throw primaryErr;
            }
        }
        res.json(response);
    } catch (e) {
        console.error("generateContent error:", e);
        res.status(500).json({ error: e.message || "Failed to generate content" });
    }
});

app.post('/api/genai/generateVideos', checkAi, async (req, res) => {
    try {
        const { model, prompt, image, config } = req.body;
        const response = await ai.models.generateVideos({ model, prompt, image, config });
        res.json(response);
    } catch (e) {
        console.error("generateVideos error:", e);
        res.status(500).json({ error: e.message || "Failed to generate videos" });
    }
});

app.post('/api/genai/getOperation', checkAi, async (req, res) => {
    try {
        const { operation } = req.body;
        const mockOperation = {
            ...operation,
            _fromAPIResponse: (arg) => arg.apiResponse
        };
        const response = await ai.operations.get({ operation: mockOperation });
        res.json(response);
    } catch (e) {
        console.error("getOperation error:", e);
        res.status(500).json({ error: e.message || "Failed to get operation" });
    }
});

// --- Cloud Storage Media Endpoints ---

app.get('/api/media/:filename', (req, res) => {
    try {
        const safeFilename = path.basename(req.params.filename);

        const cached = memoryStore.mediaBuffers.get(safeFilename);
        if (cached) {
            res.setHeader('Content-Type', cached.mimeType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(cached.buffer);
        }

        const file = storage.bucket(bucketName).file(`chopo-media/${safeFilename}`);

        const ext = path.extname(safeFilename).toLowerCase();
        const mimeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        };
        if (mimeMap[ext]) {
            res.setHeader('Content-Type', mimeMap[ext]);
        }
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const stream = file.createReadStream();
        stream.on('error', (err) => {
            console.error(`Error streaming chopo-media/${safeFilename} from GCS:`, err);
            if (!res.headersSent) {
                res.status(err.code === 404 ? 404 : 500).json({ error: 'Media file not found in Cloud Storage' });
            }
        });
        stream.pipe(res);
    } catch (error) {
        console.error('Error serving media from GCS:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream media file' });
        }
    }
});

app.post('/api/save-image', async (req, res) => {
    try {
        const { image, filename } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Image is required' });
        }
        const prefix = filename ? path.parse(filename).name : 'generated';
        const url = await uploadBase64ToGCS(image, prefix);
        res.json({ url });
    } catch (error) {
        console.error('Failed to upload image to GCS:', error);
        res.status(500).json({ error: 'Failed to save image to Cloud Storage' });
    }
});

// --- Standardized Dynamic Config Endpoints (Personas, Rubrics, Use Cases + Version Rollback) ---

async function getActivePersonas() {
    try {
        const docSnap = await withTimeout(
            firestore.collection('chopo_config').doc('personas_catalog').get(),
            2500,
            'getActivePersonas'
        );
        if (docSnap.exists) {
            const data = docSnap.data();
            if (Array.isArray(data?.personas)) {
                memoryStore.personas = data.personas.map((p, i) => sanitizePersona(p, i));
                return memoryStore.personas;
            }
        }
    } catch (e) {
        console.warn('getActivePersonas using seed/memory cache:', e.message);
    }
    return memoryStore.personas;
}

async function getActiveRubrics() {
    try {
        const docSnap = await withTimeout(
            firestore.collection('chopo_config').doc('rubrics_catalog').get(),
            2500,
            'getActiveRubrics'
        );
        if (docSnap.exists) {
            const data = docSnap.data();
            if (Array.isArray(data?.rubrics) && data.rubrics.length > 0) {
                memoryStore.rubrics = data.rubrics.map((r, i) => sanitizeRubric(r, i));
                return memoryStore.rubrics;
            }
        }
    } catch (e) {
        console.warn('getActiveRubrics using seed/memory cache:', e.message);
    }
    return memoryStore.rubrics;
}

async function getActiveUseCases() {
    try {
        const docSnap = await withTimeout(
            firestore.collection('chopo_config').doc('use_cases_catalog').get(),
            2500,
            'getActiveUseCases'
        );
        if (docSnap.exists) {
            const data = docSnap.data();
            if (Array.isArray(data?.useCases) && data.useCases.length > 0) {
                memoryStore.useCases = data.useCases.map((u, i) => sanitizeUseCase(u, i));
                return memoryStore.useCases;
            }
        }
    } catch (e) {
        console.warn('getActiveUseCases using seed/memory cache:', e.message);
    }
    return memoryStore.useCases;
}

// 1. Personas Endpoints (/api/personas & /api/audiences)
app.get('/api/personas', async (req, res) => {
    try {
        const personas = await getActivePersonas();
        res.json(personas);
    } catch (e) {
        console.error('Error reading personas:', e);
        res.json(memoryStore.personas);
    }
});

app.post('/api/personas', async (req, res) => {
    try {
        const rawList = Array.isArray(req.body) ? req.body : (req.body?.personas || []);
        const label = (!Array.isArray(req.body) && req.body?.label) ? req.body.label : 'Actualización de Audiencias y Personas';
        const uploadedList = await extractAndUploadImages(rawList, 'persona');
        const sanitizedList = uploadedList.map((p, i) => sanitizePersona(p, i));
        const updatedAt = new Date().toISOString();

        memoryStore.personas = sanitizedList;
        memoryStore.runs.audience_generator = {
            ...(memoryStore.runs.audience_generator || {}),
            personas: sanitizedList
        };

        try {
            await withTimeout(
                Promise.all([
                    firestore.collection('chopo_config').doc('personas_catalog').set({
                        personas: sanitizedList,
                        updatedAt
                    }),
                    firestore.collection('chopo_config').doc('audiences').set({
                        personas: sanitizedList,
                        updatedAt
                    }),
                    firestore.collection('chopo_runs').doc('audience_generator').set({
                        featureId: 'audience_generator',
                        data: { personas: sanitizedList },
                        updatedAt
                    }, { merge: true })
                ]),
                2500,
                'savePersonas Firestore'
            );
        } catch (fsErr) {
            console.warn('Saved personas to memoryStore (Firestore sync warning):', fsErr.message);
        }

        const snapshot = await saveConfigVersionSnapshot('personas', sanitizedList, label);
        res.json({ success: true, personas: sanitizedList, versionId: snapshot.versionId });
    } catch (e) {
        console.error('Error saving personas:', e);
        res.status(500).json({ error: 'Failed to save personas' });
    }
});

app.get('/api/audiences', async (req, res) => {
    try {
        const personas = await getActivePersonas();
        res.json(personas);
    } catch (e) {
        console.error("Error reading audiences:", e);
        res.json(memoryStore.personas);
    }
});

app.post('/api/audiences', async (req, res) => {
    try {
        const rawPersonas = Array.isArray(req.body) ? req.body : (req.body?.personas || []);
        const uploadedPersonas = await extractAndUploadImages(rawPersonas, 'audience');
        const cleanPersonas = uploadedPersonas.map((p, i) => sanitizePersona(p, i));
        const updatedAt = new Date().toISOString();

        memoryStore.personas = cleanPersonas;
        memoryStore.runs.audience_generator = {
            ...(memoryStore.runs.audience_generator || {}),
            personas: cleanPersonas
        };

        try {
            await withTimeout(
                Promise.all([
                    firestore.collection('chopo_config').doc('audiences').set({
                        personas: cleanPersonas,
                        updatedAt
                    }),
                    firestore.collection('chopo_config').doc('personas_catalog').set({
                        personas: cleanPersonas,
                        updatedAt
                    })
                ]),
                2500,
                'saveAudiences Firestore'
            );
        } catch (fsErr) {
            console.warn('Saved audiences to memoryStore (Firestore sync warning):', fsErr.message);
        }

        await saveConfigVersionSnapshot('personas', cleanPersonas, 'Actualización de Audiencias');
        res.json({ success: true, personas: cleanPersonas });
    } catch (e) {
        console.error("Error saving audiences:", e);
        res.status(500).json({ error: "Failed to save audiences" });
    }
});

// Alias endpoints (/api/config/personas, /api/config/personas/versions, /api/config/personas/rollback, /api/config/personas/reset)
app.get('/api/config/personas', async (req, res) => {
    try {
        const personas = await getActivePersonas();
        res.json({ personas, source: 'firestore' });
    } catch (e) {
        res.json({ personas: memoryStore.personas, source: 'memory' });
    }
});

app.post('/api/config/personas', async (req, res) => {
    try {
        const rawList = Array.isArray(req.body) ? req.body : (req.body?.personas || []);
        const label = (!Array.isArray(req.body) && (req.body?.changeSummary || req.body?.label))
            ? (req.body.changeSummary || req.body.label)
            : 'Actualización de Audiencias y Personas';
        const uploadedList = await extractAndUploadImages(rawList, 'persona');
        const sanitizedList = uploadedList.map((p, i) => sanitizePersona(p, i));
        const updatedAt = new Date().toISOString();

        memoryStore.personas = sanitizedList;
        memoryStore.runs.audience_generator = {
            ...(memoryStore.runs.audience_generator || {}),
            personas: sanitizedList
        };

        try {
            await withTimeout(
                Promise.all([
                    firestore.collection('chopo_config').doc('personas_catalog').set({
                        personas: sanitizedList,
                        updatedAt
                    }),
                    firestore.collection('chopo_config').doc('audiences').set({
                        personas: sanitizedList,
                        updatedAt
                    }),
                    firestore.collection('chopo_runs').doc('audience_generator').set({
                        featureId: 'audience_generator',
                        data: { personas: sanitizedList },
                        updatedAt
                    }, { merge: true })
                ]),
                2500,
                'saveConfigPersonas Firestore'
            );
        } catch (fsErr) {
            console.warn('Saved config/personas to memoryStore:', fsErr.message);
        }

        const snapshot = await saveConfigVersionSnapshot('personas', sanitizedList, label);
        res.json({ success: true, personas: sanitizedList, versionId: snapshot.versionId });
    } catch (e) {
        console.error('Error saving config/personas:', e);
        res.status(500).json({ error: 'Failed to save personas' });
    }
});

app.get('/api/config/personas/versions', async (req, res) => {
    try {
        let docsList = [];
        try {
            const snapshot = await withTimeout(
                firestore
                    .collection('chopo_config_versions')
                    .where('entityType', '==', 'personas')
                    .get(),
                2500,
                'listConfigPersonasVersions Firestore'
            );
            docsList = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: d.versionId || doc.id,
                    versionId: d.versionId || doc.id,
                    entityType: d.entityType,
                    timestamp: d.timestamp,
                    createdAt: d.timestamp,
                    label: d.label,
                    changeSummary: d.label,
                    itemCount: d.itemCount ?? (Array.isArray(d.data) ? d.data.length : 0)
                };
            });
        } catch (fsErr) {
            docsList = memoryStore.versions
                .filter(v => v.entityType === 'personas')
                .map(v => ({
                    id: v.versionId,
                    versionId: v.versionId,
                    entityType: v.entityType,
                    timestamp: v.timestamp,
                    createdAt: v.timestamp,
                    label: v.label,
                    changeSummary: v.label,
                    itemCount: v.itemCount
                }));
        }

        const versions = docsList
            .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
            .slice(0, 20);

        if (!versions.some(v => v.versionId === 'OFFICIAL_SEED')) {
            versions.push({
                id: 'OFFICIAL_SEED',
                versionId: 'OFFICIAL_SEED',
                entityType: 'personas',
                timestamp: '2026-11-01T12:00:00.000Z',
                createdAt: '2026-11-01T12:00:00.000Z',
                label: 'Configuración Inicial por Defecto',
                changeSummary: 'Configuración Inicial por Defecto',
                itemCount: initialPersonasSeed.length || 5
            });
        }

        res.json({ versions });
    } catch (e) {
        console.error('Error listing config/personas/versions:', e);
        res.status(500).json({ error: 'Failed to list versions' });
    }
});

app.post('/api/config/personas/rollback', async (req, res) => {
    try {
        const versionId = req.body?.versionId || req.body?.id;
        if (!versionId) {
            return res.status(400).json({ error: 'versionId is required' });
        }

        let restoredData = null;
        let sourceLabel = versionId;

        if (versionId === 'OFFICIAL_SEED' || versionId.startsWith('v_seed_initial')) {
            sourceLabel = 'Configuración Inicial por Defecto';
            const seed = loadSeedJson('personas_seed.json');
            restoredData = (seed?.personas || []).map((p, i) => sanitizePersona(p, i));
        } else {
            let verData = memoryStore.versions.find(v => v.versionId === versionId);
            try {
                const verDoc = await withTimeout(
                    firestore.collection('chopo_config_versions').doc(versionId).get(),
                    2500,
                    'rollback personas get'
                );
                if (verDoc.exists) {
                    verData = verDoc.data();
                }
            } catch (fsErr) {
                console.warn('Using memoryStore version for rollback:', fsErr.message);
            }

            if (!verData) {
                return res.status(404).json({ error: `Version ${versionId} not found` });
            }
            sourceLabel = verData?.label || versionId;
            restoredData = (verData?.data || []).map((p, i) => sanitizePersona(p, i));
        }

        const updatedAt = new Date().toISOString();
        memoryStore.personas = restoredData;
        memoryStore.runs.audience_generator = { personas: restoredData };

        try {
            await withTimeout(
                Promise.all([
                    firestore.collection('chopo_config').doc('personas_catalog').set({
                        personas: restoredData,
                        updatedAt
                    }),
                    firestore.collection('chopo_config').doc('audiences').set({
                        personas: restoredData,
                        updatedAt
                    }),
                    firestore.collection('chopo_runs').doc('audience_generator').set({
                        featureId: 'audience_generator',
                        data: { personas: restoredData },
                        updatedAt
                    }, { merge: true })
                ]),
                2500,
                'rollback personas Firestore'
            );
        } catch (fsErr) {
            console.warn('Restored personas in memoryStore:', fsErr.message);
        }

        const snapshot = await saveConfigVersionSnapshot('personas', restoredData, `Rollback a: ${sourceLabel}`);
        res.json({ success: true, personas: restoredData, data: restoredData, versionId: snapshot.versionId });
    } catch (e) {
        console.error('Error rolling back personas:', e);
        res.status(500).json({ error: 'Failed to rollback personas' });
    }
});

app.post('/api/config/personas/reset', async (req, res) => {
    try {
        const seed = loadSeedJson('personas_seed.json');
        const restoredData = (seed?.personas || []).map((p, i) => sanitizePersona(p, i));
        const updatedAt = new Date().toISOString();

        memoryStore.personas = restoredData;
        memoryStore.runs.audience_generator = { personas: restoredData };

        try {
            await withTimeout(
                Promise.all([
                    firestore.collection('chopo_config').doc('personas_catalog').set({
                        personas: restoredData,
                        updatedAt
                    }),
                    firestore.collection('chopo_config').doc('audiences').set({
                        personas: restoredData,
                        updatedAt
                    }),
                    firestore.collection('chopo_runs').doc('audience_generator').set({
                        featureId: 'audience_generator',
                        data: { personas: restoredData },
                        updatedAt
                    }, { merge: true })
                ]),
                2500,
                'reset personas Firestore'
            );
        } catch (fsErr) {
            console.warn('Reset personas in memoryStore:', fsErr.message);
        }

        const snapshot = await saveConfigVersionSnapshot('personas', restoredData, 'Restauración de Perfiles Base Oficiales');
        res.json({ success: true, personas: restoredData, data: restoredData, versionId: snapshot.versionId });
    } catch (e) {
        console.error('Error resetting personas:', e);
        res.status(500).json({ error: 'Failed to reset personas' });
    }
});

// 2. Rubrics Endpoints (/api/rubrics)
app.get('/api/rubrics', async (req, res) => {
    try {
        const rubrics = await getActiveRubrics();
        res.json(rubrics);
    } catch (e) {
        console.error('Error reading rubrics:', e);
        res.json(memoryStore.rubrics);
    }
});

app.post('/api/rubrics', async (req, res) => {
    try {
        const rawRubrics = Array.isArray(req.body) ? req.body : (req.body?.rubrics || []);
        const label = (!Array.isArray(req.body) && req.body?.label) ? req.body.label : 'Actualización de Rúbricas de Focus Group';
        const cleanRubrics = rawRubrics.map((r, i) => sanitizeRubric(r, i));
        const updatedAt = new Date().toISOString();

        memoryStore.rubrics = cleanRubrics;

        try {
            await withTimeout(
                firestore.collection('chopo_config').doc('rubrics_catalog').set({
                    rubrics: cleanRubrics,
                    updatedAt
                }),
                2500,
                'saveRubrics Firestore'
            );
        } catch (fsErr) {
            console.warn('Saved rubrics to memoryStore (Firestore sync warning):', fsErr.message);
        }

        const snapshot = await saveConfigVersionSnapshot('rubrics', cleanRubrics, label);
        res.json({ success: true, rubrics: cleanRubrics, versionId: snapshot.versionId });
    } catch (e) {
        console.error('Error saving rubrics:', e);
        res.status(500).json({ error: 'Failed to save rubrics' });
    }
});

// 3. Clinical Use Cases Endpoints (/api/use-cases)
app.get('/api/use-cases', async (req, res) => {
    try {
        const useCases = await getActiveUseCases();
        res.json(useCases);
    } catch (e) {
        console.error('Error reading use cases:', e);
        res.json(memoryStore.useCases);
    }
});

app.post('/api/use-cases', async (req, res) => {
    try {
        const rawUseCases = Array.isArray(req.body) ? req.body : (req.body?.useCases || []);
        const label = (!Array.isArray(req.body) && req.body?.label) ? req.body.label : 'Actualización de Casos de Uso Clínicos';
        const cleanUseCases = rawUseCases.map((u, i) => sanitizeUseCase(u, i));
        const updatedAt = new Date().toISOString();

        memoryStore.useCases = cleanUseCases;

        try {
            await withTimeout(
                firestore.collection('chopo_config').doc('use_cases_catalog').set({
                    useCases: cleanUseCases,
                    updatedAt
                }),
                2500,
                'saveUseCases Firestore'
            );
        } catch (fsErr) {
            console.warn('Saved use cases to memoryStore (Firestore sync warning):', fsErr.message);
        }

        const snapshot = await saveConfigVersionSnapshot('use_cases', cleanUseCases, label);
        res.json({ success: true, useCases: cleanUseCases, versionId: snapshot.versionId });
    } catch (e) {
        console.error('Error saving use cases:', e);
        res.status(500).json({ error: 'Failed to save use cases' });
    }
});

// 4. Version History & Rollback Endpoints (/api/config-versions)
app.get('/api/config-versions/:entityType', async (req, res) => {
    try {
        const { entityType } = req.params;
        let docsList = [];
        try {
            const snapshot = await withTimeout(
                firestore
                    .collection('chopo_config_versions')
                    .where('entityType', '==', entityType)
                    .get(),
                2500,
                'listConfigVersions Firestore'
            );
            docsList = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    versionId: d.versionId || doc.id,
                    entityType: d.entityType,
                    timestamp: d.timestamp,
                    label: d.label,
                    itemCount: d.itemCount ?? (Array.isArray(d.data) ? d.data.length : 0)
                };
            });
        } catch (fsErr) {
            docsList = memoryStore.versions
                .filter(v => v.entityType === entityType)
                .map(v => ({
                    versionId: v.versionId,
                    entityType: v.entityType,
                    timestamp: v.timestamp,
                    label: v.label,
                    itemCount: v.itemCount
                }));
        }

        const versions = docsList
            .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
            .slice(0, 20);

        // Always include the official baseline seed option so users can reset at any time
        if (!versions.some(v => v.versionId === 'OFFICIAL_SEED')) {
            versions.push({
                versionId: 'OFFICIAL_SEED',
                entityType,
                timestamp: '2026-11-01T12:00:00.000Z',
                label: 'Configuración Inicial por Defecto',
                itemCount: entityType === 'rubrics' ? 6 : entityType === 'rag_docs' ? 4 : 5
            });
        }

        res.json(versions);
    } catch (e) {
        console.error('Error listing config versions:', e);
        res.status(500).json({ error: 'Failed to list config versions' });
    }
});

function sanitizeRagDocsMap(rawDocs) {
    if (!rawDocs || typeof rawDocs !== 'object' || Array.isArray(rawDocs)) {
        return { ...loadSeedRagDocs() };
    }
    const cleaned = {};
    for (const [k, v] of Object.entries(rawDocs)) {
        const safeName = String(k || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!safeName) continue;
        const lower = safeName.toLowerCase();
        const finalName = (lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.pdf'))
            ? safeName
            : `${safeName}.md`;
        cleaned[finalName] = String(v ?? '');
    }
    return Object.keys(cleaned).length > 0 ? cleaned : { ...loadSeedRagDocs() };
}

async function triggerVertexRagReindex() {
    const datastoreId = process.env.VERTEX_RAG_DATASTORE_ID;
    const ragBucket = process.env.GCS_RAG_BUCKET_NAME;
    if (!datastoreId || !ragBucket || !storage?.authClient) return;
    try {
        const tokenRes = await storage.authClient.getAccessToken();
        const accessToken = typeof tokenRes === 'string' ? tokenRes : tokenRes?.token;
        if (!accessToken) return;
        const importUrl = `https://discoveryengine.googleapis.com/v1/${datastoreId}/branches/0/documents:import`;
        await fetch(importUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Goog-User-Project': project,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gcsSource: {
                    inputUris: [`gs://${ragBucket}/*`],
                    dataSchema: 'content'
                },
                reconciliationMode: 'INCREMENTAL'
            })
        });
    } catch (err) {
        console.warn('Vertex AI Search incremental reindex notice:', err.message);
    }
}

function syncRagDocsToGCSBackground(docsMap) {
    const dedicatedRagBucket = process.env.GCS_RAG_BUCKET_NAME;
    const targetBucketName = dedicatedRagBucket || bucketName;
    Promise.resolve().then(async () => {
        for (const [filename, content] of Object.entries(docsMap || {})) {
            try {
                // In chopo-argolis-rag-docs, files live at the bucket root (also sync .txt mirror for .md seeds)
                const objectPath = dedicatedRagBucket ? filename : `chopo-rag-docs/${filename}`;
                await withTimeout(
                    storage
                        .bucket(targetBucketName)
                        .file(objectPath)
                        .save(String(content ?? ''), {
                            contentType: 'text/plain; charset=utf-8',
                            resumable: false
                        }),
                    3500,
                    `GCS RAG sync ${filename}`
                );
                if (dedicatedRagBucket && filename.endsWith('.md')) {
                    const txtName = filename.replace(/\.md$/i, '.txt');
                    await withTimeout(
                        storage
                            .bucket(targetBucketName)
                            .file(txtName)
                            .save(String(content ?? ''), {
                                contentType: 'text/plain; charset=utf-8',
                                resumable: false
                            }),
                        3500,
                        `GCS RAG sync ${txtName}`
                    );
                }
            } catch (err) {
                console.warn(`Background GCS RAG sync skipped for ${filename}:`, err.message);
            }
        }
        await triggerVertexRagReindex();
    }).catch(() => {});
}

async function getActiveRagDocs() {
    try {
        const docSnap = await withTimeout(
            firestore.collection('chopo_config').doc('rag_docs_catalog').get(),
            2500,
            'getActiveRagDocs'
        );
        if (docSnap.exists) {
            const data = docSnap.data();
            if (data?.documents && typeof data.documents === 'object' && Object.keys(data.documents).length > 0) {
                memoryStore.ragDocs = sanitizeRagDocsMap(data.documents);
                return memoryStore.ragDocs;
            }
        }
    } catch (e) {
        console.warn('getActiveRagDocs using seed/memory cache:', e.message);
    }
    if (!memoryStore.ragDocs || Object.keys(memoryStore.ragDocs).length === 0) {
        memoryStore.ragDocs = loadSeedRagDocs();
    }
    return memoryStore.ragDocs;
}

app.get('/api/rag/docs', async (req, res) => {
    try {
        const docs = await getActiveRagDocs();
        res.json({ documents: docs });
    } catch (e) {
        console.error('Error reading RAG docs:', e);
        res.json({ documents: memoryStore.ragDocs });
    }
});

app.post('/api/rag/docs', async (req, res) => {
    try {
        const rawDocs = req.body?.docs || req.body?.documents || req.body || {};
        const label = req.body?.label || 'Actualización desde RAG Admin';
        const cleanDocs = sanitizeRagDocsMap(rawDocs);
        const updatedAt = new Date().toISOString();

        // Update hot memory cache immediately so /api/rag/retrieve uses the updated normative text right away
        memoryStore.ragDocs = cleanDocs;

        try {
            await withTimeout(
                firestore.collection('chopo_config').doc('rag_docs_catalog').set({
                    documents: cleanDocs,
                    updatedAt
                }),
                2500,
                'saveRagDocs Firestore'
            );
        } catch (fsErr) {
            console.warn('Saved RAG docs to memoryStore (Firestore sync warning):', fsErr.message);
        }

        const snapshot = await saveConfigVersionSnapshot('rag_docs', cleanDocs, label);
        syncRagDocsToGCSBackground(cleanDocs);

        res.json({
            success: true,
            documents: cleanDocs,
            versionId: snapshot.versionId
        });
    } catch (e) {
        console.error('Error saving RAG docs:', e);
        res.status(500).json({ error: 'Failed to save RAG documents' });
    }
});

// Upload PDF, TXT, or MD file to GCS Bucket (chopo-rag-docs/) and extract text for RAG
app.post('/api/rag/upload-file', async (req, res) => {
    try {
        const { filename, mimeType, base64Data, textContent } = req.body || {};
        if (!filename) {
            return res.status(400).json({ error: 'filename is required' });
        }

        const safeName = String(filename).trim().replace(/[^a-zA-Z0-9._-]/g, '_');
        const lowerName = safeName.toLowerCase();
        const isPdf = lowerName.endsWith('.pdf') || mimeType === 'application/pdf';
        const dedicatedRagBucket = process.env.GCS_RAG_BUCKET_NAME;
        const targetBucketName = dedicatedRagBucket || bucketName;
        const gcsObjectPath = dedicatedRagBucket ? safeName : `chopo-rag-docs/${safeName}`;

        // 1. Upload raw file binary to Cloud Storage if base64Data provided
        if (base64Data) {
            const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
            const fileBuffer = Buffer.from(cleanBase64, 'base64');
            Promise.resolve().then(async () => {
                try {
                    await withTimeout(
                        storage
                            .bucket(targetBucketName)
                            .file(gcsObjectPath)
                            .save(fileBuffer, {
                                contentType: isPdf ? 'application/pdf' : (mimeType || 'text/plain; charset=utf-8'),
                                resumable: false
                            }),
                        5000,
                        `GCS RAG binary upload ${safeName}`
                    );
                    await triggerVertexRagReindex();
                } catch (err) {
                    console.warn(`Background GCS binary upload warning for ${safeName}:`, err.message);
                }
            }).catch(() => {});
        }

        // 2. Determine or extract readable text content for the RAG index & editor
        let extractedText = typeof textContent === 'string' ? textContent.trim() : '';

        if (isPdf && !extractedText && base64Data) {
            const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
            const pdfBuffer = Buffer.from(cleanBase64, 'base64');

            // Fast local extraction via pdftotext if available
            try {
                const tmpPdfPath = path.join(os.tmpdir(), `chopo_rag_${Date.now()}_${safeName}`);
                fs.writeFileSync(tmpPdfPath, pdfBuffer);
                const rawPdfText = execFileSync('pdftotext', ['-layout', tmpPdfPath, '-'], {
                    encoding: 'utf8',
                    timeout: 5000
                });
                fs.unlinkSync(tmpPdfPath);
                if (rawPdfText && rawPdfText.trim().length > 20) {
                    extractedText = `# ${safeName.replace(/\.pdf$/i, '').replace(/_/g, ' ')}\n\n${rawPdfText.trim()}`;
                }
            } catch (localPdfErr) {
                console.warn(`Local pdftotext fallback to Vertex AI for ${safeName}:`, localPdfErr.message);
            }

            if (!extractedText && ai) {
                try {
                    const extractionResponse = await ai.models.generateContent({
                        model: VERTEX_TEXT_MODEL,
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'application/pdf',
                                            data: cleanBase64
                                        }
                                    },
                                    {
                                        text: 'Extrae íntegramente el texto, lineamientos, reglas y tablas de este documento PDF en formato Markdown limpio en español, respetando todos los títulos, códigos, folios y criterios sin omitir información.'
                                    }
                                ]
                            }
                        ]
                    });
                    const candidateText = extractionResponse?.candidates?.[0]?.content?.parts
                        ?.map(p => p.text || '')
                        .join('\n')
                        .trim();
                    if (candidateText) {
                        extractedText = candidateText;
                    }
                } catch (pdfErr) {
                    console.warn(`Vertex AI PDF extraction fallback for ${safeName}:`, pdfErr.message);
                }
            }

            if (!extractedText) {
                extractedText = `# Documento PDF: ${safeName}\n\nArchivo PDF almacenado en Cloud Storage (chopo-rag-docs/${safeName}).\nPuedes agregar o editar aquí el resumen de lineamientos o reglas clave de este documento para su consulta directa.`;
            }
        }

        res.json({
            success: true,
            filename: safeName,
            content: extractedText
        });
    } catch (e) {
        console.error('Error uploading RAG file:', e);
        res.status(500).json({ error: 'Failed to process uploaded file' });
    }
});

app.post('/api/config-versions/restore', async (req, res) => {
    try {
        const { entityType, versionId } = req.body || {};
        if (!entityType || !versionId) {
            return res.status(400).json({ error: 'entityType and versionId are required' });
        }

        let restoredData = null;
        let sourceLabel = versionId;

        if (versionId === 'OFFICIAL_SEED' || versionId.startsWith('v_seed_initial')) {
            sourceLabel = 'Configuración Inicial por Defecto';
            if (entityType === 'personas') {
                const seed = loadSeedJson('personas_seed.json');
                restoredData = (seed?.personas || []).map((p, i) => sanitizePersona(p, i));
            } else if (entityType === 'rubrics') {
                const seed = loadSeedJson('rubrics_seed.json');
                restoredData = (seed?.rubrics || []).map((r, i) => sanitizeRubric(r, i));
            } else if (entityType === 'use_cases') {
                const seed = loadSeedJson('use_cases_seed.json');
                restoredData = (seed?.useCases || []).map((u, i) => sanitizeUseCase(u, i));
            } else if (entityType === 'rag_docs') {
                restoredData = loadSeedRagDocs();
            }
        } else {
            let verData = memoryStore.versions.find(v => v.versionId === versionId);
            try {
                const verDoc = await withTimeout(
                    firestore.collection('chopo_config_versions').doc(versionId).get(),
                    2500,
                    'restoreConfigVersion get'
                );
                if (verDoc.exists) {
                    verData = verDoc.data();
                }
            } catch (fsErr) {
                console.warn('Using memoryStore version for restore:', fsErr.message);
            }

            if (!verData) {
                return res.status(404).json({ error: `Version ${versionId} not found` });
            }
            sourceLabel = verData?.label || versionId;
            if (entityType === 'personas') {
                restoredData = (verData?.data || []).map((p, i) => sanitizePersona(p, i));
            } else if (entityType === 'rubrics') {
                restoredData = (verData?.data || []).map((r, i) => sanitizeRubric(r, i));
            } else if (entityType === 'use_cases') {
                restoredData = (verData?.data || []).map((u, i) => sanitizeUseCase(u, i));
            } else if (entityType === 'rag_docs') {
                restoredData = sanitizeRagDocsMap(verData?.data);
            } else {
                restoredData = verData?.data || [];
            }
        }

        if (!restoredData) {
            return res.status(400).json({ error: `Unsupported entityType: ${entityType}` });
        }

        const updatedAt = new Date().toISOString();

        if (entityType === 'personas') {
            memoryStore.personas = restoredData;
            memoryStore.runs.audience_generator = { personas: restoredData };
            try {
                await withTimeout(
                    Promise.all([
                        firestore.collection('chopo_config').doc('personas_catalog').set({
                            personas: restoredData,
                            updatedAt
                        }),
                        firestore.collection('chopo_config').doc('audiences').set({
                            personas: restoredData,
                            updatedAt
                        }),
                        firestore.collection('chopo_runs').doc('audience_generator').set({
                            featureId: 'audience_generator',
                            data: { personas: restoredData },
                            updatedAt
                        }, { merge: true })
                    ]),
                    2500,
                    'restore personas Firestore'
                );
            } catch (fsErr) {
                console.warn('Restored personas in memoryStore:', fsErr.message);
            }
        } else if (entityType === 'rubrics') {
            memoryStore.rubrics = restoredData;
            try {
                await withTimeout(
                    firestore.collection('chopo_config').doc('rubrics_catalog').set({
                        rubrics: restoredData,
                        updatedAt
                    }),
                    2500,
                    'restore rubrics Firestore'
                );
            } catch (fsErr) {
                console.warn('Restored rubrics in memoryStore:', fsErr.message);
            }
        } else if (entityType === 'use_cases') {
            memoryStore.useCases = restoredData;
            try {
                await withTimeout(
                    firestore.collection('chopo_config').doc('use_cases_catalog').set({
                        useCases: restoredData,
                        updatedAt
                    }),
                    2500,
                    'restore use_cases Firestore'
                );
            } catch (fsErr) {
                console.warn('Restored use_cases in memoryStore:', fsErr.message);
            }
        } else if (entityType === 'rag_docs') {
            memoryStore.ragDocs = restoredData;
            try {
                await withTimeout(
                    firestore.collection('chopo_config').doc('rag_docs_catalog').set({
                        documents: restoredData,
                        updatedAt
                    }),
                    2500,
                    'restore rag_docs Firestore'
                );
            } catch (fsErr) {
                console.warn('Restored rag_docs in memoryStore:', fsErr.message);
            }
            syncRagDocsToGCSBackground(restoredData);
        }

        const snapshot = await saveConfigVersionSnapshot(
            entityType,
            restoredData,
            `Rollback a: ${sourceLabel}`
        );

        res.json({
            success: true,
            entityType,
            versionId: snapshot.versionId,
            data: restoredData
        });
    } catch (e) {
        console.error('Error restoring config version:', e);
        res.status(500).json({ error: 'Failed to restore config version' });
    }
});

// 5. Study-Scoped RAG Retrieval Endpoint (/api/rag/retrieve)
function filterRealismRulesByStudy(realismMarkdown, studyName = '') {
    if (!realismMarkdown) return '';
    const sections = realismMarkdown.split(/\n(?=## Estudio:)/g);
    const sLower = String(studyName || '').toLowerCase();

    const matchedSections = sections.filter(section => {
        const headerLine = (section.split('\n')[0] || '').toLowerCase();
        if (!headerLine.startsWith('## estudio:')) return true;
        if (headerLine.includes('general')) return true;

        if (
            sLower.includes('rayos x') ||
            sLower.includes('radiograf') ||
            sLower.includes('tórax') ||
            sLower.includes('torax')
        ) {
            return headerLine.includes('rayos x');
        }
        if (sLower.includes('resonancia')) {
            return headerLine.includes('resonancia');
        }
        if (sLower.includes('tomograf') || sLower.includes('tac')) {
            return headerLine.includes('tomograf');
        }
        if (sLower.includes('mastograf') || sLower.includes('ultrasonido') || sLower.includes('mamario')) {
            return headerLine.includes('ultrasonido') || headerLine.includes('mastograf');
        }
        // Default: Laboratorio Clínico / Diabetes / HbA1c / Check-up / Sangre
        return headerLine.includes('laboratorio') || headerLine.includes('diabetes') || headerLine.includes('toma de muestra');
    });

    return matchedSections.join('\n\n');
}

async function queryVertexAiSearchChunks(searchQuery, pageSize = 4) {
    const datastoreId = process.env.VERTEX_RAG_DATASTORE_ID;
    if (!datastoreId || !storage?.authClient) return [];
    try {
        const tokenRes = await withTimeout(storage.authClient.getAccessToken(), 2000, 'DiscoveryEngine token');
        const accessToken = typeof tokenRes === 'string' ? tokenRes : tokenRes?.token;
        if (!accessToken) return [];
        const searchUrl = `https://discoveryengine.googleapis.com/v1/${datastoreId}/servingConfigs/default_search:search`;
        const resp = await withTimeout(
            fetch(searchUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-Goog-User-Project': project,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: searchQuery,
                    pageSize,
                    contentSearchSpec: {
                        searchResultMode: 'CHUNKS'
                    }
                })
            }),
            2500,
            'Vertex AI Search query'
        );
        if (!resp.ok) return [];
        const data = await resp.json();
        return (data.results || [])
            .map((r, idx) => ({
                id: r.chunk?.id || `vais_chunk_${idx}`,
                title: `Vertex AI Search (${r.chunk?.documentMetadata?.title || 'chopo-rag-datastore'})`,
                content: r.chunk?.content || '',
                uri: r.chunk?.documentMetadata?.uri || ''
            }))
            .filter(c => c.content);
    } catch (err) {
        console.warn('Vertex AI Search live query fallback to local catalog:', err.message);
        return [];
    }
}

async function buildRagContextForStudy(studyName = 'Check-up Control Diabetes', track = 'patient', query = '') {
    const docs = Object.keys(memoryStore.ragDocs).length > 0 ? memoryStore.ragDocs : loadSeedRagDocs();
    const useCases = await getActiveUseCases();
    const sLower = String(studyName || '').toLowerCase();
    const matchedUseCase =
        useCases.find(u => sLower.includes(u.studyName.toLowerCase()) || u.studyName.toLowerCase().includes(sLower)) ||
        useCases.find(u => u.isDefault) ||
        useCases[0];

    const cofeprisDoc = docs['01_cofepris_lineamientos.md'] || '';
    const brandDoc = docs['02_chopo_brand_manual.md'] || '';
    const catalogDoc = docs['03_catalogo_estudios_diabetes.md'] || '';
    const fullRealismDoc = docs['04_reglas_realismo_clinico_y_operativo.md'] || '';
    const scopedRealismDoc = filterRealismRulesByStudy(fullRealismDoc, studyName);

    const chunks = [
        {
            id: 'pillar_1_cofepris',
            title: 'Pilar 1: Lineamientos Regulatorios COFEPRIS (COF-001 a COF-008)',
            content: cofeprisDoc
        },
        {
            id: 'pillar_2_brand',
            title: 'Pilar 2: Manual de Marca Laboratorios Médicos El Chopo (BRD-001 a BRD-005)',
            content: brandDoc
        },
        {
            id: 'pillar_3_clinical',
            title: 'Pilar 3: Catálogo Clínico y Exactitud Médica — Línea Diabetes y Check-ups (CLN-001 a CLN-003)',
            content: catalogDoc
        },
        {
            id: 'pillar_4_realism',
            title: `Pilar 4: Reglas Vivas de Realismo Clínico y Operativo Visual filtradas para "${studyName}" (RLM-001 a RLM-004)`,
            content: scopedRealismDoc
        }
    ];

    const standardDocNames = new Set([
        '01_cofepris_lineamientos.md',
        '02_chopo_brand_manual.md',
        '03_catalogo_estudios_diabetes.md',
        '04_reglas_realismo_clinico_y_operativo.md'
    ]);

    for (const [docKey, docContent] of Object.entries(docs)) {
        if (!standardDocNames.has(docKey) && docContent) {
            chunks.push({
                id: `custom_${docKey}`,
                title: `Documento Normativo Adicional: ${docKey}`,
                content: docContent
            });
        }
    }

    // Query live Vertex AI Search DataStore (chopo-rag-datastore in chopo-argolis) if configured
    const liveSearchChunks = await queryVertexAiSearchChunks(`${studyName} ${track} ${query} COFEPRIS realismo visual`, 4);
    if (liveSearchChunks.length > 0) {
        chunks.push({
            id: 'vertex_ai_search_live',
            title: `Fragmentos Semánticos Recuperados en Vivo de Vertex AI Search (chopo-rag-datastore)`,
            content: liveSearchChunks.map(c => `[${c.title}]:\n${c.content}`).join('\n\n')
        });
    }

    const combinedContext = chunks.map(c => `### ${c.title}\n${c.content}`).join('\n\n---\n\n');

    return {
        studyName: matchedUseCase?.studyName || studyName,
        track,
        useCase: matchedUseCase || null,
        ragDatastoreId: process.env.VERTEX_RAG_DATASTORE_ID || null,
        liveVertexSearchHits: liveSearchChunks.length,
        chunks,
        combinedContext
    };
}

app.post('/api/rag/retrieve', async (req, res) => {
    try {
        const { studyName = 'Check-up Control Diabetes', track = 'patient', query = '' } = req.body || {};
        const ragPayload = await buildRagContextForStudy(studyName, track, query);
        res.json({
            ...ragPayload,
            query
        });
    } catch (e) {
        console.error('Error retrieving RAG context:', e);
        res.status(500).json({ error: 'Failed to retrieve RAG context' });
    }
});

// --- Existing Cloud Firestore Persistence Endpoints ---

// Email Campaigns (chopo_config/email_campaigns)
app.get('/api/load-email-campaigns', async (req, res) => {
    try {
        const docSnap = await withTimeout(
            firestore.collection('chopo_config').doc('email_campaigns').get(),
            2500,
            'load-email-campaigns'
        );
        if (!docSnap.exists) {
            return res.json(memoryStore.config.email_campaigns || []);
        }
        const data = docSnap.data();
        const campaigns = Array.isArray(data?.campaigns) ? data.campaigns : [];
        memoryStore.config.email_campaigns = campaigns;
        res.json(campaigns);
    } catch (e) {
        res.json(memoryStore.config.email_campaigns || []);
    }
});

app.post('/api/save-email-campaigns', async (req, res) => {
    try {
        const campaigns = Array.isArray(req.body) ? req.body : req.body?.campaigns;
        if (!Array.isArray(campaigns)) {
            return res.status(400).json({ error: "Campaigns must be an array" });
        }
        const cleanCampaigns = await extractAndUploadImages(campaigns, 'email_campaign');
        memoryStore.config.email_campaigns = cleanCampaigns;
        try {
            await withTimeout(
                firestore.collection('chopo_config').doc('email_campaigns').set({
                    campaigns: cleanCampaigns,
                    updatedAt: new Date().toISOString()
                }),
                2500,
                'save-email-campaigns'
            );
        } catch (fsErr) {
            console.warn('Cached email_campaigns in memoryStore:', fsErr.message);
        }
        res.json({ success: true });
    } catch (e) {
        console.error("Error saving email campaigns:", e);
        res.status(500).json({ error: "Failed to save email campaigns" });
    }
});

// Audience Strategy (chopo_config/audience_strategy)
app.get('/api/audience-strategy', async (req, res) => {
    try {
        const docSnap = await withTimeout(
            firestore.collection('chopo_config').doc('audience_strategy').get(),
            2500,
            'get audience_strategy'
        );
        if (!docSnap.exists) {
            if (memoryStore.config.audience_strategy) {
                return res.json(memoryStore.config.audience_strategy);
            }
            return res.status(404).json({ error: "No strategy found" });
        }
        memoryStore.config.audience_strategy = docSnap.data();
        res.json(docSnap.data());
    } catch (e) {
        if (memoryStore.config.audience_strategy) {
            return res.json(memoryStore.config.audience_strategy);
        }
        res.status(404).json({ error: "No strategy found" });
    }
});

app.post('/api/audience-strategy', async (req, res) => {
    try {
        const cleanBody = await extractAndUploadImages(req.body || {}, 'audience_strategy');
        const payload = {
            ...cleanBody,
            updatedAt: new Date().toISOString()
        };
        memoryStore.config.audience_strategy = payload;
        try {
            await withTimeout(
                firestore.collection('chopo_config').doc('audience_strategy').set(payload),
                2500,
                'save audience_strategy'
            );
        } catch (fsErr) {
            console.warn('Cached audience_strategy in memoryStore:', fsErr.message);
        }
        res.json({ success: true });
    } catch (e) {
        console.error("Error saving audience strategy:", e);
        res.status(500).json({ error: "Failed to save audience strategy" });
    }
});

// Company Context (chopo_config/company_context)
app.get('/api/company-context', async (req, res) => {
    try {
        const docSnap = await withTimeout(
            firestore.collection('chopo_config').doc('company_context').get(),
            2500,
            'get company_context'
        );
        if (!docSnap.exists) {
            if (memoryStore.config.company_context) {
                return res.json(memoryStore.config.company_context);
            }
            return res.status(404).json({ error: "No company context found" });
        }
        memoryStore.config.company_context = docSnap.data();
        res.json(docSnap.data());
    } catch (e) {
        if (memoryStore.config.company_context) {
            return res.json(memoryStore.config.company_context);
        }
        res.status(404).json({ error: "No company context found" });
    }
});

app.post('/api/company-context', async (req, res) => {
    try {
        const cleanBody = await extractAndUploadImages(req.body || {}, 'company_context');
        const payload = {
            ...cleanBody,
            updatedAt: new Date().toISOString()
        };
        memoryStore.config.company_context = payload;
        memoryStore.runs.company_context = payload;
        try {
            await withTimeout(
                firestore.collection('chopo_config').doc('company_context').set(payload),
                2500,
                'save company_context'
            );
        } catch (fsErr) {
            console.warn('Cached company_context in memoryStore:', fsErr.message);
        }
        res.json({ success: true });
    } catch (e) {
        console.error("Error saving company context:", e);
        res.status(500).json({ error: "Failed to save company context" });
    }
});

// Generic Runs Persistence (chopo_runs/:featureId)
app.get('/api/load-run/:featureId', async (req, res) => {
    try {
        const { featureId } = req.params;
        try {
            const docSnap = await withTimeout(
                firestore.collection('chopo_runs').doc(featureId).get(),
                2500,
                `load-run ${featureId}`
            );
            if (docSnap.exists) {
                const record = docSnap.data();
                const payload = record && record.data !== undefined ? record.data : record;

                if (featureId === 'audience_generator' && payload) {
                    if (Array.isArray(payload.personas)) {
                        payload.personas = payload.personas.map((p, i) => sanitizePersona(p, i));
                    } else if (Array.isArray(payload)) {
                        return res.json({ personas: payload.map((p, i) => sanitizePersona(p, i)) });
                    }
                }
                memoryStore.runs[featureId] = payload;
                return res.json(payload);
            }
        } catch (fsErr) {
            console.warn(`load-run/${featureId} using memoryStore fallback:`, fsErr.message);
        }

        if (memoryStore.runs[featureId] !== undefined) {
            return res.json(memoryStore.runs[featureId]);
        }
        if (featureId === 'audience_generator') {
            return res.json({ personas: memoryStore.personas });
        }
        return res.status(404).json({ error: "No saved run found" });
    } catch (e) {
        console.error(`Error reading run ${req.params.featureId}:`, e);
        res.status(500).json({ error: "Failed to read run" });
    }
});

app.post('/api/save-run', async (req, res) => {
    try {
        const { featureId, data } = req.body;
        if (!featureId) {
            return res.status(400).json({ error: "featureId is required" });
        }

        let cleanData = await extractAndUploadImages(data, featureId);
        const updatedAt = new Date().toISOString();

        // Enforce strict persona schema when saving audience_generator runs
        if (featureId === 'audience_generator' && cleanData) {
            if (Array.isArray(cleanData.personas)) {
                cleanData.personas = cleanData.personas.map((p, i) => sanitizePersona(p, i));
                memoryStore.personas = cleanData.personas;
                try {
                    await withTimeout(
                        Promise.all([
                            firestore.collection('chopo_config').doc('personas_catalog').set({
                                personas: cleanData.personas,
                                updatedAt
                            }),
                            firestore.collection('chopo_config').doc('audiences').set({
                                personas: cleanData.personas,
                                updatedAt
                            })
                        ]),
                        2500,
                        'sync audience_generator personas'
                    );
                } catch (fsErr) {
                    console.warn('Synced audience_generator personas to memoryStore:', fsErr.message);
                }
                await saveConfigVersionSnapshot('personas', cleanData.personas, 'Guardado desde Generador de Audiencias');
            } else if (Array.isArray(cleanData)) {
                const sanitized = cleanData.map((p, i) => sanitizePersona(p, i));
                cleanData = { personas: sanitized };
                memoryStore.personas = sanitized;
            }
        }

        memoryStore.runs[featureId] = cleanData;

        try {
            await withTimeout(
                firestore.collection('chopo_runs').doc(featureId).set({
                    featureId,
                    data: cleanData,
                    updatedAt
                }),
                2500,
                `save-run ${featureId}`
            );

            if (featureId === 'company_context' && cleanData && typeof cleanData === 'object') {
                await withTimeout(
                    firestore.collection('chopo_config').doc('company_context').set({
                        ...cleanData,
                        updatedAt
                    }),
                    2500,
                    'save-run company_context'
                );
            }
        } catch (fsErr) {
            console.warn(`Saved run ${featureId} in memoryStore (Firestore sync warning):`, fsErr.message);
        }

        syncMemoryStoreToGCS();
        res.json({ success: true });
    } catch (e) {
        console.error("Error saving run:", e);
        res.status(500).json({ error: "Failed to save run" });
    }
});

app.post('/api/runs/clear-all', async (req, res) => {
    try {
        const preservedCompanyContext = memoryStore.runs.company_context;
        memoryStore.runs = preservedCompanyContext ? { company_context: preservedCompanyContext } : {};
        let deletedCount = 0;

        try {
            const collectionsToClear = ['chopo_runs', 'chopo_audiences', 'chopo_config'];
            const protectedDocs = new Set([
                'company_context',
                'personas_catalog',
                'rubrics_catalog',
                'use_cases_catalog',
                'prompts_catalog',
                'rag_docs_catalog'
            ]);

            for (const colName of collectionsToClear) {
                const snapshot = await withTimeout(firestore.collection(colName).get(), 2500, `clear ${colName}`);
                const batch = firestore.batch();
                let batchCount = 0;

                snapshot.docs.forEach((doc) => {
                    if (!protectedDocs.has(doc.id)) {
                        batch.delete(doc.ref);
                        batchCount++;
                        deletedCount++;
                    }
                });

                if (batchCount > 0) {
                    await withTimeout(batch.commit(), 2500, `commit clear ${colName}`);
                }
            }
        } catch (fsErr) {
            console.warn('Cleared runs in memoryStore (Firestore clear warning):', fsErr.message);
        }

        res.json({ success: true, deletedCount });
    } catch (e) {
        console.error("Error clearing runs:", e);
        res.status(500).json({ error: "Failed to clear runs" });
    }
});

// --- Multimodal Compliance Auditor ("Agente Revisor" — 4 Pillars: COFEPRIS, Brand, Clinical, Visual Realism) ---

app.post('/api/evaluator/single-check', checkAi, async (req, res) => {
    try {
        const {
            copyText = '',
            imageUrl = null,
            track = 'B2C',
            clinicalLine = 'Check-up Control Diabetes'
        } = req.body || {};

        if (!copyText && !imageUrl) {
            return res.status(400).json({ error: 'At least copyText or imageUrl is required for evaluation.' });
        }

        let storedImageUrl = imageUrl;
        let inlineImagePart = null;

        if (imageUrl && typeof imageUrl === 'string') {
            if (imageUrl.startsWith('data:image/')) {
                const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
                if (match) {
                    inlineImagePart = { inlineData: { mimeType: match[1], data: match[2] } };
                }
                if (imageUrl.length > 10240) {
                    storedImageUrl = await uploadBase64ToGCS(imageUrl, 'evaluation');
                }
            } else if (imageUrl.startsWith('/api/media/')) {
                const safeFilename = path.basename(imageUrl);
                const cached = memoryStore.mediaBuffers.get(safeFilename);
                if (cached) {
                    inlineImagePart = {
                        inlineData: { mimeType: cached.mimeType, data: cached.buffer.toString('base64') }
                    };
                } else {
                    const file = storage.bucket(bucketName).file(`chopo-media/${safeFilename}`);
                    try {
                        const [buffer] = await withTimeout(file.download(), 3000, 'download evaluation image');
                        const ext = path.extname(safeFilename).toLowerCase();
                        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
                        inlineImagePart = { inlineData: { mimeType, data: buffer.toString('base64') } };
                    } catch (imgErr) {
                        console.warn(`Could not load GCS image ${safeFilename} for multimodal evaluation:`, imgErr.message);
                    }
                }
            }
        }

        const ragContext = await buildRagContextForStudy(clinicalLine, track === 'B2B' ? 'physician' : 'patient');

        const evalPrompt = `
        Eres el "Agente Revisor" (Auditor Oficial de Cumplimiento Regulatorio COFEPRIS, Identidad de Marca, Exactitud Clínica y Realismo Operativo Visual) de Laboratorios Médicos El Chopo ("Tu laboratorio de cabecera").
        Evalúa la siguiente pieza creativa bajo los 4 Pilares oficiales para la pista "${track}" (${track === 'B2B' ? 'Pista Médico Especialista / Prescriptor' : 'Pista Paciente / Público General'}) en el estudio "${clinicalLine}":

        === COPY DEL ANUNCIO A AUDITAR ===
        "${copyText}"

        === FRAGMENTOS DE LA BASE DE CONOCIMIENTO OFICIAL (RAG) ===
        ${ragContext.combinedContext}

        REGLAS CRÍTICAS DE AUDITORÍA:
        1. Evalúa cada uno de los pilares:
           - Pilar 1 (COFEPRIS): COF-001 (Permiso/Aviso COFEPRIS), COF-002 ("Consulte a su médico" en B2C / exclusividad médica en B2B), COF-003 (Responsable Sanitario y Cédula Profesional), COF-004 (Cero promesas de curación), COF-005 (Cero autodiagnóstico), COF-006 (Cero alarmismo), COF-007 (Español claro sin titulares en inglés), COF-008 (Legibilidad).
           - Pilar 2 (Manual de Marca Chopo): BRD-001 (Paleta Azul Chopo #004B87, Blanco Clínico #FFFFFF y Rojo Acento #E30613), BRD-002 (Nombre oficial), BRD-003 (Tono diferenciado B2C empático vs B2B científico), BRD-004 (Fotografía auténtica sin agujas ni texto deformado), BRD-005 (Vigencia y condición de promoción en línea).
           - Pilar 3 (Catálogo Clínico y Exactitud Médica): CLN-001 (Fidelidad de estudios incluidos), CLN-002 (Exactitud de ayuno), CLN-003 (Rigor científico B2B).
           - Pilar 4 (Realismo Clínico y Operativo Visual): RLM-001 (Entrega 100% digital en App/tablet; prohibido placas radiográficas físicas a contraluz), RLM-002/003/004 (Vestimenta y equipamiento correcto según el estudio "${clinicalLine}").

        Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
        {
            "overallVerdict": "PASS | FAIL",
            "overallScore": 0-100,
            "approved": true,
            "violatedRuleIds": ["..."],
            "pillars": {
                "cofepris": {
                    "score": 0-100,
                    "status": "APROBADO | OBSERVACIONES | RECHAZADO",
                    "findings": ["..."],
                    "requiredDisclaimers": ["Consulte a su médico", "Permiso de Publicidad COFEPRIS No. 2609152002A00518"]
                },
                "brandManual": {
                    "score": 0-100,
                    "status": "APROBADO | OBSERVACIONES | RECHAZADO",
                    "findings": ["..."]
                },
                "clinicalCatalog": {
                    "score": 0-100,
                    "status": "APROBADO | OBSERVACIONES | RECHAZADO",
                    "findings": ["..."]
                },
                "visualRealism": {
                    "score": 0-100,
                    "status": "APROBADO | OBSERVACIONES | RECHAZADO",
                    "findings": ["..."]
                }
            },
            "suggestedCopy": "Versión optimizada y concisa del copy (máx 35-45 palabras antes del pie legal COFEPRIS) cumpliendo al 100% los 4 pilares...",
            "summary": "Resumen ejecutivo del dictamen..."
        }
        `;

        const parts = [{ text: evalPrompt }];
        if (inlineImagePart) {
            parts.unshift(inlineImagePart);
        }

        const config = {
            responseMimeType: "application/json"
        };

        if (process.env.VERTEX_RAG_DATASTORE_ID) {
            config.tools = [
                {
                    retrieval: {
                        vertexAiSearch: {
                            datastore: process.env.VERTEX_RAG_DATASTORE_ID
                        }
                    }
                }
            ];
        }

        let response;
        try {
            response = await ai.models.generateContent({
                model: VERTEX_EVALUATOR_MODEL,
                contents: [{ role: 'user', parts }],
                config
            });
        } catch (evalErr) {
            response = await ai.models.generateContent({
                model: VERTEX_TEXT_MODEL,
                contents: [{ role: 'user', parts }],
                config
            });
        }

        const rawText = response?.text || response?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '{}';
        const cleanJsonText = rawText.replace(/```json|```/g, '').trim();
        const evaluation = JSON.parse(cleanJsonText);

        const evaluationRecord = {
            copyText,
            imageUrl: storedImageUrl,
            track,
            clinicalLine,
            ragDatastoreUsed: process.env.VERTEX_RAG_DATASTORE_ID || 'firestore-rag-catalog',
            evaluation,
            createdAt: new Date().toISOString()
        };

        let evalId = `eval_${Date.now()}`;
        try {
            const docRef = await withTimeout(
                firestore.collection('chopo_evaluations').add(evaluationRecord),
                2500,
                'save evaluation'
            );
            evalId = docRef.id;
        } catch (fsErr) {
            console.warn('Evaluation returned (Firestore save warning):', fsErr.message);
        }

        res.json({
            id: evalId,
            ...evaluationRecord
        });
    } catch (error) {
        console.error("Error in /api/evaluator/single-check:", error);
        res.status(500).json({ error: error.message || "Failed to execute single-check evaluation" });
    }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
});

process.on('SIGINT', () => {
    console.log('Server shutting down');
    process.exit(0);
});
