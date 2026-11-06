import { AppError } from '@/core/errors/appError';
import type { ColorMatcher, MatcherId } from '@/types';

import { Cie76Matcher } from './cie76Matcher';
import { RgbEuclideanMatcher } from './rgbEuclideanMatcher';

/** Resolve only matchers that have a tested implementation in this build. */
export function createColorMatcher(algorithm: MatcherId): ColorMatcher {
  switch (algorithm) {
    case 'rgb-euclidean':
      return new RgbEuclideanMatcher();
    case 'cie76':
      return new Cie76Matcher();
    case 'ciede2000':
      throw new AppError(
        'GENERATION_FAILED',
        'CIEDE2000 is reserved in the data model but is not implemented in this build.',
        { context: { matcher: algorithm } },
      );
  }
}
