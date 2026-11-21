/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import React from 'react';
import { Navigation } from '../Navigation';
import {
  LanguageProvider,
  useLanguage,
  getCurrentLanguage
} from '../../context/LanguageContext';
import { AppMode } from '../../types';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});

vi.mock('../../context/CompanyContext', () => ({
  useCompanyContext: () => ({
    name: 'Laboratorio Médico del Chopo',
    description: 'Diagnóstico clínico e imagenología en México',
    saveContext: vi.fn(),
    loadLast: vi.fn()
  })
}));

vi.mock('../../services/geminiService', () => ({
  fetchRagDocs: vi.fn().mockResolvedValue({
    '01_cofepris_lineamientos.md': '# COFEPRIS',
    '03_catalogo_estudios_diabetes.md': '# Estudios',
    '04_reglas_realismo_clinico_y_operativo.md': '# Realismo'
  }),
  saveRagDocs: vi.fn().mockResolvedValue({}),
  uploadRagFile: vi.fn().mockResolvedValue({ filename: 'test.md', content: '' }),
  fetchConfigVersions: vi.fn().mockResolvedValue([]),
  restoreConfigVersion: vi.fn().mockResolvedValue({ data: {} })
}));

const LanguageLockProbe: React.FC = () => {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <span data-testid="translated-text">{t('Texto en Español', 'English Text')}</span>
      <button type="button" onClick={() => setLanguage('en')}>
        Force English
      </button>
      <button type="button" onClick={toggleLanguage}>
        Toggle Language
      </button>
    </div>
  );
};

describe('Navigation & LanguageContext (Spanish-only Lock & Manual V4)', () => {
  it('renders sidebar and mobile header in Spanish with dedicated Manual de Marca V4 and COFEPRIS/Clinical Knowledge Base buttons without any ES/EN switcher', () => {
    const setMode = vi.fn();
    const setIsMobileMenuOpen = vi.fn();

    render(
      <LanguageProvider>
        <Navigation
          currentMode={AppMode.HOME}
          setMode={setMode}
          isMobileMenuOpen={true}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Inicio')).toBeDefined();
    expect(screen.getByText('1. Audiencias')).toBeDefined();
    expect(screen.getByText('2. Usuarios Sintéticos')).toBeDefined();
    expect(screen.getByText('3. Brief de Marketing')).toBeDefined();
    expect(screen.getByText('4. Focus Group')).toBeDefined();

    // Dedicated Manual de Marca V4 button in sidebar
    const brandManualBtn = screen.getByRole('button', { name: /Manual de Marca V4/i });
    expect(brandManualBtn).toBeDefined();
    fireEvent.click(brandManualBtn);
    expect(setMode).toHaveBeenCalledWith(AppMode.BRAND_MANUAL);
    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false);

    // Knowledge Base button reflects COFEPRIS y Clínico
    expect(screen.getByRole('button', { name: /Base de Conocimiento \(COFEPRIS y Clínico\)/i })).toBeDefined();

    // Ensure no ES or EN switcher buttons exist anywhere in Navigation
    expect(screen.queryByRole('button', { name: /^ES$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^EN$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^English$/i })).toBeNull();
  });

  it('highlights Manual de Marca V4 button when active and shows COFEPRIS/Clinical modal with 1-click jump to Manual de Marca V4', async () => {
    const setMode = vi.fn();
    const setIsMobileMenuOpen = vi.fn();

    render(
      <LanguageProvider>
        <Navigation
          currentMode={AppMode.BRAND_MANUAL}
          setMode={setMode}
          isMobileMenuOpen={false}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </LanguageProvider>
    );

    const brandManualBtn = screen.getByRole('button', { name: /Manual de Marca V4/i });
    expect(brandManualBtn.className).toContain('bg-[#005FFC]');

    // Open Knowledge Base modal
    const kbBtn = screen.getByRole('button', { name: /Base de Conocimiento \(COFEPRIS y Clínico\)/i });
    fireEvent.click(kbBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Base de Conocimiento \(COFEPRIS y Clínico\)/i })).toBeDefined();
    });

    // Verify 3 clinical/regulatory pillars load and Brand Manual V4 callout redirects in 1 click
    await waitFor(() => {
      expect(screen.getAllByText(/Lineamientos Regulatorios COFEPRIS/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Catálogo de Estudios y Preparación Clínica/i)).toBeDefined();
      expect(screen.getByText(/Reglas de Imagen y Realismo Clínico/i)).toBeDefined();
    });

    expect(screen.queryByText(/Manual de Identidad y Marca Chopo/i)).toBeNull();

    const jumpBtn = screen.getByRole('button', { name: /Ir al Manual de Marca V4 ➔/i });
    fireEvent.click(jumpBtn);
    expect(setMode).toHaveBeenCalledWith(AppMode.BRAND_MANUAL);
    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false);
  });

  it('permanently locks LanguageContext to Mexican Spanish and ignores localStorage or toggle attempts', () => {
    localStorage.setItem('chopo_ui_lang', 'en');
    expect(getCurrentLanguage()).toBe('es');

    render(
      <LanguageProvider>
        <LanguageLockProbe />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-lang').textContent).toBe('es');
    expect(screen.getByTestId('translated-text').textContent).toBe('Texto en Español');

    fireEvent.click(screen.getByText('Force English'));
    fireEvent.click(screen.getByText('Toggle Language'));

    expect(screen.getByTestId('current-lang').textContent).toBe('es');
    expect(screen.getByTestId('translated-text').textContent).toBe('Texto en Español');
    expect(getCurrentLanguage()).toBe('es');
  });
});
