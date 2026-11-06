import type { Rgb8, RgbaImage } from '@/types';

import { srgbChannelToLinear } from '@/core/color/lab';

import type { ContainLayout } from './contain';
import type { RgbaPixel } from './pixel';

export interface AreaSampleOptions {
  alphaThreshold: number;
  backgroundColor: Rgb8;
}

function linearCompositeToSrgb(premultiplied: number, alpha: number, background: number): number {
  const backgroundLinear = srgbChannelToLinear(background);
  const outputLinear = premultiplied + (1 - alpha) * backgroundLinear;
  const encoded =
    outputLinear <= 0.0031308 ? outputLinear * 12.92 : 1.055 * outputLinear ** (1 / 2.4) - 0.055;

  return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
}

/**
 * Average the source pixels intersecting one contain-mapped target cell.
 * Alpha is premultiplied in linear light, so transparent black cannot create a
 * dark fringe. The returned RGB is already composited over the background.
 */
export function sampleAreaAverage(
  image: RgbaImage,
  layout: ContainLayout,
  targetX: number,
  targetY: number,
  options: AreaSampleOptions,
): RgbaPixel | null {
  const sourceX0 = (targetX - layout.offsetX) / layout.scale;
  const sourceX1 = (targetX + 1 - layout.offsetX) / layout.scale;
  const sourceY0 = (targetY - layout.offsetY) / layout.scale;
  const sourceY1 = (targetY + 1 - layout.offsetY) / layout.scale;

  const clippedX0 = Math.max(0, sourceX0);
  const clippedX1 = Math.min(image.width, sourceX1);
  const clippedY0 = Math.max(0, sourceY0);
  const clippedY1 = Math.min(image.height, sourceY1);

  if (clippedX0 >= clippedX1 || clippedY0 >= clippedY1) {
    return null;
  }

  const startX = Math.floor(clippedX0);
  const endX = Math.ceil(clippedX1);
  const startY = Math.floor(clippedY0);
  const endY = Math.ceil(clippedY1);

  let totalWeight = 0;
  let alphaWeight = 0;
  let redWeight = 0;
  let greenWeight = 0;
  let blueWeight = 0;

  for (let sourceY = startY; sourceY < endY; sourceY += 1) {
    const overlapY = Math.max(0, Math.min(clippedY1, sourceY + 1) - Math.max(clippedY0, sourceY));

    if (overlapY === 0) {
      continue;
    }

    for (let sourceX = startX; sourceX < endX; sourceX += 1) {
      const overlapX = Math.max(0, Math.min(clippedX1, sourceX + 1) - Math.max(clippedX0, sourceX));

      if (overlapX === 0) {
        continue;
      }

      const weight = overlapX * overlapY;
      const offset = (sourceY * image.width + sourceX) * 4;
      const red = image.data[offset];
      const green = image.data[offset + 1];
      const blue = image.data[offset + 2];
      const alphaByte = image.data[offset + 3];

      if (
        red === undefined ||
        green === undefined ||
        blue === undefined ||
        alphaByte === undefined
      ) {
        throw new RangeError('RGBA image buffer is shorter than its declared dimensions.');
      }

      const alpha = alphaByte / 255;
      totalWeight += weight;
      alphaWeight += weight * alpha;
      redWeight += weight * alpha * srgbChannelToLinear(red);
      greenWeight += weight * alpha * srgbChannelToLinear(green);
      blueWeight += weight * alpha * srgbChannelToLinear(blue);
    }
  }

  if (totalWeight === 0) {
    return null;
  }

  const averageAlpha = alphaWeight / totalWeight;
  const alphaByte = Math.round(averageAlpha * 255);

  if (alphaByte < options.alphaThreshold) {
    return null;
  }

  return {
    rgb: [
      linearCompositeToSrgb(redWeight / totalWeight, averageAlpha, options.backgroundColor[0]),
      linearCompositeToSrgb(greenWeight / totalWeight, averageAlpha, options.backgroundColor[1]),
      linearCompositeToSrgb(blueWeight / totalWeight, averageAlpha, options.backgroundColor[2]),
    ],
    alpha: alphaByte,
  };
}
