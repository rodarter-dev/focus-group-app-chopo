/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Home } from '../Home';
import React from 'react';
import { LanguageProvider } from '../../context/LanguageContext';
import { AppMode } from '../../types';

afterEach(() => {
  cleanup();
});

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="icon-bar-chart" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Eye: () => <div data-testid="icon-eye" />,
  Users: () => <div data-testid="icon-users" />,
  UserPlus: () => <div data-testid="icon-user-plus" />,
  FileText: () => <div data-testid="icon-file-text" />,
  Layers: () => <div data-testid="icon-layers" />,
  MessageSquare: () => <div data-testid="icon-message-square" />,
  Target: () => <div data-testid="icon-target" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  Zap: () => <div data-testid="icon-zap" />,
  Search: () => <div data-testid="icon-search" />,
  ArrowRight: () => <div data-testid="icon-arrow-right" />,
  Palette: () => <div data-testid="icon-palette" />
}));

// Mock CompanyContext
vi.mock('../../context/CompanyContext', () => ({
  useCompanyContext: () => ({
    name: 'Laboratorio Médico del Chopo',
    description: 'Laboratorio Médico del Chopo (Grupo PROA) es líder en diagnóstico clínico e imagenología en México.'
  })
}));

describe('Home Component (Laboratorio Médico del Chopo)', () => {
    const mockSetMode = vi.fn();

    const renderWithProviders = () =>
        render(
            <LanguageProvider>
                <Home setMode={mockSetMode} />
            </LanguageProvider>
        );

    it('renders the correct Chopo brand text and official 3 segments (Pacientes B2C, Médicos B2D, Empresas B2B)', () => {
        renderWithProviders();
        expect(screen.getAllByText(/Intelligence Hub/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Laboratorio Médico del Chopo/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Pacientes B2C/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Médicos B2D/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Empresas B2B/i).length).toBeGreaterThan(0);
    });

    it('does not use dark mode classes on the main heading', () => {
        renderWithProviders();
        const heading = screen.getAllByText(/Intelligence Hub/i)[0];
        expect(heading.parentElement?.className).not.toContain('text-white');
    });

    it('does not use dark mode classes on the description', () => {
        renderWithProviders();
        const description = screen.getByText(/Espacio exclusivo del equipo de Marketing de Laboratorio Médico del Chopo/i);
        expect(description.className).not.toContain('text-blue-100');
    });

    it('uses the correct Chopo AI workflow heading', () => {
        renderWithProviders();
        expect(screen.getByText(/Flujo de Trabajo — Chopo Intelligence Hub/i)).toBeDefined();
    });

    it('renders quick-access card to open Manual de Marca V4 and navigates on click', () => {
        mockSetMode.mockClear();
        renderWithProviders();
        const manualBtn = screen.getByRole('button', { name: /Abrir Manual de Marca V4 ➔/i });
        expect(manualBtn).toBeDefined();
        fireEvent.click(manualBtn);
        expect(mockSetMode).toHaveBeenCalledWith(AppMode.BRAND_MANUAL);
    });

    it('renders all 4 active Chopo tool cards', () => {
        renderWithProviders();
        const tools = ["Audiencias", "Usuarios Sintéticos", "Brief de Marketing", "Focus Group"];
        tools.forEach(tool => {
            expect(screen.getAllByText(new RegExp(tool, 'i')).length).toBeGreaterThan(0);
        });
    });
});
