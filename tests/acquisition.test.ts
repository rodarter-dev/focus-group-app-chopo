import { expect, test, describe, vi, beforeEach } from 'vitest';
import { simulateAcquisitionFocusGroup } from '../services/geminiService';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  {
                    personaId: 'aud_diabetes_patient',
                    personaName: 'Roberto Méndez (54, CDMX)',
                    likelihoodToJoin: 88,
                    perceivedValue: 92,
                    barriers: 'Ninguna si el requisito de ayuno está claro',
                    winningOffer: 'Precio especial exclusivo pagando en línea en chopo.com.mx',
                    feedback: 'Me da mucha confianza poder pagar en línea y recibir mis resultados de HbA1c en la App Chopo.'
                  }
                ])
              }
            ]
          }
        }
      ]
    })
  });
});

describe('Laboratorios Chopo Acquisition Simulation', () => {
    const mockPersonas = [
        {
            id: 'aud_diabetes_patient',
            track: 'patient',
            name: '[Paciente B2C] Control Crónico de Diabetes',
            personaName: 'Roberto Méndez (54, CDMX)',
            age: 54,
            job_title: 'Contador Público Independiente',
            bio: 'Paciente con diabetes tipo 2 que monitorea su HbA1c cada 3 meses.',
            demographics: '45–68 años, Urbano Nacional, NSE C / C+',
            pain_points: ['Incertidumbre sobre horas de ayuno'],
            goals: ['Pagar en línea con descuento y ver resultados en App Chopo'],
            details: { lifestyle_tags: ['Monitoreo HbA1c', 'Resultados en App Chopo'] }
        }
    ];

    const mockOffers = [
        "Precio especial exclusivo pagando en línea en chopo.com.mx",
        "Resultados digitales de HbA1c directo en la App Chopo"
    ];

    test('simulateAcquisitionFocusGroup returns valid results for Chopo clinical offers', async () => {
        const results = await simulateAcquisitionFocusGroup(
            mockPersonas,
            mockOffers,
            "Laboratorios Chopo",
            "Diagnóstico Clínico e Imagenología (Grupo PROA)"
        );

        expect(results).toHaveLength(1);
        expect(results[0].personaId).toBe('aud_diabetes_patient');
        expect(results[0].likelihoodToJoin).toBeGreaterThan(50);
        expect(results[0].winningOffer).toContain('chopo.com.mx');
    });
});
