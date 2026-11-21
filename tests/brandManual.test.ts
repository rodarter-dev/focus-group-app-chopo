import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildBrandSlices,
  exportBrandManualToMarkdown,
  resolveSegmentKey,
  resolveTrackFromSegment,
  getSubformatsForChannel
} from '../services/brandManualUtils.js';
import type { BrandManualConfig } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_PATH = path.resolve(__dirname, '../data/seeds/brand_manual_seed.json');
const RAG_SEEDS_DIR = path.resolve(__dirname, '../data/seeds/rag_docs');

const officialSeed: BrandManualConfig = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));

describe('Chopo Brand Manual V4 — Seed Integrity & RAG Separation', () => {
  test('official seed contains all 5 mandatory V4 sections and metadata', () => {
    expect(officialSeed.metadata.id).toBe('chopo_brand_manual_v4');
    expect(officialSeed.metadata.version).toBe('4.0.0');
    expect(officialSeed.identity_and_voice.officialBrandNames).toContain('Laboratorio Médico del Chopo');
    expect(officialSeed.identity_and_voice).toBeDefined();
    expect(officialSeed.photography_and_imagery).toBeDefined();
    expect(officialSeed.color_palette).toBeDefined();
    expect(officialSeed.graphic_design_and_layout).toBeDefined();
    expect(officialSeed.channels?.items).toBeDefined();
    expect(Object.keys(officialSeed.channels.items).sort()).toEqual([
      'mailing_ecommerce',
      'pdv_sucursal',
      'social_media',
      'web'
    ]);
  });

  test('legacy 02_chopo_brand_manual.md seed has been removed from RAG docs while regulatory/clinical/realism seeds remain', () => {
    expect(fs.existsSync(path.join(RAG_SEEDS_DIR, '02_chopo_brand_manual.md'))).toBe(false);
    expect(fs.existsSync(path.join(RAG_SEEDS_DIR, '01_cofepris_lineamientos.md'))).toBe(true);
    expect(fs.existsSync(path.join(RAG_SEEDS_DIR, '03_catalogo_estudios_diabetes.md'))).toBe(true);
    expect(fs.existsSync(path.join(RAG_SEEDS_DIR, '04_reglas_realismo_clinico_y_operativo.md'))).toBe(true);
  });
});

