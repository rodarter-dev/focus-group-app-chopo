/**
 * Executive Report Exporter for Chopo Intelligence Hub.
 * Generates print-ready (Letter PDF) and standalone HTML executive reports
 * aligned with Laboratorio Medico del Chopo Brand Manual V4.
 */

export type FocusGroupTestMode =
  | 'campaign'
  | 'ab_test'
  | 'messages'
  | 'acquisition'
  | 'email'
  | 'product';

export interface BriefAudienceItem {
  name: string;
  sourceSegment?: string;
  ageRange?: string;
  painPoints?: string[];
  drivers?: string[];
  messagingAngle?: string;
}

export interface BriefKpiItem {
  title: string;
  description: string;
}

export interface BriefChannelItem {
  name: string;
  justification?: string;
}

export interface BriefPhaseItem {
  title: string;
  dates?: string;
  focus?: string;
  goal?: string;
}

export interface BriefClinicalContext {
  studyName?: string;
  category?: string;
  includedStudies?: string[];
  fastingRequirement?: string;
  visualRealismRules?: string;
  defaultPromoText?: string;
  cofeprisPermitB2C?: string;
  cofeprisPermitB2B?: string;
  responsableSanitario?: string;
}

export interface BriefCreativeAssetSnapshot {
  audienceLabel?: string;
  imageUrl?: string | null;
  headline?: string;
  subheadline?: string;
  bodyCopy?: string;
  ctaText?: string;
  legalFooter?: string;
  socialCaption?: string;
  socialHashtags?: string[];
  searchHeadline?: string;
  searchDescription?: string;
  searchUrl?: string;
  emailSubject?: string;
  emailPreheader?: string;
  emailBannerHeadline?: string;
  emailBannerSubheadline?: string;
  emailBody?: string;
  emailCtaText?: string;
  emailImageUrl?: string | null;
  emailLegalFooter?: string;
  youtubeTitle?: string;
  youtubeScript?: string;
  acquisitionOffers?: string[];
}

export interface BriefExecutiveReportPayload {
  title: string;
  generatedAt?: string | Date;
  studyName?: string;
  productName?: string;
  segmentKey?: string;
  segmentLabel?: string;
  funnelStage?: string;
  funnelLabel?: string;
  channelKey?: string;
  channelLabel?: string;
  channelSubformat?: string;
  slogan?: string;
  campaignGoal?: string;
  objectiveGoal?: string;
  targetKpi?: string;
  valuePropMain?: string;
  competitiveEdge?: string;
  marketContext?: string;
  primaryHook?: string;
  supportingMessages?: Array<{ title: string; content: string }>;
  channelAdaptedCopy?: string;
  complianceChecklist?: string[];
  assumptions?: {
    budget?: string;
    timeline?: string;
    primarySalesFocus?: string;
    mitigationStrategy?: string;
  };
  audiences?: BriefAudienceItem[];
  kpis?: BriefKpiItem[];
  channels?: BriefChannelItem[];
  phases?: BriefPhaseItem[];
  clinicalContext?: BriefClinicalContext;
  creativeAssets?: BriefCreativeAssetSnapshot[];
}

export interface FocusGroupRubricSummaryItem {
  name: string;
  weight?: number;
  score: number;
  rationale?: string;
}

export interface FocusGroupVariantItem {
  label: string;
  imageUrl?: string | null;
  headline?: string;
  copy?: string;
  score?: number;
  scoreScale?: number;
  votes?: number;
  isWinner?: boolean;
  summary?: string;
}

export interface FocusGroupParticipantOpinion {
  name: string;
  segmentLabel?: string;
  profileDetail?: string;
  sentiment?: string;
  score?: number | null;
  scoreMax?: number;
  selectedOption?: string;
  opinion: string;
  barriers?: string;
  suggestedImprovement?: string;
}

export interface FocusGroupExtraMetric {
  label: string;
  value: string;
  sublabel?: string;
}

export interface FocusGroupExecutiveReportPayload {
  title: string;
  testMode: FocusGroupTestMode;
  testModeLabel?: string;
  generatedAt?: string | Date;
  studyName?: string;
  segmentKey?: string;
  segmentLabel?: string;
  channelKey?: string;
  channelLabel?: string;
  evaluatedCount: number;
  averageScore?: number | null;
  averageScoreLabel?: string;
  averageScoreSuffix?: string;
  sentimentBreakdown?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  extraMetrics?: FocusGroupExtraMetric[];
  evaluatedMaterial?: {
    headline?: string;
    subheadline?: string;
    copy?: string;
    imageUrl?: string | null;
    ctaText?: string;
    itemsListTitle?: string;
    itemsList?: Array<{ title: string; detail?: string; badge?: string }>;
  };
  abVariants?: FocusGroupVariantItem[];
  rubricBreakdown?: FocusGroupRubricSummaryItem[];
  strategicSummary?: {
    keyFindings?: string[];
    strengths?: string[];
    improvements?: string[];
    agencyAdjustments?: string[];
  };
  opinions: FocusGroupParticipantOpinion[];
}

const BRAND_OFFICIAL_NAME = 'Laboratorio Médico del Chopo';
const BRAND_SLOGAN = 'Chopo, toda una vida cuidando la vida.';
const BRAND_LOGO_DESCRIPTOR = 'Análisis clínicos y estudios especializados';
const BRAND_CONTACT_BAR = 'App Chopo | chopo.com.mx | WhatsApp 55 6481 1373 | Tel. 800 00 24676';

const TEST_MODE_LABELS: Record<FocusGroupTestMode, string> = {
  campaign: 'Evaluación de Campaña',
  ab_test: 'Prueba A/B',
  messages: 'Mensajes Clave',
  acquisition: 'Oferta de Captación',
  email: 'Correo Electrónico',
  product: 'Estudio / Producto'
};

/**
 * Escapes HTML special characters to prevent XSS injection.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates and sanitizes an image source URL.
 * Allows only safe relative media/images paths, raster data:image URIs,
 * blob URLs, and http/https URLs.
 */
export function sanitizeImageSrc(url?: string | null): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  const trimmed = url.trim();
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return '';
  }

  // Block protocol-relative URLs and parent traversal on relative paths
  if (trimmed.startsWith('/api/media/') || trimmed.startsWith('/images/')) {
    if (trimmed.startsWith('//') || trimmed.includes('..') || /["'<>]/.test(trimmed)) {
      return '';
    }
    return trimmed;
  }

  // Allow safe raster data:image URIs (explicitly excludes svg+xml and text/html)
  if (/^data:image\/(png|jpe?g|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon);/i.test(trimmed)) {
    if (/["'<>]/.test(trimmed)) {
      return '';
    }
    return trimmed;
  }

  // Allow blob URLs
  if (/^blob:(https?:\/\/)?[^\s"'<>]+$/i.test(trimmed)) {
    return trimmed;
  }

  // Allow standard http/https URLs
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch {
      return '';
    }
  }

  return '';
}

/**
 * Builds a clean ASCII filename with slugified title and YYYY-MM-DD date.
 */
export function buildSafeReportFilename(
  prefix: string,
  title?: string,
  ext: string = 'html',
  referenceDate: Date = new Date()
): string {
  const slugify = (input: string, maxLen: number): string =>
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, maxLen)
      .replace(/_+$/g, '');

  const cleanPrefix = slugify(prefix || 'reporte_chopo', 40) || 'reporte_chopo';
  const cleanTitle = title ? slugify(title, 48) : '';
  const cleanExt = slugify(ext || 'html', 10) || 'html';

  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  const dateStamp = `${year}-${month}-${day}`;

  const parts = cleanTitle ? [cleanPrefix, cleanTitle, dateStamp] : [cleanPrefix, dateStamp];
  return `${parts.join('_')}.${cleanExt}`;
}

