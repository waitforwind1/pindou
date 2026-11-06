import type { RgbaImage } from '@/types';

import type { ContainLayout } from './contain';
import { mapTargetCellToSource } from './contain';
import type { RgbaPixel } from './pixel';
import { readRgbaPixel } from './pixel';

export function sampleNearestNeighbor(
  image: RgbaImage,
  layout: ContainLayout,
  targetX: number,
  targetY: number,
): RgbaPixel | null {
  const source = mapTargetCellToSource(layout, image.width, image.height, targetX, targetY);
  return source === null ? null : readRgbaPixel(image, source.x, source.y);
}
