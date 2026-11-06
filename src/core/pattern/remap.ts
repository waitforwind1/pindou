import { createColorMatcher } from '@/core/color/factory';
import { AppError } from '@/core/errors/appError';
import type {
  BeadPattern,
  DitheringMode,
  MatcherId,
  Palette,
  PatternCell,
  PatternDocument,
  Rgb8,
} from '@/types';
import type { RgbaPixel } from '@/core/image/pixel';

import { createGenerationKey } from './generationKey';
import { assertPatternOptions } from './options';
import { quantizeSampledCells } from './quantize';

export type ManualRemapPolicy = 'preserve-visible' | 'recalculate';

export interface RemapPatternOptions {
  palette: Palette;
  matcher?: MatcherId;
  dithering?: DitheringMode;
  /** Manual cells are guarded from source-RGB recalculation by default. */
  manualPolicy?: ManualRemapPolicy;
}

export interface RemapPatternResult {
  document: PatternDocument;
  remappedAutoCells: number;
  preservedManualCells: number;
  unrecalculatedManualCells: number;
}

function invalid(message: string, context?: Readonly<Record<string, unknown>>): never {
  throw new AppError('GENERATION_FAILED', message, { ...(context ? { context } : {}) });
}

function frozenRgb(rgb: Rgb8): Rgb8 {
  return Object.freeze([rgb[0], rgb[1], rgb[2]] as const);
}

function targetPaletteMatcher(palette: Palette, matcherId: MatcherId) {
  if (palette.verification.status !== 'verified' || palette.colors.length === 0) {
    invalid('Remapping requires a verified, non-empty target palette.', {
      paletteId: palette.ref.id,
    });
  }

  return createColorMatcher(matcherId).prepare(palette.colors);
}

/**
 * Re-match auto cells from their preserved source RGB. Manual cells are not
 * recalculated unless explicitly requested; their previously visible colour is
 * mapped to the target palette so no cell can reference the old palette.
 */
export function remapPattern(
  document: PatternDocument,
  options: RemapPatternOptions,
): RemapPatternResult {
  const { pattern, palette: sourcePalette } = document;
  const targetPalette = options.palette;
  const matcherId = options.matcher ?? pattern.options.colorStrategy.matcher;
  const dithering = options.dithering ?? pattern.options.colorStrategy.dithering;
  const manualPolicy = options.manualPolicy ?? 'preserve-visible';
  const nextOptions = {
    ...pattern.options,
    colorStrategy: {
      matcher: matcherId,
      dithering,
    },
  };

  assertPatternOptions(nextOptions);

  if (pattern.cells.length !== pattern.width * pattern.height) {
    invalid('Pattern cell count does not match its dimensions.');
  }

  const remapMatcher = targetPaletteMatcher(targetPalette, matcherId);
  const samples: (RgbaPixel | null)[] = new Array(pattern.cells.length).fill(null);
  let remappedAutoCells = 0;
  let preservedManualCells = 0;
  let unrecalculatedManualCells = 0;

  for (let index = 0; index < pattern.cells.length; index += 1) {
    const cell = pattern.cells[index];

    if (cell === null || cell === undefined) {
      continue;
    }

    if (cell.origin === 'auto') {
      if (cell.sourceRgb === null) {
        invalid('Automatic cell has no source RGB and cannot be remapped.', { index });
      }

      samples[index] = { rgb: cell.sourceRgb, alpha: 255 };
      remappedAutoCells += 1;
      continue;
    }

    if (manualPolicy === 'recalculate' && cell.sourceRgb !== null) {
      samples[index] = { rgb: cell.sourceRgb, alpha: 255 };
      remappedAutoCells += 1;
    }
  }

  const quantized = quantizeSampledCells(
    samples,
    pattern.width,
    pattern.height,
    targetPalette,
    remapMatcher,
    dithering,
  );
  const cells: (PatternCell | null)[] = new Array(pattern.cells.length).fill(null);

  for (let index = 0; index < pattern.cells.length; index += 1) {
    const cell = pattern.cells[index];

    if (cell === null || cell === undefined) {
      continue;
    }

    const sampled = samples[index];

    if (sampled !== null && sampled !== undefined) {
      const colorIndex = quantized[index];

      if (colorIndex === undefined || colorIndex < 0 || colorIndex >= targetPalette.colors.length) {
        invalid('Remapped cell has no valid target palette colour.', { index, colorIndex });
      }

      cells[index] = Object.freeze({
        colorIndex,
        sourceRgb: cell.sourceRgb === null ? null : frozenRgb(cell.sourceRgb),
        origin: cell.origin,
      });
      continue;
    }

    const sourceColor = sourcePalette.colors[cell.colorIndex];

    if (sourceColor === undefined) {
      invalid('Manual cell references a missing source palette colour.', {
        index,
        colorIndex: cell.colorIndex,
      });
    }

    const colorIndex = remapMatcher.match(sourceColor.displayRgb);

    if (colorIndex < 0 || colorIndex >= targetPalette.colors.length) {
      invalid('Manual cell could not be mapped into the target palette.', { index, colorIndex });
    }

    cells[index] = Object.freeze({
      colorIndex,
      sourceRgb: cell.sourceRgb === null ? null : frozenRgb(cell.sourceRgb),
      origin: 'manual' as const,
    });
    preservedManualCells += 1;

    if (manualPolicy === 'recalculate' && cell.sourceRgb === null) {
      unrecalculatedManualCells += 1;
    }
  }

  const nextPattern: BeadPattern = Object.freeze({
    ...pattern,
    cells: Object.freeze(cells),
    paletteRef: targetPalette.ref,
    options: Object.freeze({
      ...nextOptions,
      backgroundColor: frozenRgb(nextOptions.backgroundColor),
      colorStrategy: Object.freeze({ ...nextOptions.colorStrategy }),
    }),
    metadata: Object.freeze({
      ...pattern.metadata,
      stateVersion: pattern.metadata.stateVersion + 1,
      generationKey: createGenerationKey({
        source: pattern.source,
        palette: targetPalette,
        options: nextOptions,
      }),
    }),
  });

  return Object.freeze({
    document: Object.freeze({ pattern: nextPattern, palette: targetPalette }),
    remappedAutoCells,
    preservedManualCells,
    unrecalculatedManualCells,
  });
}
