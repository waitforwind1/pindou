import type { Rgb8, RgbaImage, SamplingMode } from '@/types';

import { compositeOnBackground } from './alpha';
import { sampleAreaAverage } from './area';
import type { ContainLayout } from './contain';
import { sampleNearestNeighbor } from './nearest';
import type { RgbaPixel } from './pixel';

export interface SampleCellOptions {
  samplingMode: SamplingMode;
  alphaThreshold: number;
  backgroundColor: Rgb8;
}

/**
 * Produce a match-ready colour for one target cell. RGB is already composited
 * over the configured background; alpha is retained only for diagnostics.
 */
export function sampleImageCell(
  image: RgbaImage,
  layout: ContainLayout,
  targetX: number,
  targetY: number,
  options: SampleCellOptions,
): RgbaPixel | null {
  if (options.samplingMode === 'area') {
    return sampleAreaAverage(image, layout, targetX, targetY, {
      alphaThreshold: options.alphaThreshold,
      backgroundColor: options.backgroundColor,
    });
  }

  const sample = sampleNearestNeighbor(image, layout, targetX, targetY);

  if (sample === null || sample.alpha < options.alphaThreshold) {
    return null;
  }

  return {
    rgb: compositeOnBackground(sample.rgb, sample.alpha, options.backgroundColor),
    alpha: sample.alpha,
  };
}