describe('Segment & Track Mapping (B2C / B2D / B2B)', () => {
  test('maps segment keys and tracks deterministically to b2c_patients (Tú), b2d_doctors (Tú), and b2b_enterprises (Usted)', () => {
    expect(resolveSegmentKey('b2c_patients')).toBe('b2c_patients');
    expect(resolveSegmentKey('patient')).toBe('b2c_patients');
    expect(resolveSegmentKey('b2d_doctors')).toBe('b2d_doctors');
    expect(resolveSegmentKey('physician')).toBe('b2d_doctors');
    expect(resolveSegmentKey('b2b_enterprises')).toBe('b2b_enterprises');
    expect(resolveSegmentKey('enterprise')).toBe('b2b_enterprises');
    expect(resolveSegmentKey('unknown_value')).toBe('b2c_patients');
    expect(resolveSegmentKey(undefined)).toBe('b2c_patients');

    expect(resolveTrackFromSegment('b2c_patients')).toBe('patient');
    expect(resolveTrackFromSegment('b2d_doctors')).toBe('physician');
    expect(resolveTrackFromSegment('b2b_enterprises')).toBe('enterprise');
    expect(resolveTrackFromSegment('enterprise')).toBe('enterprise');

    const b2cFromKey = buildBrandSlices(officialSeed, { audienceSegment: 'b2c_patients' });
    const b2cFromTrack = buildBrandSlices(officialSeed, { track: 'patient' });
    expect(b2cFromKey.audienceSegment).toBe('b2c_patients');
    expect(b2cFromTrack.audienceSegment).toBe('b2c_patients');
    expect(b2cFromKey.dynamicVars.pronoun).toBe('Tú');
    expect(b2cFromTrack.dynamicVars.pronoun).toBe('Tú');
    expect(b2cFromKey.dynamicVars.segmentCode).toBe('B2C');
    expect(b2cFromKey.dynamicVars.primaryDestination).toBe('chopo.com.mx');

    const b2dFromKey = buildBrandSlices(officialSeed, { audienceSegment: 'b2d_doctors' });
    const b2dFromTrack = buildBrandSlices(officialSeed, { track: 'physician' });
    expect(b2dFromKey.audienceSegment).toBe('b2d_doctors');
    expect(b2dFromTrack.audienceSegment).toBe('b2d_doctors');
    expect(b2dFromKey.dynamicVars.pronoun).toBe('Tú');
    expect(b2dFromTrack.dynamicVars.pronoun).toBe('Tú');
    expect(b2dFromKey.dynamicVars.segmentCode).toBe('B2D');
    expect(b2dFromKey.dynamicVars.primaryDestination).toBe('chopo.com.mx/medicos');
    expect(b2dFromKey.dynamicVars.precautionaryLegend).toContain('profesionales de la salud');

    const b2bFromKey = buildBrandSlices(officialSeed, { audienceSegment: 'b2b_enterprises' });
    const b2bFromTrack = buildBrandSlices(officialSeed, { track: 'enterprise' });
    expect(b2bFromKey.audienceSegment).toBe('b2b_enterprises');
    expect(b2bFromTrack.audienceSegment).toBe('b2b_enterprises');
    expect(b2bFromKey.dynamicVars.pronoun).toBe('Usted');
    expect(b2bFromTrack.dynamicVars.pronoun).toBe('Usted');
    expect(b2bFromKey.dynamicVars.segmentCode).toBe('B2B');
    expect(b2bFromKey.dynamicVars.primaryDestination).toBe('chopo.com.mx/empresas');
  });

  test('getSubformatsForChannel returns channel-specific subformats and handles custom/fallback channels', () => {
    expect(getSubformatsForChannel('social_media', officialSeed)).toContain('Post Fijo 1:1');
    expect(getSubformatsForChannel('social_media', officialSeed)).toContain('Historia 9:16');
    expect(getSubformatsForChannel('mailing_ecommerce', officialSeed)).toContain('Mailing Promocional');
    expect(getSubformatsForChannel('web', officialSeed)).toContain('Hero Banner Carrusel Web');
    expect(getSubformatsForChannel('pdv_sucursal', officialSeed)).toContain('Póster Interior de Sucursal');

    const cloned = structuredClone(officialSeed);
    cloned.channels.items.custom_ooh = {
      id: 'custom_ooh',
      label: 'Espectaculares Exteriores',
      supportedFormats: ['Cartelera 12x7m', 'Mupi Urbano'],
      copyRules: 'Titular breve',
      photoRules: 'Alta resolución',
      focusGroupContext: 'En traslado diario',
      auditorRules: ['Legibilidad a 50 metros']
    };
    expect(getSubformatsForChannel('custom_ooh', cloned)).toEqual(['Cartelera 12x7m', 'Mupi Urbano']);
    expect(getSubformatsForChannel('nonexistent_channel', officialSeed)).toEqual(['Formato Estándar']);
  });
});