function formatMexicanDate(input?: string | Date): string {
  const fallbackDate = new Date();
  let parsed = fallbackDate;
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    parsed = input;
  } else if (typeof input === 'string' && input.trim()) {
    const candidate = new Date(input);
    if (!Number.isNaN(candidate.getTime())) {
      parsed = candidate;
    } else {
      return input.trim();
    }
  }
  try {
    return parsed.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return parsed.toISOString().slice(0, 10);
  }
}

function normalizeSegmentLabel(segmentKey?: string, explicitLabel?: string): string {
  if (explicitLabel && explicitLabel.trim()) {
    const clean = explicitLabel.trim();
    if (/^b2c/i.test(clean) || /paciente/i.test(clean)) {
      if (!/médico|empresa|multisegmento/i.test(clean)) return 'Paciente B2C';
    }
    if (/^b2d/i.test(clean) || /médico/i.test(clean)) {
      if (!/paciente|empresa|multisegmento/i.test(clean)) return 'Médico B2D';
    }
    if (/^b2b/i.test(clean) || /empresa/i.test(clean)) {
      if (!/paciente|médico|multisegmento/i.test(clean)) return 'Empresa B2B';
    }
    return clean;
  }
  const key = String(segmentKey || '').toLowerCase();
  if (key.includes('b2d') || key.includes('doctor') || key.includes('physician')) {
    return 'Médico B2D';
  }
  if (key.includes('b2b') || key.includes('enterprise')) {
    return 'Empresa B2B';
  }
  return 'Paciente B2C';
}

function normalizeFunnelLabel(funnelStage?: string, explicitLabel?: string): string {
  if (explicitLabel && explicitLabel.trim()) {
    return explicitLabel.trim();
  }
  const key = String(funnelStage || '').toLowerCase();
  if (key === 'awareness') return 'Awareness';
  if (key === 'consideration') return 'Consideration';
  if (key === 'performance') return 'Performance';
  return funnelStage ? funnelStage : 'Performance';
}

function normalizeChannelLabel(channelKey?: string, explicitLabel?: string): string {
  if (explicitLabel && explicitLabel.trim()) {
    return explicitLabel.trim();
  }
  const key = String(channelKey || '').toLowerCase();
  if (key === 'social_media') return 'Redes Sociales';
  if (key === 'mailing_ecommerce') return 'Mailing / E-commerce';
  if (key === 'web') return 'Sitio Web';
  if (key === 'pdv_sucursal') return 'PDV Sucursal';
  return channelKey ? channelKey : 'Redes Sociales';
}

function normalizeSentiment(raw?: string): 'Positivo' | 'Neutral' | 'Negativo' {
  const s = String(raw || '').toLowerCase();
  if (s.includes('pos')) return 'Positivo';
  if (s.includes('neg')) return 'Negativo';
  return 'Neutral';
}

function getScoreTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

function renderMultilineHtml(text?: string): string {
  if (!text) return '';
  return escapeHtml(text).replace(/\r?\n/g, '<br />');
}

