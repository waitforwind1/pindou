import { AppError } from '@/core/errors/appError';
import { P0_ALPHA_THRESHOLD } from '@/core/image/alpha';
import type { PatternOptions, Rgb8 } from '@/types';

export { P0_ALPHA_THRESHOLD } from '@/core/image/alpha';

export const MIN_PATTERN_DIMENSION = 8;
export const MAX_PATTERN_DIMENSION = 128;
export const MAX_PATTERN_CELLS = 16_384;

function generationError(message: string, context?: Readonly<Record<string, unknown>>): never {
  throw new AppError('GENERATION_FAILED', message, { ...(context ? { context } : {}) });
}

function validateRgb(value: Rgb8, path: string): void {
  for (let channel = 0; channel < 3; channel += 1) {
    const valueAtChannel = value[channel];

    if (
      typeof valueAtChannel !== 'number' ||
      !Number.isInteger(valueAtChannel) ||
      valueAtChannel < 0 ||
      valueAtChannel > 255
    ) {
      generationError(`${path}[${channel}] must be an integer from 0 to 255.`);
    }
  }
}

export function assertPatternOptions(options: PatternOptions): void {
  for (const [label, value] of [
    ['targetWidth', options.targetWidth],
    ['targetHeight', options.targetHeight],
  ] as const) {
    if (
      !Number.isInteger(value) ||
      value < MIN_PATTERN_DIMENSION ||
      value > MAX_PATTERN_DIMENSION
    ) {
      generationError(
        `${label} must be an integer from ${MIN_PATTERN_DIMENSION} to ${MAX_PATTERN_DIMENSION}.`,
      );
    }
  }

  if (options.targetWidth * options.targetHeight > MAX_PATTERN_CELLS) {
    generationError(`A pattern may not exceed ${MAX_PATTERN_CELLS} cells.`);
  }

  if (options.fitMode !== 'contain') {
    generationError('Only contain fit mode is supported.');
  }

  if (options.samplingMode !== 'nearest' && options.samplingMode !== 'area') {
    generationError(`Unsupported sampling mode "${String(options.samplingMode)}".`);
  }

  if (options.alphaThreshold !== P0_ALPHA_THRESHOLD) {
    generationError(`The P0 transparency threshold is fixed at ${P0_ALPHA_THRESHOLD}.`);
  }

  validateRgb(options.backgroundColor, 'backgroundColor');

  if (
    options.colorStrategy.matcher !== 'rgb-euclidean' &&
    options.colorStrategy.matcher !== 'cie76' &&
    options.colorStrategy.matcher !== 'ciede2000'
  ) {
    generationError(`Unsupported colour matcher "${String(options.colorStrategy.matcher)}".`);
  }

  if (
    options.colorStrategy.dithering !== 'none' &&
    options.colorStrategy.dithering !== 'floyd-steinberg'
  ) {
    generationError(`Unsupported dithering mode "${String(options.colorStrategy.dithering)}".`);
  }
}
