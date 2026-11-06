import { describe, expect, it } from 'vitest';

import { compositeOnWhite, isTransparentAlpha } from '@/core/image';

describe('P0 alpha rules', () => {
  it('treats A < 128 as empty and A >= 128 as valid', () => {
    expect(isTransparentAlpha(0)).toBe(true);
    expect(isTransparentAlpha(1)).toBe(true);
    expect(isTransparentAlpha(127)).toBe(true);
    expect(isTransparentAlpha(128)).toBe(false);
    expect(isTransparentAlpha(255)).toBe(false);
  });

  it('composites valid pixels on white without discarding alpha first', () => {
    expect(compositeOnWhite([100, 150, 200], 128)).toEqual([177, 202, 227]);
    expect(compositeOnWhite([100, 150, 200], 255)).toEqual([100, 150, 200]);
    expect(compositeOnWhite([100, 150, 200], 0)).toEqual([255, 255, 255]);
  });
});