describe('Deterministic Brand Manual Slicing by AI Flow', () => {
  test('Flow 1 — segmentContext contains ONLY purpose and segment (zero color, logo, or basal line rules)', () => {
    const { segmentContext } = buildBrandSlices(officialSeed, {
      audienceSegment: 'b2b_enterprises',
      funnelStage: 'awareness',
      channelKey: 'pdv_sucursal'
    });

    expect(Object.keys(segmentContext).sort()).toEqual(['purpose', 'segment']);
    expect(segmentContext.purpose).toBe(officialSeed.identity_and_voice.purpose);
    expect(segmentContext.segment?.id).toBe('b2b_enterprises');
    expect(segmentContext.segment?.pronoun).toBe('Usted');

    const serialized = JSON.stringify(segmentContext);
    expect(serialized).not.toContain('contrastMatrix');
    expect(serialized).not.toContain('#63CF00');
    expect(serialized).not.toContain('#005FFC');
    expect(serialized).not.toContain('lineaBasalRules');
    expect(serialized).not.toContain('logoRules');
    expect(serialized).not.toContain('modularityRules');
  });

  test('Flow 2A — voiceAndFunnelSlice switches funnel rules cleanly and stays free of graphic layout/contrast matrices', () => {
    const awareness = buildBrandSlices(officialSeed, {
      audienceSegment: 'b2c_patients',
      funnelStage: 'awareness',
      channelKey: 'social_media'
    });
    const performance = buildBrandSlices(officialSeed, {
      audienceSegment: 'b2c_patients',
      funnelStage: 'performance',
      channelKey: 'pdv_sucursal'
    });

    expect(awareness.voiceAndFunnelSlice.funnelStage.stage).toBe('awareness');
    expect(awareness.voiceAndFunnelSlice.funnelStage.headlineRule).toContain('Toda una vida');
    expect(awareness.voiceAndFunnelSlice.channelCopyRules).toBe(officialSeed.channels.items.social_media.copyRules);

    expect(performance.voiceAndFunnelSlice.funnelStage.stage).toBe('performance');
    expect(performance.voiceAndFunnelSlice.funnelStage.headlineRule).toContain('YA NO comienzan');
    expect(performance.voiceAndFunnelSlice.channelCopyRules).toBe(officialSeed.channels.items.pdv_sucursal.copyRules);

    expect(performance.voiceAndFunnelSlice).not.toHaveProperty('graphic_design_and_layout');
    expect(performance.voiceAndFunnelSlice).not.toHaveProperty('contrastMatrix');
  });

  test('Flow 2A/2B — photoSlice includes cleanBaseImageRuleForAI, ambientPromptGuidance, donts (with stethoscope rule), and active channel photoRules, while excluding graphic layout & contrastMatrix', () => {
    const socialSlices = buildBrandSlices(officialSeed, {
      audienceSegment: 'b2d_doctors',
      funnelStage: 'consideration',
      channelKey: 'social_media'
    });
    const pdvSlices = buildBrandSlices(officialSeed, {
      audienceSegment: 'b2c_patients',
      funnelStage: 'performance',
      channelKey: 'pdv_sucursal'
    });

    const { photoSlice } = socialSlices;
    expect(photoSlice.cleanBaseImageRuleForAI).toBe(officialSeed.photography_and_imagery.cleanBaseImageRuleForAI);
    expect(photoSlice.ambientPromptGuidance).toBe(officialSeed.color_palette.ambientPromptGuidance);
    expect(Array.isArray(photoSlice.donts)).toBe(true);
    expect(photoSlice.donts.some((rule: string) => /estetoscopio/i.test(rule))).toBe(true);
    expect(photoSlice.channelPhotoRules).toBe(officialSeed.channels.items.social_media.photoRules);
    expect(pdvSlices.photoSlice.channelPhotoRules).toBe(officialSeed.channels.items.pdv_sucursal.photoRules);

    expect(photoSlice).not.toHaveProperty('graphic_design_and_layout');
    expect(photoSlice).not.toHaveProperty('contrastMatrix');
    expect(photoSlice).not.toHaveProperty('logoRules');
    expect(photoSlice).not.toHaveProperty('lineaBasalRules');
    expect(photoSlice).not.toHaveProperty('modularityRules');
    expect(JSON.stringify(photoSlice)).not.toContain('contrastMatrix');
  });

  test('Flow 3 — focusGroupSlice contains ONLY purpose, focusGroupWarmthHint, channelFocusGroupContext, and channelLabel (no legal/brand rules)', () => {
    const { focusGroupSlice } = buildBrandSlices(officialSeed, {
      audienceSegment: 'b2c_patients',
      funnelStage: 'performance',
      channelKey: 'mailing_ecommerce'
    });

    expect(Object.keys(focusGroupSlice).sort()).toEqual([
      'channelFocusGroupContext',
      'channelLabel',
      'focusGroupWarmthHint',
      'purpose'
    ]);
    expect(focusGroupSlice.purpose).toBe(officialSeed.identity_and_voice.purpose);
    expect(focusGroupSlice.focusGroupWarmthHint).toBe(officialSeed.photography_and_imagery.focusGroupWarmthHint);
    expect(focusGroupSlice.channelFocusGroupContext).toBe(officialSeed.channels.items.mailing_ecommerce.focusGroupContext);
    expect(focusGroupSlice.channelLabel).toBe(officialSeed.channels.items.mailing_ecommerce.label);

    const serialized = JSON.stringify(focusGroupSlice);
    expect(serialized).not.toContain('COFEPRIS');
    expect(serialized).not.toContain('contrastMatrix');
    expect(serialized).not.toContain('lineaBasalRules');
    expect(serialized).not.toContain('advertisingPermitRule');
    expect(serialized).not.toContain('zeroExclamationMarks');
  });

  test('Flow 4 — fullAuditorSlice includes graphic_design_and_layout, contrastMatrix, and ONLY the active channel', () => {
    const channels = ['social_media', 'mailing_ecommerce', 'web', 'pdv_sucursal'] as const;

    for (const channelKey of channels) {
      const { fullAuditorSlice } = buildBrandSlices(officialSeed, {
        audienceSegment: 'b2c_patients',
        funnelStage: 'performance',
        channelKey
      });

      expect(fullAuditorSlice.graphic_design_and_layout).toEqual(officialSeed.graphic_design_and_layout);
      expect(fullAuditorSlice.color_palette.contrastMatrix).toEqual(officialSeed.color_palette.contrastMatrix);
      expect(fullAuditorSlice.activeChannel).toBeDefined();
      expect(fullAuditorSlice.activeChannel.id).toBe(channelKey);
      expect(fullAuditorSlice).not.toHaveProperty('channels');

      // Ensure rules exclusive to other channels are NOT present in activeChannel
      const otherChannelKeys = channels.filter((c) => c !== channelKey);
      for (const otherKey of otherChannelKeys) {
        expect(fullAuditorSlice.activeChannel.id).not.toBe(otherKey);
        expect(fullAuditorSlice.activeChannel.label).not.toBe(officialSeed.channels.items[otherKey].label);
      }
    }
  });
});

