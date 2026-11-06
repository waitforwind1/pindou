import { AppError } from '@/core/errors/appError';
import type { ColorCount, ColorStatistics, PatternDocument } from '@/types';

function invalid(message: string, context?: Readonly<Record<string, unknown>>): never {
  throw new AppError('GENERATION_FAILED', message, { ...(context ? { context } : {}) });
}

export function computeColorStatistics(document: PatternDocument): ColorStatistics {
  const { pattern, palette } = document;

  for (const field of ['id', 'brand', 'series', 'variant', 'version', 'checksum'] as const) {
    if (pattern.paletteRef[field] !== palette.ref[field]) {
      invalid('Pattern and palette references do not match.', { field });
    }
  }

  if (
    !Number.isInteger(pattern.width) ||
    pattern.width <= 0 ||
    !Number.isInteger(pattern.height) ||
    pattern.height <= 0
  ) {
    invalid('Pattern dimensions must be positive integers.');
  }

  const totalCells = pattern.width * pattern.height;

  if (pattern.cells.length !== totalCells) {
    invalid('Pattern cell count does not match its dimensions.', {
      expected: totalCells,
      actual: pattern.cells.length,
    });
  }

  const counts = new Uint32Array(palette.colors.length);
  let emptyCount = 0;

  for (const cell of pattern.cells) {
    if (cell === null) {
      emptyCount += 1;
      continue;
    }

    if (
      !Number.isInteger(cell.colorIndex) ||
      cell.colorIndex < 0 ||
      cell.colorIndex >= palette.colors.length
    ) {
      invalid('Pattern contains an out-of-range palette index.', {
        colorIndex: cell.colorIndex,
      });
    }

    counts[cell.colorIndex] = (counts[cell.colorIndex] ?? 0) + 1;
  }

  const colors: ColorCount[] = [];

  for (let colorIndex = 0; colorIndex < counts.length; colorIndex += 1) {
    const count = counts[colorIndex] ?? 0;
    const color = palette.colors[colorIndex];

    if (count === 0) {
      continue;
    }

    if (color === undefined) {
      invalid('Pattern references a missing palette colour.', { colorIndex });
    }

    colors.push(
      Object.freeze({
        colorIndex,
        code: color.code,
        officialName: color.officialName,
        displayRgb: color.displayRgb,
        count,
      }),
    );
  }

  colors.sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.code < right.code ? -1 : left.code > right.code ? 1 : 0;
  });
  const beadCount = totalCells - emptyCount;

  return Object.freeze({
    patternStateVersion: pattern.metadata.stateVersion,
    paletteChecksum: palette.ref.checksum,
    width: pattern.width,
    height: pattern.height,
    totalCells,
    beadCount,
    emptyCount,
    usedColorCount: colors.length,
    colors: Object.freeze(colors),
  });
}
