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
  Users,
  Lock,
  BookOpen,
  ClipboardCheck,
  Printer,
  ChevronsUpDown
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
import { invalidateBrandManualCache } from '../services/geminiService';

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

const BUILT_IN_CHANNEL_DEFAULT_FULL_LABELS: Record<string, string> = {
  social_media: 'Redes Sociales (Feed 1:1, Vertical 4:5, Carruseles, Historias y Reels/TikTok 9:16)',
  mailing_ecommerce: 'Mailings (Email Marketing) y E-commerce',
  web: 'Sitio Web y Banners Digitales (chopo.com.mx)',
  pdv_sucursal: 'Punto de Venta en Sucursal — PDV (Pósters, Folletos, Lonas Exteriores y Regionales)'
};

const PROTECTED_COLOR_IDS = new Set([
  'bright_blue',
  'basal_green',
  'navy_blue',
  'promo_pink'
]);

const PROTECTED_COLOR_HEXES = new Set([
  '#005FFC',
  '#63CF00',
  '#004699',
  '#F24360'
]);

const FALLBACK_HEX_NAMES: Record<string, string> = {
  '#FFFFFF': 'Blanco',
  '#000000': 'Negro',
  '#004699': 'Azul marino',
  '#005FFC': 'Azul brillante',
  '#63CF00': 'Verde brillante',
  '#98BAF4': 'Azul claro 1',
  '#BDD4F2': 'Azul claro 2',
  '#81A4EE': 'Azul vibrante modular',
  '#EFF9FE': 'Hielo',
  '#F24360': 'Rosa promocional',
  '#E20613': 'Rojo estacional',
  '#D200F4': 'Magenta botones'
};

const SEGMENT_ORDER = ['b2c_patients', 'b2d_doctors', 'b2b_enterprises'];

const SEGMENT_DISPLAY_TITLES: Record<string, string> = {
  b2c_patients: 'B2C — Pacientes',
  b2d_doctors: 'B2D — Médicos',
  b2b_enterprises: 'B2B — Empresas'
};

const FUNNEL_ORDER = ['awareness', 'consideration', 'performance'];

const FUNNEL_BADGES: Record<string, { title: string; subtitle: string; colorClass: string }> = {
  awareness: {
    title: 'Awareness',
    subtitle: 'Reconocimiento de Marca',
    colorClass: 'bg-sky-50 text-[#004699] border-sky-200'
  },
  consideration: {
    title: 'Consideration',
    subtitle: 'Consideración',
    colorClass: 'bg-blue-50 text-[#005FFC] border-blue-200'
  },
  performance: {
    title: 'Performance',
    subtitle: 'Conversión / Promoción',
    colorClass: 'bg-rose-50 text-[#F24360] border-rose-200'
  }
};

function formatFunnelSubtitle(stageKey: string, rawLabel?: string): string {
  const badge = FUNNEL_BADGES[stageKey];
  if (rawLabel) {
    const trimmed = rawLabel.trim();
    const parenMatch = trimmed.match(/\(([^)]+)\)/);
    if (parenMatch && parenMatch[1]) {
      return parenMatch[1].trim();
    }
    if (badge) {
      const stripped = trimmed
        .replace(new RegExp(`^${badge.title}\\s*[-—:]?\\s*`, 'i'), '')
        .trim();
      if (stripped) return stripped;
    } else if (trimmed) {
      return trimmed;
    }
  }
  return badge?.subtitle || rawLabel || stageKey;
}

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

function isProtectedInstitutionalColor(colorItem: BrandColorItem): boolean {
  const id = String(colorItem.id || '').trim().toLowerCase();
  const normalizedHex = normalizeHexForPicker(colorItem.hex);
  return PROTECTED_COLOR_IDS.has(id) || PROTECTED_COLOR_HEXES.has(normalizedHex);
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
  return label
    .replace(/^Rollback\s+a:\s*/i, 'Restaurado desde: ')
    .replace(/\bRollback\b/gi, 'Restauración');
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizePrintableCopy(value: unknown): string {
  return String(value ?? '')
    .replace(/\bplantillas\s+CSS\b/gi, 'plantillas visuales')
    .replace(/\bCSS\b/g, 'diseño visual')
    .replace(/imágenes rasterizadas/gi, 'artes finales en imagen');
}

function resolveColorShortName(
  hex: string,
  paletteMap: Record<string, string>
): string {
  const norm = normalizeHexForPicker(hex);
  const rawName = paletteMap[norm] || FALLBACK_HEX_NAMES[norm];
  if (!rawName) return norm;
  const shortened = rawName.replace(/\s*\([^)]*\)\s*/g, '').trim();
  return shortened || rawName;
}

