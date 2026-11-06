import { describe, expect, it } from 'vitest';

import { Cie76Matcher, deltaE76, deltaE76Squared } from '@/core/color';
import { AppError } from '@/core/errors/appError';
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

describe('CIE76 distance and matching', () => {
  it('computes squared and Euclidean distance with the documented formula', () => {
    expect(deltaE76Squared([50, 2.7, -80], [50, 0, 0])).toBeCloseTo(2.7 ** 2 + 80 ** 2, 10);
    expect(deltaE76([50, 2.7, -80], [50, 0, 0])).toBeCloseTo(Math.sqrt(2.7 ** 2 + 80 ** 2), 10);
  });

  it('matches a palette colour to itself', () => {
    const matcher = new Cie76Matcher().prepare([
      beadColor('02', [255, 0, 0]),
      beadColor('03', [0, 255, 0]),
      beadColor('04', [0, 0, 255]),
    ]);

    expect(matcher.match([255, 0, 0])).toBe(0);
    expect(matcher.match([0, 255, 0])).toBe(1);
    expect(matcher.match([0, 0, 255])).toBe(2);
  });

  it('breaks exact ties by official code, not palette position', () => {
    const matcher = new Cie76Matcher().prepare([
      beadColor('20', [255, 0, 0]),
      beadColor('10', [255, 0, 0]),
    ]);

    expect(matcher.match([255, 0, 0])).toBe(1);
  });

  it('is deterministic for repeated matching', () => {
    const matcher = new Cie76Matcher().prepare([
      beadColor('01', [0, 0, 0]),
      beadColor('02', [120, 120, 120]),
      beadColor('03', [255, 255, 255]),
    ]);

    const results = Array.from({ length: 100 }, () => matcher.match([124, 121, 118]));
    expect(new Set(results)).toEqual(new Set([1]));
  });

  it('rejects an empty palette instead of inventing a colour', () => {
    let caught: unknown;

    try {
      new Cie76Matcher().prepare([]);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(caught instanceof AppError ? caught.code : null).toBe('PALETTE_INVALID');
  });
});
