import { describe, test, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeImageSrc,
  buildSafeReportFilename,
  buildBriefExecutiveReportHtml,
  buildFocusGroupExecutiveReportHtml,
  BriefExecutiveReportPayload,
  FocusGroupExecutiveReportPayload
} from '../services/reportExporter';

const FORBIDDEN_TECHNICAL_JARGON = [
  /\bRAG\b/i,
  /\bVertex\s+AI\b/i,
  /\bFirestore\b/i,
  /\bLLM\b/i,
  /\bJSON\b/i,
  /\bAPI\b/i,
  /\bTop-K\b/i,
  /\bBase64\b/i,
  /\bPrompt\b/i,
  /\bBackend\b/i,
  /\bToken\b/i
];

function extractVisibleText(html: string): string {
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('reportExporter — Security & Filename Utilities', () => {
  test('escapeHtml neutralizes XSS vectors, quotes, and angle brackets', () => {
    const raw = `<script>alert("xss")</script> & 'quoted' > <img onerror=alert(1)>`;
    const escaped = escapeHtml(raw);
    expect(escaped).not.toContain('<script>');
    expect(escaped).not.toContain('<img');
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&quot;xss&quot;');
    expect(escaped).toContain('&#39;quoted&#39;');
    expect(escaped).toContain('&amp;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('sanitizeImageSrc allows safe media/image URLs and blocks unsafe schemes', () => {
    expect(sanitizeImageSrc('/api/media/campaign_diabetes.png')).toBe('/api/media/campaign_diabetes.png');
    expect(sanitizeImageSrc('/images/chopo-logo.svg')).toBe('/images/chopo-logo.svg');
    expect(sanitizeImageSrc('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ')).toBe(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    );
    expect(sanitizeImageSrc('blob:https://chopo.com.mx/550e8400-e29b-41d4-a716-446655440000')).toBe(
      'blob:https://chopo.com.mx/550e8400-e29b-41d4-a716-446655440000'
    );
    expect(sanitizeImageSrc('https://chopo.com.mx/assets/banner.jpg')).toBe(
      'https://chopo.com.mx/assets/banner.jpg'
    );

    // Unsafe vectors must be blocked
    expect(sanitizeImageSrc('javascript:alert(1)')).toBe('');
    expect(sanitizeImageSrc('  JAVASCRIPT:alert(document.cookie)  ')).toBe('');
    expect(sanitizeImageSrc('vbscript:msgbox(1)')).toBe('');
    expect(sanitizeImageSrc('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeImageSrc('data:image/svg+xml,<svg onload=alert(1)>')).toBe('');
    expect(sanitizeImageSrc('//evil.example.com/pixel.png')).toBe('');
    expect(sanitizeImageSrc('/api/media/../../etc/passwd')).toBe('');
    expect(sanitizeImageSrc('')).toBe('');
    expect(sanitizeImageSrc(null)).toBe('');
  });

  test('buildSafeReportFilename strips Spanish accents, punctuation, and appends YYYY-MM-DD', () => {
    const fixedDate = new Date(2026, 10, 24); // 2026-11-24
    const filename = buildSafeReportFilename(
      'reporte_brief_chopo',
      'Perfil Control Diabetes (HbA1c) — Campaña Preventiva Niño',
      'html',
      fixedDate
    );
    expect(filename).toMatch(/^reporte_brief_chopo_[a-z0-9_]+_2026-11-24\.html$/);
    expect(filename).not.toMatch(/[áéíóúñÁÉÍÓÚÑ\s()—]/);
    expect(filename).toContain('perfil_control_diabetes_hba1c');
  });
});

describe('reportExporter — Brief Executive Report HTML', () => {
  const sampleBriefPayload: BriefExecutiveReportPayload = {
    title: 'Campaña Preventiva Check-up Control Diabetes',
    generatedAt: new Date(2026, 10, 24),
    studyName: 'Check-up Control Diabetes',
    productName: 'Check-up Control Diabetes',
    segmentKey: 'b2c_patients',
    funnelStage: 'performance',
    channelKey: 'social_media',
    channelSubformat: 'Post Fijo 1:1',
    slogan: 'Chopo, toda una vida cuidando la vida.',
    campaignGoal: 'Impulsar agendamientos en línea para el control glucémico oportuno.',
    objectiveGoal: 'Incrementar la adopción del estudio preventivo en pacientes adultos.',
    targetKpi: 'Aumentar 20% las citas agendadas en chopo.com.mx durante el trimestre.',
    valuePropMain: 'Precisión diagnóstica acreditada y resultados digitales el mismo día.',
    competitiveEdge: 'Red nacional de sucursales y entrega digital directa en App Chopo.',
    marketContext: 'Creciente demanda de prevención metabólica accesible y sin filas.',
    primaryHook: 'Cuida tu glucosa hoy con resultados confiables en tu celular.',
    supportingMessages: [
      {
        title: 'Entrega Digital',
        content: 'Consulta tus resultados en App Chopo y compártelos con tu médico.'
      }
    ],
    channelAdaptedCopy: 'Agenda tu Check-up Control Diabetes en línea con precio especial.',
    complianceChecklist: ['Sin signos de exclamación', 'Folio COFEPRIS visible'],
    assumptions: {
      budget: 'Asignación digital trimestral enfocada en conversión.',
      timeline: 'Noviembre a Diciembre 2026',
      primarySalesFocus: 'Pago en línea en chopo.com.mx y App Chopo',
      mitigationStrategy: 'Validar folio COFEPRIS vigente y leyenda Consulte a su médico.'
    },
    audiences: [
      {
        name: 'Paciente Preventivo con Historial Familiar',
        sourceSegment: 'Paciente B2C',
        ageRange: '35-55 años',
        painPoints: ['Falta de tiempo por las mañanas', 'Dudas sobre horas de ayuno'],
        drivers: ['Precio especial en línea', 'Resultados en App Chopo'],
        messagingAngle: 'Un estudio claro y rápido para cuidar tu tranquilidad.'
      }
    ],
    clinicalContext: {
      studyName: 'Check-up Control Diabetes',
      category: 'Metabolismo y Control Glucémico',
      includedStudies: [
        'Hemoglobina Glicosilada (HbA1c)',
        'Química Sanguínea de 6 elementos',
        'Examen General de Orina'
      ],
      fastingRequirement: 'Ayuno obligatorio de 8 a 12 horas.',
      cofeprisPermitB2C: 'Permiso de Publicidad COFEPRIS No. 2609152002A00518',
      responsableSanitario: 'Q.F.B. Jessica Alejandra Rivera Domínguez, Céd. Prof. 3602644'
    },
    creativeAssets: [
      {
        audienceLabel: 'Paciente B2C',
        imageUrl: '/api/media/diabetes_banner_v4.png',
        headline: 'Controla tu glucosa con precisión clínica',
        subheadline: 'Precio especial pagando en línea',
        bodyCopy: 'Agenda tu Check-up Control Diabetes en chopo.com.mx y recibe resultados digitales.',
        ctaText: 'Agenda tu estudio en chopo.com.mx',
        legalFooter: 'Consulte a su médico. Permiso de Publicidad COFEPRIS No. 2609152002A00518.',
        socialCaption: 'Tu prevención comienza hoy con análisis clínicos confiables.',
        socialHashtags: ['#Chopo', '#ControlDiabetes'],
        emailSubject: 'Tu Check-up Control Diabetes con precio especial en línea',
        emailBody: 'Reserva en minutos desde App Chopo o chopo.com.mx.'
      }
    ]
  };

  test('includes Chopo Manual V4 tokens, metadata, clinical COFEPRIS info, copy, and sanitized image', () => {
    const html = buildBriefExecutiveReportHtml(sampleBriefPayload);

    // Chopo V4 official brand tokens
    expect(html).toContain('Laboratorio Médico del Chopo');
    expect(html).toContain('Chopo, toda una vida cuidando la vida.');
    expect(html).toContain('Análisis clínicos y estudios especializados');
    expect(html).toContain('App Chopo | chopo.com.mx | WhatsApp 55 6481 1373 | Tel. 800 00 24676');
    expect(html).toContain('#004699');
    expect(html).toContain('#005FFC');
    expect(html).toContain('#63CF00');
    expect(html).toContain('#BDD4F2');
    expect(html).toContain('#F24360');
    expect(html).toContain('Roboto');
    expect(html).toContain('@media print');
    expect(html).toContain('Guardar como PDF / Imprimir');

    // Segment, funnel, channel metadata
    expect(html).toContain('Paciente B2C');
    expect(html).toContain('Performance');
    expect(html).toContain('Redes Sociales');
    expect(html).toContain('Post Fijo 1:1');

    // Clinical & COFEPRIS context
    expect(html).toContain('Hemoglobina Glicosilada (HbA1c)');
    expect(html).toContain('Ayuno obligatorio de 8 a 12 horas.');
    expect(html).toContain('Permiso de Publicidad COFEPRIS No. 2609152002A00518');
    expect(html).toContain('Q.F.B. Jessica Alejandra Rivera Domínguez');

    // Copy & image rendering
    expect(html).toContain('/api/media/diabetes_banner_v4.png');
    expect(html).toContain('Controla tu glucosa con precisión clínica');
    expect(html).toContain('Agenda tu estudio en chopo.com.mx');
    expect(html).toContain('Tu Check-up Control Diabetes con precio especial en línea');
  });

  test('enforces zero exclamation marks and zero forbidden technical jargon in Brief report', () => {
    const html = buildBriefExecutiveReportHtml(sampleBriefPayload);
    const visibleText = extractVisibleText(html);
    const withoutDoctype = html.replace(/^<!DOCTYPE html>/i, '');

    expect(visibleText).not.toMatch(/[¡!]/);
    expect(withoutDoctype).not.toMatch(/[¡!]/);

    for (const pattern of FORBIDDEN_TECHNICAL_JARGON) {
      expect(visibleText).not.toMatch(pattern);
    }
  });

  test('escapes untrusted payload strings and drops malicious image URLs', () => {
    const xssPayload: BriefExecutiveReportPayload = {
      title: 'Campaña <script>alert(1)</script>',
      creativeAssets: [
        {
          headline: 'Titular "<img src=x onerror=alert(1)>"',
          imageUrl: 'javascript:alert(1)'
        }
      ]
    };
    const html = buildBriefExecutiveReportHtml(xssPayload);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('javascript:alert(1)');
  });
});

describe('reportExporter — Focus Group Executive Report HTML', () => {
  const standardCampaignPayload: FocusGroupExecutiveReportPayload = {
    title: 'Evaluación Creativa: Check-up Control Diabetes',
    testMode: 'campaign',
    generatedAt: new Date(2026, 10, 24),
    studyName: 'Check-up Control Diabetes',
    segmentKey: 'b2c_patients',
    channelKey: 'social_media',
    evaluatedCount: 3,
    averageScore: 84,
    averageScoreLabel: 'Calificación Promedio',
    averageScoreSuffix: ' / 100',
    evaluatedMaterial: {
      headline: 'Controla tu glucosa hoy con resultados digitales',
      copy: 'Agenda en línea en chopo.com.mx y recibe tus estudios en App Chopo.',
      imageUrl: '/api/media/control_diabetes_social.png',
      ctaText: 'Agenda tu estudio en línea'
    },
    rubricBreakdown: [
      {
        name: 'Claridad en 3 Segundos',
        weight: 35,
        score: 88,
        rationale: 'El beneficio principal y el estudio incluido se entienden de inmediato.'
      },
      {
        name: 'Confianza Clínica y Marca',
        weight: 35,
        score: 72,
        rationale: 'Buena credibilidad, aunque conviene reforzar la indicación de ayuno.'
      },
      {
        name: 'Llamado a la Acción',
        weight: 30,
        score: 46,
        rationale: 'El botón podría indicar con mayor claridad el ahorro por pago en línea.'
      }
    ],
    strategicSummary: {
      keyFindings: ['Alta receptividad general en pacientes adultos interesados en prevención.'],
      strengths: ['Mensaje empático y fotografía luminosa alineada a Lineamientos de Marca V4.'],
      improvements: ['Explicitar las horas de ayuno requeridas para evitar dudas previas.'],
      agencyAdjustments: ['Destacar el beneficio de precio especial en línea junto al botón principal.']
    },
    opinions: [
      {
        name: 'Laura Méndez',
        segmentLabel: 'Paciente B2C',
        profileDetail: '46 años · Administradora',
        sentiment: 'Positive',
        score: 90,
        opinion: 'Me transmite mucha confianza y me gusta poder ver los resultados en la App Chopo.'
      },
      {
        name: 'Dr. Carlos Navarro',
        segmentLabel: 'Médico B2D',
        profileDetail: '52 años · Médico Internista',
        sentiment: 'Neutral',
        score: 74,
        opinion: 'La comunicación es clara, solo sugeriría especificar que incluye HbA1c certificada.'
      },
      {
        name: 'Sofía Ramírez',
        segmentLabel: 'Paciente B2C',
        profileDetail: '38 años · Contadora',
        sentiment: 'Negative',
        score: 48,
        opinion: 'No queda claro desde el inicio si debo acudir en ayuno o cuánto cuesta el paquete.'
      }
    ]
  };

  test('renders standard campaign Focus Group report with KPIs, rubric bars, Opiniones Textuales, and zero jargon', () => {
    const html = buildFocusGroupExecutiveReportHtml(standardCampaignPayload);
    const visibleText = extractVisibleText(html);
    const withoutDoctype = html.replace(/^<!DOCTYPE html>/i, '');

    expect(html).toContain('Reporte Ejecutivo de Focus Group Sintético');
    expect(html).toContain('Evaluación de Campaña');
    expect(html).toContain('84 / 100');
    expect(html).toContain('Distribución de Sentimiento');
    expect(html).toContain('Redes Sociales');
    expect(html).toContain('Paciente B2C');

    // Rubric breakdown with color tier classes
    expect(html).toContain('Claridad en 3 Segundos');
    expect(html).toContain('35%');
    expect(html).toContain('tier-high');
    expect(html).toContain('tier-mid');
    expect(html).toContain('tier-low');

    // Strategic summary & Opiniones Textuales (NEVER "Citas Reales")
    expect(html).toContain('Hallazgos Principales');
    expect(html).toContain('Fortalezas Detectadas');
    expect(html).toContain('Oportunidades de Mejora y Ajustes Sugeridos para la Agencia');
    expect(html).toContain('Opiniones Textuales');
    expect(html).not.toMatch(/Citas\s+Reales/i);

    // Zero exclamation marks and zero technical jargon
    expect(visibleText).not.toMatch(/[¡!]/);
    expect(withoutDoctype).not.toMatch(/[¡!]/);
    for (const pattern of FORBIDDEN_TECHNICAL_JARGON) {
      expect(visibleText).not.toMatch(pattern);
    }
  });

  test('renders A/B test Focus Group report with side-by-side Variant A vs Variant B and Winner badge', () => {
    const abPayload: FocusGroupExecutiveReportPayload = {
      title: 'Prueba A/B: Mastografía Digital',
      testMode: 'ab_test',
      generatedAt: new Date(2026, 10, 24),
      studyName: 'Mastografía Digital + Ultrasonido',
      segmentKey: 'b2c_patients',
      channelKey: 'pdv_sucursal',
      evaluatedCount: 2,
      averageScore: 8.9,
      averageScoreLabel: 'Puntaje Variante Ganadora',
      averageScoreSuffix: ' / 10',
      abVariants: [
        {
          label: 'Variante A — Empatía y Privacidad',
          imageUrl: '/api/media/variant_a.png',
          headline: 'Cuidamos tu salud en un espacio cálido y privado',
          score: 8.9,
          scoreScale: 10,
          votes: 2,
          isWinner: true,
          summary: 'Genera mayor tranquilidad y cercanía emocional.'
        },
        {
          label: 'Variante B — Enfoque Tecnológico',
          imageUrl: '/api/media/variant_b.png',
          headline: 'Diagnóstico digital de alta definición',
          score: 7.4,
          scoreScale: 10,
          votes: 0,
          isWinner: false,
          summary: 'Se percibe confiable pero ligeramente más distante.'
        }
      ],
      opinions: [
        {
          name: 'Ana Lucía Torres',
          segmentLabel: 'Paciente B2C',
          profileDetail: '49 años · Docente',
          sentiment: 'Positivo',
          score: 9,
          scoreMax: 10,
          selectedOption: 'Variante A — Empatía y Privacidad',
          opinion: 'La variante A me hace sentir acompañada y reduce el nerviosismo del estudio.'
        },
        {
          name: 'Patricia Gómez',
          segmentLabel: 'Paciente B2C',
          profileDetail: '54 años · Empresaria',
          sentiment: 'Positivo',
          score: 8.8,
          scoreMax: 10,
          selectedOption: 'Variante A — Empatía y Privacidad',
          opinion: 'Prefiero el enfoque cálido de la variante A con el respaldo clínico de Chopo.'
        }
      ]
    };

    const html = buildFocusGroupExecutiveReportHtml(abPayload);
    const visibleText = extractVisibleText(html);
    const withoutDoctype = html.replace(/^<!DOCTYPE html>/i, '');

    expect(html).toContain('Prueba A/B');
    expect(html).toContain('Comparativo de Variantes Evaluadas');
    expect(html).toContain('Variante A — Empatía y Privacidad');
    expect(html).toContain('Variante B — Enfoque Tecnológico');
    expect(html).toContain('Variante Ganadora');
    expect(html).toContain('/api/media/variant_a.png');
    expect(html).toContain('/api/media/variant_b.png');
    expect(html).toContain('Opiniones Textuales');
    expect(html).not.toMatch(/Citas\s+Reales/i);

    expect(visibleText).not.toMatch(/[¡!]/);
    expect(withoutDoctype).not.toMatch(/[¡!]/);
    for (const pattern of FORBIDDEN_TECHNICAL_JARGON) {
      expect(visibleText).not.toMatch(pattern);
    }
  });
});
