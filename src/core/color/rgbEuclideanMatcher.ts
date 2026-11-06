import { AppError } from '@/core/errors/appError';
import type { BeadColor, ColorMatcher, PreparedMatcher, Rgb8 } from '@/types';

export const RGB_TIE_EPSILON = 1e-9;

/** Deterministic sRGB Euclidean matcher with official-code tie breaking. */
export class RgbEuclideanMatcher implements ColorMatcher {
  readonly id = 'rgb-euclidean' as const;

  prepare(colors: readonly BeadColor[]): PreparedMatcher {
    if (colors.length === 0) {
      throw new AppError(
        'PALETTE_INVALID',
        'Cannot prepare a colour matcher without palette colours.',
      );
    }

    const reds = new Uint8Array(colors.length);
    const greens = new Uint8Array(colors.length);
    const blues = new Uint8Array(colors.length);
    const codes = new Array<string>(colors.length);

    for (let index = 0; index < colors.length; index += 1) {
      const color = colors[index];

      if (color === undefined) {
        throw new AppError('PALETTE_INVALID', 'Palette candidate index is out of range.');
      }

      reds[index] = color.displayRgb[0];
      greens[index] = color.displayRgb[1];
      blues[index] = color.displayRgb[2];
      codes[index] = color.code;
    }

    return {
      match: (rgb: Rgb8): number => {
        let bestIndex = -1;
        let bestCode = '';
        let bestDistance = Number.POSITIVE_INFINITY;

        for (let colorIndex = 0; colorIndex < reds.length; colorIndex += 1) {
          const red = reds[colorIndex];
          const green = greens[colorIndex];
          const blue = blues[colorIndex];
          const code = codes[colorIndex];

          if (
            red === undefined ||
            green === undefined ||
            blue === undefined ||
            code === undefined
          ) {
            throw new AppError('PALETTE_INVALID', 'Palette candidate index is out of range.');
          }

          const deltaRed = rgb[0] - red;
          const deltaGreen = rgb[1] - green;
          const deltaBlue = rgb[2] - blue;
          const distance = deltaRed * deltaRed + deltaGreen * deltaGreen + deltaBlue * deltaBlue;
          const isTie = Math.abs(distance - bestDistance) <= RGB_TIE_EPSILON;
          const isBetter = bestIndex === -1 || (isTie ? code < bestCode : distance < bestDistance);

          if (isBetter) {
            bestIndex = colorIndex;
            bestCode = code;
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
