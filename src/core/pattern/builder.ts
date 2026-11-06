import { createColorMatcher } from '@/core/color/factory';
import { AppError } from '@/core/errors/appError';
import { computeContainLayout } from '@/core/image/contain';
import { assertRgbaImage } from '@/core/image/pixel';
import { sampleImageCell } from '@/core/image/sample';
import type {
  BeadPattern,
  GenerationRequest,
  PatternCell,
  PatternDocument,
  RgbaImage,
  SourceImageMeta,
} from '@/types';
import type { RgbaPixel } from '@/core/image/pixel';

import { createGenerationKey, PATTERN_ENGINE_VERSION } from './generationKey';
import { assertPatternOptions } from './options';
import { quantizeSampledCells } from './quantize';

export interface BuildPatternContext {
  now?: () => Date;
}

function validateSource(source: SourceImageMeta, image: RgbaImage): void {
  if (source.width !== image.width || source.height !== image.height) {
    throw new AppError(
      'GENERATION_FAILED',
      'Source metadata dimensions do not match the RGBA image.',
    );
  }

  if (
    !Number.isFinite(source.transparentPixelRatio) ||
    source.transparentPixelRatio < 0 ||
    source.transparentPixelRatio > 1
  ) {
    throw new AppError('GENERATION_FAILED', 'Source transparent pixel ratio must be from 0 to 1.');
  }
}

function frozenRgb(rgb: readonly [number, number, number]) {
  return Object.freeze([rgb[0], rgb[1], rgb[2]] as const);
}

function buildCell(sample: RgbaPixel, colorIndex: number): PatternCell {
  return Object.freeze({
    colorIndex,
    sourceRgb: frozenRgb(sample.rgb),
    origin: 'auto' as const,
  });
}

/** Pure image-to-pattern pipeline used by every UI and test entry point. */
export function buildPattern(
  request: GenerationRequest,
  context: BuildPatternContext = {},
): PatternDocument {
  assertPatternOptions(request.options);
  assertRgbaImage(request.image);
  validateSource(request.source, request.image);

  if (request.palette.verification.status !== 'verified' || request.palette.colors.length === 0) {
    throw new AppError(
      'PALETTE_INVALID',
      'Pattern generation requires a verified, non-empty palette.',
    );
  }

  const width = request.options.targetWidth;
  const height = request.options.targetHeight;
  const layout = computeContainLayout(
    request.image.width,
    request.image.height,
    request.options.targetWidth,
    request.options.targetHeight,
  );
  const samples: (RgbaPixel | null)[] = new Array(width * height).fill(null);
  let beadCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sample = sampleImageCell(request.image, layout, x, y, {
        samplingMode: request.options.samplingMode,
        alphaThreshold: request.options.alphaThreshold,
        backgroundColor: request.options.backgroundColor,
      });
      const index = y * width + x;
      samples[index] = sample;

      if (sample !== null) {
        beadCount += 1;
      }
    }
  }

  if (beadCount === 0) {
    throw new AppError('EMPTY_PATTERN', 'The image produced no valid bead cells.');
  }

  const matcher = createColorMatcher(request.options.colorStrategy.matcher).prepare(
    request.palette.colors,
  );
  const colorIndices = quantizeSampledCells(
    samples,
    width,
    height,
    request.palette,
    matcher,
    request.options.colorStrategy.dithering,
  );
  const cells: (PatternCell | null)[] = new Array(width * height).fill(null);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];

    if (sample !== null && sample !== undefined) {
      const colorIndex = colorIndices[index];

      if (
        colorIndex === undefined ||
        colorIndex < 0 ||
        colorIndex >= request.palette.colors.length
      ) {
        throw new AppError('GENERATION_FAILED', 'Generated cell has no valid palette colour.', {
          context: { index, colorIndex },
        });
      }

      cells[index] = buildCell(sample, colorIndex);
    }
  }

  const now = context.now?.() ?? new Date();

  if (Number.isNaN(now.getTime())) {
    throw new AppError('GENERATION_FAILED', 'Generation clock returned an invalid date.');
  }

  const pattern: BeadPattern = Object.freeze({
    schemaVersion: 1 as const,
    width,
    height,
    cells: Object.freeze(cells),
    paletteRef: request.palette.ref,
    options: Object.freeze({
      ...request.options,
      backgroundColor: frozenRgb(request.options.backgroundColor),
      colorStrategy: Object.freeze({ ...request.options.colorStrategy }),
    }),
    source: Object.freeze({ ...request.source }),
    metadata: Object.freeze({
      createdAt: now.toISOString(),
      stateVersion: 1,
      generationKey: createGenerationKey(request),
      engineVersion: PATTERN_ENGINE_VERSION,
    }),
  });

  return Object.freeze({ pattern, palette: request.palette });
}
