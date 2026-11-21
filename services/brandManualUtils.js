// Deterministic Brand Manual V4 Slicer, Dynamic Variable Extractor & Markdown Exporter
// Shared across Node.js backend (server.js) and React/TypeScript frontend (Vite).

export const TRACK_TO_SEGMENT_KEY = {
  patient: 'b2c_patients',
  physician: 'b2d_doctors',
  enterprise: 'b2b_enterprises'
};

export const SEGMENT_KEY_TO_TRACK = {
  b2c_patients: 'patient',
  b2d_doctors: 'physician',
  b2b_enterprises: 'enterprise'
};

export const CHANNEL_SUBFORMATS = {
  social_media: [
    'Post Fijo 1:1',
    'Post / Carrusel 4:5',
    'Historia 9:16',
    'Reel / TikTok 9:16'
  ],
  mailing_ecommerce: [
    'Mailing Promocional',
    'Módulo E-commerce'
  ],
  web: [
    'Hero Banner Carrusel Web',
    'Banner Promocional Horizontal'
  ],
  pdv_sucursal: [
    'Póster Interior de Sucursal',
    'Folleto / Díptico Interior',
    'Lona / Microperforado Vista Exterior',
    'Póster Regional'
  ]
};

export function resolveSegmentKey(segmentOrTrack) {
  if (!segmentOrTrack) return 'b2c_patients';
  if (SEGMENT_KEY_TO_TRACK[segmentOrTrack]) return segmentOrTrack;
  if (TRACK_TO_SEGMENT_KEY[segmentOrTrack]) return TRACK_TO_SEGMENT_KEY[segmentOrTrack];
  return 'b2c_patients';
}

export function resolveTrackFromSegment(segmentOrTrack) {
  if (!segmentOrTrack) return 'patient';
  if (TRACK_TO_SEGMENT_KEY[segmentOrTrack]) return segmentOrTrack;
  if (SEGMENT_KEY_TO_TRACK[segmentOrTrack]) return SEGMENT_KEY_TO_TRACK[segmentOrTrack];
  return 'patient';
}

export function getSubformatsForChannel(channelKey, manual) {
  const fromManual = manual?.channels?.items?.[channelKey]?.supportedFormats;
  if (CHANNEL_SUBFORMATS[channelKey]?.length) {
    return CHANNEL_SUBFORMATS[channelKey];
  }
  if (Array.isArray(fromManual) && fromManual.length > 0) {
    return fromManual;
  }
  return ['Formato Estándar'];
}

function findColorHex(palette, id, fallbackHex) {
  const pools = [
    ...(Array.isArray(palette?.primaryDigital) ? palette.primaryDigital : []),
    ...(Array.isArray(palette?.secondaryDigital) ? palette.secondaryDigital : []),
    ...(Array.isArray(palette?.promotionalAndButtons) ? palette.promotionalAndButtons : [])
  ];
  const match = pools.find((c) => c?.id === id);
  return match?.hex || fallbackHex;
}

function formatContactBar(strictOrder, primaryDestination) {
  if (!Array.isArray(strictOrder) || strictOrder.length === 0) {
    return `App Chopo | ${primaryDestination || 'chopo.com.mx'} | WhatsApp 55 6481 1373 | Tel. 800 00 24676`;
  }
  return strictOrder
    .map((entry) => {
      const cleaned = String(entry || '').replace(/^\s*\d+\.\s*/, '').trim();
      if (primaryDestination && /chopo\.com\.mx/i.test(cleaned)) {
        return cleaned.replace(/Página web\s*\(([^)]+)\)/i, primaryDestination).replace(/chopo\.com\.mx[^\s)]*/i, primaryDestination);
      }
      return cleaned
        .replace(/^Página web\s*\(([^)]+)\)$/i, '$1')
        .replace(/^WhatsApp\s*\(([^)]+)\)$/i, 'WhatsApp $1')
        .replace(/^Teléfonos?\s*\(([^)]+)\)$/i, 'Tel. $1');
    })
    .filter(Boolean)
    .join(' | ');
}

