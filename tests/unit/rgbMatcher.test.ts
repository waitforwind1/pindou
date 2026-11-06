import { describe, expect, it } from 'vitest';

import { Cie76Matcher, createColorMatcher, RgbEuclideanMatcher } from '@/core/color';
import { AppError } from '@/core/errors/appError';
import { loadDefaultPalette } from '@/palettes';
import type { BeadColor } from '@/types';

function beadColor(code: string, rgb: readonly [number, number, number]): BeadColor {
  return {
    code,
    officialName: `Test ${code}`,
    displayRgb: rgb,
    source: {
      documentId: 'test-document',
      page: 1,
    },
  };
}

const colors = [
  beadColor('20', [255, 0, 0]),
  beadColor('10', [0, 255, 0]),
  beadColor('30', [0, 0, 255]),
];

describe('RGB Euclidean matcher', () => {
  it('matches exact palette colours to their own indices', () => {
    const matcher = new RgbEuclideanMatcher().prepare(colors);

    expect(matcher.match([255, 0, 0])).toBe(0);
    expect(matcher.match([0, 255, 0])).toBe(1);
    expect(matcher.match([0, 0, 255])).toBe(2);
  });

  it('breaks ties by official code instead of palette position', () => {
    const matcher = new RgbEuclideanMatcher().prepare([
      beadColor('20', [120, 40, 80]),
      beadColor('10', [120, 40, 80]),
    ]);

    expect(matcher.match([120, 40, 80])).toBe(1);
  });

  it('returns deterministic results for repeated calls', () => {
    const matcher = new RgbEuclideanMatcher().prepare(colors);
    const results = Array.from({ length: 100 }, () => matcher.match([140, 30, 10]));

    expect(new Set(results).size).toBe(1);
  });

  it('rejects an empty palette', () => {
    expect(() => new RgbEuclideanMatcher().prepare([])).toThrowError(AppError);
  });
});

describe('colour matcher factory', () => {
  it('resolves both implemented strategies without sharing state', () => {
    expect(createColorMatcher('rgb-euclidean')).toBeInstanceOf(RgbEuclideanMatcher);
    expect(createColorMatcher('cie76')).toBeInstanceOf(Cie76Matcher);
  });

  it('does not pretend that the reserved CIEDE2000 strategy is available', () => {
    expect(() => createColorMatcher('ciede2000')).toThrowError(AppError);
  });
});

describe('matcher strategy differences', () => {
  it('can select different real Hama codes for the same dark blue sample', async () => {
    const palette = await loadDefaultPalette();
    const sample = [0, 0, 90] as const;
    const rgbIndex = new RgbEuclideanMatcher().prepare(palette.colors).match(sample);
    const labIndex = new Cie76Matcher().prepare(palette.colors).match(sample);

    expect(palette.colors[rgbIndex]?.code).toBe('116');
    expect(palette.colors[labIndex]?.code).toBe('08');
    expect(rgbIndex).not.toBe(labIndex);
  });
});
