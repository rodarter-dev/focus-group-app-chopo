/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AudienceGenerator } from '../AudienceGenerator';
import React from 'react';
import { LanguageProvider } from '../../context/LanguageContext';
import { AppMode, CombinedPersona } from '../../types';
import { STANDARD_AUDIENCES } from '../../data/simulationData';
import * as geminiService from '../../services/geminiService';

const SAMPLE_ENTERPRISE_PERSONA: CombinedPersona = {
  id: 'aud_enterprise_hr_test',
  track: 'enterprise',
  name: '[Empresa B2B] Directora de Recursos Humanos Corporativo',
  personaName: 'Lic. Patricia Salgado (45 años, CDMX)',
  age: 45,
  job_title: 'Directora de Recursos Humanos',
  demographics: '38-55 años, Corporativo 350 colaboradores, CDMX',
  bio: 'Responsable de convenios de salud ocupacional y check-ups anuales para 350 colaboradores.',
  pain_points: ['Falta de facturación centralizada y reportes consolidados'],
  goals: ['Convenio anual confiable con amplia cobertura de sucursales'],
  lifestyle_tags: ['Salud Ocupacional', 'Convenios B2B'],
  preferred_products: ['Check-up Completo Chopo', 'Exámenes de Ingreso'],
  imagePrompt: 'Ejecutiva mexicana en oficina moderna'
};

const ALL_THREE_SEGMENTS_PERSONAS: CombinedPersona[] = [
  ...(STANDARD_AUDIENCES as unknown as CombinedPersona[]),
  SAMPLE_ENTERPRISE_PERSONA
];

afterEach(() => {
  cleanup();
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  vi.clearAllMocks();
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
    name: 'Laboratorio Médico del Chopo',
    description: 'Laboratorio Médico del Chopo (Grupo PROA)'
  })
}));

// Mock Services
vi.mock('../../services/geminiService', () => ({
  generateSingleAudienceFromPrompt: vi.fn().mockImplementation(async (_prompt: string, track: 'B2C' | 'B2D' | 'B2B') => {
    if (track === 'B2B') {
      return {
        id: 'aud_enterprise_generated',
        track: 'enterprise',
        name: '[Empresa B2B] Directora de Recursos Humanos',
        personaName: 'Lic. Mariana Ortiz, 44',
        demographics: '38-52 años, Empresa de 350 colaboradores, CDMX',
        bio: 'Directora de Recursos Humanos buscando convenios de check-ups anuales para 350 colaboradores.',
        imagePrompt: 'Retrato realista de ejecutiva',
        imageUrl: ''
      };
    }
    if (track === 'B2C') {
      return {
        id: 'aud_patient_generated',
        track: 'patient',
        name: '[Paciente B2C] Mujer Embarazada Primeriza',
        personaName: 'Sofía Ramírez, 29',
        demographics: '25-35 años, CDMX, NSE C+',
        bio: 'Mujer embarazada primeriza buscando ultrasonido prenatal y control trimestral.',
        imagePrompt: 'Retrato realista de paciente',
        imageUrl: ''
      };
    }
    return {
      id: 'aud_physician_test',
      track: 'physician',
      name: '[Médico B2D] Médico General Recién Egresado',
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
    };
  }),
  generateImageFromPrompt: vi.fn().mockResolvedValue('/api/media/chopo_persona_dr_carlos.png')
}));