describe('Dynamic Variables — Zero Hardcoded Leakage Proof', () => {
  test('dynamicVars updates dynamically when slogan, contact touchpoints, brand name, and palette HEX values are mutated', () => {
    const mutated = structuredClone(officialSeed);
    mutated.identity_and_voice.officialBrandNames = ['Chopo Diagnóstico Renombrado'];
    mutated.identity_and_voice.mandatorySlogan.text = 'Nuevo slogan experimental 2027.';
    mutated.identity_and_voice.logoDescriptor = 'Laboratorio clínico de alta especialidad';
    mutated.identity_and_voice.contactTouchpointsOrder.strictOrder = [
      '1. Portal Nuevo',
      '2. Página web (chopo.com.mx)',
      '3. WhatsApp (55 9999 0000)',
      '4. Teléfonos (800 11 22334)'
    ];

    const mutateHex = (
      pool: Array<{ id: string; hex: string }>,
      id: string,
      newHex: string
    ) => {
      const found = pool.find((item) => item.id === id);
      if (found) found.hex = newHex;
    };

    mutateHex(mutated.color_palette.primaryDigital, 'basal_green', '#11AA22');
    mutateHex(mutated.color_palette.primaryDigital, 'bright_blue', '#123456');
    mutateHex(mutated.color_palette.primaryDigital, 'navy_blue', '#010203');
    mutateHex(mutated.color_palette.secondaryDigital, 'light_blue_2', '#AABBCC');
    mutateHex(mutated.color_palette.promotionalAndButtons, 'promo_pink', '#FF00AA');
    mutateHex(mutated.color_palette.promotionalAndButtons, 'seasonal_red', '#CC0011');
    mutateHex(mutated.color_palette.promotionalAndButtons, 'mailing_magenta', '#9900FF');

    const slices = buildBrandSlices(mutated, {
      audienceSegment: 'b2d_doctors',
      funnelStage: 'consideration',
      channelKey: 'web'
    });

    expect(slices.dynamicVars.officialName).toBe('Chopo Diagnóstico Renombrado');
    expect(slices.dynamicVars.slogan).toBe('Nuevo slogan experimental 2027.');
    expect(slices.dynamicVars.logoDescriptor).toBe('Laboratorio clínico de alta especialidad');
    expect(slices.dynamicVars.contactBar).toContain('Portal Nuevo');
    expect(slices.dynamicVars.contactBar).toContain('chopo.com.mx/medicos');
    expect(slices.dynamicVars.contactBar).toContain('WhatsApp 55 9999 0000');
    expect(slices.dynamicVars.contactBar).toContain('Tel. 800 11 22334');
    expect(slices.dynamicVars.contactBar).not.toContain('55 6481 1373');
    expect(slices.dynamicVars.contactBar).not.toContain('800 00 24676');

    expect(slices.dynamicVars.basalGreenHex).toBe('#11AA22');
    expect(slices.dynamicVars.brightBlueHex).toBe('#123456');
    expect(slices.dynamicVars.navyBlueHex).toBe('#010203');
    expect(slices.dynamicVars.modularLightBlueHex).toBe('#AABBCC');
    expect(slices.dynamicVars.promoPinkHex).toBe('#FF00AA');
    expect(slices.dynamicVars.seasonalRedHex).toBe('#CC0011');
    expect(slices.dynamicVars.mailingMagentaHex).toBe('#9900FF');
  });
});

