/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Home } from '../Home';
import React from 'react';
import { LanguageProvider } from '../../context/LanguageContext';

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
  ArrowRight: () => <div data-testid="icon-arrow-right" />
}));

// Mock CompanyContext
vi.mock('../../context/CompanyContext', () => ({
  useCompanyContext: () => ({
    name: 'Laboratorios Chopo',
    description: 'Laboratorios Médicos El Chopo (Grupo PROA) es líder en diagnóstico clínico e imagenología en México.'
  })
}));

describe('Home Component (Laboratorios Chopo)', () => {
    const mockSetMode = vi.fn();

    const renderWithProviders = () =>
        render(
            <LanguageProvider>
                <Home setMode={mockSetMode} />
            </LanguageProvider>
        );

    it('renders the correct Chopo brand text from context', () => {
        renderWithProviders();
        expect(screen.getAllByText(/Intelligence Hub/i).length).toBeGreaterThan(0);
    });

    it('does not use dark mode classes on the main heading', () => {
        renderWithProviders();
        const heading = screen.getAllByText(/Intelligence Hub/i)[0];
        expect(heading.parentElement?.className).not.toContain('text-white');
    });

    it('does not use dark mode classes on the description', () => {
        renderWithProviders();
        const description = screen.getByText(/Espacio exclusivo del equipo de Marketing de Laboratorios Chopo/i);
        expect(description.className).not.toContain('text-blue-100');
    });

    it('uses the correct Chopo AI workflow heading', () => {
        renderWithProviders();
        expect(screen.getByText(/Flujo de Trabajo — Chopo Intelligence Hub/i)).toBeDefined();
    });

    it('renders all 4 active Chopo tool cards', () => {
        renderWithProviders();
        const tools = ["Audiencias", "Usuarios Sintéticos", "Brief de Marketing", "Focus Group"];
        tools.forEach(tool => {
            expect(screen.getAllByText(new RegExp(tool, 'i')).length).toBeGreaterThan(0);
        });
    });
});