export function buildBrandSlices(manual, options = {}) {
  const safeManual = manual && typeof manual === 'object' ? manual : {};
  const identity = safeManual.identity_and_voice || {};
  const photography = safeManual.photography_and_imagery || {};
  const palette = safeManual.color_palette || {};
  const layout = safeManual.graphic_design_and_layout || {};
  const channelItems = safeManual.channels?.items || {};

  const audienceSegment = resolveSegmentKey(options.audienceSegment || options.track);
  const funnelStage = ['awareness', 'consideration', 'performance'].includes(options.funnelStage)
    ? options.funnelStage
    : 'performance';

  const availableChannelKeys = Object.keys(channelItems);
  const channelKey = options.channelKey && channelItems[options.channelKey]
    ? options.channelKey
    : (channelItems.social_media ? 'social_media' : (availableChannelKeys[0] || 'social_media'));

  const segmentsMap = identity.audienceSegments || {};
  const selectedSegment = segmentsMap[audienceSegment] || segmentsMap.b2c_patients || Object.values(segmentsMap)[0] || null;

  const funnelMap = identity.funnelStageRules || {};
  const selectedFunnel = funnelMap[funnelStage] || funnelMap.performance || Object.values(funnelMap)[0] || null;

  const selectedChannel = channelItems[channelKey] || null;

  // 1. Flow 1 (Persona / Audience Generator): strictly purpose + segment context
  const segmentContext = {
    purpose: identity.purpose || '',
    segment: selectedSegment
      ? {
          id: selectedSegment.id,
          code: selectedSegment.code,
          appTrack: selectedSegment.appTrack,
          label: selectedSegment.label,
          pronoun: selectedSegment.pronoun,
          toneGuidance: selectedSegment.toneGuidance,
          valueDrivers: selectedSegment.valueDrivers || [],
          primaryDestination: selectedSegment.primaryDestination
        }
      : null
  };

  // 2A. Flow 2A (Brief / Copy): verbal identity, funnel & channel copy rules ONLY
  const voiceAndFunnelSlice = {
    officialBrandNames: identity.officialBrandNames || [],
    mandatorySlogan: identity.mandatorySlogan || { text: '', usageRule: '' },
    purpose: identity.purpose || '',
    brandAttributesPyramid: identity.brandAttributesPyramid || {},
    audienceSegment: selectedSegment,
    voiceAndCopyInvariants: identity.voiceAndCopyInvariants || {},
    funnelStage: selectedFunnel ? { stage: funnelStage, ...selectedFunnel } : { stage: funnelStage },
    contactTouchpointsOrder: identity.contactTouchpointsOrder || { strictOrder: [], rule: '' },
    medicalCitationsRule: identity.medicalCitationsRule || {},
    advertisingPermitRule: identity.advertisingPermitRule || '',
    channelCopyRules: selectedChannel?.copyRules || '',
    channelLabel: selectedChannel?.label || channelKey,
    channelSupportedFormats: selectedChannel?.supportedFormats || []
  };

  // 2B. Flow 2A/2B (Base Photography): photographic rules + ambient color guidance + channel photo rules ONLY
  const photoSlice = {
    generalPhilosophy: photography.generalPhilosophy || '',
    colorTemperatureRule: photography.colorTemperatureRule || '',
    cleanBaseImageRuleForAI: photography.cleanBaseImageRuleForAI || '',
    dos: photography.dos || [],
    donts: photography.donts || [],
    ambientPromptGuidance: palette.ambientPromptGuidance || '',
    channelPhotoRules: selectedChannel?.photoRules || '',
    channelLabel: selectedChannel?.label || channelKey
  };

  // 3. Flow 3 (Focus Group / Chat): strictly 3 lightweight human-reaction fields
  const focusGroupSlice = {
    purpose: identity.purpose || '',
    focusGroupWarmthHint: photography.focusGroupWarmthHint || '',
    channelFocusGroupContext: selectedChannel?.focusGroupContext || '',
    channelLabel: selectedChannel?.label || channelKey
  };

  // 4. Flow 4 (Agente Evaluador / Compliance Auditor): full V4 + ONLY active channel
  const fullAuditorSlice = {
    identity_and_voice: identity,
    photography_and_imagery: photography,
    color_palette: palette,
    graphic_design_and_layout: layout,
    activeChannel: selectedChannel
  };

  const officialName = Array.isArray(identity.officialBrandNames) && identity.officialBrandNames.length > 0
    ? identity.officialBrandNames[0]
    : 'Laboratorio Médico del Chopo';

  const primaryDestination = selectedSegment?.primaryDestination || 'chopo.com.mx';

  const dynamicVars = {
    officialName,
    slogan: identity.mandatorySlogan?.text || 'Chopo, toda una vida cuidando la vida.',
    logoDescriptor: identity.logoDescriptor || 'Análisis clínicos y estudios especializados',
    contactBar: formatContactBar(identity.contactTouchpointsOrder?.strictOrder, primaryDestination),
    pronoun: selectedSegment?.pronoun || 'Tú',
    segmentCode: selectedSegment?.code || 'B2C',
    segmentLabel: selectedSegment?.label || 'B2C — Compañeros de los Pacientes',
    primaryDestination,
    precautionaryLegend: selectedSegment?.mandatoryPrecautionaryLegend || 'Consulte a su médico.',
    channelLabel: selectedChannel?.label || channelKey,
    basalGreenHex: findColorHex(palette, 'basal_green', '#63CF00'),
    brightBlueHex: findColorHex(palette, 'bright_blue', '#005FFC'),
    navyBlueHex: findColorHex(palette, 'navy_blue', '#004699'),
    modularLightBlueHex: findColorHex(palette, 'light_blue_2', '#BDD4F2'),
    promoPinkHex: findColorHex(palette, 'promo_pink', '#F24360'),
    seasonalRedHex: findColorHex(palette, 'seasonal_red', '#E20613'),
    mailingMagentaHex: findColorHex(palette, 'mailing_magenta', '#D200F4')
  };

  return {
    audienceSegment,
    funnelStage,
    channelKey,
    segmentContext,
    voiceAndFunnelSlice,
    photoSlice,
    focusGroupSlice,
    fullAuditorSlice,
    dynamicVars
  };
}