describe('Brand Manual Markdown Exporter', () => {
  test('exportBrandManualToMarkdown renders all 5 sections cleanly with dynamic data', () => {
    const md = exportBrandManualToMarkdown(officialSeed);

    expect(md).toContain('# Manual de Marca — Grupo PROA / Laboratorio Médico del Chopo (v4.0.0)');
    expect(md).toContain('## 1. Identidad y Voz');
    expect(md).toContain('## 2. Fotografía e Imagen');
    expect(md).toContain('## 3. Paleta de Color y Contrastes');
    expect(md).toContain('## 4. Diseño Gráfico, Logo y Línea Basal');
    expect(md).toContain('## 5. Reglas por Canal');

    // Verify key content from each section appears cleanly
    expect(md).toContain(officialSeed.identity_and_voice.mandatorySlogan.text);
    expect(md).toContain('B2C — Compañeros de los Pacientes');
    expect(md).toContain('B2D — Compañeros de los Médicos');
    expect(md).toContain('B2B — Compañero de las Empresas');
    expect(md).toContain('estetoscopio');
    expect(md).toContain('Matriz de Contrastes');
    expect(md).toContain('#63CF00');
    expect(md).toContain('Avenir');
    expect(md).toContain('social_media');
    expect(md).toContain('mailing_ecommerce');
    expect(md).toContain('web');
    expect(md).toContain('pdv_sucursal');
  });

  test('exportBrandManualToMarkdown reflects edits on a mutated manual and handles null safely', () => {
    const mutated = structuredClone(officialSeed);
    mutated.identity_and_voice.mandatorySlogan.text = 'Slogan actualizado para validación.';
    const md = exportBrandManualToMarkdown(mutated);
    expect(md).toContain('Slogan actualizado para validación.');

    expect(exportBrandManualToMarkdown(null)).toBe('# Manual de Marca\n');
  });
});
