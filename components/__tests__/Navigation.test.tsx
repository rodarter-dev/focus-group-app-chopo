/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
    name: 'Laboratorios Chopo',
    description: 'Diagnóstico clínico e imagenología en México',
    saveContext: vi.fn(),
    loadLast: vi.fn()
  })
}));

vi.mock('../../services/geminiService', () => ({
  fetchRagDocs: vi.fn().mockResolvedValue({}),
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

describe('Navigation & LanguageContext (Spanish-only Lock)', () => {
  it('renders sidebar and mobile header in Spanish without any ES/EN language switcher buttons', () => {
    render(
      <LanguageProvider>
        <Navigation
          currentMode={AppMode.HOME}
          setMode={vi.fn()}
          isMobileMenuOpen={false}
          setIsMobileMenuOpen={vi.fn()}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Inicio')).toBeDefined();
    expect(screen.getByText('1. Audiencias')).toBeDefined();
    expect(screen.getByText('2. Usuarios Sintéticos')).toBeDefined();
    expect(screen.getByText('3. Brief de Marketing')).toBeDefined();
    expect(screen.getByText('4. Focus Group')).toBeDefined();

    // Ensure no ES or EN switcher buttons exist anywhere in Navigation
    expect(screen.queryByRole('button', { name: /^ES$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^EN$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^English$/i })).toBeNull();
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
