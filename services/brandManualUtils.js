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

export const BUILT_IN_CHANNEL_ORDER = [
  'social_media',
  'mailing_ecommerce',
  'web',
  'pdv_sucursal'
];

const DEFAULT_CHANNEL_LABELS = {
  social_media: 'Redes Sociales',
  mailing_ecommerce: 'Mailings (Email Marketing) y E-commerce',
  web: 'Sitio Web y Banners Digitales (chopo.com.mx)',
  pdv_sucursal: 'Punto de Venta en Sucursal — PDV'
};

export function getSubformatsForChannel(channelKey, manual) {
  const rawFromManual =
    manual?.channels?.items?.[channelKey]?.supportedFormats ??
    manual?.channels?.[channelKey]?.supportedFormats;
  if (Array.isArray(rawFromManual)) {
    const cleaned = rawFromManual
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    if (cleaned.length > 0) {
      return cleaned;
    }
  }
  if (CHANNEL_SUBFORMATS[channelKey]?.length) {
    return CHANNEL_SUBFORMATS[channelKey];
  }
  return ['Formato Estándar'];
}

export function getChannelOptionsFromManual(manual) {
  const items =
    manual?.channels?.items && typeof manual.channels.items === 'object'
      ? manual.channels.items
      : null;

  if (!items || Object.keys(items).length === 0) {
    return BUILT_IN_CHANNEL_ORDER.map((id) => ({
      id,
      label: DEFAULT_CHANNEL_LABELS[id] || id,
      supportedFormats: CHANNEL_SUBFORMATS[id] ? [...CHANNEL_SUBFORMATS[id]] : ['Formato Estándar'],
      isBuiltIn: true
    }));
  }

  const allKeys = Object.keys(items);
  const orderedKeys = [
    ...BUILT_IN_CHANNEL_ORDER.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !BUILT_IN_CHANNEL_ORDER.includes(k))
  ];

  return orderedKeys.map((key) => {
    const ch = items[key] || {};
    const id = ch.id || key;
    const label =
      typeof ch.label === 'string' && ch.label.trim()
        ? ch.label.trim()
        : DEFAULT_CHANNEL_LABELS[key] || key;
    return {
      id,
      label,
      supportedFormats: getSubformatsForChannel(key, manual),
      isBuiltIn: BUILT_IN_CHANNEL_ORDER.includes(key)
    };
  });
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

