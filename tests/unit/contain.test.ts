import { describe, expect, it } from 'vitest';

import { computeContainLayout, mapTargetCellToSource } from '@/core/image';

describe('contain coordinate mapping', () => {
  it('centres an 8x4 source inside a 64x64 target without stretching', () => {
    const layout = computeContainLayout(8, 4, 64, 64);

    expect(layout).toEqual({
      scale: 8,
      contentWidth: 64,
      contentHeight: 32,
      offsetX: 0,
      offsetY: 16,
    });
    expect(mapTargetCellToSource(layout, 8, 4, 0, 15)).toBeNull();
    expect(mapTargetCellToSource(layout, 8, 4, 0, 48)).toBeNull();
    expect(mapTargetCellToSource(layout, 8, 4, 0, 16)).toEqual({ x: 0, y: 0 });
    expect(mapTargetCellToSource(layout, 8, 4, 63, 47)).toEqual({ x: 7, y: 3 });
  });

  it('maps a square source corner to the source centre correctly', () => {
    const layout = computeContainLayout(4, 4, 64, 64);

    expect(mapTargetCellToSource(layout, 4, 4, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(mapTargetCellToSource(layout, 4, 4, 63, 63)).toEqual({ x: 3, y: 3 });
  });

  it('leaves the left and right target columns empty for a tall source', () => {
    const layout = computeContainLayout(2, 4, 8, 8);

    expect(layout.offsetX).toBe(2);
    expect(mapTargetCellToSource(layout, 2, 4, 1, 4)).toBeNull();
    expect(mapTargetCellToSource(layout, 2, 4, 2, 4)).toEqual({ x: 0, y: 2 });
    expect(mapTargetCellToSource(layout, 2, 4, 5, 4)).toEqual({ x: 1, y: 2 });
    expect(mapTargetCellToSource(layout, 2, 4, 6, 4)).toBeNull();
  });

  it('rejects non-positive dimensions', () => {
    expect(() => computeContainLayout(0, 4, 64, 64)).toThrow(RangeError);
    expect(() => computeContainLayout(8, 4.5, 64, 64)).toThrow(RangeError);
  });
});
