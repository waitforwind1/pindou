import { AppError } from '@/core/errors/appError';
import type { BeadColor, ColorMatcher, Lab, PreparedMatcher, Rgb8 } from '@/types';

import { srgbToLab } from './lab';

export const CIE76_TIE_EPSILON = 1e-9;

/** Deterministic CIE76 matcher whose tie-breaker is the official colour code. */
export class Cie76Matcher implements ColorMatcher {
  readonly id = 'cie76' as const;

  prepare(colors: readonly BeadColor[]): PreparedMatcher {
    if (colors.length === 0) {
      throw new AppError(
        'PALETTE_INVALID',
        'Cannot prepare a colour matcher without palette colours.',
      );
    }

    const codes = colors.map((color) => color.code);
    const labs: readonly Lab[] = colors.map((color) => srgbToLab(color.displayRgb));

    return {
      match: (rgb: Rgb8): number => {
        const sourceLab = srgbToLab(rgb);
        let bestIndex = -1;
        let bestCode = '';
        let bestDistance = Number.POSITIVE_INFINITY;

        for (let colorIndex = 0; colorIndex < labs.length; colorIndex += 1) {
          const candidateLab = labs[colorIndex];
          const candidateCode = codes[colorIndex];

          if (candidateLab === undefined || candidateCode === undefined) {
            throw new AppError('PALETTE_INVALID', 'Palette candidate index is out of range.');
          }

          const deltaLightness = sourceLab[0] - candidateLab[0];
          const deltaA = sourceLab[1] - candidateLab[1];
          const deltaB = sourceLab[2] - candidateLab[2];
          const distance = deltaLightness * deltaLightness + deltaA * deltaA + deltaB * deltaB;
          const isTie = Math.abs(distance - bestDistance) <= CIE76_TIE_EPSILON;
          const isBetter =
            bestIndex === -1 || (isTie ? candidateCode < bestCode : distance < bestDistance);

          if (isBetter) {
            bestIndex = colorIndex;
            bestCode = candidateCode;
            bestDistance = distance;
          }
        }

        if (bestIndex === -1) {
          throw new AppError('PALETTE_INVALID', 'Colour matching produced no palette candidate.');
        }

        return bestIndex;
      },
    };
  }
}
