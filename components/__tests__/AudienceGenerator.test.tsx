/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AudienceGenerator } from '../AudienceGenerator';
import React from 'react';
import { LanguageProvider } from '../../context/LanguageContext';
import { AppMode } from '../../types';
import { STANDARD_AUDIENCES } from '../../data/simulationData';
import * as geminiService from '../../services/geminiService';

afterEach(() => {
  cleanup();
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  localStorage.clear();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ personas: STANDARD_AUDIENCES, audienceTargets: '' })
  });
});

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Users: () => <div data-testid="icon-users" />,
  TrendingUp: () => <div data-testid="icon-trending-up" />,
  Briefcase: () => <div data-testid="icon-briefcase" />,
  RotateCcw: () => <div data-testid="icon-rotate-ccw" />,
  Shield: () => <div data-testid="icon-shield" />,
  Settings: () => <div data-testid="icon-settings" />,
  X: () => <div data-testid="icon-x" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Plus: () => <div data-testid="icon-plus" />,
  Edit2: () => <div data-testid="icon-edit" />,
  Trash2: () => <div data-testid="icon-trash" />,
  History: () => <div data-testid="icon-history" />,
  UserPlus: () => <div data-testid="icon-user-plus" />,
  CheckCircle2: () => <div data-testid="icon-check" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  Target: () => <div data-testid="icon-target" />,
  Camera: () => <div data-testid="icon-camera" />
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => <div />,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />
}));

// Mock CompanyContext
vi.mock('../../context/CompanyContext', () => ({
  useCompanyContext: () => ({
    name: 'Laboratorios Chopo',
    description: 'Laboratorios Médicos El Chopo (Grupo PROA)'
  })
}));

// Mock Services
vi.mock('../../services/geminiService', () => ({
  generateSingleAudienceFromPrompt: vi.fn().mockResolvedValue({
    id: 'aud_physician_test',
    track: 'physician',
    name: 'Médico General Recién Egresado (Médico B2B)',
    personaName: 'Dr. Sebastián Mora, 26',
    demographics: '25-29 años, Médico General, CDMX, NSE C+',
    bio: 'Médico general recién egresado que acaba de terminar su servicio social.',
    imagePrompt: 'Retrato realista de estudio',
    imageUrl: '',
    details: {
      name: 'Dr. Sebastián Mora',
      age: 26,
      income: '$28,000 MXN/mes',
      job_title: 'Médico General Recién Egresado',
      bio: 'Busca estudios confiables y accesibles para sus primeros pacientes.',
      pain_points: ['Presupuesto limitado de sus pacientes'],
      goals: ['Diagnóstico oportuno y resultados digitales en App Chopo'],
      lifestyle_tags: ['Primer Consultorio', 'Digital'],
      preferred_products: ['Check-up Completo Chopo', 'Biometría Hemática'],
      charts: {
        brand_affinity: {
          labels: ['Calidad Analítica', 'Precio / Promoción', 'Rapidez Digital', 'Cercanía Sucursal'],
          data: [95, 88, 92, 90]
        }
      }
    }
  }),
  generateImageFromPrompt: vi.fn().mockResolvedValue('/api/media/chopo_persona_dr_carlos.png')
}));

describe('AudienceGenerator (Simplified Prompt-First Flow)', () => {
  const setPersonasMock = vi.fn();
  const setModeMock = vi.fn();

  const renderComponent = (personasProp: any[] = STANDARD_AUDIENCES) =>
    render(
      <LanguageProvider>
        <AudienceGenerator
          personas={personasProp}
          setPersonas={setPersonasMock}
          setMode={setModeMock}
        />
      </LanguageProvider>
    );

  it('renders Chopo base audience cards directly without the legacy CRM table', () => {
    renderComponent();

    expect(screen.queryByText(/Vista Previa de Datos Clínicos CRM/i)).toBeNull();
    expect(screen.queryAllByText(/Adulto en Control de Diabetes/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Médico Especialista \(Endocrinología/i).length).toBeGreaterThan(0);
  });

  it('renders the AI prompt creator with B2C/B2B track selectors and quick example chips', () => {
    renderComponent();

    expect(screen.queryAllByText(/Crear Nuevo Perfil de Audiencia con IA/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Paciente \(Pista B2C\)/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Médico Prescriptor \(Pista B2B\)/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Médico general recién egresado que acaba de terminar su servicio social/i).length).toBeGreaterThan(0);
  });

  it('populates prompt from quick chip and calls generateSingleAudienceFromPrompt on submit', async () => {
    renderComponent();

    const chip = screen.getByText(/Médico general recién egresado que acaba de terminar su servicio social/i);
    fireEvent.click(chip);

    const generateBtn = screen.getByText(/\+ Generar y Agregar Audiencia/i);
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(geminiService.generateSingleAudienceFromPrompt).toHaveBeenCalledWith(
        expect.stringContaining('Médico general recién egresado'),
        'B2B',
        expect.any(String)
      );
    });
  });

  it('preselects audience in localStorage and navigates to SYNTHETIC_USERS when clicking card CTA', () => {
    renderComponent();

    const synthButtons = screen.getAllByText(/Crear Usuarios Sintéticos de este Perfil/i);
    fireEvent.click(synthButtons[0]);

    expect(localStorage.getItem('chopo_preselected_audience')).toBe(STANDARD_AUDIENCES[0].name);
    expect(setModeMock).toHaveBeenCalledWith(AppMode.SYNTHETIC_USERS);
  });
});