function buildBrandLogoSvg(): string {
  return `<svg class="brand-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 52" fill="none" aria-label="${escapeHtml(BRAND_OFFICIAL_NAME)}">
    <text x="4" y="34" font-family="Roboto, Arial, sans-serif" font-size="34" font-weight="900" letter-spacing="1.4" fill="#FFFFFF">CHOPO</text>
    <text x="150" y="15" font-family="Roboto, Arial, sans-serif" font-size="9" font-weight="700" fill="#BDD4F2">&#174;</text>
    <path d="M2 23 H64 C69 23, 72 33, 77 33 C82 33, 86 11, 92 11 C98 11, 101 23, 108 23 H162" stroke="#63CF00" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
}

function buildBaseStyles(): string {
  return `
    @page {
      size: letter;
      margin: 14mm;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Roboto', Arial, sans-serif;
      color: #0F172A;
      background-color: #EEF3F9;
      line-height: 1.5;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .no-print {
      position: sticky;
      top: 0;
      z-index: 50;
      background: #FFFFFF;
      border-bottom: 2px solid #BDD4F2;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      box-shadow: 0 2px 10px rgba(0, 70, 153, 0.08);
    }

    .toolbar-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toolbar-title {
      font-size: 13px;
      font-weight: 700;
      color: #004699;
    }

    .toolbar-hint {
      font-size: 11px;
      color: #475569;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .toolbar-btn-primary {
      appearance: none;
      border: none;
      border-radius: 999px;
      background: #005FFC;
      color: #FFFFFF;
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 12px;
      font-weight: 700;
      padding: 9px 18px;
      cursor: pointer;
    }

    .toolbar-btn-primary:hover {
      background: #004699;
    }

    .report-shell {
      max-width: 900px;
      margin: 24px auto 40px;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #D7E4F5;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }

    .basal-bar {
      height: 6px;
      background: #63CF00;
      width: 100%;
    }

    .report-header {
      background: linear-gradient(135deg, #004699 0%, #005FFC 100%);
      color: #FFFFFF;
      padding: 24px 28px 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
    }

    .brand-lockup {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .brand-svg {
      width: 158px;
      height: 39px;
      display: block;
    }

    .brand-official-name {
      font-size: 13px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: 0.2px;
    }

    .brand-descriptor {
      font-size: 11px;
      font-weight: 400;
      color: #BDD4F2;
    }

    .header-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      text-align: right;
    }

    .report-badge {
      display: inline-block;
      background: #BDD4F2;
      color: #004699;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 999px;
      letter-spacing: 0.3px;
    }

    .mode-badge {
      display: inline-block;
      background: #F24360;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
    }

    .header-date {
      font-size: 11px;
      color: #E2EEFF;
      font-weight: 400;
    }

    .title-band {
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
      padding: 18px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .report-title {
      margin: 0;
      font-size: 20px;
      font-weight: 900;
      color: #004699;
      line-height: 1.25;
    }

    .report-subtitle {
      margin: 4px 0 0;
      font-size: 12px;
      color: #475569;
    }

    .slogan-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #BDD4F2;
      color: #004699;
      padding: 7px 14px;
      border-radius: 0 0 14px 0;
      font-size: 11px;
      font-weight: 700;
    }

    .slogan-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #63CF00;
      display: inline-block;
      flex-shrink: 0;
    }

    .report-body {
      padding: 24px 28px 28px;
    }

    .section-block {
      margin-bottom: 24px;
    }

    .section-block:last-child {
      margin-bottom: 0;
    }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E2E8F0;
      font-size: 14px;
      font-weight: 900;
      color: #004699;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .section-accent {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      background: #63CF00;
      display: inline-block;
      flex-shrink: 0;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .meta-card {
      background: #F8FAFC;
      border: 1px solid #DCE7F5;
      border-top: 3px solid #005FFC;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 4px;
    }

    .meta-value {
      font-size: 13px;
      font-weight: 700;
      color: #004699;
      line-height: 1.3;
    }

    .meta-sub {
      font-size: 11px;
      color: #475569;
      margin-top: 3px;
    }

    .two-col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .three-col {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 14px 16px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .card-surface {
      background: #F8FAFC;
      border: 1px solid #DCE7F5;
      border-radius: 10px;
      padding: 14px 16px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .card-modular {
      background: #EFF6FF;
      border: 1px solid #BDD4F2;
      border-left: 4px solid #005FFC;
      border-radius: 0 10px 14px 0;
      padding: 14px 16px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .card-title {
      margin: 0 0 6px;
      font-size: 12px;
      font-weight: 700;
      color: #004699;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .card-text {
      margin: 0;
      font-size: 12.5px;
      color: #0F172A;
      line-height: 1.5;
    }

    .muted-text {
      color: #475569;
      font-size: 11.5px;
    }

    .clean-list {
      margin: 0;
      padding-left: 18px;
      font-size: 12.5px;
      color: #0F172A;
    }

    .clean-list li {
      margin-bottom: 5px;
      line-height: 1.45;
    }

    .clean-list li:last-child {
      margin-bottom: 0;
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .pill {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 700;
      background: #EFF6FF;
      color: #004699;
      border: 1px solid #BDD4F2;
    }

    .pill-green {
      background: #ECFDF5;
      color: #166534;
      border-color: #BBF7D0;
    }

    .pill-amber {
      background: #FFFBEB;
      color: #92400E;
      border-color: #FDE68A;
    }

    .pill-red {
      background: #FEF2F2;
      color: #991B1B;
      border-color: #FECACA;
    }

    .pill-pink {
      background: #F24360;
      color: #FFFFFF;
      border-color: #F24360;
    }

    .clinical-box {
      background: #F8FAFC;
      border: 1px solid #BDD4F2;
      border-left: 4px solid #63CF00;
      border-radius: 10px;
      padding: 16px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .cofepris-bar {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      font-size: 11px;
      color: #475569;
    }

    .cofepris-bar strong {
      color: #004699;
    }

    .value-banner {
      background: #004699;
      color: #FFFFFF;
      padding: 16px 18px;
      border-radius: 0 12px 16px 0;
      border-left: 5px solid #63CF00;
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .value-banner-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #BDD4F2;
      margin-bottom: 4px;
    }

    .value-banner-text {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.35;
      margin: 0;
    }

    .asset-card {
      border: 1px solid #D7E4F5;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 16px;
      background: #FFFFFF;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .asset-card-header {
      background: #004699;
      color: #FFFFFF;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      border-bottom: 3px solid #63CF00;
    }

    .asset-card-header-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .asset-card-body {
      padding: 16px;
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .asset-card-body.no-image {
      grid-template-columns: minmax(0, 1fr);
    }

    .asset-image {
      width: 100%;
      max-height: 240px;
      object-fit: cover;
      border-radius: 0 0 14px 0;
      border: 1px solid #DCE7F5;
      display: block;
      background: #F8FAFC;
    }

    .asset-copy-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .asset-headline {
      margin: 0;
      font-size: 16px;
      font-weight: 900;
      color: #004699;
      line-height: 1.25;
    }

    .asset-subheadline {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      color: #005FFC;
    }

    .asset-cta {
      display: inline-block;
      background: #005FFC;
      color: #FFFFFF;
      font-size: 11.5px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      width: fit-content;
    }

    .asset-legal {
      font-size: 10.5px;
      color: #475569;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      margin: 0;
    }

    .channel-pieces-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
      padding: 0 16px 16px;
    }

    .channel-piece {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .channel-piece-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #005FFC;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
    }

    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .kpi-card {
      background: #F8FAFC;
      border: 1px solid #DCE7F5;
      border-top: 4px solid #005FFC;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .kpi-card.accent-green {
      border-top-color: #63CF00;
    }

    .kpi-card.accent-navy {
      border-top-color: #004699;
    }

    .kpi-card.accent-pink {
      border-top-color: #F24360;
    }

    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
    }

    .kpi-value {
      font-size: 22px;
      font-weight: 900;
      color: #004699;
      line-height: 1.15;
    }

    .kpi-value-sm {
      font-size: 14px;
      font-weight: 700;
      color: #004699;
      line-height: 1.3;
    }

    .kpi-sub {
      font-size: 10.5px;
      color: #475569;
      margin-top: 4px;
    }

    .sentiment-bar {
      display: flex;
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: #E2E8F0;
      margin: 8px 0 6px;
    }

    .sentiment-pos {
      background: #16A34A;
    }

    .sentiment-neu {
      background: #D97706;
    }

    .sentiment-neg {
      background: #DC2626;
    }

    .sentiment-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 10.5px;
      color: #475569;
    }

    .rubric-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .rubric-table th {
      background: #004699;
      color: #FFFFFF;
      text-align: left;
      padding: 9px 10px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .rubric-table td {
      padding: 10px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
    }

    .rubric-table tr:nth-child(even) td {
      background: #F8FAFC;
    }

    .progress-track {
      width: 100%;
      min-width: 90px;
      height: 8px;
      border-radius: 999px;
      background: #E2E8F0;
      overflow: hidden;
      margin-top: 4px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 999px;
    }

    .progress-fill.tier-high {
      background: #16A34A;
    }

    .progress-fill.tier-mid {
      background: #D97706;
    }

    .progress-fill.tier-low {
      background: #DC2626;
    }

    .score-text-high {
      color: #166534;
      font-weight: 900;
    }

    .score-text-mid {
      color: #B45309;
      font-weight: 900;
    }

    .score-text-low {
      color: #B91C1C;
      font-weight: 900;
    }

    .variants-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .variant-card {
      border: 1px solid #DCE7F5;
      border-radius: 12px;
      overflow: hidden;
      background: #FFFFFF;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .variant-card.is-winner {
      border: 2px solid #63CF00;
      box-shadow: 0 4px 14px rgba(99, 207, 0, 0.14);
    }

    .variant-header {
      background: #F8FAFC;
      padding: 10px 14px;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .variant-card.is-winner .variant-header {
      background: #EFF6FF;
    }

    .variant-name {
      font-size: 13px;
      font-weight: 700;
      color: #004699;
    }

    .winner-badge {
      display: inline-block;
      background: #63CF00;
      color: #0F172A;
      font-size: 10px;
      font-weight: 900;
      padding: 3px 9px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .variant-body {
      padding: 12px 14px;
    }

    .variant-img {
      width: 100%;
      height: 170px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
      margin-bottom: 10px;
      display: block;
    }

    .opinion-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .opinion-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #005FFC;
      border-radius: 10px;
      padding: 12px 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .opinion-card.sent-pos {
      border-left-color: #16A34A;
    }

    .opinion-card.sent-neu {
      border-left-color: #D97706;
    }

    .opinion-card.sent-neg {
      border-left-color: #DC2626;
    }

    .opinion-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 6px;
    }

    .opinion-name {
      font-size: 12.5px;
      font-weight: 700;
      color: #004699;
    }

    .opinion-profile {
      font-size: 10.5px;
      color: #475569;
      margin-top: 2px;
    }

    .opinion-quote {
      margin: 6px 0 0;
      font-size: 12px;
      color: #0F172A;
      font-style: italic;
      line-height: 1.48;
    }

    .opinion-meta {
      margin-top: 8px;
      padding-top: 7px;
      border-top: 1px solid #E2E8F0;
      font-size: 11px;
      color: #475569;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .report-footer {
      background: #F8FAFC;
      border-top: 3px solid #63CF00;
      padding: 18px 28px 22px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .footer-contact {
      font-size: 12px;
      font-weight: 700;
      color: #004699;
      margin-bottom: 4px;
    }

    .footer-brand {
      font-size: 11px;
      font-weight: 500;
      color: #005FFC;
      margin-bottom: 8px;
    }

    .footer-disclaimer {
      margin: 0;
      font-size: 10.5px;
      color: #475569;
      line-height: 1.45;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .data-table th {
      background: #EFF6FF;
      color: #004699;
      text-align: left;
      padding: 8px 10px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      border-bottom: 2px solid #BDD4F2;
    }

    .data-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
    }

    @media (max-width: 720px) {
      .meta-grid,
      .kpi-strip,
      .two-col,
      .three-col,
      .variants-grid,
      .opinion-grid,
      .channel-pieces-grid,
      .asset-card-body {
        grid-template-columns: minmax(0, 1fr);
      }
      .header-meta {
        align-items: flex-start;
        text-align: left;
      }
    }

    @media print {
      .no-print {
        display: none;
      }

      html, body {
        background: #FFFFFF;
        font-size: 11.5px;
      }

      .report-shell {
        max-width: none;
        margin: 0;
        border: none;
        border-radius: 0;
        box-shadow: none;
      }

      .report-header {
        padding: 18px 20px;
      }

      .title-band {
        padding: 14px 20px;
      }

      .report-body {
        padding: 18px 20px;
      }

      .report-footer {
        padding: 14px 20px;
      }

      h2, h3 {
        break-after: avoid;
        page-break-after: avoid;
      }

      tr, .card, .card-surface, .card-modular, .clinical-box, .asset-card, .variant-card, .opinion-card, .kpi-strip, .value-banner {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;
}

function wrapStandaloneDocument(options: {
  pageTitle: string;
  reportBadge: string;
  modeBadge?: string;
  generatedDateText: string;
  reportTitle: string;
  reportSubtitle?: string;
  slogan: string;
  bodyHtml: string;
  footerDisclaimer: string;
}): string {
  const {
    pageTitle,
    reportBadge,
    modeBadge,
    generatedDateText,
    reportTitle,
    reportSubtitle,
    slogan,
    bodyHtml,
    footerDisclaimer
  } = options;

  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)} | ${escapeHtml(BRAND_OFFICIAL_NAME)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
  <style>${buildBaseStyles()}</style>
</head>
<body>
  <div class="no-print">
    <div class="toolbar-info">
      <span class="toolbar-title">Vista Ejecutiva Lista para Impresión · ${escapeHtml(BRAND_OFFICIAL_NAME)}</span>
      <span class="toolbar-hint">Selecciona Guardar como PDF en el destino de impresión para conservar colores y diseño institucional.</span>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="toolbar-btn-primary" onclick="window.print()">Guardar como PDF / Imprimir</button>
    </div>
  </div>

  <main class="report-shell">
    <div class="basal-bar"></div>
    <header class="report-header">
      <div class="brand-lockup">
        ${buildBrandLogoSvg()}
        <span class="brand-official-name">${escapeHtml(BRAND_OFFICIAL_NAME)}</span>
        <span class="brand-descriptor">${escapeHtml(BRAND_LOGO_DESCRIPTOR)}</span>
      </div>
      <div class="header-meta">
        <span class="report-badge">${escapeHtml(reportBadge)}</span>
        ${modeBadge ? `<span class="mode-badge">${escapeHtml(modeBadge)}</span>` : ''}
        <span class="header-date">Generado el ${escapeHtml(generatedDateText)}</span>
      </div>
    </header>

    <div class="title-band">
      <div>
        <h1 class="report-title">${escapeHtml(reportTitle)}</h1>
        ${reportSubtitle ? `<p class="report-subtitle">${escapeHtml(reportSubtitle)}</p>` : ''}
      </div>
      <div class="slogan-chip">
        <span class="slogan-dot"></span>
        <span>${escapeHtml(slogan)}</span>
      </div>
    </div>

    <div class="report-body">
      ${bodyHtml}
    </div>

    <footer class="report-footer">
      <div class="footer-contact">${escapeHtml(BRAND_CONTACT_BAR)}</div>
      <div class="footer-brand">${escapeHtml(BRAND_OFFICIAL_NAME)} · ${escapeHtml(BRAND_LOGO_DESCRIPTOR)} · ${escapeHtml(slogan)}</div>
      <p class="footer-disclaimer">${escapeHtml(footerDisclaimer)}</p>
    </footer>
  </main>
</body>
</html>`;
}

/**
 * Generates an executive, print-ready standalone HTML report for Marketing Pre-Campaign Briefs.
 */
export function buildBriefExecutiveReportHtml(payload: BriefExecutiveReportPayload): string {
  const generatedDateText = formatMexicanDate(payload.generatedAt);
  const studyTitle = payload.studyName || payload.productName || payload.title || 'Campaña Clínica Chopo';
  const segmentLabel = normalizeSegmentLabel(payload.segmentKey, payload.segmentLabel);
  const funnelLabel = normalizeFunnelLabel(payload.funnelStage, payload.funnelLabel);
  const channelLabel = normalizeChannelLabel(payload.channelKey, payload.channelLabel);
  const subformatLabel = payload.channelSubformat || 'Formato Estándar';
  const slogan = payload.slogan?.trim() || BRAND_SLOGAN;

  const sections: string[] = [];

  // 1. Metadata Cards
  sections.push(`
    <section class="section-block">
      <h2 class="section-heading"><span class="section-accent"></span>Resumen de Configuración de Campaña</h2>
      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">Estudio / Campaña</div>
          <div class="meta-value">${escapeHtml(studyTitle)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Segmento Objetivo</div>
          <div class="meta-value">${escapeHtml(segmentLabel)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Etapa del Funnel</div>
          <div class="meta-value">${escapeHtml(funnelLabel)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Canal y Subformato</div>
          <div class="meta-value">${escapeHtml(channelLabel)}</div>
          <div class="meta-sub">${escapeHtml(subformatLabel)}</div>
        </div>
      </div>
    </section>
  `);

  // 2. Clinical & Regulatory Context (when available)
  const clinical = payload.clinicalContext;
  if (
    clinical &&
    (
      (clinical.includedStudies && clinical.includedStudies.length > 0) ||
      clinical.fastingRequirement ||
      clinical.cofeprisPermitB2C ||
      clinical.cofeprisPermitB2B ||
      clinical.responsableSanitario
    )
  ) {
    const studiesListHtml =
      clinical.includedStudies && clinical.includedStudies.length > 0
        ? `<ul class="clean-list">${clinical.includedStudies.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
        : '<p class="card-text muted-text">Consultar ficha clínica del estudio.</p>';

    const permitsParts: string[] = [];
    if (clinical.cofeprisPermitB2C) {
      permitsParts.push(`<strong>Folio COFEPRIS Público General:</strong> ${escapeHtml(clinical.cofeprisPermitB2C)}`);
    }
    if (clinical.cofeprisPermitB2B) {
      permitsParts.push(`<strong>Folio COFEPRIS Profesionales:</strong> ${escapeHtml(clinical.cofeprisPermitB2B)}`);
    }
    if (clinical.responsableSanitario) {
      permitsParts.push(`<strong>Responsable Sanitario:</strong> ${escapeHtml(clinical.responsableSanitario)}`);
    }

    sections.push(`
      <section class="section-block">
        <h2 class="section-heading"><span class="section-accent"></span>Contexto Clínico y Base Normativa y Clínica</h2>
        <div class="clinical-box">
          <div class="two-col">
            <div>
              <h3 class="card-title">Estudios Incluidos</h3>
              ${studiesListHtml}
            </div>
            <div>
              <h3 class="card-title">Requisitos de Preparación y Ayuno</h3>
              <p class="card-text">${escapeHtml(clinical.fastingRequirement || 'Sin indicación especial registrada.')}</p>
              ${
                clinical.defaultPromoText
                  ? `<p class="muted-text" style="margin-top:8px;"><strong>Condición comercial vigente:</strong> ${escapeHtml(clinical.defaultPromoText)}</p>`
                  : ''
              }
              ${
                clinical.visualRealismRules
                  ? `<p class="muted-text" style="margin-top:6px;"><strong>Lineamientos de realismo clínico:</strong> ${escapeHtml(clinical.visualRealismRules)}</p>`
                  : ''
              }
            </div>
          </div>
          ${permitsParts.length > 0 ? `<div class="cofepris-bar">${permitsParts.join(' &nbsp;|&nbsp; ')}</div>` : ''}
        </div>
      </section>
    `);
  }

  // 3. Campaign Brief / Concepto Rector
  const conceptCards: string[] = [];
  if (payload.objectiveGoal || payload.campaignGoal) {
    conceptCards.push(`
      <div class="card-surface">
        <h3 class="card-title">Objetivo Estratégico</h3>
        <p class="card-text">${renderMultilineHtml(payload.objectiveGoal || payload.campaignGoal)}</p>
        ${
          payload.targetKpi
            ? `<p class="muted-text" style="margin-top:8px;"><strong>KPI Objetivo:</strong> ${escapeHtml(payload.targetKpi)}</p>`
            : ''
        }
      </div>
    `);
  }
  if (payload.primaryHook || payload.channelAdaptedCopy) {
    const supportingHtml =
      payload.supportingMessages && payload.supportingMessages.length > 0
        ? `<ul class="clean-list" style="margin-top:8px;">${payload.supportingMessages
            .map((m) => `<li><strong>${escapeHtml(m.title)}:</strong> ${escapeHtml(m.content)}</li>`)
            .join('')}</ul>`
        : '';
    conceptCards.push(`
      <div class="card-modular">
        <h3 class="card-title">Mensaje Clave y Gancho Principal</h3>
        ${payload.primaryHook ? `<p class="card-text" style="font-weight:700;color:#004699;">"${escapeHtml(payload.primaryHook)}"</p>` : ''}
        ${supportingHtml}
      </div>
    `);
  }

  const valuePropBlock = payload.valuePropMain
    ? `
      <div class="value-banner">
        <div class="value-banner-label">Propuesta de Valor Central</div>
        <p class="value-banner-text">${escapeHtml(payload.valuePropMain)}</p>
      </div>
      ${
        payload.competitiveEdge || payload.marketContext
          ? `<div class="two-col" style="margin-bottom:12px;">
              ${
                payload.competitiveEdge
                  ? `<div class="card"><h3 class="card-title">Ventaja Competitiva</h3><p class="card-text">${escapeHtml(payload.competitiveEdge)}</p></div>`
                  : ''
              }
              ${
                payload.marketContext
                  ? `<div class="card"><h3 class="card-title">Contexto de Mercado</h3><p class="card-text">${escapeHtml(payload.marketContext)}</p></div>`
                  : ''
              }
            </div>`
          : ''
      }
    `
    : '';

  const restrictionsParts: string[] = [];
  if (payload.assumptions?.mitigationStrategy) {
    restrictionsParts.push(payload.assumptions.mitigationStrategy);
  }
  if (payload.complianceChecklist && payload.complianceChecklist.length > 0) {
    restrictionsParts.push(...payload.complianceChecklist);
  }

  const assumptionsHtml =
    payload.assumptions &&
    (payload.assumptions.budget ||
      payload.assumptions.timeline ||
      payload.assumptions.primarySalesFocus ||
      restrictionsParts.length > 0)
      ? `
        <div class="two-col" style="margin-top:12px;">
          <div class="card">
            <h3 class="card-title">Alcance Operativo y Comercial</h3>
            <ul class="clean-list">
              ${payload.assumptions.budget ? `<li><strong>Presupuesto:</strong> ${escapeHtml(payload.assumptions.budget)}</li>` : ''}
              ${payload.assumptions.timeline ? `<li><strong>Cronograma:</strong> ${escapeHtml(payload.assumptions.timeline)}</li>` : ''}
              ${payload.assumptions.primarySalesFocus ? `<li><strong>Foco de Conversión:</strong> ${escapeHtml(payload.assumptions.primarySalesFocus)}</li>` : ''}
            </ul>
          </div>
          <div class="card">
            <h3 class="card-title">Restricciones de Marca y Regulatorias</h3>
            ${
              restrictionsParts.length > 0
                ? `<ul class="clean-list">${restrictionsParts.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
                : '<p class="card-text muted-text">Alineado a los Lineamientos de Marca V4 y normativa sanitaria vigente.</p>'
            }
          </div>
        </div>
      `
      : '';

  if (conceptCards.length > 0 || valuePropBlock || assumptionsHtml) {
    sections.push(`
      <section class="section-block">
        <h2 class="section-heading"><span class="section-accent"></span>Brief Creativo y Concepto Rector</h2>
        ${valuePropBlock}
        ${conceptCards.length > 0 ? `<div class="two-col">${conceptCards.join('')}</div>` : ''}
        ${
          payload.channelAdaptedCopy
            ? `<div class="card-modular" style="margin-top:12px;">
                <h3 class="card-title">Pieza Adaptada al Canal Principal (${escapeHtml(channelLabel)} · ${escapeHtml(subformatLabel)})</h3>
                <p class="card-text">${renderMultilineHtml(payload.channelAdaptedCopy)}</p>
              </div>`
            : ''
        }
        ${assumptionsHtml}
      </section>
    `);
  }

  // 4. Target Audiences
  if (payload.audiences && payload.audiences.length > 0) {
    const audienceCards = payload.audiences
      .map((aud) => {
        const painItems = (aud.painPoints || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('');
        const driverItems = (aud.drivers || []).map((d) => `<li>${escapeHtml(d)}</li>`).join('');
        return `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
              <div>
                <div style="font-size:13.5px;font-weight:700;color:#004699;">${escapeHtml(aud.name)}</div>
                ${aud.sourceSegment ? `<div class="muted-text">${escapeHtml(aud.sourceSegment)}</div>` : ''}
              </div>
              ${aud.ageRange ? `<span class="pill">${escapeHtml(aud.ageRange)}</span>` : ''}
            </div>
            ${
              aud.messagingAngle
                ? `<p class="card-text" style="margin-bottom:8px;padding:8px 10px;background:#EFF6FF;border-radius:8px;color:#004699;font-style:italic;">"${escapeHtml(aud.messagingAngle)}"</p>`
                : ''
            }
            <div class="two-col">
              ${painItems ? `<div><div class="meta-label">Puntos de Dolor</div><ul class="clean-list">${painItems}</ul></div>` : ''}
              ${driverItems ? `<div><div class="meta-label">Motivadores</div><ul class="clean-list">${driverItems}</ul></div>` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    sections.push(`
      <section class="section-block">
        <h2 class="section-heading"><span class="section-accent"></span>Público Objetivo</h2>
        <div style="display:flex;flex-direction:column;gap:12px;">${audienceCards}</div>
      </section>
    `);
  }

  // 5. KPIs, Strategic Channels & Phases (when present)
  if (
    (payload.kpis && payload.kpis.length > 0) ||
    (payload.channels && payload.channels.length > 0) ||
    (payload.phases && payload.phases.length > 0)
  ) {
    const kpiHtml =
      payload.kpis && payload.kpis.length > 0
        ? `<div class="three-col" style="margin-bottom:12px;">${payload.kpis
            .map(
              (k) => `
              <div class="card-surface">
                <div style="font-size:12.5px;font-weight:700;color:#004699;margin-bottom:4px;">${escapeHtml(k.title)}</div>
                <div class="muted-text">${escapeHtml(k.description)}</div>
              </div>
            `
            )
            .join('')}</div>`
        : '';

    const phasesHtml =
      payload.phases && payload.phases.length > 0
        ? `<table class="data-table" style="margin-top:8px;">
            <thead>
              <tr>
                <th>Fase</th>
                <th>Periodo</th>
                <th>Enfoque Estratégico</th>
                <th>Meta Principal</th>
              </tr>
            </thead>
            <tbody>
              ${payload.phases
                .map(
                  (ph) => `
                  <tr>
                    <td><strong>${escapeHtml(ph.title)}</strong></td>
                    <td>${escapeHtml(ph.dates || '')}</td>
                    <td>${escapeHtml(ph.focus || '')}</td>
                    <td>${escapeHtml(ph.goal || '')}</td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>`
        : '';

    const channelsHtml =
      payload.channels && payload.channels.length > 0
        ? `<div class="two-col" style="margin-top:12px;">${payload.channels
            .map(
              (ch) => `
              <div class="card">
                <div style="font-size:12px;font-weight:700;color:#004699;margin-bottom:3px;">${escapeHtml(ch.name)}</div>
                <div class="muted-text">${escapeHtml(ch.justification || '')}</div>
              </div>
            `
            )
            .join('')}</div>`
        : '';

    sections.push(`
      <section class="section-block">
        <h2 class="section-heading"><span class="section-accent"></span>Indicadores, Canales y Plan de Ejecución</h2>
        ${kpiHtml}
        ${phasesHtml}
        ${channelsHtml}
      </section>
    `);
  }

  // 6. Creative Copy & Visual Assets
  if (payload.creativeAssets && payload.creativeAssets.length > 0) {
    const assetBlocks = payload.creativeAssets
      .map((asset, index) => {
        const safeMainImg = sanitizeImageSrc(asset.imageUrl);
        const safeEmailImg = sanitizeImageSrc(asset.emailImageUrl);
        const pieceLabel = asset.audienceLabel
          ? `Pieza Creativa ${index + 1} · ${asset.audienceLabel}`
          : `Pieza Creativa ${index + 1}`;
        const headline =
          asset.headline || asset.emailBannerHeadline || asset.searchHeadline || studyTitle;
        const subheadline = asset.subheadline || asset.emailBannerSubheadline || slogan;
        const bodyCopy = asset.bodyCopy || asset.socialCaption || asset.searchDescription || '';
        const ctaText = asset.ctaText || asset.emailCtaText || 'Agenda tu estudio en chopo.com.mx';
        const legalFooter =
          asset.legalFooter ||
          asset.emailLegalFooter ||
          (clinical?.cofeprisPermitB2C
            ? `Consulte a su médico. ${clinical.cofeprisPermitB2C}.`
            : 'Consulte a su médico.');

        const extraPieces: string[] = [];

        if (asset.socialCaption || (asset.socialHashtags && asset.socialHashtags.length > 0)) {
          extraPieces.push(`
            <div class="channel-piece">
              <div class="channel-piece-label">Redes Sociales</div>
              ${asset.socialCaption ? `<p class="card-text">${renderMultilineHtml(asset.socialCaption)}</p>` : ''}
              ${
                asset.socialHashtags && asset.socialHashtags.length > 0
                  ? `<div style="margin-top:6px;font-size:11px;color:#005FFC;font-weight:500;">${escapeHtml(asset.socialHashtags.join(' '))}</div>`
                  : ''
              }
            </div>
          `);
        }

        if (asset.searchHeadline || asset.searchDescription) {
          extraPieces.push(`
            <div class="channel-piece">
              <div class="channel-piece-label">Anuncio de Buscador</div>
              ${asset.searchUrl ? `<div class="muted-text">${escapeHtml(asset.searchUrl)}</div>` : ''}
              ${asset.searchHeadline ? `<div style="font-size:12.5px;font-weight:700;color:#005FFC;margin:2px 0;">${escapeHtml(asset.searchHeadline)}</div>` : ''}
              ${asset.searchDescription ? `<p class="card-text">${escapeHtml(asset.searchDescription)}</p>` : ''}
            </div>
          `);
        }

        if (asset.emailSubject || asset.emailBody) {
          extraPieces.push(`
            <div class="channel-piece">
              <div class="channel-piece-label">Correo Electrónico</div>
              ${asset.emailSubject ? `<div style="font-size:12px;font-weight:700;color:#004699;">Asunto: ${escapeHtml(asset.emailSubject)}</div>` : ''}
              ${asset.emailPreheader ? `<div class="muted-text" style="margin-bottom:4px;">Preheader: ${escapeHtml(asset.emailPreheader)}</div>` : ''}
              ${
                safeEmailImg && safeEmailImg !== safeMainImg
                  ? `<img src="${escapeHtml(safeEmailImg)}" alt="Banner de correo" style="width:100%;max-height:110px;object-fit:cover;border-radius:6px;margin:6px 0;" />`
                  : ''
              }
              ${asset.emailBody ? `<p class="card-text">${renderMultilineHtml(asset.emailBody)}</p>` : ''}
              ${asset.emailCtaText ? `<div style="margin-top:6px;"><span class="pill pill-pink">${escapeHtml(asset.emailCtaText)}</span></div>` : ''}
            </div>
          `);
        }

        if (asset.youtubeTitle || asset.youtubeScript) {
          extraPieces.push(`
            <div class="channel-piece">
              <div class="channel-piece-label">Video Corto / Guion</div>
              ${asset.youtubeTitle ? `<div style="font-size:12px;font-weight:700;color:#004699;margin-bottom:4px;">${escapeHtml(asset.youtubeTitle)}</div>` : ''}
              ${asset.youtubeScript ? `<p class="card-text">${renderMultilineHtml(asset.youtubeScript)}</p>` : ''}
            </div>
          `);
        }

        if (asset.acquisitionOffers && asset.acquisitionOffers.length > 0) {
          extraPieces.push(`
            <div class="channel-piece">
              <div class="channel-piece-label">Ofertas de Captación</div>
              <ul class="clean-list">${asset.acquisitionOffers.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>
            </div>
          `);
        }

        return `
          <div class="asset-card">
            <div class="asset-card-header">
              <span class="asset-card-header-title">${escapeHtml(pieceLabel)}</span>
              <span class="pill pill-pink">${escapeHtml(channelLabel)}</span>
            </div>
            <div class="asset-card-body ${safeMainImg ? '' : 'no-image'}">
              ${
                safeMainImg
                  ? `<div><img class="asset-image" src="${escapeHtml(safeMainImg)}" alt="${escapeHtml(headline)}" /></div>`
                  : ''
              }
              <div class="asset-copy-stack">
                <div>
                  <div class="meta-label">Titular</div>
                  <h3 class="asset-headline">${escapeHtml(headline)}</h3>
                </div>
                <div>
                  <div class="meta-label">Subtítulo</div>
                  <p class="asset-subheadline">${escapeHtml(subheadline)}</p>
                </div>
                ${
                  bodyCopy
                    ? `<div>
                        <div class="meta-label">Cuerpo del Mensaje</div>
                        <p class="card-text">${renderMultilineHtml(bodyCopy)}</p>
                      </div>`
                    : ''
                }
                <div>
                  <div class="meta-label">Llamado a la Acción (CTA)</div>
                  <span class="asset-cta">${escapeHtml(ctaText)}</span>
                </div>
                <p class="asset-legal"><strong>Legales y pie de contacto:</strong> ${escapeHtml(legalFooter)}</p>
              </div>
            </div>
            ${extraPieces.length > 0 ? `<div class="channel-pieces-grid">${extraPieces.join('')}</div>` : ''}
          </div>
        `;
      })
      .join('');

    sections.push(`
      <section class="section-block">
        <h2 class="section-heading"><span class="section-accent"></span>Propuestas Creativas y Materiales de Campaña</h2>
        ${assetBlocks}
      </section>
    `);
  }

  return wrapStandaloneDocument({
    pageTitle: `Brief Creativo — ${payload.title || studyTitle}`,
    reportBadge: 'Reporte Ejecutivo de Precampaña y Brief Creativo',
    generatedDateText,
    reportTitle: payload.title || studyTitle,
    reportSubtitle: payload.studyName && payload.studyName !== payload.title ? `Estudio clínico vinculado: ${payload.studyName}` : undefined,
    slogan,
    bodyHtml: sections.join('\n'),
    footerDisclaimer:
      'Este documento constituye un borrador estratégico de precampaña y Brief Creativo elaborado en Chopo Intelligence Hub con base en los Lineamientos de Marca V4 y la Base Normativa y Clínica. Requiere validación final de Marca, Área Médica y Legal antes de su publicación.'
  });
}

/**
 * Generates an executive, print-ready standalone HTML report for Synthetic Focus Group sessions.
 */
export function buildFocusGroupExecutiveReportHtml(
  payload: FocusGroupExecutiveReportPayload
): string {
  const generatedDateText = formatMexicanDate(payload.generatedAt);
  const modeLabel = payload.testModeLabel || TEST_MODE_LABELS[payload.testMode] || 'Evaluación de Campaña';
  const segmentLabel = normalizeSegmentLabel(payload.segmentKey, payload.segmentLabel);
  const channelLabel = normalizeChannelLabel(payload.channelKey, payload.channelLabel);

  // Derive sentiment breakdown if not explicitly provided
  const sentiment = payload.sentimentBreakdown || (() => {
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    for (const op of payload.opinions || []) {
      const norm = normalizeSentiment(op.sentiment);
      if (norm === 'Positivo') positive += 1;
      else if (norm === 'Negativo') negative += 1;
      else neutral += 1;
    }
    return { positive, neutral, negative };
  })();

  const totalSentiment = sentiment.positive + sentiment.neutral + sentiment.negative;
  const posPct = totalSentiment > 0 ? Math.round((sentiment.positive / totalSentiment) * 100) : 0;
  const neuPct = totalSentiment > 0 ? Math.round((sentiment.neutral / totalSentiment) * 100) : 0;
  const negPct = totalSentiment > 0 ? Math.max(0, 100 - posPct - neuPct) : 0;

  const avgScoreDisplay =
    typeof payload.averageScore === 'number' && Number.isFinite(payload.averageScore)
      ? `${payload.averageScore}${payload.averageScoreSuffix ?? ' / 100'}`
      : `${posPct}%`;
  const avgScoreLabel = payload.averageScoreLabel || 'Calificación Promedio';

  const sections: string[] = [];

  // 1. Executive KPI Strip
  const extraMetricsHtml =
    payload.extraMetrics && payload.extraMetrics.length > 0
      ? `<div class="meta-grid" style="margin-top:10px;">${payload.extraMetrics
          .slice(0, 4)
          .map(
            (m) => `
            <div class="meta-card">
              <div class="meta-label">${escapeHtml(m.label)}</div>
              <div class="meta-value">${escapeHtml(m.value)}</div>
              ${m.sublabel ? `<div class="meta-sub">${escapeHtml(m.sublabel)}</div>` : ''}
            </div>
          `
          )
          .join('')}</div>`
      : '';

  sections.push(`
    <section class="section-block">
      <h2 class="section-heading"><span class="section-accent"></span>Indicadores Ejecutivos del Focus Group Sintético</h2>
      <div class="kpi-strip">
        <div class="kpi-card accent-green">
          <div class="kpi-label">${escapeHtml(avgScoreLabel)}</div>
          <div class="kpi-value">${escapeHtml(avgScoreDisplay)}</div>
          <div class="kpi-sub">Evaluación consolidada</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Distribución de Sentimiento</div>
          <div class="sentiment-bar">
            <div class="sentiment-pos" style="width:${posPct}%;"></div>
            <div class="sentiment-neu" style="width:${neuPct}%;"></div>
            <div class="sentiment-neg" style="width:${negPct}%;"></div>
          </div>
          <div class="sentiment-legend">
            <span><strong>Positivo:</strong> ${sentiment.positive} (${posPct}%)</span>
            <span><strong>Neutral:</strong> ${sentiment.neutral} (${neuPct}%)</span>
            <span><strong>Negativo:</strong> ${sentiment.negative} (${negPct}%)</span>
          </div>
        </div>
        <div class="kpi-card accent-navy">
          <div class="kpi-label">Participantes Evaluados</div>
          <div class="kpi-value">${escapeHtml(payload.evaluatedCount)}</div>
          <div class="kpi-sub">Audiencia Simulada</div>
        </div>
        <div class="kpi-card accent-pink">
          <div class="kpi-label">Canal y Segmento</div>
          <div class="kpi-value-sm">${escapeHtml(channelLabel)}</div>
          <div class="kpi-sub">${escapeHtml(segmentLabel)}</div>
        </div>
      </div>
      ${extraMetricsHtml}
    </section>
  `);

  // 2. Evaluated Material Snapshot OR A/B Variants Comparison
  if (payload.abVariants && payload.abVariants.length > 0) {
    const variantCards = payload.abVariants
      .map((variant) => {
        const safeImg = sanitizeImageSrc(variant.imageUrl);
        const scale = variant.scoreScale || 10;
        const scoreLabel =
          typeof variant.score === 'number' && Number.isFinite(variant.score)
            ? `${variant.score} / ${scale}`
            : '';
        return `
          <div class="variant-card ${variant.isWinner ? 'is-winner' : ''}">
            <div class="variant-header">
              <span class="variant-name">${escapeHtml(variant.label)}</span>
              ${variant.isWinner ? '<span class="winner-badge">Variante Ganadora</span>' : ''}
            </div>
            <div class="variant-body">
              ${safeImg ? `<img class="variant-img" src="${escapeHtml(safeImg)}" alt="${escapeHtml(variant.label)}" />` : ''}
              <div class="pill-row" style="margin-top:0;margin-bottom:8px;">
                ${scoreLabel ? `<span class="pill ${variant.isWinner ? 'pill-green' : ''}">Puntaje promedio: ${escapeHtml(scoreLabel)}</span>` : ''}
                ${typeof variant.votes === 'number' ? `<span class="pill">Preferencia directa: ${escapeHtml(variant.votes)}</span>` : ''}
              </div>
              ${variant.headline ? `<div style="font-size:13px;font-weight:700;color:#004699;margin-bottom:4px;">${escapeHtml(variant.headline)}</div>` : ''}
              ${variant.copy ? `<p class="card-text">${renderMultilineHtml(variant.copy)}</p>` : ''}
              ${variant.summary ? `<p class="muted-text" style="margin-top:6px;">${escapeHtml(variant.summary)}</p>` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    sections.push(`
      <section class="section-block">
        <h2 class="section-heading"><span class="section-accent"></span>Comparativo de Variantes Evaluadas</h2>
        <div class="variants-grid">${variantCards}</div>
      </section>
    `);
  } else if (payload.evaluatedMaterial) {
    const mat = payload.evaluatedMaterial;
    const safeImg = sanitizeImageSrc(mat.imageUrl);
    const hasHero = Boolean(safeImg || mat.headline || mat.copy);
    const hasItems = Boolean(mat.itemsList && mat.itemsList.length > 0);

    if (hasHero || hasItems) {
      const heroHtml = hasHero
        ? `
          <div class="asset-card" style="margin-bottom:${hasItems ? '14px' : '0'};">
            <div class="asset-card-body ${safeImg ? '' : 'no-image'}">
              ${safeImg ? `<div><img class="asset-image" src="${escapeHtml(safeImg)}" alt="${escapeHtml(mat.headline || payload.title)}" /></div>` : ''}
              <div class="asset-copy-stack">
                ${mat.subheadline ? `<div class="meta-label">${escapeHtml(mat.subheadline)}</div>` : ''}
                ${mat.headline ? `<h3 class="asset-headline">${escapeHtml(mat.headline)}</h3>` : ''}
                ${mat.copy ? `<p class="card-text">${renderMultilineHtml(mat.copy)}</p>` : ''}
                ${mat.ctaText ? `<div><span class="asset-cta">${escapeHtml(mat.ctaText)}</span></div>` : ''}
              </div>
            </div>
          </div>
        `
        : '';

      const itemsHtml = hasItems
        ? `
          <div class="card-surface">
            <h3 class="card-title">${escapeHtml(mat.itemsListTitle || 'Materiales Evaluados')}</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Elemento Evaluado</th>
                  <th>Detalle</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                ${(mat.itemsList || [])
                  .map(
                    (item) => `
                    <tr>
                      <td><strong>${escapeHtml(item.title)}</strong></td>
                      <td>${escapeHtml(item.detail || '')}</td>
                      <td>${item.badge ? `<span class="pill">${escapeHtml(item.badge)}</span>` : ''}</td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        : '';

      sections.push(`
        <section class="section-block">
          <h2 class="section-heading"><span class="section-accent"></span>Material Evaluado</h2>
          ${heroHtml}
          ${itemsHtml}
        </section>
      `);
    }
  }

  // 3. Weighted Rubric Breakdown Table (when rubric scores exist)
  if (payload.rubricBreakdown && payload.rubricBreakdown.length > 0) {
    const rubricRows = payload.rubricBreakdown
      .map((item) => {
        const clampedScore = Math.max(0, Math.min(100, Math.round(Number(item.score) || 0)));
        const tier = getScoreTier(clampedScore);
        const weightDisplay =
          typeof item.weight === 'number' && Number.isFinite(item.weight) ? `${item.weight}%` : '—';
        return `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${escapeHtml(weightDisplay)}</td>
            <td>
              <span class="score-text-${tier}">${clampedScore} / 100</span>
              <div class="progress-track">
                <div class="progress-fill tier-${tier}" style="width:${clampedScore}%;"></div>
              </div>
            </td>
            <td>${escapeHtml(item.rationale || 'Evaluación ponderada de la audiencia simulada.')}</td>
          </tr>
        `;
      })
      .join('');

    sections.push(`
      <section class="section-block">
        <h2 class="section-heading"><span class="section-accent"></span>Desglose Ponderado por Criterio de Evaluación</h2>
        <table class="rubric-table">
          <thead>
            <tr>
              <th style="width:26%;">Criterio</th>
              <th style="width:10%;">Peso</th>
              <th style="width:22%;">Calificación</th>
              <th style="width:42%;">Observación Consolidada</th>
            </tr>
          </thead>
          <tbody>${rubricRows}</tbody>
        </table>
      </section>
    `);
  }

  // 4. Strategic Summary
  const summary = payload.strategicSummary;
  if (
    summary &&
    (
      (summary.keyFindings && summary.keyFindings.length > 0) ||
      (summary.strengths && summary.strengths.length > 0) ||
      (summary.improvements && summary.improvements.length > 0) ||
      (summary.agencyAdjustments && summary.agencyAdjustments.length > 0)
    )
  ) {
    const summaryCards: string[] = [];

    if (summary.keyFindings && summary.keyFindings.length > 0) {
      summaryCards.push(`
        <div class="card-modular">
          <h3 class="card-title">Hallazgos Principales</h3>
          <ul class="clean-list">${summary.keyFindings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      `);
    }

    if (summary.strengths && summary.strengths.length > 0) {
      summaryCards.push(`
        <div class="card" style="border-left:4px solid #63CF00;">
          <h3 class="card-title">Fortalezas Detectadas</h3>
          <ul class="clean-list">${summary.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      `);
    }

    const improvementsCombined = [
      ...(summary.improvements || []),
      ...(summary.agencyAdjustments || [])
    ];
    if (improvementsCombined.length > 0) {
      summaryCards.push(`
        <div class="card" style="border-left:4px solid #F24360;">
          <h3 class="card-title">Oportunidades de Mejora y Ajustes Sugeridos para la Agencia</h3>
          <ul class="clean-list">${improvementsCombined.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      `);
    }

    sections.push(`
      <section class="section-block">
        <h2 class="section-heading"><span class="section-accent"></span>Resumen Estratégico</h2>
        <div style="display:flex;flex-direction:column;gap:12px;">${summaryCards.join('')}</div>
      </section>
    `);
  }

  // 5. Opiniones Textuales (NEVER "Citas Reales")
  const opinionCards = (payload.opinions || [])
    .map((op) => {
      const normSent = normalizeSentiment(op.sentiment);
      const sentClass =
        normSent === 'Positivo' ? 'sent-pos' : normSent === 'Negativo' ? 'sent-neg' : 'sent-neu';
      const pillClass =
        normSent === 'Positivo' ? 'pill-green' : normSent === 'Negativo' ? 'pill-red' : 'pill-amber';
      const scoreMax = op.scoreMax || 100;
      const scoreBadge =
        typeof op.score === 'number' && Number.isFinite(op.score)
          ? `<span class="pill">${escapeHtml(op.score)} / ${escapeHtml(scoreMax)}</span>`
          : '';

      const metaLines: string[] = [];
      if (op.selectedOption && op.selectedOption !== 'None' && op.selectedOption !== 'Ninguna') {
        metaLines.push(`<div><strong>Opción preferida:</strong> ${escapeHtml(op.selectedOption)}</div>`);
      }
      if (op.barriers && op.barriers !== 'None' && op.barriers !== 'Ninguna') {
        metaLines.push(`<div><strong>Barrera señalada:</strong> ${escapeHtml(op.barriers)}</div>`);
      }
      if (op.suggestedImprovement && op.suggestedImprovement !== 'None') {
        metaLines.push(`<div><strong>Ajuste sugerido:</strong> ${escapeHtml(op.suggestedImprovement)}</div>`);
      }

      return `
        <article class="opinion-card ${sentClass}">
          <div class="opinion-head">
            <div>
              <div class="opinion-name">${escapeHtml(op.name)}</div>
              <div class="opinion-profile">
                ${escapeHtml(op.segmentLabel || segmentLabel)}${op.profileDetail ? ` · ${escapeHtml(op.profileDetail)}` : ''}
              </div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;">
              <span class="pill ${pillClass}">${escapeHtml(normSent)}</span>
              ${scoreBadge}
            </div>
          </div>
          <p class="opinion-quote">"${escapeHtml(op.opinion)}"</p>
          ${metaLines.length > 0 ? `<div class="opinion-meta">${metaLines.join('')}</div>` : ''}
        </article>
      `;
    })
    .join('');

  sections.push(`
    <section class="section-block">
      <h2 class="section-heading"><span class="section-accent"></span>Opiniones Textuales</h2>
      ${
        opinionCards
          ? `<div class="opinion-grid">${opinionCards}</div>`
          : '<p class="muted-text">No se registraron opiniones textuales para esta sesión.</p>'
      }
    </section>
  `);

  return wrapStandaloneDocument({
    pageTitle: `Focus Group Sintético — ${payload.title}`,
    reportBadge: 'Reporte Ejecutivo de Focus Group Sintético',
    modeBadge: modeLabel,
    generatedDateText,
    reportTitle: payload.title,
    reportSubtitle: payload.studyName ? `Campaña / Estudio evaluado: ${payload.studyName}` : undefined,
    slogan: BRAND_SLOGAN,
    bodyHtml: sections.join('\n'),
    footerDisclaimer:
      'Las Opiniones Textuales y métricas de este reporte provienen de una Audiencia Simulada mediante un Focus Group Sintético con fines de evaluación creativa previa. Este material apoya el análisis de Marketing y no sustituye la validación formal de Marca, Área Médica ni cumplimiento regulatorio.'
  });
}

/**
 * Triggers a client-side download of a standalone HTML report file.
 */
export function downloadHtmlReport(html: string, filename: string): void {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') {
    return;
  }
  const safeName = filename.toLowerCase().endsWith('.html') ? filename : `${filename}.html`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = safeName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

/**
 * Opens a clean print preview window for Save-as-PDF printing.
 * Automatically falls back to downloading the HTML file if popups are blocked.
 */
export function openPrintableReport(
  html: string,
  fallbackFilename: string
): 'print_window' | 'downloaded' {
  if (typeof window === 'undefined') {
    return 'downloaded';
  }
  try {
    const printWin = window.open('', '_blank', 'width=1040,height=860');
    if (!printWin) {
      downloadHtmlReport(html, fallbackFilename);
      return 'downloaded';
    }

    let documentHtml = html;
    if (
      window.location?.origin &&
      /^https?:\/\//i.test(window.location.origin) &&
      !documentHtml.includes('<base ')
    ) {
      documentHtml = documentHtml.replace(
        '<head>',
        `<head>\n  <base href="${escapeHtml(window.location.origin)}/" />`
      );
    }

    printWin.document.open();
    printWin.document.write(documentHtml);
    printWin.document.close();
    printWin.focus();

    setTimeout(() => {
      try {
        printWin.focus();
        printWin.print();
      } catch {
        // User can trigger print manually from the top toolbar button
      }
    }, 350);

    return 'print_window';
  } catch {
    downloadHtmlReport(html, fallbackFilename);
    return 'downloaded';
  }
}
