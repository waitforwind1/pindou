import { describe, expect, it } from 'vitest';

import { srgbChannelToLinear, srgbToLab } from '@/core/color';
import type { Rgb8 } from '@/types';

function expectLab(rgb: Rgb8, expected: readonly [number, number, number]): void {
  const actual = srgbToLab(rgb);

  expect(actual[0]).toBeCloseTo(expected[0], 3);
  expect(actual[1]).toBeCloseTo(expected[1], 3);
  expect(actual[2]).toBeCloseTo(expected[2], 3);
}

describe('sRGB to CIELAB', () => {
  it('uses the sRGB linearization threshold', () => {
    expect(srgbChannelToLinear(0)).toBe(0);
    expect(srgbChannelToLinear(255)).toBeCloseTo(1, 12);
    expect(srgbChannelToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 12);
  });

  it.each([
    { label: 'black', rgb: [0, 0, 0] as const, expected: [0, 0, 0] as const },
    { label: 'white', rgb: [255, 255, 255] as const, expected: [100, 0, 0] as const },
    {
      label: 'red',
      rgb: [255, 0, 0] as const,
      expected: [53.2408, 80.0925, 67.2032] as const,
    },
    {
      label: 'green',
      rgb: [0, 255, 0] as const,
      expected: [87.7347, -86.1827, 83.1793] as const,
    },
    {
      label: 'blue',
      rgb: [0, 0, 255] as const,
      expected: [32.297, 79.1875, -107.8602] as const,
    },
  ])('matches the D65 reference for $label', ({ rgb, expected }) => {
    expectLab(rgb, expected);
  });
});
