/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { HelpGuideModal } from '../HelpGuideModal';
import { LanguageProvider } from '../../context/LanguageContext';
import { AppMode } from '../../types';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});

vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  HelpCircle: () => <div data-testid="icon-help" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Users: () => <div data-testid="icon-users" />,
  UserPlus: () => <div data-testid="icon-user-plus" />,
  FileText: () => <div data-testid="icon-file-text" />,
  MessageSquare: () => <div data-testid="icon-message-square" />,
  BookOpen: () => <div data-testid="icon-book-open" />,
  Search: () => <div data-testid="icon-search" />,
  ArrowRight: () => <div data-testid="icon-arrow-right" />,
  Mail: () => <div data-testid="icon-mail" />,
  History: () => <div data-testid="icon-history" />,
  Zap: () => <div data-testid="icon-zap" />,
  RotateCcw: () => <div data-testid="icon-rotate-ccw" />,
  Trash2: () => <div data-testid="icon-trash" />,
  ClipboardList: () => <div data-testid="icon-clipboard-list" />
}));

describe('HelpGuideModal (Spanish-only Exact Interface Parity)', () => {
  const onCloseMock = vi.fn();
  const onNavigateModeMock = vi.fn();
  const onOpenRagModalMock = vi.fn();

  const renderModal = (currentMode: AppMode = AppMode.HOME) => {
    return render(
      <LanguageProvider>
        <HelpGuideModal
          isOpen={true}
          onClose={onCloseMock}
          currentMode={currentMode}
          onNavigateMode={onNavigateModeMock}
          onOpenRagModal={onOpenRagModalMock}
        />
      </LanguageProvider>
    );
  };

  it('renders official Chopo Intelligence Hub workflow and Agency Fast-Track in Quick Flow (ES)', () => {
    const { container } = renderModal(AppMode.HOME);

    expect(screen.getAllByText(/Flujo de Trabajo — Chopo Intelligence Hub/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/100% en español para Laboratorios Chopo/i)).toBeDefined();
    expect(screen.getByText(/Atajo Rápido para Agencia \/ Parrilla/i)).toBeDefined();
    expect(screen.getByText(/Ir Directo al Focus Group ➔/i)).toBeDefined();
    expect(screen.getAllByText(/1\. Audiencias/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\. Usuarios Sintéticos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\. Brief de Marketing/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4\. Focus Group/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/📚 Base de Conocimiento \(COFEPRIS y Marca\)/i).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/ES\s*\|\s*EN/i);
    expect(container.textContent).not.toMatch(/Switch Español/i);
  });

  it('documents exact controls across 1. Audiencias, 2. Usuarios Sintéticos, 3. Brief, and 4. Focus Group without legacy terms', () => {
    const { container } = renderModal(AppMode.AUDIENCE_GEN);

    // 1. Audiencias
    expect(screen.getByText(/✨ Crear Nuevo Perfil de Audiencia con IA/i)).toBeDefined();
    expect(screen.getByText(/🏥 Paciente \(B2C\)/i)).toBeDefined();
    expect(screen.getByText(/🩺 Médico Prescriptor \(B2B\)/i)).toBeDefined();
    expect(screen.getByText(/Generar y Agregar Audiencia/i)).toBeDefined();
    expect(screen.getAllByText(/📜 Historial \/ Versiones/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/🗑️ Vaciar Todos/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Incluye: \.\.\./i)).toBeDefined();
    expect(screen.getByText(/👥 Crear Usuarios Sintéticos de este Perfil ➔/i)).toBeDefined();
    expect(container.textContent).not.toMatch(/Índice de Afinidad/i);
    expect(container.textContent).not.toMatch(/semilla/i);

    // 2. Usuarios Sintéticos
    fireEvent.click(screen.getByRole('button', { name: /^2\. Usuarios Sintéticos$/i }));
    expect(screen.getAllByText(/Contexto Clínico Adicional \(Opcional\)/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/🗑️ Vaciar Usuarios Sintéticos/i)).toBeDefined();
    expect(screen.getByText(/🗑️ Borrar Todos/i)).toBeDefined();
    expect(screen.getByText(/Siguiente Paso: 3\. Crear Brief de Campaña ➔/i)).toBeDefined();
    expect(screen.getByText(/O ir directo a: 4\. Evaluar en Focus Group ➔/i)).toBeDefined();

    // 3. Brief de Marketing
    fireEvent.click(screen.getByRole('button', { name: /^3\. Brief de Marketing$/i }));
    expect(screen.getByText(/Editar Contexto Institucional de Laboratorios Chopo/i)).toBeDefined();
    expect(screen.getAllByText(/Administrar Estudios Clínicos/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Siguiente Paso: 4\. Evaluar esta Campaña en Focus Group ➔/i)).toBeDefined();

    // 4. Focus Group
    fireEvent.click(screen.getByRole('button', { name: /^4\. Focus Group$/i }));
    expect(screen.getByText(/👥 Ver \/ Inspeccionar Participantes Evaluados \(N\)/i)).toBeDefined();
    expect(screen.getByText(/📋 Criterios de Evaluación \(Rúbricas\)/i)).toBeDefined();
    expect(screen.getByText(/Traer datos del último Brief/i)).toBeDefined();
    expect(screen.getByText(/Preguntas Sugeridas en 1 Clic:/i)).toBeDefined();
    expect(screen.getByText(/2\. Mensajes Clave/i)).toBeDefined();
    expect(screen.getByText(/Crear\/Editar Estudios/i)).toBeDefined();
    expect(screen.getByText(/Evaluar Imagen \/ Banner/i)).toBeDefined();
    expect(container.textContent).not.toMatch(/Sincronizar con Brief/i);
    expect(container.textContent).not.toMatch(/Configurar Estudios/i);
  });

  it('includes updated FAQ on deleting/clearing audiences & synthetic users and stays locked to Mexican Spanish even with stale localStorage', () => {
    renderModal(AppMode.HOME);
    fireEvent.click(screen.getByRole('button', { name: /Dudas Frecuentes \/ Buscador/i }));

    expect(
      screen.getByText(
        /¿Cómo borro o vacío las audiencias o los usuarios sintéticos para empezar desde cero, y cómo los recupero si borré uno por error\?/i
      )
    ).toBeDefined();

    const searchInput = screen.getByPlaceholderText(/Escribe una palabra clave/i);
    fireEvent.change(searchInput, { target: { value: 'Rollback' } });
    expect(screen.getByText(/Incluye: \.\.\./i)).toBeDefined();

    cleanup();

    // Verify Spanish-only lock even if legacy localStorage had 'en'
    localStorage.setItem('chopo_ui_lang', 'en');
    const { container } = renderModal(AppMode.SYNTHETIC_FOCUS_GROUP);
    expect(screen.getByText(/👥 Ver \/ Inspeccionar Participantes Evaluados \(N\)/i)).toBeDefined();
    expect(screen.getByText(/Traer datos del último Brief/i)).toBeDefined();
    expect(screen.getByText(/📋 Criterios de Evaluación \(Rúbricas\)/i)).toBeDefined();
    expect(screen.getByText(/Preguntas Sugeridas en 1 Clic:/i)).toBeDefined();
    expect(container.textContent).not.toMatch(/Load from latest Brief/i);
    expect(container.textContent).not.toMatch(/ES\s*\|\s*EN/i);
  });
});
