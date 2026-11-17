import { expect, test, describe } from 'vitest';
import { brandConfig } from '../config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Logo Configuration (Laboratorios Chopo)', () => {
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
