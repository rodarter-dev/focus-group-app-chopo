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
  ClipboardList: () => <div data-testid="icon-clipboard-list" />,
  Palette: () => <div data-testid="icon-palette" />
}));

describe('HelpGuideModal (Spanish-only Exact Interface Parity & Manual V4)', () => {
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

  it('renders official Chopo Intelligence Hub workflow, Manual de Marca V4, and Base de Conocimiento (COFEPRIS y Clínico) in Quick Flow (ES)', () => {
    const { container } = renderModal(AppMode.HOME);

    expect(screen.getAllByText(/Flujo de Trabajo — Chopo Intelligence Hub/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/100% en español para Laboratorio Médico del Chopo/i)).toBeDefined();
    expect(screen.getByText(/Atajo Rápido para Agencia \/ Parrilla/i)).toBeDefined();
    expect(screen.getByText(/Ir Directo al Focus Group ➔/i)).toBeDefined();
    expect(screen.getAllByText(/1\. Audiencias/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\. Usuarios Sintéticos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\. Brief de Marketing/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4\. Focus Group/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Manual de Marca V4/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Base de Conocimiento \(COFEPRIS y Clínico\)/i).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/ES\s*\|\s*EN/i);
    expect(container.textContent).not.toMatch(/Switch Español/i);
    expect(container.textContent).not.toMatch(/COFEPRIS y Marca/i);
  });

  it('documents Manual de Marca V4 5 tabs, 3 segments (B2C/B2D/B2B), Funnel, 4 Channels, and COFEPRIS/Clinical Knowledge Base without jargon', () => {
    const { container } = renderModal(AppMode.BRAND_MANUAL);

    // Auto-selects Manual de Marca V4 tab when currentMode is BRAND_MANUAL
    expect(screen.getByText(/Manual de Marca V4 — Laboratorio Médico del Chopo/i)).toBeDefined();
    expect(screen.getByText(/1\. Identidad y Voz/i)).toBeDefined();
    expect(screen.getByText(/2\. Fotografía e Imagen/i)).toBeDefined();
    expect(screen.getByText(/3\. Paleta y Contrastes/i)).toBeDefined();
    expect(screen.getByText(/4\. Diseño Gráfico y Línea Basal/i)).toBeDefined();
    expect(screen.getByText(/5\. Reglas por Canal/i)).toBeDefined();
    expect(screen.getAllByText(/B2C Pacientes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/B2D Médicos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/B2B Empresas/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Restaurar Manual V4 Oficial/i)).toBeDefined();

    // Verify no technical jargon leaks
    expect(container.textContent).not.toMatch(/\bRAG\b|\bJSON\b|\bFirestore\b|\bPII\b/i);

    // Base de Conocimiento (COFEPRIS y Clínico) tab
    fireEvent.click(screen.getByRole('button', { name: /Base de Conocimiento \(COFEPRIS y Clínico\)/i }));
    expect(screen.getByText(/Los 3 Pilares Regulatorios y Clínicos Oficiales/i)).toBeDefined();
    expect(screen.getByText(/Lineamientos Regulatorios COFEPRIS/i)).toBeDefined();
    expect(screen.getByText(/Catálogo de Estudios y Preparación Clínica/i)).toBeDefined();
    expect(screen.getByText(/Reglas de Imagen y Realismo Médico/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Ir al Manual de Marca V4 ➔/i })).toBeDefined();
  });

  it('documents exact controls across 1. Audiencias, 2. Usuarios Sintéticos, 3. Brief (Funnel & 4 Channels), and 4. Focus Group without legacy terms', () => {
    const { container } = renderModal(AppMode.AUDIENCE_GEN);

    // 1. Audiencias
    expect(screen.getByText(/✨ Crear Nuevo Perfil de Audiencia con IA/i)).toBeDefined();
    expect(screen.getAllByText(/B2C Pacientes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/B2D Médicos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/B2B Empresas/i).length).toBeGreaterThan(0);
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

    // 3. Brief de Marketing (Funnel & 4 Channels)
    fireEvent.click(screen.getByRole('button', { name: /^3\. Brief de Marketing$/i }));
    expect(screen.getByText(/Awareness:/i)).toBeDefined();
    expect(screen.getByText(/Consideration:/i)).toBeDefined();
    expect(screen.getByText(/Performance:/i)).toBeDefined();
    expect(screen.getByText(/Redes Sociales:/i)).toBeDefined();
    expect(screen.getByText(/Mailing \/ E-commerce:/i)).toBeDefined();
    expect(screen.getByText(/Sitio Web:/i)).toBeDefined();
    expect(screen.getByText(/PDV Sucursal:/i)).toBeDefined();
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

  it('includes FAQ on Manual de Marca V4 and stays locked to Mexican Spanish even with stale localStorage', () => {
    renderModal(AppMode.HOME);
    fireEvent.click(screen.getByRole('button', { name: /Dudas Frecuentes \/ Buscador/i }));

    expect(
      screen.getByText(
        /¿Dónde administro la voz de marca, los colores oficiales, la Línea Basal y las reglas por canal/i
      )
    ).toBeDefined();

    const searchInput = screen.getByPlaceholderText(/Escribe una palabra clave/i);
    fireEvent.change(searchInput, { target: { value: 'Manual de Marca V4' } });
    expect(screen.getAllByText(/Restaurar Manual V4 Oficial/i).length).toBeGreaterThan(0);

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
