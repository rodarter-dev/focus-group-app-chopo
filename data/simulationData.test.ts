import { describe, it, expect } from 'vitest';
import { SIMULATION_PRODUCTS, STANDARD_AUDIENCES } from './simulationData';

describe('Simulation Data Content (Laboratorios Chopo)', () => {
    it('contains Chopo clinical diagnostic studies instead of legacy retail products', () => {
        const legacyRetailKeywords = [/Mixer/i, /Vacuum/i, /Cookware/i, /Jewelry/i];
        const chopoClinicalKeywords = [
            /Check-up Control Diabetes/i,
            /Hemoglobina Glicosilada \(HbA1c\)/i,
            /Check-up Completo Chopo/i,
            /Mastografía Digital/i,
            /Rayos X de Tórax Digital/i
        ];

        const productsText = SIMULATION_PRODUCTS.join(' ');

        legacyRetailKeywords.forEach(k => {
            expect(productsText).not.toMatch(k);
        });

        chopoClinicalKeywords.forEach(k => {
            expect(productsText).toMatch(k);
        });
    });

    it('has standardized fixed-schema B2C patient and B2B physician personas', () => {
        expect(STANDARD_AUDIENCES.length).toBeGreaterThanOrEqual(5);

        STANDARD_AUDIENCES.forEach(persona => {
            expect(['patient', 'physician']).toContain(persona.track);
            expect(typeof persona.age).toBe('number');
            expect(persona.job_title).toBeTruthy();
            expect(Array.isArray(persona.pain_points)).toBe(true);
            expect(persona.pain_points.length).toBeGreaterThan(0);
            expect(Array.isArray(persona.goals)).toBe(true);
            expect(persona.goals.length).toBeGreaterThan(0);
        });
    });
});