export function buildBrandManualPrintableHtml(manual: BrandManualConfig): string {
  const meta = manual.metadata;
  const idv = manual.identity_and_voice;
  const photo = manual.photography_and_imagery;
  const pal = manual.color_palette;
  const gfx = manual.graphic_design_and_layout;
  const channels = manual.channels?.items || {};

  const allColors: BrandColorItem[] = [
    ...(pal.primaryDigital || []),
    ...(pal.secondaryDigital || []),
    ...(pal.promotionalAndButtons || [])
  ];
  const colorNameLookup: Record<string, string> = { ...FALLBACK_HEX_NAMES };
  for (const c of allColors) {
    if (c?.hex && c?.name) {
      colorNameLookup[normalizeHexForPicker(c.hex)] = c.name;
    }
  }

  const exportDate = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const renderBulletList = (items: string[] | undefined, tone: 'neutral' | 'do' | 'dont' | 'checklist' = 'neutral') => {
    const safeList = (items || []).map((i) => sanitizePrintableCopy(i).trim()).filter(Boolean);
    if (safeList.length === 0) return '<p class="muted">Sin registros.</p>';
    return `<ul class="rule-list rule-list-${tone}">${safeList
      .map((item) => {
        const isWarn = tone === 'checklist' && /^\s*(ESTRICTAMENTE\s+)?(PROHIBIDO|NUNCA)\b/i.test(item);
        const itemClass = isWarn ? ' class="warn-item"' : '';
        return `<li${itemClass}>${escapeHtml(item)}</li>`;
      })
      .join('')}</ul>`;
  };

  const renderPaletteSwatches = (groupTitle: string, list: BrandColorItem[]) => {
    if (!Array.isArray(list) || list.length === 0) return '';
    return `
      <div class="sub-block">
        <h3>${escapeHtml(groupTitle)}</h3>
        <div class="swatch-grid">
          ${list
            .map((c) => {
              const safeHex = normalizeHexForPicker(c.hex);
              const light = isLightHex(safeHex);
              return `
                <div class="swatch-card">
                  <div class="swatch-color" style="background-color:${safeHex};color:${light ? '#004699' : '#FFFFFF'};">
                    <span class="swatch-hex" style="background:${light ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.28)'};color:${light ? '#004699' : '#FFFFFF'};">${escapeHtml(c.hex)}</span>
                  </div>
                  <div class="swatch-body">
                    <div class="swatch-name">${escapeHtml(c.name)}</div>
                    <div class="swatch-rgb">${escapeHtml(c.rgb)}</div>
                    <p class="swatch-usage">${escapeHtml(c.usage)}</p>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  };

  const renderContrastChips = (bgSafe: string, hexList: string[], variant: 'allowed' | 'forbidden') => {
    if (!Array.isArray(hexList) || hexList.length === 0) {
      return '<span class="muted">Ninguno</span>';
    }
    return `<div class="chip-wrap">${hexList
      .map((fg) => {
        const fgSafe = normalizeHexForPicker(fg);
        const label = resolveColorShortName(fg, colorNameLookup);
        return `
          <span class="contrast-chip chip-${variant}">
            <span class="aa-box" style="background-color:${bgSafe};color:${fgSafe};">Aa</span>
            <span class="chip-label">${escapeHtml(label)}</span>
            <span class="chip-hex">${escapeHtml(fg)}</span>
          </span>
        `;
      })
      .join('')}</div>`;
  };

  const orderedSegments = [
    ...SEGMENT_ORDER.filter((k) => Boolean(idv.audienceSegments?.[k])),
    ...Object.keys(idv.audienceSegments || {}).filter((k) => !SEGMENT_ORDER.includes(k))
  ];

  const orderedFunnels = [
    ...FUNNEL_ORDER.filter((k) => Boolean(idv.funnelStageRules?.[k])),
    ...Object.keys(idv.funnelStageRules || {}).filter((k) => !FUNNEL_ORDER.includes(k))
  ];

  const orderedChannels = [
    ...['social_media', 'mailing_ecommerce', 'web', 'pdv_sucursal'].filter((k) => Boolean(channels[k])),
    ...Object.keys(channels).filter((k) => !BUILT_IN_CHANNEL_IDS.has(k))
  ];

  const cleanContactSteps = (idv.contactTouchpointsOrder?.strictOrder || [])
    .map((entry) => String(entry || '').replace(/^\s*\d+\.\s*/, '').trim())
    .filter(Boolean);

  const pyramid = idv.brandAttributesPyramid || {
    cuspUnique: [],
    centerDifferentiators: [],
    baseCategoryEssentials: [],
    experiencePillars: {}
  };

  const weightEntries = Object.entries(gfx.typographyRules?.weightHierarchy || {});

  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Manual de Marca V4 — ${escapeHtml(meta.client || 'Laboratorio Médico del Chopo')}</title>
  <style>
    @page {
      size: letter;
      margin: 14mm 14mm 16mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Avenir Next', 'Avenir', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1E293B;
      background: #F1F5F9;
      font-size: 11px;
      line-height: 1.5;
    }
    .no-print {
      position: sticky;
      top: 0;
      z-index: 50;
      background: #004699;
      color: #FFFFFF;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 2px 10px rgba(0, 70, 153, 0.25);
    }
    .toolbar-title {
      font-weight: 800;
      font-size: 13px;
    }
    .toolbar-sub {
      font-size: 11px;
      color: #BDD4F2;
    }
    .toolbar-actions {
      display: flex;
      gap: 10px;
    }
    .btn-print {
      background: #63CF00;
      color: #004699;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-close {
      background: rgba(255,255,255,0.16);
      color: #FFFFFF;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 8px;
      padding: 8px 14px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .page-shell {
      max-width: 860px;
      margin: 22px auto 40px auto;
      background: #FFFFFF;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
    }
    .top-bar {
      height: 7px;
      background: linear-gradient(90deg, #005FFC 0%, #004699 55%, #63CF00 100%);
    }
    .cover {
      padding: 26px 32px 22px 32px;
      background: linear-gradient(180deg, #EFF9FE 0%, #FFFFFF 100%);
      border-bottom: 1px solid #DCEAF7;
    }
    .cover-kicker {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      background: #FFFFFF;
      border: 1px solid #BDD4F2;
      color: #005FFC;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .cover h1 {
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 900;
      color: #004699;
      letter-spacing: -0.02em;
    }
    .cover-slogan {
      font-size: 13px;
      font-weight: 800;
      color: #005FFC;
      margin: 0 0 12px 0;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      font-size: 10px;
      color: #475569;
    }
    .content {
      padding: 22px 32px 30px 32px;
    }
    .section-block {
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #E2E8F0;
    }
    .section-block:last-of-type {
      border-bottom: none;
    }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #005FFC;
    }
    .section-head h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 900;
      color: #004699;
    }
    .source-ref {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 999px;
      padding: 2px 9px;
      white-space: nowrap;
    }
    h3 {
      margin: 12px 0 6px 0;
      font-size: 12px;
      font-weight: 800;
      color: #004699;
    }
    .sub-block {
      margin-top: 12px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 10px 12px;
      break-inside: avoid;
    }
    .card-accent {
      background: #EFF9FE;
      border-color: #BDD4F2;
    }
    .card-do {
      background: #ECFDF5;
      border-color: #A7F3D0;
    }
    .card-dont {
      background: #FFF1F2;
      border-color: #FECDD3;
    }
    .field-label {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #004699;
      margin-bottom: 3px;
    }
    .field-value {
      margin: 0;
      color: #1E293B;
    }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 9.5px;
      font-weight: 700;
      background: #EFF9FE;
      color: #004699;
      border: 1px solid #BDD4F2;
      margin: 2px 4px 2px 0;
    }
    .pill-rose {
      background: #FFF1F2;
      color: #BE123C;
      border-color: #FECDD3;
    }
    .rule-list {
      margin: 4px 0 0 0;
      padding-left: 16px;
    }
    .rule-list li {
      margin-bottom: 4px;
    }
    .rule-list-dont li,
    .rule-list li.warn-item {
      color: #9F1239;
      font-weight: 600;
    }
    .ordered-steps {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 6px 0;
    }
    .step-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #EFF9FE;
      border: 1px solid #BDD4F2;
      border-radius: 999px;
      padding: 3px 10px 3px 4px;
      font-weight: 700;
      color: #004699;
    }
    .step-num {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: #005FFC;
      color: #FFFFFF;
      font-size: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .swatch-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .swatch-card {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
      background: #FFFFFF;
      break-inside: avoid;
    }
    .swatch-color {
      height: 46px;
      padding: 6px 8px;
      display: flex;
      align-items: flex-end;
      border-bottom: 1px solid #E2E8F0;
    }
    .swatch-hex {
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 6px;
    }
    .swatch-body {
      padding: 8px 10px;
    }
    .swatch-name {
      font-weight: 800;
      color: #004699;
      font-size: 10.5px;
    }
    .swatch-rgb {
      font-size: 9.5px;
      color: #64748B;
      margin-bottom: 3px;
    }
    .swatch-usage {
      margin: 0;
      font-size: 10px;
      color: #334155;
    }
    .contrast-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 10px;
    }
    .contrast-table th {
      background: #004699;
      color: #FFFFFF;
      text-align: left;
      padding: 7px 8px;
      font-size: 10px;
    }
    .contrast-table td {
      border: 1px solid #E2E8F0;
      padding: 7px 8px;
      vertical-align: top;
    }
    .contrast-table tr {
      break-inside: avoid;
    }
    .bg-badge {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid rgba(15,23,42,0.12);
      font-weight: 800;
    }
    .chip-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .contrast-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px 2px 3px;
      border-radius: 999px;
      border: 1px solid #CBD5E1;
      font-size: 9.5px;
      background: #FFFFFF;
    }
    .chip-allowed {
      border-color: #A7F3D0;
      background: #ECFDF5;
      color: #065F46;
    }
    .chip-forbidden {
      border-color: #FECDD3;
      background: #FFF1F2;
      color: #9F1239;
    }
    .aa-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid rgba(15,23,42,0.18);
      font-size: 9px;
      font-weight: 900;
    }
    .chip-label {
      font-weight: 700;
    }
    .chip-hex {
      font-size: 8.5px;
      opacity: 0.8;
    }
    .weight-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    .weight-table td {
      border: 1px solid #E2E8F0;
      padding: 6px 8px;
    }
    .weight-key {
      width: 90px;
      background: #EFF9FE;
      color: #004699;
      font-weight: 900;
      text-align: center;
    }
    .channel-card {
      border: 1px solid #CBD5E1;
      border-top: 3px solid #005FFC;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      break-inside: avoid;
      background: #FFFFFF;
    }
    .channel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .channel-head h3 {
      margin: 0;
      font-size: 12.5px;
      color: #004699;
    }
    .muted {
      color: #64748B;
      font-style: italic;
      margin: 0;
    }
    .doc-footer {
      padding: 14px 32px 20px 32px;
      background: #004699;
      color: #FFFFFF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 10px;
    }
    .doc-footer strong {
      color: #63CF00;
    }
    @media print {
      body {
        background: #FFFFFF;
      }
      .no-print {
        display: none !important;
      }
      .page-shell {
        margin: 0;
        max-width: none;
        border-radius: 0;
        box-shadow: none;
      }
      .cover, .content, .doc-footer {
        padding-left: 16px;
        padding-right: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <div class="toolbar-title">Manual de Marca V4 — ${escapeHtml(meta.client || 'Laboratorio Médico del Chopo')}</div>
      <div class="toolbar-sub">Vista ejecutiva lista para imprimir o guardar como PDF (Tamaño Carta)</div>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn-print" onclick="window.print()">Guardar como PDF / Imprimir</button>
      <button type="button" class="btn-close" onclick="window.close()">Cerrar</button>
    </div>
  </div>

  <div class="page-shell">
    <div class="top-bar"></div>
    <header class="cover">
      <span class="cover-kicker">Documento Oficial de Lineamientos de Marca</span>
      <h1>Manual de Marca V4 — ${escapeHtml(meta.client || 'Laboratorio Médico del Chopo')}</h1>
      <p class="cover-slogan">${escapeHtml(idv.mandatorySlogan?.text || meta.umbrellaCampaign || 'Chopo, toda una vida cuidando la vida.')}</p>
      <div class="meta-row">
        <span><strong>Versión:</strong> ${escapeHtml(meta.version || '4.0.0')}</span>
        ${meta.sourceDocument ? `<span><strong>Fuente:</strong> ${escapeHtml(meta.sourceDocument)}</span>` : ''}
        ${meta.lastUpdated ? `<span><strong>Última actualización:</strong> ${escapeHtml(meta.lastUpdated)}</span>` : ''}
        <span><strong>Exportado:</strong> ${escapeHtml(exportDate)}</span>
      </div>
    </header>

    <main class="content">
      <!-- SECCIÓN 1 -->
      <section class="section-block">
        <div class="section-head">
          <h2>${escapeHtml(idv.uiTabTitle || '1. Identidad y Voz')}</h2>
          ${idv.sourcePages ? `<span class="source-ref">Ref. Manual V4: ${escapeHtml(idv.sourcePages)}</span>` : ''}
        </div>

        <div class="grid-2">
          <div class="card card-accent">
            <div class="field-label">Nombres Oficiales de Marca</div>
            <p class="field-value"><strong>${escapeHtml((idv.officialBrandNames || []).join(' / '))}</strong></p>
            <div class="field-label" style="margin-top:8px;">Descriptivo Obligatorio del Logotipo</div>
            <p class="field-value">${escapeHtml(idv.logoDescriptor)}</p>
          </div>
          <div class="card card-accent">
            <div class="field-label">Slogan Obligatorio</div>
            <p class="field-value"><strong>${escapeHtml(idv.mandatorySlogan?.text)}</strong></p>
            <p class="field-value" style="margin-top:4px;font-size:10px;color:#334155;">${escapeHtml(idv.mandatorySlogan?.usageRule)}</p>
          </div>
        </div>

        <div class="card" style="margin-top:10px;">
          <div class="field-label">Propósito de Marca</div>
          <p class="field-value">${escapeHtml(idv.purpose)}</p>
        </div>

        <div class="sub-block">
          <h3>Pirámide de Atributos de Marca</h3>
          <div class="grid-3">
            <div class="card">
              <div class="field-label">Cúspide Única</div>
              ${renderBulletList(pyramid.cuspUnique)}
            </div>
            <div class="card">
              <div class="field-label">Diferenciadores Centrales</div>
              ${renderBulletList(pyramid.centerDifferentiators)}
            </div>
            <div class="card">
              <div class="field-label">Esenciales de Categoría</div>
              ${renderBulletList(pyramid.baseCategoryEssentials)}
            </div>
          </div>
          ${
            Object.keys(pyramid.experiencePillars || {}).length > 0
              ? `<div class="card" style="margin-top:8px;">
                  <div class="field-label">Pilares de Experiencia</div>
                  <div class="grid-2" style="margin-top:4px;">
                    ${Object.entries(pyramid.experiencePillars || {})
                      .map(
                        ([pillar, vals]) =>
                          `<div><strong style="color:#004699;text-transform:capitalize;">${escapeHtml(pillar)}:</strong> ${escapeHtml(Array.isArray(vals) ? vals.join(', ') : String(vals || ''))}</div>`
                      )
                      .join('')}
                  </div>
                </div>`
              : ''
          }
        </div>

        <div class="sub-block">
          <h3>Segmentos Oficiales de Audiencia</h3>
          <div class="grid-3">
            ${orderedSegments
              .map((segKey) => {
                const seg = idv.audienceSegments[segKey];
                if (!seg) return '';
                const pronounDetail =
                  seg.pronoun === 'Tú'
                    ? seg.code === 'B2D'
                      ? 'Tú (respetuoso entre colegas)'
                      : 'Tú (cercano y cotidiano)'
                    : seg.pronoun;
                return `
                  <div class="card">
                    <div class="field-label">${escapeHtml(seg.code)} — ${escapeHtml(seg.label)}</div>
                    <p class="field-value"><strong>Pronombre:</strong> ${escapeHtml(pronounDetail)}</p>
                    <p class="field-value"><strong>Destino:</strong> ${escapeHtml(seg.primaryDestination)}</p>
                    <p class="field-value" style="margin-top:4px;">${escapeHtml(seg.toneGuidance)}</p>
                    <p class="field-value" style="margin-top:4px;"><strong>Leyenda:</strong> ${escapeHtml(seg.mandatoryPrecautionaryLegend)}</p>
                    ${
                      Array.isArray(seg.valueDrivers) && seg.valueDrivers.length
                        ? `<div style="margin-top:6px;"><div class="field-label">Impulsores de Valor</div>${renderBulletList(seg.valueDrivers)}</div>`
                        : ''
                    }
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="sub-block">
          <h3>Reglas Invariables de Voz</h3>
          <div class="grid-2">
            <div class="card">
              <div class="field-label">Persona Gramatical</div>
              <p class="field-value">${escapeHtml(idv.voiceAndCopyInvariants?.grammaticalPerson)}</p>
            </div>
            <div class="card card-dont">
              <div class="field-label" style="color:#9F1239;">Cero Signos de Admiración (¡...!)</div>
              <p class="field-value">${escapeHtml(idv.voiceAndCopyInvariants?.zeroExclamationMarks)}</p>
            </div>
            <div class="card">
              <div class="field-label">Claridad Sobre Tecnicismos</div>
              <p class="field-value">${escapeHtml(idv.voiceAndCopyInvariants?.clarityOverJargon)}</p>
            </div>
            <div class="card">
              <div class="field-label">Ingenio vs. Humor</div>
              <p class="field-value">${escapeHtml(idv.voiceAndCopyInvariants?.ingenuityVsHumor)}</p>
            </div>
          </div>
          <div class="grid-2" style="margin-top:8px;">
            <div class="card card-do">
              <div class="field-label" style="color:#065F46;">Sí Hacer en Redacción</div>
              ${renderBulletList(idv.voiceAndCopyInvariants?.dos, 'do')}
            </div>
            <div class="card card-dont">
              <div class="field-label" style="color:#9F1239;">Prohibido en Redacción</div>
              ${renderBulletList(idv.voiceAndCopyInvariants?.donts, 'dont')}
            </div>
          </div>
        </div>

        <div class="sub-block">
          <h3>Reglas por Etapa del Funnel</h3>
          <div class="grid-3">
            ${orderedFunnels
              .map((stageKey) => {
                const st = idv.funnelStageRules[stageKey];
                if (!st) return '';
                const badgeTitle = FUNNEL_BADGES[stageKey]?.title || stageKey;
                const subtitle = formatFunnelSubtitle(stageKey, st.label);
                return `
                  <div class="card">
                    <div style="margin-bottom:6px;">
                      <span class="pill">${escapeHtml(badgeTitle)}</span>
                      <strong style="color:#004699;">${escapeHtml(subtitle)}</strong>
                    </div>
                    <p class="field-value"><strong>Titular:</strong> ${escapeHtml(st.headlineRule)}</p>
                    <p class="field-value" style="margin-top:4px;"><strong>Enfoque:</strong> ${escapeHtml(st.bodyFocus)}</p>
                    <p class="field-value" style="margin-top:4px;"><strong>Llamado a la acción:</strong> ${escapeHtml(st.ctaPlacementAndStyle)}</p>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="grid-2" style="margin-top:10px;">
          <div class="card">
            <div class="field-label">Orden Estricto de Puntos de Contacto</div>
            <div class="ordered-steps">
              ${cleanContactSteps
                .map(
                  (step, i) =>
                    `<span class="step-item"><span class="step-num">${i + 1}</span><span>${escapeHtml(step)}</span></span>`
                )
                .join('')}
            </div>
            <p class="field-value" style="margin-top:4px;">${escapeHtml(idv.contactTouchpointsOrder?.rule)}</p>
          </div>
          <div class="card">
            <div class="field-label">Citas Médicas (${escapeHtml(idv.medicalCitationsRule?.citationStandard || 'APA 7')} · Máx. ${escapeHtml(idv.medicalCitationsRule?.maxAgeYears ?? 5)} años)</div>
            <p class="field-value">${escapeHtml(idv.medicalCitationsRule?.rule)}</p>
            <div class="field-label" style="margin-top:8px;">Permisos de Publicidad COFEPRIS</div>
            <p class="field-value">${escapeHtml(idv.advertisingPermitRule)}</p>
          </div>
        </div>
      </section>

      <!-- SECCIÓN 2 -->
      <section class="section-block">
        <div class="section-head">
          <h2>${escapeHtml(photo.uiTabTitle || '2. Fotografía e Imagen')}</h2>
          ${photo.sourcePages ? `<span class="source-ref">Ref. Manual V4: ${escapeHtml(photo.sourcePages)}</span>` : ''}
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="field-label">Filosofía General</div>
            <p class="field-value">${escapeHtml(photo.generalPhilosophy)}</p>
          </div>
          <div class="card">
            <div class="field-label">Temperatura de Color e Iluminación</div>
            <p class="field-value">${escapeHtml(photo.colorTemperatureRule)}</p>
          </div>
          <div class="card card-accent">
            <div class="field-label">Regla de Fotografía Base Limpia</div>
            <p class="field-value">${escapeHtml(photo.cleanBaseImageRuleForAI)}</p>
          </div>
          <div class="card">
            <div class="field-label">Guía de Calidez y Autenticidad</div>
            <p class="field-value">${escapeHtml(photo.focusGroupWarmthHint)}</p>
          </div>
        </div>
        <div class="grid-2" style="margin-top:10px;">
          <div class="card card-do">
            <div class="field-label" style="color:#065F46;">Sí Hacer en Fotografía</div>
            ${renderBulletList(photo.dos, 'do')}
          </div>
          <div class="card card-dont">
            <div class="field-label" style="color:#9F1239;">Prohibido en Fotografía</div>
            ${renderBulletList(photo.donts, 'dont')}
          </div>
        </div>
      </section>

      <!-- SECCIÓN 3 -->
      <section class="section-block">
        <div class="section-head">
          <h2>${escapeHtml(pal.uiTabTitle || '3. Paleta de Color y Contrastes')}</h2>
          ${pal.sourcePages ? `<span class="source-ref">Ref. Manual V4: ${escapeHtml(pal.sourcePages)}</span>` : ''}
        </div>
        <div class="card card-accent">
          <div class="field-label">Ambientación de Color en Escenas Fotográficas</div>
          <p class="field-value">${escapeHtml(pal.ambientPromptGuidance)}</p>
        </div>

        ${renderPaletteSwatches('Colores Primarios Digitales', pal.primaryDigital)}
        ${renderPaletteSwatches('Colores Secundarios y Modulares', pal.secondaryDigital)}
        ${renderPaletteSwatches('Promocionales y Botones', pal.promotionalAndButtons)}

        <div class="sub-block">
          <h3>Matriz Visual de Contrastes Permitidos vs. Prohibidos</h3>
          <table class="contrast-table">
            <thead>
              <tr>
                <th style="width:18%;">Color de Fondo</th>
                <th style="width:28%;">Colores Permitidos</th>
                <th style="width:26%;">Colores Prohibidos</th>
                <th style="width:28%;">Notas y Excepciones</th>
              </tr>
            </thead>
            <tbody>
              ${(pal.contrastMatrix || [])
                .map((row) => {
                  const bgSafe = normalizeHexForPicker(row.backgroundHex);
                  const light = isLightHex(bgSafe);
                  return `
                    <tr>
                      <td>
                        <div class="bg-badge" style="background-color:${bgSafe};color:${light ? '#004699' : '#FFFFFF'};">
                          <span>${escapeHtml(row.backgroundName)}</span>
                          <span style="font-size:9px;opacity:0.9;">${escapeHtml(row.backgroundHex)}</span>
                        </div>
                      </td>
                      <td>${renderContrastChips(bgSafe, row.allowedForegrounds, 'allowed')}</td>
                      <td>${renderContrastChips(bgSafe, row.forbiddenForegrounds, 'forbidden')}</td>
                      <td>${escapeHtml(row.notes)}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- SECCIÓN 4 -->
      <section class="section-block">
        <div class="section-head">
          <h2>${escapeHtml(gfx.uiTabTitle || '4. Diseño Gráfico, Logo y Línea Basal')}</h2>
          ${gfx.sourcePages ? `<span class="source-ref">Ref. Manual V4: ${escapeHtml(gfx.sourcePages)}</span>` : ''}
        </div>
        ${
          gfx.usageNote
            ? `<div class="card card-accent" style="margin-bottom:10px;"><p class="field-value">${escapeHtml(sanitizePrintableCopy(gfx.usageNote))}</p></div>`
            : ''
        }

        <div class="sub-block">
          <h3>Logotipo y Cobrandeo / Alianzas</h3>
          <div class="grid-2">
            <div class="card"><div class="field-label">Descriptivo Obligatorio</div><p class="field-value">${escapeHtml(gfx.logoRules?.mandatoryDescriptor)}</p></div>
            <div class="card"><div class="field-label">Contraste sobre Fotografías</div><p class="field-value">${escapeHtml(gfx.logoRules?.contrastOnPhotos)}</p></div>
            <div class="card"><div class="field-label">Color en Aplicaciones Modulares</div><p class="field-value">${escapeHtml(gfx.logoRules?.modularLogoColor)}</p></div>
            <div class="card"><div class="field-label">Ubicación Autorizada</div><p class="field-value">${escapeHtml(gfx.logoRules?.placement)}</p></div>
          </div>
          <div class="card" style="margin-top:8px;">
            <div class="field-label">Cobrandeo y Alianzas</div>
            <p class="field-value">${escapeHtml(gfx.logoRules?.cobrandingRule)}</p>
          </div>
        </div>

        <div class="sub-block">
          <h3>Tipografía y Jerarquía de Pesos</h3>
          <div class="grid-2">
            <div class="card"><div class="field-label">Familia Principal</div><p class="field-value"><strong>${escapeHtml(gfx.typographyRules?.primaryFontFamily)}</strong></p></div>
            <div class="card"><div class="field-label">Alternativa Web e Interfaz</div><p class="field-value"><strong>${escapeHtml(gfx.typographyRules?.webAlternativeFontFamily)}</strong></p></div>
          </div>
          ${
            weightEntries.length > 0
              ? `<table class="weight-table">
                  <tbody>
                    ${weightEntries
                      .map(
                        ([w, desc]) =>
                          `<tr><td class="weight-key">${escapeHtml(w)}</td><td>${escapeHtml(desc)}</td></tr>`
                      )
                      .join('')}
                  </tbody>
                </table>`
              : ''
          }
          <div class="card" style="margin-top:8px;">
            <div class="field-label">Criterio de Revisión Visual Tipográfica</div>
            <p class="field-value">${escapeHtml(sanitizePrintableCopy(gfx.typographyRules?.visionAuditGuidance))}</p>
          </div>
        </div>

        <div class="sub-block">
          <h3>Línea Basal Verde (#63CF00)</h3>
          <div class="card" style="border-left:4px solid #63CF00;margin-bottom:8px;">
            <p class="field-value">${escapeHtml(gfx.lineaBasalRules?.description)}</p>
          </div>
          <div class="grid-2">
            <div class="card">
              <div class="field-label">Proporciones Invariables</div>
              ${renderBulletList(gfx.lineaBasalRules?.proportionInvariants)}
            </div>
            <div class="card">
              <div class="field-label">Interacción Tridimensional y Tamaño</div>
              ${renderBulletList(gfx.lineaBasalRules?.interactionAndSizeRules)}
            </div>
            <div class="card">
              <div class="field-label">Recortes Permitidos y Prohibidos</div>
              ${renderBulletList(gfx.lineaBasalRules?.allowedAndForbiddenCrops)}
            </div>
            <div class="card card-dont">
              <div class="field-label" style="color:#9F1239;">Reglas de No Agresión</div>
              ${renderBulletList(gfx.lineaBasalRules?.nonAggressionRules, 'dont')}
            </div>
          </div>
        </div>

        <div class="sub-block">
          <h3>Modularidad y Cajas</h3>
          <div class="grid-2">
            <div class="card"><div class="field-label">Geometría de Esquinas y Radios</div><p class="field-value">${escapeHtml(gfx.modularityRules?.cornerGeometry)}</p></div>
            <div class="card"><div class="field-label">Prohibición de Cajas Flotantes</div><p class="field-value">${escapeHtml(gfx.modularityRules?.noFloatingBoxes)}</p></div>
            <div class="card"><div class="field-label">Orientación de un Solo Eje</div><p class="field-value">${escapeHtml(gfx.modularityRules?.singleAxisOrientation)}</p></div>
            <div class="card"><div class="field-label">Límites Máximos de Tamaño</div><p class="field-value">${escapeHtml(gfx.modularityRules?.maxSizeLimits)}</p></div>
          </div>
          <div class="card" style="margin-top:8px;">
            <div class="field-label">Composición Horizontal y Pleca de Llamado a la Acción</div>
            <p class="field-value">${escapeHtml(gfx.modularityRules?.horizontalLayoutAndCtaTab)}</p>
          </div>
        </div>

        <div class="sub-block">
          <h3>Preciadores y Descuentos</h3>
          <div class="grid-3">
            <div class="card"><div class="field-label">Color Obligatorio</div><p class="field-value">${escapeHtml(gfx.pricingAndDiscountsRules?.mandatoryColor)}</p></div>
            <div class="card"><div class="field-label">Círculo Rebasado sobre Fotografía</div><p class="field-value">${escapeHtml(gfx.pricingAndDiscountsRules?.circularBadgeBleed)}</p></div>
            <div class="card"><div class="field-label">Caja Promocional Modular</div><p class="field-value">${escapeHtml(gfx.pricingAndDiscountsRules?.modularPromoBox)}</p></div>
          </div>
        </div>

        <div class="sub-block">
          <h3>Íconos, Legales y Piezas sin Fotografía</h3>
          <div class="grid-3">
            <div class="card"><div class="field-label">Íconos</div><p class="field-value">${escapeHtml(gfx.iconsLegalsAndNoPhotoRules?.icons)}</p></div>
            <div class="card"><div class="field-label">Ubicación de Legales</div><p class="field-value">${escapeHtml(gfx.iconsLegalsAndNoPhotoRules?.legalsPlacement)}</p></div>
            <div class="card"><div class="field-label">Piezas sin Fotografía</div><p class="field-value">${escapeHtml(gfx.iconsLegalsAndNoPhotoRules?.noPhotoLayouts)}</p></div>
          </div>
        </div>
      </section>

      <!-- SECCIÓN 5 -->
      <section class="section-block">
        <div class="section-head">
          <h2>${escapeHtml(manual.channels?.uiTabTitle || '5. Reglas por Canal')}</h2>
        </div>
        ${orderedChannels
          .map((chKey) => {
            const ch = channels[chKey];
            if (!ch) return '';
            return `
              <div class="channel-card">
                <div class="channel-head">
                  <h3>${escapeHtml(ch.label || BUILT_IN_CHANNEL_SHORT_LABELS[chKey] || 'Canal')}</h3>
                  ${ch.sourcePages ? `<span class="source-ref">Ref. Manual V4: ${escapeHtml(ch.sourcePages)}</span>` : ''}
                </div>
                ${
                  Array.isArray(ch.supportedFormats) && ch.supportedFormats.length > 0
                    ? `<div style="margin-bottom:8px;">${ch.supportedFormats
                        .map((fmt) => `<span class="pill">${escapeHtml(fmt)}</span>`)
                        .join('')}</div>`
                    : ''
                }
                <div class="grid-2">
                  <div class="card">
                    <div class="field-label">Reglas de Redacción y Textos</div>
                    <p class="field-value">${escapeHtml(sanitizePrintableCopy(ch.copyRules))}</p>
                  </div>
                  <div class="card">
                    <div class="field-label">Reglas de Fotografía y Encuadre</div>
                    <p class="field-value">${escapeHtml(sanitizePrintableCopy(ch.photoRules))}</p>
                  </div>
                </div>
                ${
                  ch.focusGroupContext
                    ? `<div class="card" style="margin-top:8px;">
                        <div class="field-label">Contexto de Experiencia para Focus Group</div>
                        <p class="field-value">${escapeHtml(sanitizePrintableCopy(ch.focusGroupContext))}</p>
                      </div>`
                    : ''
                }
                ${
                  Array.isArray(ch.auditorRules) && ch.auditorRules.length > 0
                    ? `<div class="card" style="margin-top:8px;">
                        <div class="field-label">Lista de Verificación del Revisor Automático</div>
                        ${renderBulletList(ch.auditorRules, 'checklist')}
                      </div>`
                    : ''
                }
              </div>
            `;
          })
          .join('')}
      </section>
    </main>

    <footer class="doc-footer">
      <div>
        <strong>${escapeHtml(idv.mandatorySlogan?.text || 'Chopo, toda una vida cuidando la vida.')}</strong>
        <div>${escapeHtml(meta.client || 'Laboratorio Médico del Chopo')} · ${escapeHtml(idv.logoDescriptor || 'Análisis clínicos y estudios especializados')}</div>
      </div>
      <div style="text-align:right;">
        <div>Manual de Marca V${escapeHtml(meta.version || '4.0.0')}</div>
        <div>${escapeHtml(cleanContactSteps.join(' | ') || 'App Chopo | chopo.com.mx | WhatsApp 55 6481 1373 | Tel. 800 00 24676')}</div>
      </div>
    </footer>
  </div>
</body>
</html>`;
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

const SourcePagesBadge: React.FC<{ pages?: string }> = ({ pages }) => {
  if (!pages || !pages.trim()) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold shrink-0">
      <BookOpen size={12} className="text-[#005FFC]" />
      <span>Ref. Manual V4: {pages}</span>
    </span>
  );
};

interface EditableListProps {
  items: string[];
  onChange: (next: string[]) => void;
  addButtonLabel?: string;
  placeholder?: string;
  variant?: 'neutral' | 'do' | 'dont' | 'ordered' | 'checklist';
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

  const defaultCardStyles =
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
        const isChecklistWarning =
          variant === 'checklist' && /^\s*(ESTRICTAMENTE\s+)?(PROHIBIDO|NUNCA)\b/i.test(item);
        const rowCardStyle = isChecklistWarning
          ? 'bg-rose-50/50 border-rose-200 focus-within:border-rose-400'
          : defaultCardStyles;
        return (
          <div
            key={idx}
            className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${rowCardStyle} ${
              isCriticalPhotoAlert ? 'ring-2 ring-rose-300/80 bg-rose-50' : ''
            }`}
          >
            {variant === 'do' && (
              <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-1.5" />
            )}
            {variant === 'dont' && (
              <AlertTriangle size={17} className="text-rose-600 shrink-0 mt-1.5" />
            )}
            {variant === 'checklist' &&
              (isChecklistWarning ? (
                <AlertTriangle size={17} className="text-rose-600 shrink-0 mt-1.5" />
              ) : (
                <ClipboardCheck size={17} className="text-[#004699] shrink-0 mt-1.5" />
              ))}
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
              {isChecklistWarning && (
                <span className="inline-block mb-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold uppercase tracking-wide">
                  Restricción
                </span>
              )}
              {multiline ? (
                <textarea
                  rows={2}
                  disabled={disabled}
                  value={item}
                  onChange={(e) => handleItemChange(idx, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-white/90 focus:bg-white text-sm text-slate-800 px-3 py-2 rounded-lg border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 resize-y leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              ) : (
                <input
                  type="text"
                  disabled={disabled}
                  value={item}
                  onChange={(e) => handleItemChange(idx, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-white/90 focus:bg-white text-sm text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
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
                    className="p-1 rounded-lg text-slate-400 hover:text-[#004699] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Subir posición"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || idx === items.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="p-1 rounded-lg text-slate-400 hover:text-[#004699] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${addButtonStyles}`}
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
  isOpen?: boolean;
  onToggle?: () => void;
  accentColor?: string;
  children: React.ReactNode;
}

const AccordionCard: React.FC<AccordionCardProps> = ({
  title,
  subtitle,
  icon,
  defaultOpen = true,
  isOpen: controlledOpen,
  onToggle,
  accentColor = 'border-t-[#005FFC]',
  children
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = typeof controlledOpen === 'boolean' ? controlledOpen : internalOpen;
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 border-t-4 ${accentColor} shadow-sm overflow-hidden`}>
      <button
        type="button"
        onClick={handleToggle}
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
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4">{children}</div>}
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

  // Governance / RBAC permissions from /api/auth/me
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // Tab 4 controlled accordions (first 2 open by default, remaining 4 closed)
  const [designAccordions, setDesignAccordions] = useState<Record<string, boolean>>({
    logo: true,
    typography: true,
    lineaBasal: false,
    modularity: false,
    pricing: false,
    iconsLegals: false
  });

  // Tab 5 inline channel creator & format input
  const [isCreatingChannel, setIsCreatingChannel] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [newFormatInput, setNewFormatInput] = useState<string>('');

  // Tab 3 contrast chip inputs & validation errors keyed by `${rowIdx}_${field}`
  const [contrastHexDrafts, setContrastHexDrafts] = useState<Record<string, string>>({});
  const [contrastHexErrors, setContrastHexErrors] = useState<Record<string, string>>({});

  const isBusy = isLoading || isSaving || isRestoring;
  const isReadOnly = !canEdit;
  const isControlsDisabled = isBusy || isReadOnly;

  const allDesignAccordionsOpen = useMemo(
    () => Object.values(designAccordions).every(Boolean),
    [designAccordions]
  );

  const toggleAllDesignAccordions = () => {
    const nextOpen = !allDesignAccordionsOpen;
    setDesignAccordions({
      logo: nextOpen,
      typography: nextOpen,
      lineaBasal: nextOpen,
      modularity: nextOpen,
      pricing: nextOpen,
      iconsLegals: nextOpen
    });
  };

  const toggleDesignAccordion = (key: string) => {
    setDesignAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 5500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const fetchAuthPermissions = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        setCanEdit(true);
        return;
      }
      const data = await res.json();
      if (typeof data?.email === 'string' && data.email.trim()) {
        setCurrentUserEmail(data.email.trim());
      }
      if (data?.authMode === 'none') {
        setCanEdit(true);
        return;
      }
      const rawPermission =
        data?.permissions?.canEditBrandManual ?? data?.canEditBrandManual;
      if (typeof rawPermission === 'boolean') {
        setCanEdit(rawPermission);
      } else {
        setCanEdit(true);
      }
    } catch {
      setCanEdit(true);
    }
  };

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
    fetchAuthPermissions();
    fetchActiveManual();
  }, []);

  const updateManual = (updater: (prev: BrandManualConfig) => BrandManualConfig) => {
    if (!canEdit) return;
    setManual((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!manual || isBusy || !canEdit) return;
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
      invalidateBrandManualCache();
      await fetchVersions();
      showToast('Cambios guardados correctamente. Los lineamientos ya están activos en campañas, imágenes y evaluaciones.');
    } catch (err) {
      console.error('Error al guardar Manual de Marca V4:', err);
      setErrorMessage('No se pudieron guardar los cambios del Manual de Marca V4. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreVersion = async (versionId: string, versionLabel?: string) => {
    if (isBusy || !canEdit) return;
    const confirmMessage =
      versionId === 'OFFICIAL_SEED'
        ? '¿Deseas restaurar el Manual de Marca V4 Oficial? Se reemplazarán los ajustes actuales con los lineamientos oficiales base.'
        : `¿Deseas restaurar la versión "${sanitizeSnapshotLabel(versionLabel)}"? Los cambios actuales se respaldarán en el historial antes de aplicar la restauración.`;
    if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
      return;
    }

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
      invalidateBrandManualCache();
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

  const triggerHtmlFallbackDownload = (html: string, filename: string) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPdf = () => {
    if (!manual) return;
    const html = buildBrandManualPrintableHtml(manual);
    const fallbackFilename = 'Manual_Marca_Chopo_V4.html';
    try {
      const printWin = window.open('', '_blank', 'width=1060,height=860');
      if (!printWin) {
        triggerHtmlFallbackDownload(html, fallbackFilename);
        showToast('Tu navegador bloqueó la ventana de impresión. Se descargó Manual_Marca_Chopo_V4.html listo para imprimir como PDF.');
        return;
      }
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      window.setTimeout(() => {
        try {
          printWin.focus();
          printWin.print();
        } catch {
          // El usuario puede presionar el botón superior "Guardar como PDF / Imprimir"
        }
      }, 350);
      showToast('Vista ejecutiva abierta. Selecciona "Guardar como PDF" en el diálogo de impresión.');
    } catch {
      triggerHtmlFallbackDownload(html, fallbackFilename);
      showToast('Se descargó Manual_Marca_Chopo_V4.html listo para abrir e imprimir como PDF.');
    }
  };

  const handleDownloadText = () => {
    if (!manual) return;
    const textContent = exportBrandManualToMarkdown(manual);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Manual_Marca_Chopo_V4.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Descarga iniciada: Manual_Marca_Chopo_V4.txt');
  };

  const allPaletteColors = useMemo<BrandColorItem[]>(() => {
    if (!manual) return [];
    return [
      ...manual.color_palette.primaryDigital,
      ...manual.color_palette.secondaryDigital,
      ...manual.color_palette.promotionalAndButtons
    ];
  }, [manual]);

  const colorNameByHex = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = { ...FALLBACK_HEX_NAMES };
    allPaletteColors.forEach((c) => {
      if (c?.hex && c?.name) {
        map[normalizeHexForPicker(c.hex)] = c.name;
      }
    });
    return map;
  }, [allPaletteColors]);

  const displayVersions = useMemo<ConfigVersionSnapshot[]>(() => {
    const seenIds = new Set<string>();
    const seenSeedFingerprints = new Set<string>();
    const deduped: ConfigVersionSnapshot[] = [];

    for (const ver of versions) {
      if (!ver) continue;
      const vid = String(ver.versionId || '');
      if (vid && seenIds.has(vid)) continue;

      const sanitized = sanitizeSnapshotLabel(ver.label);
      const isInitialSeedEntry =
        vid === 'v_seed_initial_brand_manual' ||
        vid === 'OFFICIAL_SEED' ||
        /^Manual de Marca (Oficial )?V4( Oficial)? — Laboratorio Médico del Chopo$/i.test(sanitized);

      if (isInitialSeedEntry) {
        const seedFp = `initial_seed_${ver.timestamp || 'base'}`;
        if (seenSeedFingerprints.has(seedFp) || (vid === 'v_seed_initial_brand_manual' && seenSeedFingerprints.size > 0)) {
          continue;
        }
        seenSeedFingerprints.add(seedFp);
      }

      if (vid) seenIds.add(vid);
      deduped.push(ver);
    }

    return deduped;
  }, [versions]);

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
    if (!canEdit) return;
    const newItem: BrandColorItem = {
      id: `custom_color_${Date.now()}`,
      name: 'Nuevo Color Corporativo',
      hex: '#005FFC',
      rgb: 'R:0 G:95 B:252',
      usage: 'Define el uso autorizado de este color en materiales de marca.'
    };
    updateColorGroup(groupKey, (list) => [...list, newItem]);
  };

  const handleDeleteColor = (
    groupKey: 'primaryDigital' | 'secondaryDigital' | 'promotionalAndButtons',
    idx: number,
    colorItem: BrandColorItem
  ) => {
    if (!canEdit || isProtectedInstitutionalColor(colorItem)) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`¿Deseas eliminar el color "${colorItem.name}" (${colorItem.hex}) de la paleta?`)
    ) {
      return;
    }
    updateColorGroup(groupKey, (items) => items.filter((_, i) => i !== idx));
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
    if (!canEdit) return;
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
    if (!canEdit) return;
    const draftKey = `${rowIdx}_${field}`;
    const trimmed = rawHex.trim().toUpperCase();
    if (!trimmed) {
      setContrastHexErrors((prev) => ({
        ...prev,
        [draftKey]: 'Ingresa un código HEX válido de 6 dígitos (ejemplo: #004699).'
      }));
      return;
    }
    const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!/^#[0-9A-F]{6}$/.test(formatted)) {
      setContrastHexErrors((prev) => ({
        ...prev,
        [draftKey]: 'Código HEX no válido. Usa formato de 6 caracteres, por ejemplo #004699.'
      }));
      return;
    }
    const existingList = manual?.color_palette.contrastMatrix?.[rowIdx]?.[field] || [];
    if (existingList.map((h) => h.toUpperCase()).includes(formatted)) {
      setContrastHexErrors((prev) => ({
        ...prev,
        [draftKey]: `El color ${formatted} ya está registrado en esta lista.`
      }));
      return;
    }
    handleUpdateContrastRow(rowIdx, (row) => {
      const current = row[field] || [];
      if (current.map((h) => h.toUpperCase()).includes(formatted)) return row;
      return { ...row, [field]: [...current, formatted] };
    });
    setContrastHexDrafts((prev) => ({ ...prev, [draftKey]: '' }));
    setContrastHexErrors((prev) => ({ ...prev, [draftKey]: '' }));
  };

  // Helpers for Tab 5 channels
  const handleCreateChannel = () => {
    if (!canEdit) return;
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
    if (BUILT_IN_CHANNEL_IDS.has(chKey) || !manual || !canEdit) return;
    const chLabel = manual.channels.items[chKey]?.label || chKey;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`¿Deseas eliminar el canal personalizado "${chLabel}" y todas sus reglas?`)
    ) {
      return;
    }
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
    if (!manual || !manual.channels.items[selectedChannelKey] || !canEdit) return;
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
    if (!canEdit) return;
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
            disabled={isControlsDisabled}
            onClick={() => handleAddColorToGroup(groupKey)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EFF9FE] hover:bg-blue-100 text-[#004699] border border-blue-200 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            <span>Agregar Color</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((colorItem, idx) => {
            const safeHex = normalizeHexForPicker(colorItem.hex);
            const light = isLightHex(safeHex);
            const isProtected = isProtectedInstitutionalColor(colorItem);
            return (
              <div
                key={colorItem.id || idx}
                className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/40 flex flex-col shadow-sm hover:border-[#005FFC]/50 transition-colors"
              >
                {/* Live Color Swatch Preview */}
                <div
                  className="min-h-[6.25rem] p-3 flex flex-col justify-between gap-2 relative border-b border-slate-200/70"
                  style={{ backgroundColor: safeHex }}
                >
                  <div className="flex items-center justify-between gap-2">
                    {isProtected ? (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                          light
                            ? 'bg-white/85 text-[#004699] border border-slate-200/80'
                            : 'bg-slate-900/35 text-white/95 backdrop-blur-sm'
                        }`}
                        title="Color institucional obligatorio"
                      >
                        Institucional
                      </span>
                    ) : (
                      <span />
                    )}

                    {isProtected ? (
                      <button
                        type="button"
                        disabled
                        className={`p-1.5 rounded-lg cursor-not-allowed opacity-90 shrink-0 ${
                          light
                            ? 'bg-white/90 text-[#004699] border border-slate-200'
                            : 'bg-slate-900/35 text-white/90 border border-white/20'
                        }`}
                        title="Color institucional obligatorio"
                        aria-label="Color institucional obligatorio"
                      >
                        <Lock size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isControlsDisabled}
                        onClick={() => handleDeleteColor(groupKey, idx, colorItem)}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                          light
                            ? 'bg-white/90 text-slate-500 hover:text-rose-600 border border-slate-200'
                            : 'bg-slate-900/30 text-white/90 hover:bg-rose-600'
                        }`}
                        title="Eliminar color"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide shadow-sm ${
                        light
                          ? 'bg-white/85 text-[#004699] border border-slate-200/80'
                          : 'bg-slate-900/35 text-white backdrop-blur-sm'
                      }`}
                    >
                      {colorItem.hex}
                    </span>

                    <label
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm shrink-0 transition-opacity ${
                        isControlsDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'
                      } ${
                        light
                          ? 'bg-white/90 text-[#004699] border border-slate-200'
                          : 'bg-white/20 text-white backdrop-blur-sm border border-white/30'
                      }`}
                      title="Elegir color visualmente"
                    >
                      <input
                        type="color"
                        disabled={isControlsDisabled}
                        value={safeHex}
                        onChange={(e) => {
                          const picked = e.target.value.toUpperCase();
                          updateColorGroup(groupKey, (items) =>
                            items.map((c, i) =>
                              i === idx ? { ...c, hex: picked, rgb: hexToRgbString(picked) } : c
                            )
                          );
                        }}
                        className="w-4 h-4 rounded border-0 p-0 bg-transparent cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span>Selector</span>
                    </label>
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
                      disabled={isControlsDisabled}
                      value={colorItem.name}
                      onChange={(e) =>
                        updateColorGroup(groupKey, (items) =>
                          items.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c))
                        )
                      }
                      className="w-full px-3 py-1.5 text-sm font-semibold text-[#004699] bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Código HEX
                      </label>
                      <input
                        type="text"
                        disabled={isControlsDisabled}
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
                        className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                        Equivalencia RGB
                      </label>
                      <input
                        type="text"
                        disabled={isControlsDisabled}
                        value={colorItem.rgb}
                        onChange={(e) =>
                          updateColorGroup(groupKey, (items) =>
                            items.map((c, i) => (i === idx ? { ...c, rgb: e.target.value } : c))
                          )
                        }
                        className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Uso autorizado
                    </label>
                    <textarea
                      rows={2}
                      disabled={isControlsDisabled}
                      value={colorItem.usage}
                      onChange={(e) =>
                        updateColorGroup(groupKey, (items) =>
                          items.map((c, i) => (i === idx ? { ...c, usage: e.target.value } : c))
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 resize-y leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
            disabled={isControlsDisabled}
            onClick={() => handleRestoreVersion('OFFICIAL_SEED')}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#004699] text-sm font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Read-Only Governance Banner */}
        {isReadOnly && (
          <div className="px-6 py-3 bg-gradient-to-r from-[#004699] to-[#003575] border-b border-amber-400/60 flex flex-wrap items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              <span className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-300/60 flex items-center justify-center text-amber-300 shrink-0">
                <Lock size={15} />
              </span>
              <span>
                Modo Consulta (Solo Lectura — La edición del Manual de Marca V4 está reservada para Brand Owners)
              </span>
            </div>
            {currentUserEmail && (
              <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-medium text-blue-100">
                Sesión: {currentUserEmail}
              </span>
            )}
          </div>
        )}

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
                  {hasUnsavedChanges && !isReadOnly && (
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
                disabled={isControlsDisabled}
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                placeholder={
                  isReadOnly
                    ? 'Edición restringida a Brand Owners...'
                    : 'Nota de cambio (opcional)...'
                }
                className="flex-1 min-w-[220px] max-w-md px-4 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={isControlsDisabled}
                onClick={handleSave}
                title={isReadOnly ? 'Modo consulta: solo Brand Owners pueden guardar cambios' : 'Guardar cambios del Manual de Marca V4'}
                className="px-5 py-2.5 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white text-sm font-bold shadow-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  const next = !isHistoryOpen;
                  setIsHistoryOpen(next);
                  if (next) fetchVersions();
                }}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 ${
                  isHistoryOpen
                    ? 'bg-[#004699] text-white border-[#004699]'
                    : 'bg-white hover:bg-slate-50 text-[#004699] border-slate-200'
                }`}
              >
                <History size={15} />
                <span>Historial de Versiones</span>
                {displayVersions.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isHistoryOpen ? 'bg-white/20 text-white' : 'bg-[#EFF9FE] text-[#005FFC]'
                    }`}
                  >
                    {displayVersions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={handleExportPdf}
                className="px-4 py-2.5 rounded-xl bg-[#004699] hover:bg-[#003575] text-white border border-[#004699] text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                <Printer size={15} className="text-[#63CF00]" />
                <span>Exportar Manual (PDF)</span>
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={handleDownloadText}
                className="px-3 py-2.5 rounded-xl bg-white hover:bg-[#EFF9FE] text-[#004699] border border-slate-200 hover:border-blue-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Descargar versión en archivo de texto plano"
              >
                <Download size={14} className="text-[#005FFC]" />
                <span>Descargar Texto</span>
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
                  disabled={isControlsDisabled}
                  onClick={() => handleRestoreVersion('OFFICIAL_SEED')}
                  title={isReadOnly ? 'Solo Brand Owners pueden restaurar versiones' : 'Restaurar a la versión oficial V4'}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-amber-50 text-[#004699] border border-slate-300 hover:border-amber-400 text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {displayVersions.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-500">
                Aún no hay versiones guardadas personalizadas. Puedes editar cualquier pestaña y presionar &ldquo;Guardar Cambios&rdquo;, o restablecer con &ldquo;Restaurar Manual V4 Oficial&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {displayVersions.map((ver) => {
                  const updatedBy = (ver as any).updatedBy || (ver as any).author || (ver as any).userEmail;
                  return (
                    <div
                      key={ver.versionId}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-sm hover:border-blue-300 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#004699] truncate">
                          {sanitizeSnapshotLabel(ver.label)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {formatMexicanDate(ver.timestamp || (ver as any).createdAt)}
                          {updatedBy ? ` · Por: ${updatedBy}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isControlsDisabled}
                        onClick={() => handleRestoreVersion(ver.versionId, ver.label)}
                        className="px-3.5 py-2 rounded-xl bg-[#EFF9FE] hover:bg-[#005FFC] text-[#005FFC] hover:text-white text-xs font-bold transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Restaurar esta versión
                      </button>
                    </div>
                  );
                })}
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#004699]">Identidad Oficial, Slogan y Propósito</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nombres oficiales autorizados, descriptivo del logotipo y frase paraguas obligatoria en todas las campañas.
                </p>
              </div>
              <SourcePagesBadge pages={manual.identity_and_voice.sourcePages} />
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
                  disabled={isControlsDisabled}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                    Descriptivo Obligatorio del Logotipo
                  </label>
                  <input
                    type="text"
                    disabled={isControlsDisabled}
                    value={manual.identity_and_voice.logoDescriptor}
                    onChange={(e) =>
                      updateManual((prev) => ({
                        ...prev,
                        identity_and_voice: { ...prev.identity_and_voice, logoDescriptor: e.target.value }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                    Slogan Obligatorio
                  </label>
                  <input
                    type="text"
                    disabled={isControlsDisabled}
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
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-[#004699] bg-[#EFF9FE]/60 focus:bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
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
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Propósito de Marca
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
                  value={manual.identity_and_voice.purpose}
                  onChange={(e) =>
                    updateManual((prev) => ({
                      ...prev,
                      identity_and_voice: { ...prev.identity_and_voice, purpose: e.target.value }
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
                const isB2D = segKey === 'b2d_doctors' || seg.code === 'B2D';
                const badgeStyle =
                  seg.code === 'B2C'
                    ? 'bg-[#EFF9FE] text-[#005FFC] border-blue-200'
                    : seg.code === 'B2D'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200';

                const pronounHint =
                  seg.pronoun === 'Tú'
                    ? isB2D
                      ? 'Trato cercano de colega clínico con respeto profesional, sin confianzas.'
                      : 'Trato cálido, empático y cotidiano para pacientes y familias.'
                    : 'Trato formal e institucional para empresas y convenios.';

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
                          disabled={isControlsDisabled}
                          value={seg.label}
                          onChange={(e) => updateSegment({ label: e.target.value })}
                          className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Pronombre de trato
                          </label>
                          <select
                            disabled={isControlsDisabled}
                            value={seg.pronoun}
                            onChange={(e) => updateSegment({ pronoun: e.target.value })}
                            className="w-full px-2.5 py-2 text-xs font-bold text-[#004699] bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                          >
                            <option value="Tú">
                              {isB2D ? 'Tú (respetuoso entre colegas)' : 'Tú (cercano y cotidiano)'}
                            </option>
                            <option value="Usted">Usted (formal institucional)</option>
                          </select>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{pronounHint}</p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Destino principal
                          </label>
                          <input
                            type="text"
                            disabled={isControlsDisabled}
                            value={seg.primaryDestination}
                            onChange={(e) => updateSegment({ primaryDestination: e.target.value })}
                            className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Guía de tono y personalidad
                        </label>
                        <textarea
                          rows={3}
                          disabled={isControlsDisabled}
                          value={seg.toneGuidance}
                          onChange={(e) => updateSegment({ toneGuidance: e.target.value })}
                          className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Leyenda precautoria obligatoria
                        </label>
                        <input
                          type="text"
                          disabled={isControlsDisabled}
                          value={seg.mandatoryPrecautionaryLegend}
                          onChange={(e) => updateSegment({ mandatoryPrecautionaryLegend: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold text-[#004699] bg-amber-50/50 focus:bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
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
                          disabled={isControlsDisabled}
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
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-700 uppercase tracking-wide mb-1.5">
                  Cero Signos de Admiración (¡...!)
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-rose-50/40 focus:bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Claridad Sobre Tecnicismos
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Ingenio vs. Humor
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
                  disabled={isControlsDisabled}
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
                  disabled={isControlsDisabled}
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
                  title: stageKey,
                  subtitle: stage.label || stageKey,
                  colorClass: 'bg-slate-100 text-slate-700 border-slate-200'
                };
                const stageSubtitle = formatFunnelSubtitle(stageKey, stage.label);
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
                      <span className="text-xs font-semibold text-slate-600 truncate">{stageSubtitle}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#004699] uppercase tracking-wide mb-1">
                        Regla de Titular
                      </label>
                      <textarea
                        rows={4}
                        disabled={isControlsDisabled}
                        value={stage.headlineRule}
                        onChange={(e) => updateStage({ headlineRule: e.target.value })}
                        className="w-full px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#004699] uppercase tracking-wide mb-1">
                        Enfoque del Cuerpo
                      </label>
                      <textarea
                        rows={3}
                        disabled={isControlsDisabled}
                        value={stage.bodyFocus}
                        onChange={(e) => updateStage({ bodyFocus: e.target.value })}
                        className="w-full px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#004699] uppercase tracking-wide mb-1">
                        Ubicación y Estilo de Llamado a la Acción
                      </label>
                      <textarea
                        rows={3}
                        disabled={isControlsDisabled}
                        value={stage.ctaPlacementAndStyle}
                        onChange={(e) => updateStage({ ctaPlacementAndStyle: e.target.value })}
                        className="w-full px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
                disabled={isControlsDisabled}
              />

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Regla de aplicación de puntos de contacto
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
                      disabled={isControlsDisabled}
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
                      className="w-full px-3 py-2 text-sm font-bold text-[#004699] bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Estándar de citación
                    </label>
                    <input
                      type="text"
                      disabled={isControlsDisabled}
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
                      className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Regla de citación médica
                  </label>
                  <textarea
                    rows={3}
                    disabled={isControlsDisabled}
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
                    className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <label className="block text-sm font-bold text-[#004699]">
                  Regla de Permisos COFEPRIS
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-xs text-slate-700 bg-amber-50/40 focus:bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
                  disabled={isControlsDisabled}
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
                  disabled={isControlsDisabled}
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
                  disabled={isControlsDisabled}
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
                          disabled={isControlsDisabled}
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#004699]">Dirección de Arte y Estilo Fotográfico</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lineamientos de calidez humana, temperatura de luz, fotografía base limpia y evaluación de autenticidad.
                </p>
              </div>
              <SourcePagesBadge pages={manual.photography_and_imagery.sourcePages} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Filosofía General de Fotografía
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Regla de Temperatura de Color e Iluminación
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Regla de Fotografía Base Limpia (Generación de Imágenes)
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-[#EFF9FE]/50 focus:bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Guía de Calidez para Evaluación en Focus Group
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
                disabled={isControlsDisabled}
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
                disabled={isControlsDisabled}
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#004699]">Ambientación de Color en Escenas Fotográficas</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Guía sutil para vestimenta, consultorios y detalles de ambiente sin teñir piel ni paredes.
                </p>
              </div>
              <SourcePagesBadge pages={manual.color_palette.sourcePages} />
            </div>
            <textarea
              rows={3}
              disabled={isControlsDisabled}
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
              className="w-full px-4 py-3 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
                  Combinaciones autorizadas y restringidas de color de texto o elementos sobre cada color de fondo, con vista previa real Aa.
                </p>
              </div>
              <button
                type="button"
                disabled={isControlsDisabled}
                onClick={handleAddContrastRow}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EFF9FE] hover:bg-blue-100 text-[#004699] border border-blue-200 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            disabled={isControlsDisabled}
                            value={row.backgroundName}
                            onChange={(e) =>
                              handleUpdateContrastRow(rowIdx, (r) => ({
                                ...r,
                                backgroundName: e.target.value
                              }))
                            }
                            className={`w-full px-2.5 py-1.5 text-sm font-bold rounded-lg border focus:outline-none disabled:opacity-85 disabled:cursor-not-allowed ${
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
                              disabled={isControlsDisabled}
                              value={bgSafe}
                              onChange={(e) =>
                                handleUpdateContrastRow(rowIdx, (r) => ({
                                  ...r,
                                  backgroundHex: e.target.value.toUpperCase()
                                }))
                              }
                              className="w-7 h-7 rounded cursor-pointer border border-white/60 bg-transparent disabled:cursor-not-allowed"
                            />
                            <input
                              type="text"
                              disabled={isControlsDisabled}
                              value={row.backgroundHex}
                              onChange={(e) =>
                                handleUpdateContrastRow(rowIdx, (r) => ({
                                  ...r,
                                  backgroundHex: e.target.value.toUpperCase()
                                }))
                              }
                              className={`w-24 px-2 py-1 text-xs font-bold rounded-lg border disabled:opacity-85 disabled:cursor-not-allowed ${
                                bgLight
                                  ? 'bg-white/90 text-slate-800 border-slate-300'
                                  : 'bg-slate-900/30 text-white border-white/30'
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isControlsDisabled}
                            onClick={() =>
                              updateManual((prev) => ({
                                ...prev,
                                color_palette: {
                                  ...prev.color_palette,
                                  contrastMatrix: prev.color_palette.contrastMatrix.filter((_, i) => i !== rowIdx)
                                }
                              }))
                            }
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
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
                      <div className="lg:col-span-9 p-4 bg-white space-y-4 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                          {/* Allowed Foregrounds */}
                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2 size={14} />
                              <span>Permitidos (✓)</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(row.allowedForegrounds || []).map((fgHex, fgIdx) => {
                                const fgSafe = normalizeHexForPicker(fgHex);
                                const resolvedName = resolveColorShortName(fgHex, colorNameByHex);
                                return (
                                  <span
                                    key={`${fgHex}_${fgIdx}`}
                                    className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-950"
                                    title={`${colorNameByHex[fgSafe] || fgHex} (${fgHex}) sobre ${row.backgroundName}`}
                                  >
                                    <span
                                      className="inline-flex items-center justify-center w-7 h-5 rounded-full text-[10px] font-black border border-slate-300/80 shrink-0"
                                      style={{ backgroundColor: bgSafe, color: fgSafe }}
                                    >
                                      Aa
                                    </span>
                                    <span className="font-bold">{resolvedName}</span>
                                    <span className="text-[10px] text-emerald-700/80 font-mono">{fgHex}</span>
                                    <button
                                      type="button"
                                      disabled={isControlsDisabled}
                                      onClick={() =>
                                        handleUpdateContrastRow(rowIdx, (r) => ({
                                          ...r,
                                          allowedForegrounds: r.allowedForegrounds.filter((_, i) => i !== fgIdx)
                                        }))
                                      }
                                      className="text-emerald-600 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                      title="Quitar color permitido"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1 min-w-0">
                              <select
                                disabled={isControlsDisabled}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setContrastHexErrors((prev) => ({ ...prev, [allowedKey]: '' }));
                                    handleAddContrastChip(rowIdx, 'allowedForegrounds', e.target.value);
                                  }
                                }}
                                className="flex-1 min-w-0 w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed"
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
                                disabled={isControlsDisabled}
                                value={contrastHexDrafts[allowedKey] || ''}
                                onChange={(e) => {
                                  setContrastHexDrafts((prev) => ({
                                    ...prev,
                                    [allowedKey]: e.target.value
                                  }));
                                  if (contrastHexErrors[allowedKey]) {
                                    setContrastHexErrors((prev) => ({ ...prev, [allowedKey]: '' }));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddContrastChip(
                                      rowIdx,
                                      'allowedForegrounds',
                                      contrastHexDrafts[allowedKey] || ''
                                    );
                                  }
                                }}
                                placeholder="#HEX"
                                className={`w-20 shrink-0 px-2 py-1.5 text-xs bg-slate-50 border rounded-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                                  contrastHexErrors[allowedKey]
                                    ? 'border-rose-400 focus:ring-rose-300'
                                    : 'border-slate-200'
                                }`}
                              />
                              <button
                                type="button"
                                disabled={isControlsDisabled}
                                onClick={() =>
                                  handleAddContrastChip(
                                    rowIdx,
                                    'allowedForegrounds',
                                    contrastHexDrafts[allowedKey] || ''
                                  )
                                }
                                className="px-2.5 py-1.5 shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Agregar HEX permitido"
                              >
                                +
                              </button>
                            </div>
                            {contrastHexErrors[allowedKey] && (
                              <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span>{contrastHexErrors[allowedKey]}</span>
                              </p>
                            )}
                          </div>

                          {/* Forbidden Foregrounds */}
                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                              <Ban size={14} />
                              <span>Prohibidos (✕)</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(row.forbiddenForegrounds || []).map((fgHex, fgIdx) => {
                                const fgSafe = normalizeHexForPicker(fgHex);
                                const resolvedName = resolveColorShortName(fgHex, colorNameByHex);
                                return (
                                  <span
                                    key={`${fgHex}_${fgIdx}`}
                                    className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs text-rose-950"
                                    title={`${colorNameByHex[fgSafe] || fgHex} (${fgHex}) prohibido sobre ${row.backgroundName}`}
                                  >
                                    <span
                                      className="inline-flex items-center justify-center w-7 h-5 rounded-full text-[10px] font-black border border-slate-300/80 shrink-0"
                                      style={{ backgroundColor: bgSafe, color: fgSafe }}
                                    >
                                      Aa
                                    </span>
                                    <span className="font-bold">{resolvedName}</span>
                                    <span className="text-[10px] text-rose-700/80 font-mono">{fgHex}</span>
                                    <button
                                      type="button"
                                      disabled={isControlsDisabled}
                                      onClick={() =>
                                        handleUpdateContrastRow(rowIdx, (r) => ({
                                          ...r,
                                          forbiddenForegrounds: r.forbiddenForegrounds.filter((_, i) => i !== fgIdx)
                                        }))
                                      }
                                      className="text-rose-600 hover:text-rose-900 disabled:opacity-40 disabled:cursor-not-allowed"
                                      title="Quitar color prohibido"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1 min-w-0">
                              <select
                                disabled={isControlsDisabled}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setContrastHexErrors((prev) => ({ ...prev, [forbiddenKey]: '' }));
                                    handleAddContrastChip(rowIdx, 'forbiddenForegrounds', e.target.value);
                                  }
                                }}
                                className="flex-1 min-w-0 w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-60 disabled:cursor-not-allowed"
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
                                disabled={isControlsDisabled}
                                value={contrastHexDrafts[forbiddenKey] || ''}
                                onChange={(e) => {
                                  setContrastHexDrafts((prev) => ({
                                    ...prev,
                                    [forbiddenKey]: e.target.value
                                  }));
                                  if (contrastHexErrors[forbiddenKey]) {
                                    setContrastHexErrors((prev) => ({ ...prev, [forbiddenKey]: '' }));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddContrastChip(
                                      rowIdx,
                                      'forbiddenForegrounds',
                                      contrastHexDrafts[forbiddenKey] || ''
                                    );
                                  }
                                }}
                                placeholder="#HEX"
                                className={`w-20 shrink-0 px-2 py-1.5 text-xs bg-slate-50 border rounded-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                                  contrastHexErrors[forbiddenKey]
                                    ? 'border-rose-400 focus:ring-rose-300'
                                    : 'border-slate-200'
                                }`}
                              />
                              <button
                                type="button"
                                disabled={isControlsDisabled}
                                onClick={() =>
                                  handleAddContrastChip(
                                    rowIdx,
                                    'forbiddenForegrounds',
                                    contrastHexDrafts[forbiddenKey] || ''
                                  )
                                }
                                className="px-2.5 py-1.5 shrink-0 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Agregar HEX prohibido"
                              >
                                +
                              </button>
                            </div>
                            {contrastHexErrors[forbiddenKey] && (
                              <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span>{contrastHexErrors[forbiddenKey]}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Notas y excepciones de contraste
                          </label>
                          <input
                            type="text"
                            disabled={isControlsDisabled}
                            value={row.notes}
                            onChange={(e) =>
                              handleUpdateContrastRow(rowIdx, (r) => ({ ...r, notes: e.target.value }))
                            }
                            className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
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
          {/* Mandatory Prominent Info Banner + Source Pages + Expand/Collapse Toggle */}
          <div className="rounded-2xl bg-[#EFF9FE] border border-[#BDD4F2] p-5 space-y-3 text-[#004699] shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-blue-200 flex items-center justify-center text-[#005FFC] shrink-0 mt-0.5">
                <Info size={20} />
              </div>
              <p className="text-sm font-medium leading-relaxed flex-1">
                <strong className="font-bold">Uso de esta sección:</strong> Estas reglas gráficas guían las plantillas de vista previa y al Revisor Automático (Agente Evaluador) cuando audita artes finales diseñados por agencia. No se envían al generador de fotografías base para mantener las fotos limpias sin logos ni textos deformados.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200/70">
              <SourcePagesBadge pages={manual.graphic_design_and_layout.sourcePages} />
              <button
                type="button"
                onClick={toggleAllDesignAccordions}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-[#004699] border border-blue-200 text-xs font-bold transition-colors"
              >
                <ChevronsUpDown size={14} className="text-[#005FFC]" />
                <span>{allDesignAccordionsOpen ? 'Contraer todo' : 'Expandir todo'}</span>
              </button>
            </div>
          </div>

          {/* 1. Reglas de Logotipo */}
          <AccordionCard
            title="Reglas de Logotipo"
            subtitle="Descriptivo obligatorio, contraste sobre fotografía, ubicación y cobrandeo"
            icon={<ShieldCheck size={18} />}
            defaultOpen={true}
            isOpen={designAccordions.logo}
            onToggle={() => toggleDesignAccordion('logo')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Descriptivo obligatorio
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Contraste sobre fotografías
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Color en aplicaciones modulares
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Ubicación autorizada
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Regla de cobrandeo con aliados
                </label>
                <textarea
                  rows={2}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </AccordionCard>

          {/* 2. Tipografía */}
          <AccordionCard
            title="Tipografía (Avenir / Roboto y Jerarquía de Pesos)"
            subtitle="Familias oficiales y jerarquía BLACK / HEAVY / MEDIUM / LIGHT"
            icon={<Type size={18} />}
            defaultOpen={true}
            isOpen={designAccordions.typography}
            onToggle={() => toggleDesignAccordion('typography')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Familia Tipográfica Principal
                </label>
                <input
                  type="text"
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Alternativa Web e Interfaz
                </label>
                <input
                  type="text"
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
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
                          disabled={isControlsDisabled}
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
                          className="flex-1 px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
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
                disabled={isControlsDisabled}
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
                className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
              />
            </div>
          </AccordionCard>

          {/* 3. Línea Basal Verde */}
          <AccordionCard
            title="Línea Basal Verde (#63CF00)"
            subtitle="Onda de pulso característica: proporciones, interacción tridimensional, recortes y no agresión"
            icon={<Layers size={18} />}
            accentColor="border-t-[#63CF00]"
            defaultOpen={false}
            isOpen={designAccordions.lineaBasal}
            onToggle={() => toggleDesignAccordion('lineaBasal')}
          >
            <div>
              <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                Descripción y significado
              </label>
              <textarea
                rows={2}
                disabled={isControlsDisabled}
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
                className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
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
                  disabled={isControlsDisabled}
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
                  disabled={isControlsDisabled}
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
                  disabled={isControlsDisabled}
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
                  disabled={isControlsDisabled}
                />
              </div>
            </div>
          </AccordionCard>

          {/* 4. Modularidad y Cajas */}
          <AccordionCard
            title="Modularidad y Cajas"
            subtitle="Geometría de esquinas, cajas ancladas a bordes, orientación y límites máximos"
            icon={<Layers size={18} />}
            defaultOpen={false}
            isOpen={designAccordions.modularity}
            onToggle={() => toggleDesignAccordion('modularity')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Geometría de Esquinas y Radios
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Prohibición de Cajas Flotantes
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Orientación de un Solo Eje
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Límites Máximos de Tamaño
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Composición Horizontal y Pleca de Llamado a la Acción
                </label>
                <textarea
                  rows={3}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
            defaultOpen={false}
            isOpen={designAccordions.pricing}
            onToggle={() => toggleDesignAccordion('pricing')}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Color Obligatorio
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Círculo Rebasado sobre Fotografía
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Caja Promocional Modular
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </AccordionCard>

          {/* 6. Íconos, Legales y Piezas sin Foto */}
          <AccordionCard
            title="Íconos, Legales y Piezas sin Foto"
            subtitle="Iconografía monocromática, ubicación de textos legales y piezas de fondo sólido"
            icon={<FileText size={18} />}
            defaultOpen={false}
            isOpen={designAccordions.iconsLegals}
            onToggle={() => toggleDesignAccordion('iconsLegals')}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Íconos
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Ubicación de Legales
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Piezas sin Fotografía
                </label>
                <textarea
                  rows={4}
                  disabled={isControlsDisabled}
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
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
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
                  const rawLabel = (ch?.label || '').trim();
                  const isUnchangedBuiltIn =
                    Boolean(BUILT_IN_CHANNEL_SHORT_LABELS[chKey]) &&
                    (!rawLabel || rawLabel === BUILT_IN_CHANNEL_DEFAULT_FULL_LABELS[chKey]);
                  const pillName = isUnchangedBuiltIn
                    ? BUILT_IN_CHANNEL_SHORT_LABELS[chKey]
                    : rawLabel || BUILT_IN_CHANNEL_SHORT_LABELS[chKey] || chKey;
                  const isActive = selectedChannelKey === chKey;
                  return (
                    <button
                      key={chKey}
                      type="button"
                      onClick={() => setSelectedChannelKey(chKey)}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all max-w-xs truncate ${
                        isActive
                          ? 'bg-[#005FFC] text-white border-[#005FFC] shadow-sm'
                          : 'bg-slate-50 hover:bg-[#EFF9FE] text-[#004699] border-slate-200 hover:border-blue-300'
                      }`}
                      title={rawLabel || pillName}
                    >
                      {pillName}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={isControlsDisabled}
                onClick={() => setIsCreatingChannel(!isCreatingChannel)}
                className="px-4 py-2.5 rounded-xl bg-[#EFF9FE] hover:bg-blue-100 text-[#004699] border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={15} />
                <span>Nuevo Canal</span>
              </button>
            </div>

            {isCreatingChannel && !isReadOnly && (
              <div className="p-4 rounded-xl bg-[#EFF9FE]/70 border border-blue-200 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  disabled={isControlsDisabled}
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
                  disabled={isControlsDisabled || !newChannelName.trim()}
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide">
                      Nombre descriptivo del canal
                    </label>
                    <SourcePagesBadge pages={activeChannel.sourcePages} />
                  </div>
                  <input
                    type="text"
                    disabled={isControlsDisabled}
                    value={activeChannel.label}
                    onChange={(e) =>
                      updateSelectedChannel((ch) => ({ ...ch, label: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 text-base font-bold text-[#004699] bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-80 disabled:cursor-not-allowed"
                  />
                </div>

                {!BUILT_IN_CHANNEL_IDS.has(selectedChannelKey) && (
                  <button
                    type="button"
                    disabled={isControlsDisabled}
                    onClick={() => handleDeleteCustomChannel(selectedChannelKey)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={isControlsDisabled}
                        onClick={() =>
                          updateSelectedChannel((ch) => ({
                            ...ch,
                            supportedFormats: ch.supportedFormats.filter((_, i) => i !== fmtIdx)
                          }))
                        }
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    disabled={isControlsDisabled}
                    value={newFormatInput}
                    onChange={(e) => setNewFormatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChannelFormat();
                      }
                    }}
                    placeholder="ej. Carrusel 4:5, Póster Vertical..."
                    className="w-72 px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    disabled={isControlsDisabled || !newFormatInput.trim()}
                    onClick={handleAddChannelFormat}
                    className="px-3.5 py-2 rounded-xl bg-[#EFF9FE] hover:bg-blue-100 text-[#004699] border border-blue-200 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={isControlsDisabled}
                    value={activeChannel.copyRules}
                    onChange={(e) =>
                      updateSelectedChannel((ch) => ({ ...ch, copyRules: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                    Reglas de Fotografía y Encuadre
                  </label>
                  <textarea
                    rows={5}
                    disabled={isControlsDisabled}
                    value={activeChannel.photoRules}
                    onChange={(e) =>
                      updateSelectedChannel((ch) => ({ ...ch, photoRules: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#004699] uppercase tracking-wide mb-1.5">
                  Contexto de Experiencia para Focus Group
                </label>
                <textarea
                  rows={2}
                  disabled={isControlsDisabled}
                  value={activeChannel.focusGroupContext}
                  onChange={(e) =>
                    updateSelectedChannel((ch) => ({ ...ch, focusGroupContext: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005FFC]/30 leading-relaxed disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              {/* Auditor Rules Checklist */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[#004699]">
                    Lista de Verificación del Revisor Automático (Agente Evaluador)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Criterios específicos que se auditan automáticamente para las piezas de este canal. Las reglas que inician con PROHIBIDO o NUNCA se destacan como restricciones críticas.
                  </p>
                </div>
                <EditableStringList
                  items={activeChannel.auditorRules || []}
                  onChange={(next) =>
                    updateSelectedChannel((ch) => ({ ...ch, auditorRules: next }))
                  }
                  variant="checklist"
                  multiline
                  addButtonLabel="+ Agregar regla"
                  placeholder="Escribe una regla de revisión para este canal..."
                  disabled={isControlsDisabled}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