function cleanExportText(value) {
  return String(value || '')
    .replace(/\bplantillas\s+CSS\b/gi, 'plantillas visuales')
    .replace(/\bCSS\b/g, 'diseño visual')
    .replace(/imágenes rasterizadas/gi, 'artes finales en imagen')
    .trim();
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
  if (idv.sourcePages) lines.push(`*Referencia Manual V4: ${idv.sourcePages}*`);
  lines.push(`- **Nombres oficiales:** ${(idv.officialBrandNames || []).join(' / ')}`);
  lines.push(`- **Descriptivo del logotipo:** ${idv.logoDescriptor || ''}`);
  lines.push(`- **Slogan obligatorio:** ${idv.mandatorySlogan?.text || ''}`);
  if (idv.mandatorySlogan?.usageRule) lines.push(`  - *Regla:* ${idv.mandatorySlogan.usageRule}`);
  lines.push(`- **Propósito:** ${idv.purpose || ''}`);
  lines.push('');

  const pyramid = idv.brandAttributesPyramid || idv.attributePyramid || idv.pyramid;
  if (pyramid && typeof pyramid === 'object') {
    const hasPyramid =
      (Array.isArray(pyramid.cuspUnique) && pyramid.cuspUnique.length > 0) ||
      (Array.isArray(pyramid.centerDifferentiators) && pyramid.centerDifferentiators.length > 0) ||
      (Array.isArray(pyramid.baseCategoryEssentials) && pyramid.baseCategoryEssentials.length > 0) ||
      (pyramid.experiencePillars && Object.keys(pyramid.experiencePillars).length > 0);
    if (hasPyramid) {
      lines.push('### Pirámide de Atributos de Marca');
      if (Array.isArray(pyramid.cuspUnique) && pyramid.cuspUnique.length) {
        lines.push(`- **Cúspide Única:** ${pyramid.cuspUnique.join(', ')}`);
      }
      if (Array.isArray(pyramid.centerDifferentiators) && pyramid.centerDifferentiators.length) {
        lines.push(`- **Diferenciadores Centrales:** ${pyramid.centerDifferentiators.join(', ')}`);
      }
      if (Array.isArray(pyramid.baseCategoryEssentials) && pyramid.baseCategoryEssentials.length) {
        lines.push(`- **Esenciales de Categoría:** ${pyramid.baseCategoryEssentials.join(', ')}`);
      }
      if (pyramid.experiencePillars && typeof pyramid.experiencePillars === 'object') {
        const pillarEntries = Object.entries(pyramid.experiencePillars);
        if (pillarEntries.length > 0) {
          lines.push('- **Pilares de Experiencia:**');
          pillarEntries.forEach(([pillarName, attrs]) => {
            const title = pillarName.charAt(0).toUpperCase() + pillarName.slice(1);
            const valueText = Array.isArray(attrs) ? attrs.join(', ') : String(attrs || '');
            lines.push(`  - **${title}:** ${valueText}`);
          });
        }
      }
      lines.push('');
    }
  }

  lines.push('### Segmentos de Audiencia');
  Object.values(idv.audienceSegments || {}).forEach((seg) => {
    lines.push(`- **${seg.label} (${seg.code})** — Pronombre: **${seg.pronoun}** | Destino: ${seg.primaryDestination}`);
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
  lines.push('### Orden de Contacto y Citas Médicas');
  const cleanContactOrder = (idv.contactTouchpointsOrder?.strictOrder || [])
    .map((entry) => String(entry || '').replace(/^\s*\d+\.\s*/, '').trim())
    .filter(Boolean);
  lines.push(`- **Orden estricto:** ${cleanContactOrder.join(' → ')}`);
  lines.push(`- **Regla de contacto:** ${idv.contactTouchpointsOrder?.rule || ''}`);
  lines.push(`- **Citas médicas (${idv.medicalCitationsRule?.citationStandard || 'APA 7'}, máx. ${idv.medicalCitationsRule?.maxAgeYears || 5} años):** ${idv.medicalCitationsRule?.rule || ''}`);
  lines.push(`- **Permiso COFEPRIS:** ${idv.advertisingPermitRule || ''}`);
  lines.push('');

  lines.push(`## ${photo.uiTabTitle || '2. Fotografía e Imagen'}`);
  if (photo.sourcePages) lines.push(`*Referencia Manual V4: ${photo.sourcePages}*`);
  lines.push(`- **Filosofía visual:** ${photo.generalPhilosophy || ''}`);
  lines.push(`- **Temperatura de color:** ${photo.colorTemperatureRule || ''}`);
  lines.push(`- **Fotografía base limpia:** ${photo.cleanBaseImageRuleForAI || ''}`);
  lines.push(`- **Guía de calidez (Focus Group):** ${photo.focusGroupWarmthHint || ''}`);
  lines.push('- **Sí hacer:**');
  (photo.dos || []).forEach((item) => lines.push(`  - ${item}`));
  lines.push('- **Prohibido:**');
  (photo.donts || []).forEach((item) => lines.push(`  - ${item}`));
  lines.push('');

  lines.push(`## ${pal.uiTabTitle || '3. Paleta de Color y Contrastes'}`);
  if (pal.sourcePages) lines.push(`*Referencia Manual V4: ${pal.sourcePages}*`);
  lines.push(`- **Ambientación fotográfica:** ${pal.ambientPromptGuidance || ''}`);
  const renderPaletteGroup = (title, items) => {
    if (!Array.isArray(items) || !items.length) return;
    lines.push(`### ${title}`);
    items.forEach((c) => lines.push(`- **${c.name}** (${c.hex} / ${c.rgb}): ${c.usage}`));
  };
  renderPaletteGroup('Primarios Digitales', pal.primaryDigital);
  renderPaletteGroup('Secundarios y Modulares', pal.secondaryDigital);
  renderPaletteGroup('Promocionales y Botones', pal.promotionalAndButtons);
  if (Array.isArray(pal.contrastMatrix) && pal.contrastMatrix.length) {
    lines.push('### Matriz de Contrastes');
    pal.contrastMatrix.forEach((row) => {
      lines.push(`- Fondo **${row.backgroundName} (${row.backgroundHex})**: Permitidos [${(row.allowedForegrounds || []).join(', ')}] | Prohibidos [${(row.forbiddenForegrounds || []).join(', ')}] — ${row.notes}`);
    });
  }
  lines.push('');

  lines.push(`## ${gfx.uiTabTitle || '4. Diseño Gráfico, Logo y Línea Basal'}`);
  if (gfx.sourcePages) lines.push(`*Referencia Manual V4: ${gfx.sourcePages}*`);
  if (gfx.usageNote) lines.push(`> ${cleanExportText(gfx.usageNote)}`);
  lines.push('');

  lines.push('### Logotipo y Cobrandeo / Alianzas');
  if (gfx.logoRules?.mandatoryDescriptor) lines.push(`- **Descriptivo obligatorio:** ${gfx.logoRules.mandatoryDescriptor}`);
  if (gfx.logoRules?.contrastOnPhotos) lines.push(`- **Contraste sobre fotografías:** ${gfx.logoRules.contrastOnPhotos}`);
  if (gfx.logoRules?.modularLogoColor) lines.push(`- **Color en aplicaciones modulares:** ${gfx.logoRules.modularLogoColor}`);
  if (gfx.logoRules?.placement) lines.push(`- **Ubicación autorizada:** ${gfx.logoRules.placement}`);
  if (gfx.logoRules?.cobrandingRule) lines.push(`- **Cobrandeo y Alianzas:** ${gfx.logoRules.cobrandingRule}`);
  lines.push('');

  lines.push('### Tipografía y Jerarquía de Pesos');
  if (gfx.typographyRules?.primaryFontFamily) lines.push(`- **Familia principal:** ${gfx.typographyRules.primaryFontFamily}`);
  if (gfx.typographyRules?.webAlternativeFontFamily) lines.push(`- **Alternativa web e interfaz:** ${gfx.typographyRules.webAlternativeFontFamily}`);
  if (gfx.typographyRules?.weightHierarchy && typeof gfx.typographyRules.weightHierarchy === 'object') {
    const weights = Object.entries(gfx.typographyRules.weightHierarchy);
    if (weights.length > 0) {
      lines.push('- **Jerarquía de pesos:**');
      weights.forEach(([weight, desc]) => lines.push(`  - **${weight}:** ${desc}`));
    }
  }
  if (gfx.typographyRules?.visionAuditGuidance) {
    lines.push(`- **Criterio de revisión visual:** ${cleanExportText(gfx.typographyRules.visionAuditGuidance)}`);
  }
  lines.push('');

  lines.push('### Línea Basal');
  if (gfx.lineaBasalRules?.description) lines.push(`- **Descripción:** ${gfx.lineaBasalRules.description}`);
  if (Array.isArray(gfx.lineaBasalRules?.proportionInvariants) && gfx.lineaBasalRules.proportionInvariants.length) {
    lines.push('- **Proporciones invariables:**');
    gfx.lineaBasalRules.proportionInvariants.forEach((item) => lines.push(`  - ${item}`));
  }
  if (Array.isArray(gfx.lineaBasalRules?.interactionAndSizeRules) && gfx.lineaBasalRules.interactionAndSizeRules.length) {
    lines.push('- **Interacción tridimensional (abrazo) y tamaño:**');
    gfx.lineaBasalRules.interactionAndSizeRules.forEach((item) => lines.push(`  - ${item}`));
  }
  if (Array.isArray(gfx.lineaBasalRules?.allowedAndForbiddenCrops) && gfx.lineaBasalRules.allowedAndForbiddenCrops.length) {
    lines.push('- **Recortes permitidos y prohibidos:**');
    gfx.lineaBasalRules.allowedAndForbiddenCrops.forEach((item) => lines.push(`  - ${item}`));
  }
  if (Array.isArray(gfx.lineaBasalRules?.nonAggressionRules) && gfx.lineaBasalRules.nonAggressionRules.length) {
    lines.push('- **Reglas de no agresión:**');
    gfx.lineaBasalRules.nonAggressionRules.forEach((item) => lines.push(`  - ${item}`));
  }
  lines.push('');

  lines.push('### Modularidad y Cajas');
  if (gfx.modularityRules?.cornerGeometry) lines.push(`- **Geometría de esquinas:** ${gfx.modularityRules.cornerGeometry}`);
  if (gfx.modularityRules?.noFloatingBoxes) lines.push(`- **Prohibición de cajas flotantes:** ${gfx.modularityRules.noFloatingBoxes}`);
  if (gfx.modularityRules?.singleAxisOrientation) lines.push(`- **Orientación de un solo eje:** ${gfx.modularityRules.singleAxisOrientation}`);
  if (gfx.modularityRules?.maxSizeLimits) lines.push(`- **Límites máximos de tamaño:** ${gfx.modularityRules.maxSizeLimits}`);
  if (gfx.modularityRules?.horizontalLayoutAndCtaTab) lines.push(`- **Composición horizontal y pleca de CTA:** ${gfx.modularityRules.horizontalLayoutAndCtaTab}`);
  lines.push('');

  lines.push('### Preciadores y Descuentos');
  if (gfx.pricingAndDiscountsRules?.mandatoryColor) lines.push(`- **Color obligatorio:** ${gfx.pricingAndDiscountsRules.mandatoryColor}`);
  if (gfx.pricingAndDiscountsRules?.circularBadgeBleed) lines.push(`- **Círculo rebasado sobre fotografía:** ${gfx.pricingAndDiscountsRules.circularBadgeBleed}`);
  if (gfx.pricingAndDiscountsRules?.modularPromoBox) lines.push(`- **Caja promocional modular:** ${gfx.pricingAndDiscountsRules.modularPromoBox}`);
  lines.push('');

  lines.push('### Íconos, Legales y Piezas sin Fotografía');
  if (gfx.iconsLegalsAndNoPhotoRules?.icons) lines.push(`- **Íconos:** ${gfx.iconsLegalsAndNoPhotoRules.icons}`);
  if (gfx.iconsLegalsAndNoPhotoRules?.legalsPlacement) lines.push(`- **Ubicación de legales:** ${gfx.iconsLegalsAndNoPhotoRules.legalsPlacement}`);
  if (gfx.iconsLegalsAndNoPhotoRules?.noPhotoLayouts) lines.push(`- **Piezas sin fotografía:** ${gfx.iconsLegalsAndNoPhotoRules.noPhotoLayouts}`);
  lines.push('');

  lines.push(`## ${manual.channels?.uiTabTitle || '5. Reglas por Canal'}`);
  const orderedChannelKeys = [
    ...BUILT_IN_CHANNEL_ORDER.filter((k) => Boolean(channels[k])),
    ...Object.keys(channels).filter((k) => !BUILT_IN_CHANNEL_ORDER.includes(k))
  ];
  orderedChannelKeys.forEach((chKey) => {
    const ch = channels[chKey];
    if (!ch) return;
    lines.push(`### ${ch.label || DEFAULT_CHANNEL_LABELS[chKey] || 'Canal'}`);
    if (ch.sourcePages) lines.push(`*Referencia Manual V4: ${ch.sourcePages}*`);
    if (Array.isArray(ch.supportedFormats) && ch.supportedFormats.length) {
      lines.push(`- **Formatos:** ${ch.supportedFormats.join(', ')}`);
    }
    lines.push(`- **Redacción:** ${cleanExportText(ch.copyRules || '')}`);
    lines.push(`- **Fotografía:** ${cleanExportText(ch.photoRules || '')}`);
    lines.push(`- **Contexto Focus Group:** ${cleanExportText(ch.focusGroupContext || '')}`);
    if (Array.isArray(ch.auditorRules) && ch.auditorRules.length) {
      lines.push('- **Reglas de Revisión:**');
      ch.auditorRules.forEach((r) => lines.push(`  - ${cleanExportText(r)}`));
    }
    lines.push('');
  });

  return lines.join('\n');
}
