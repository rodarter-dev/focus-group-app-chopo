import { expect, test, describe } from 'vitest';
import { brandConfig } from '../config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Logo & Brand Identity V4 Configuration (Laboratorio Médico del Chopo)', () => {
  test('brandConfig uses official Brand Manual V4 name, page title, and HEX palette', () => {
    expect(brandConfig.companyName).toBe('Laboratorio Médico del Chopo');
    expect(brandConfig.meta.title).toBe('Laboratorio Médico del Chopo | Intelligence Hub');
    expect(brandConfig.colors.secondary).toBe('#004699');
    expect(brandConfig.colors.accent).toBe('#005FFC');
    expect(brandConfig.colors.lime).toBe('#63CF00');
    expect(brandConfig.colors.coral).toBe('#F24360');
  });

  test('brandConfig.logo.sidebar is set to the official Chopo SVG logo', () => {
    expect(brandConfig.logo.sidebar).toBe('/images/chopo-logo.svg');
  });

  test('the chopo-logo.svg file exists in the public/images directory and legacy qvc-logo.png is removed', () => {
    const chopoLogoPath = path.resolve(__dirname, '../public/images/chopo-logo.svg');
    const legacyQvcLogoPath = path.resolve(__dirname, '../public/images/qvc-logo.png');
    expect(fs.existsSync(chopoLogoPath)).toBe(true);
    expect(fs.existsSync(legacyQvcLogoPath)).toBe(false);
  });
});
