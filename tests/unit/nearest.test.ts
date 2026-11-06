import { describe, expect, it } from 'vitest';

import { computeContainLayout, readRgbaPixel, sampleNearestNeighbor } from '@/core/image';
import type { RgbaImage } from '@/types';

const image: RgbaImage = {
  width: 2,
  height: 2,
  data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 0]),
};

describe('nearest-neighbour sampling', () => {
  it('reads RGBA values without applying CSS or smoothing', () => {
    expect(readRgbaPixel(image, 0, 0)).toEqual({ rgb: [255, 0, 0], alpha: 255 });
    expect(readRgbaPixel(image, 1, 1)).toEqual({ rgb: [255, 255, 255], alpha: 0 });
  });

  it('samples one source pixel at each 1:1 target cell', () => {
    const layout = computeContainLayout(2, 2, 2, 2);

    expect(sampleNearestNeighbor(image, layout, 0, 1)).toEqual({
      rgb: [0, 0, 255],
      alpha: 255,
    });
    expect(sampleNearestNeighbor(image, layout, 1, 0)).toEqual({
      rgb: [0, 255, 0],
      alpha: 255,
    });
  });

  it('returns null when contain has no source cell', () => {
    const layout = computeContainLayout(8, 4, 64, 64);

    expect(sampleNearestNeighbor(image, layout, 0, 0)).toBeNull();
  });

  it('bounds-checks pixel access', () => {
    expect(() => readRgbaPixel(image, 2, 0)).toThrow(RangeError);
  });
});