export function exportBrandManualToMarkdown(manual) {
  if (!manual || typeof manual !== 'object') return '# Manual de Marca\n';
  const meta = manual.metadata || {};
  const idv = manual.identity_and_voice || {};
  const photo = manual.photography_and_imagery || {};
  const pal = manual.color_palette || {};
  const gfx = manual.graphic_design_and_layout || {};
  const channels = manual.channels?.items || {};

  const lines = [];
  lines.push(`# Manual de Marca — ${meta.client || 'Laboratorio Médico del Chopo'} (v${meta.version || '4.0.0'})`);
  lines.push('');
  if (meta.umbrellaCampaign) lines.push(`**Campaña paraguas / Slogan:** ${meta.umbrellaCampaign}`);
  if (meta.sourceDocument) lines.push(`**Fuente:** ${meta.sourceDocument}`);
  if (meta.lastUpdated) lines.push(`**Última actualización:** ${meta.lastUpdated}`);
  lines.push('');

  lines.push(`## ${idv.uiTabTitle || '1. Identidad y Voz'}`);
  lines.push(`- **Nombres oficiales:** ${(idv.officialBrandNames || []).join(' / ')}`);
  lines.push(`- **Descriptivo del logotipo:** ${idv.logoDescriptor || ''}`);
  lines.push(`- **Slogan obligatorio:** ${idv.mandatorySlogan?.text || ''}`);
  if (idv.mandatorySlogan?.usageRule) lines.push(`  - *Regla:* ${idv.mandatorySlogan.usageRule}`);
  lines.push(`- **Propósito:** ${idv.purpose || ''}`);
  lines.push('');
  lines.push('### Segmentos de Audiencia');
  Object.values(idv.audienceSegments || {}).forEach((seg) => {
    lines.push(`- **${seg.label} (${seg.code})** — Pronombre: **${seg.pronoun}** | Destino: \`${seg.primaryDestination}\``);
    lines.push(`  - Tono: ${seg.toneGuidance}`);
    lines.push(`  - Leyenda precautoria: ${seg.mandatoryPrecautionaryLegend}`);
    if (Array.isArray(seg.valueDrivers) && seg.valueDrivers.length) {
      lines.push(`  - Impulsores: ${seg.valueDrivers.join('; ')}`);
    }
  });
  lines.push('');
  lines.push('### Reglas Invariables de Voz');
  lines.push(`- **Persona gramatical:** ${idv.voiceAndCopyInvariants?.grammaticalPerson || ''}`);
  lines.push(`- **Cero signos de admiración:** ${idv.voiceAndCopyInvariants?.zeroExclamationMarks || ''}`);
  lines.push(`- **Claridad:** ${idv.voiceAndCopyInvariants?.clarityOverJargon || ''}`);
  lines.push(`- **Ingenio vs. humor:** ${idv.voiceAndCopyInvariants?.ingenuityVsHumor || ''}`);
  lines.push('- **Sí hacer:**');
  (idv.voiceAndCopyInvariants?.dos || []).forEach((item) => lines.push(`  - ${item}`));
  lines.push('- **Prohibido:**');
  (idv.voiceAndCopyInvariants?.donts || []).forEach((item) => lines.push(`  - ${item}`));
  lines.push('');
  lines.push('### Reglas por Etapa del Funnel');
  Object.values(idv.funnelStageRules || {}).forEach((f) => {
    lines.push(`- **${f.label}**`);
    lines.push(`  - Titular: ${f.headlineRule}`);
    lines.push(`  - Foco: ${f.bodyFocus}`);
    lines.push(`  - CTA: ${f.ctaPlacementAndStyle}`);
  });
  lines.push('');
  lines.push(`### Orden de Contacto y Citas Médicas`);
  lines.push(`- **Orden estricto:** ${(idv.contactTouchpointsOrder?.strictOrder || []).join(' → ')}`);
  lines.push(`- **Regla de contacto:** ${idv.contactTouchpointsOrder?.rule || ''}`);
  lines.push(`- **Citas médicas (${idv.medicalCitationsRule?.citationStandard || 'APA 7'}, máx. ${idv.medicalCitationsRule?.maxAgeYears || 5} años):** ${idv.medicalCitationsRule?.rule || ''}`);
  lines.push(`- **Permiso COFEPRIS:** ${idv.advertisingPermitRule || ''}`);
  lines.push('');

  lines.push(`## ${photo.uiTabTitle || '2. Fotografía e Imagen'}`);
  lines.push(`- **Filosofía visual:** ${photo.generalPhilosophy || ''}`);
  lines.push(`- **Temperatura de color:** ${photo.colorTemperatureRule || ''}`);
  lines.push(`- **Foto base limpia (IA):** ${photo.cleanBaseImageRuleForAI || ''}`);
  lines.push(`- **Guía de calidez (Focus Group):** ${photo.focusGroupWarmthHint || ''}`);
  lines.push('- **Sí hacer:**');
  (photo.dos || []).forEach((item) => lines.push(`  - ${item}`));
  lines.push('- **Prohibido:**');
  (photo.donts || []).forEach((item) => lines.push(`  - ${item}`));
  lines.push('');

  lines.push(`## ${pal.uiTabTitle || '3. Paleta de Color y Contrastes'}`);
  lines.push(`- **Ambientación fotográfica:** ${pal.ambientPromptGuidance || ''}`);
  const renderPaletteGroup = (title, items) => {
    if (!Array.isArray(items) || !items.length) return;
    lines.push(`### ${title}`);
    items.forEach((c) => lines.push(`- **${c.name}** (\`${c.hex}\` / ${c.rgb}): ${c.usage}`));
  };
  renderPaletteGroup('Primarios Digitales', pal.primaryDigital);
  renderPaletteGroup('Secundarios y Modulares', pal.secondaryDigital);
  renderPaletteGroup('Promocionales y Botones', pal.promotionalAndButtons);
  if (Array.isArray(pal.contrastMatrix) && pal.contrastMatrix.length) {
    lines.push('### Matriz de Contrastes');
    pal.contrastMatrix.forEach((row) => {
      lines.push(`- Fondo **${row.backgroundName} (\`${row.backgroundHex}\`)**: Permitidos [${(row.allowedForegrounds || []).join(', ')}] | Prohibidos [${(row.forbiddenForegrounds || []).join(', ')}] — ${row.notes}`);
    });
  }
  lines.push('');

  lines.push(`## ${gfx.uiTabTitle || '4. Diseño Gráfico, Logo y Línea Basal'}`);
  if (gfx.usageNote) lines.push(`> ${gfx.usageNote}`);
  lines.push('');
  lines.push(`- **Descriptivo de logo:** ${gfx.logoRules?.mandatoryDescriptor || ''}`);
  lines.push(`- **Ubicación de logo:** ${gfx.logoRules?.placement || ''}`);
  lines.push(`- **Tipografía:** ${gfx.typographyRules?.primaryFontFamily || ''} | Web: ${gfx.typographyRules?.webAlternativeFontFamily || ''}`);
  lines.push(`- **Línea Basal:** ${gfx.lineaBasalRules?.description || ''}`);
  lines.push(`- **Modularidad:** ${gfx.modularityRules?.cornerGeometry || ''} ${gfx.modularityRules?.maxSizeLimits || ''}`);
  lines.push(`- **Preciadores:** ${gfx.pricingAndDiscountsRules?.mandatoryColor || ''} ${gfx.pricingAndDiscountsRules?.circularBadgeBleed || ''}`);
  lines.push('');

  lines.push(`## ${manual.channels?.uiTabTitle || '5. Reglas por Canal'}`);
  Object.values(channels).forEach((ch) => {
    lines.push(`### ${ch.label} (\`${ch.id}\`)`);
    if (Array.isArray(ch.supportedFormats)) lines.push(`- **Formatos:** ${ch.supportedFormats.join(', ')}`);
    lines.push(`- **Copy:** ${ch.copyRules || ''}`);
    lines.push(`- **Fotografía:** ${ch.photoRules || ''}`);
    lines.push(`- **Contexto Focus Group:** ${ch.focusGroupContext || ''}`);
    if (Array.isArray(ch.auditorRules) && ch.auditorRules.length) {
      lines.push('- **Reglas de Auditoría:**');
      ch.auditorRules.forEach((r) => lines.push(`  - ${r}`));
    }
    lines.push('');
  });

  return lines.join('\n');
}
