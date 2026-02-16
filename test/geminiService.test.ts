import { describe, it, expect } from 'vitest';
import { parseDietStructuredText, mapMealCategory } from '../services/geminiService';

describe('mapMealCategory', () => {
  it('maps "desayuno" to breakfast', () => {
    expect(mapMealCategory('Desayuno')).toBe('breakfast');
  });

  it('maps "comida" to lunch', () => {
    expect(mapMealCategory('Comida')).toBe('lunch');
  });

  it('maps "almuerzo" to lunch', () => {
    expect(mapMealCategory('Almuerzo')).toBe('lunch');
  });

  it('maps "cena" to dinner', () => {
    expect(mapMealCategory('Cena')).toBe('dinner');
  });

  it('maps "colación" to snack', () => {
    expect(mapMealCategory('Colación')).toBe('snack');
  });

  it('maps "snack" to snack', () => {
    expect(mapMealCategory('Snack')).toBe('snack');
  });

  it('maps unknown labels to other', () => {
    expect(mapMealCategory('Merienda')).toBe('other');
  });
});

describe('parseDietStructuredText', () => {
  it('parses a standard multi-day diet format', () => {
    const text = `
SEMANA 1
DÍA 1
Desayuno
Avena con frutas, leche descremada
Colación
Manzana verde
Comida
Pollo a la plancha, arroz integral, ensalada
Cena
Sopa de verduras, tortilla

DÍA 2
Desayuno
Huevos revueltos, pan integral
Comida
Pescado al horno, quinoa
Cena
Ensalada de atún
    `.trim();

    const result = parseDietStructuredText(text);
    expect(result).not.toBeNull();
    expect(result!.schedule.length).toBeGreaterThanOrEqual(6);
    expect(result!.name).toBe('Plan nutricional personalizado');

    const breakfast = result!.schedule[0];
    expect(breakfast.category).toBe('breakfast');
    expect(breakfast.time).toContain('DÍA 1');
    expect(breakfast.description).toContain('Avena');
  });

  it('returns null for empty input', () => {
    expect(parseDietStructuredText('')).toBeNull();
  });

  it('returns null for text with no recognizable meal keywords', () => {
    const result = parseDietStructuredText('This is just random text without meal data');
    expect(result).toBeNull();
  });

  it('handles single-day format', () => {
    const text = `
DÍA 1
Desayuno
Pan con aguacate
Comida
Ensalada mixta con pollo
Cena
Fruta con yogurt
    `.trim();

    const result = parseDietStructuredText(text);
    expect(result).not.toBeNull();
    expect(result!.schedule).toHaveLength(3);
  });

  it('generates ingredients from comma-separated descriptions', () => {
    const text = `
DÍA 1
Desayuno
Huevos, jamón, pan integral
    `.trim();

    const result = parseDietStructuredText(text);
    expect(result).not.toBeNull();
    expect(result!.schedule[0].ingredients.length).toBeGreaterThanOrEqual(2);
  });
});
