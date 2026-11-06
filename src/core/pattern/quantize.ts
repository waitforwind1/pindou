import { AppError } from '@/core/errors/appError';
import type { DitheringMode, Palette, PreparedMatcher } from '@/types';
import type { RgbaPixel } from '@/core/image/pixel';

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, value));
}

function paletteRgbAt(palette: Palette, index: number): readonly [number, number, number] {
  const color = palette.colors[index];

  if (color === undefined) {
    throw new AppError('PALETTE_INVALID', 'Matcher returned an out-of-range palette index.', {
      context: { index, paletteId: palette.ref.id },
    });
  }

  return color.displayRgb;
}

/**
 * Quantize match-ready samples. Floyd–Steinberg operates in sRGB byte space,
 * never writes into an empty cell, and stores no adjusted colour in the pattern.
 */
export function quantizeSampledCells(
  samples: readonly (RgbaPixel | null)[],
  width: number,
  height: number,
  palette: Palette,
  matcher: PreparedMatcher,
  dithering: DitheringMode,
): Int32Array {
  const result = new Int32Array(samples.length);

  if (dithering === 'none') {
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];

      if (sample !== null && sample !== undefined) {
        result[index] = matcher.match(sample.rgb);
      }
    }

    return result;
  }

  const working = new Float32Array(samples.length * 3);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];

    if (sample !== null && sample !== undefined) {
      const offset = index * 3;
      working[offset] = sample.rgb[0];
      working[offset + 1] = sample.rgb[1];
      working[offset + 2] = sample.rgb[2];
    }
  }

  const diffuse = (
    x: number,
    y: number,
    weight: number,
    error: readonly [number, number, number],
  ) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    const targetIndex = y * width + x;
    const target = samples[targetIndex];

    if (target === null || target === undefined) {
      return;
    }

    const offset = targetIndex * 3;
    working[offset] = (working[offset] ?? 0) + error[0] * weight;
    working[offset + 1] = (working[offset + 1] ?? 0) + error[1] * weight;
    working[offset + 2] = (working[offset + 2] ?? 0) + error[2] * weight;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;

      if (samples[index] === null || samples[index] === undefined) {
        continue;
      }

      const offset = index * 3;
      const adjusted = [
        clampChannel(working[offset] ?? 0),
        clampChannel(working[offset + 1] ?? 0),
        clampChannel(working[offset + 2] ?? 0),
      ] as const;
      const colorIndex = matcher.match(adjusted);
      result[index] = colorIndex;

      const matched = paletteRgbAt(palette, colorIndex);
      const error = [
        adjusted[0] - matched[0],
        adjusted[1] - matched[1],
        adjusted[2] - matched[2],
      ] as const;

      diffuse(x + 1, y, 7 / 16, error);
      diffuse(x - 1, y + 1, 3 / 16, error);
      diffuse(x, y + 1, 5 / 16, error);
      diffuse(x + 1, y + 1, 1 / 16, error);
    }
  }

  return result;
}