describe('AudienceGenerator (Manual V4 — 3 Segments: B2C, B2D, B2B)', () => {
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

  it('renders Chopo base audience cards directly and displays legacy physician personas as Médico (B2D)', () => {
    renderComponent();

    expect(screen.queryByText(/Vista Previa de Datos Clínicos CRM/i)).toBeNull();
    expect(screen.queryAllByText(/Adulto en Control de Diabetes/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Médico Especialista \(Endocrinología/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Médico \(B2D\)/i).length).toBeGreaterThan(0);
  });

  it('renders the 3 official Manual V4 segment toggles, pronoun hints, filter pills, and B2C/B2D/B2B quick chips', () => {
    renderComponent(ALL_THREE_SEGMENTS_PERSONAS);

    expect(screen.queryAllByText(/Crear Nuevo Perfil de Audiencia con IA/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Paciente \(B2C\)/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Médico \(B2D\)/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Empresa \(B2B\)/i).length).toBeGreaterThan(0);

    // Pronoun hints
    expect(screen.queryAllByText(/Habla de Tú respetuoso/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Habla de Usted/i).length).toBeGreaterThan(0);

    // 4 filter pills
    expect(screen.getByRole('button', { name: /Todos los Perfiles/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Pacientes B2C/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Médicos B2D/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Empresas B2B/i })).toBeTruthy();

    // Quick chips across B2C, B2D, B2B
    expect(screen.getByText(/Médico general recién egresado que acaba de terminar su servicio social/i)).toBeTruthy();
    expect(screen.getByText(/Mujer embarazada primeriza buscando ultrasonido prenatal/i)).toBeTruthy();
    expect(screen.getByText(/Directora de Recursos Humanos buscando convenios de check-ups anuales para 350 colaboradores/i)).toBeTruthy();
  });

  it('submits B2D quick chip with track B2D to generateSingleAudienceFromPrompt', async () => {
    renderComponent();

    const chip = screen.getByText(/Médico general recién egresado que acaba de terminar su servicio social/i);
    fireEvent.click(chip);

    const generateBtn = screen.getByText(/Generar y Agregar Audiencia/i);
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(geminiService.generateSingleAudienceFromPrompt).toHaveBeenCalledWith(
        expect.stringContaining('Médico general recién egresado'),
        'B2D',
        expect.any(String)
      );
    });
  });

  it('submits B2B enterprise quick chip with track B2B to generateSingleAudienceFromPrompt', async () => {
    renderComponent();

    const chip = screen.getByText(/Directora de Recursos Humanos buscando convenios de check-ups anuales para 350 colaboradores/i);
    fireEvent.click(chip);

    const generateBtn = screen.getByText(/Generar y Agregar Audiencia/i);
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(geminiService.generateSingleAudienceFromPrompt).toHaveBeenCalledWith(
        expect.stringContaining('Directora de Recursos Humanos'),
        'B2B',
        expect.any(String)
      );
    });
  });

  it('submits B2C patient quick chip with track B2C to generateSingleAudienceFromPrompt', async () => {
    renderComponent();

    const chip = screen.getByText(/Mujer embarazada primeriza buscando ultrasonido prenatal/i);
    fireEvent.click(chip);

    const generateBtn = screen.getByText(/Generar y Agregar Audiencia/i);
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(geminiService.generateSingleAudienceFromPrompt).toHaveBeenCalledWith(
        expect.stringContaining('Mujer embarazada primeriza'),
        'B2C',
        expect.any(String)
      );
    });
  });

  it('filters cards cleanly across Pacientes B2C, Médicos B2D, and Empresas B2B', () => {
    renderComponent(ALL_THREE_SEGMENTS_PERSONAS);

    // Filter B2B Enterprises
    fireEvent.click(screen.getByRole('button', { name: /Empresas B2B/i }));
    expect(screen.queryAllByText(/Directora de Recursos Humanos Corporativo/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Adulto en Control de Diabetes/i)).toBeNull();
    expect(screen.queryByText(/Médico Especialista \(Endocrinología/i)).toBeNull();

    // Filter B2D Doctors
    fireEvent.click(screen.getByRole('button', { name: /Médicos B2D/i }));
    expect(screen.queryAllByText(/Médico Especialista \(Endocrinología/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Directora de Recursos Humanos Corporativo/i)).toBeNull();
    expect(screen.queryByText(/Adulto en Control de Diabetes/i)).toBeNull();

    // Filter B2C Patients
    fireEvent.click(screen.getByRole('button', { name: /Pacientes B2C/i }));
    expect(screen.queryAllByText(/Adulto en Control de Diabetes/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Médico Especialista \(Endocrinología/i)).toBeNull();
    expect(screen.queryByText(/Directora de Recursos Humanos Corporativo/i)).toBeNull();
  });

  it('preselects audience in localStorage and navigates to SYNTHETIC_USERS when clicking card CTA', () => {
    renderComponent();

    const synthButtons = screen.getAllByText(/Crear Usuarios Sintéticos de este Perfil/i);
    fireEvent.click(synthButtons[0]);

    expect(localStorage.getItem('chopo_preselected_audience')).toBe(STANDARD_AUDIENCES[0].name);
    expect(setModeMock).toHaveBeenCalledWith(AppMode.SYNTHETIC_USERS);
  });
});
