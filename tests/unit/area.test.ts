import { describe, expect, it } from 'vitest';

import { computeContainLayout, sampleAreaAverage, sampleImageCell } from '@/core/image';
import type { RgbaImage } from '@/types';

function image(width: number, height: number, pixels: readonly number[]): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(pixels) };
}

function options(alphaThreshold = 128) {
  return {
    alphaThreshold,
    backgroundColor: [255, 255, 255] as const,
  };
}

describe('area-average sampling', () => {
  it('averages black and white in linear light rather than sRGB byte space', () => {
    const source = image(
      2,
      2,
      [0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255],
    );
    const sample = sampleAreaAverage(source, computeContainLayout(2, 2, 1, 1), 0, 0, options());

    expect(sample?.rgb).toEqual([188, 188, 188]);
    expect(sample?.alpha).toBe(255);
  });

  it('premultiplies alpha so transparent black does not create a dark fringe', () => {
    const source = image(2, 1, [255, 0, 0, 255, 0, 0, 0, 0]);
    const sample = sampleAreaAverage(source, computeContainLayout(2, 1, 1, 1), 0, 0, options());

    expect(sample).not.toBeNull();
    expect(sample?.rgb[0]).toBeGreaterThanOrEqual(248);
    expect(sample?.rgb[1]).toBeGreaterThanOrEqual(185);
    expect(sample?.rgb[2]).toBeGreaterThanOrEqual(185);
  });

  it('uses the rounded average alpha for the strict 128 threshold', () => {
    const below = image(1, 1, [255, 0, 0, 127]);
    const exact = image(1, 1, [255, 0, 0, 128]);
    const layout = computeContainLayout(1, 1, 1, 1);

    expect(sampleAreaAverage(below, layout, 0, 0, options())).toBeNull();
    expect(sampleAreaAverage(exact, layout, 0, 0, options())).not.toBeNull();
  });

  it('clips each sampling rectangle to the current contain cell without cross-cell bleed', () => {
    const source = image(2, 1, [255, 0, 0, 255, 0, 0, 255, 255]);
    const layout = computeContainLayout(2, 1, 4, 1);

    expect(sampleAreaAverage(source, layout, 1, 0, options())?.rgb).toEqual([255, 0, 0]);
    expect(sampleAreaAverage(source, layout, 2, 0, options())?.rgb).toEqual([0, 0, 255]);
  });
});

describe('unified cell sampler', () => {
  it('maps transparent nearest-neighbour pixels to empty cells', () => {
    const source = image(1, 1, [255, 255, 255, 0]);
    const sample = sampleImageCell(source, computeContainLayout(1, 1, 1, 1), 0, 0, {
      samplingMode: 'nearest',
      ...options(),
    });

    expect(sample).toBeNull();
  });

  it('composites translucent nearest-neighbour pixels before matching', () => {
    const source = image(1, 1, [100, 150, 200, 128]);
    const sample = sampleImageCell(source, computeContainLayout(1, 1, 1, 1), 0, 0, {
      samplingMode: 'nearest',
      ...options(),
    });

    expect(sample).toEqual({ rgb: [177, 202, 227], alpha: 128 });
  });
});
