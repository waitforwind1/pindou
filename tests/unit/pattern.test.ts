import { describe, expect, it } from 'vitest';

import { AppError } from '@/core/errors/appError';
import {
  buildPattern,
  computeColorStatistics,
  MAX_PATTERN_CELLS,
  MIN_PATTERN_DIMENSION,
} from '@/core/pattern';
import { loadDefaultPalette } from '@/palettes';
import type {
  GenerationRequest,
  Palette,
  PatternOptions,
  RgbaImage,
  SourceImageMeta,
} from '@/types';

const FIXED_NOW = () => new Date('2026-11-06T04:00:00.000Z');

function sourceMeta(image: RgbaImage, transparentPixelRatio = 0): SourceImageMeta {
  return {
    sourceId: `fixture-${image.width}x${image.height}`,
    fileName: 'fixture.png',
    mimeType: 'image/png',
    byteSize: image.data.byteLength,
    width: image.width,
    height: image.height,
    transparentPixelRatio,
    orientationApplied: true,
  };
}

function defaultOptions(overrides: Partial<PatternOptions> = {}): PatternOptions {
  return {
    targetWidth: 8,
    targetHeight: 8,
    fitMode: 'contain',
    samplingMode: 'nearest',
    alphaThreshold: 128,
    backgroundColor: [255, 255, 255],
    colorStrategy: {
      matcher: 'cie76',
      dithering: 'none',
    },
    ...overrides,
  };
}

function solidImage(
  width: number,
  height: number,
  rgba: readonly [number, number, number, number],
): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    data[offset] = rgba[0];
    data[offset + 1] = rgba[1];
    data[offset + 2] = rgba[2];
    data[offset + 3] = rgba[3];
  }

  return { width, height, data };
}

async function requestFor(
  image: RgbaImage,
  overrides: Partial<PatternOptions> = {},
  palette?: Palette,
): Promise<GenerationRequest> {
  return {
    image,
    source: sourceMeta(image),
    palette: palette ?? (await loadDefaultPalette()),
    options: defaultOptions(overrides),
  };
}

function exerciseStatistics(document: ReturnType<typeof buildPattern>): void {
  const statistics = computeColorStatistics(document);
  const countSum = statistics.colors.reduce((sum, color) => sum + color.count, 0);

  expect(statistics.totalCells).toBe(document.pattern.width * document.pattern.height);
  expect(statistics.beadCount + statistics.emptyCount).toBe(statistics.totalCells);
  expect(countSum).toBe(statistics.beadCount);
  expect(statistics.usedColorCount).toBe(statistics.colors.length);

  for (const color of statistics.colors) {
    expect(document.palette.colors[color.colorIndex]?.code).toBe(color.code);
  }
}

describe('BeadPattern generation', () => {
  it('maps a solid image to a complete pattern with only real palette indices', async () => {
    const request = await requestFor(solidImage(1, 1, [255, 0, 0, 255]));
    const document = buildPattern(request, { now: FIXED_NOW });

    expect(document.pattern.cells).toHaveLength(64);
    expect(document.pattern.cells.every((cell) => cell !== null)).toBe(true);
    expect(document.pattern.metadata).toMatchObject({
      createdAt: '2026-11-06T04:00:00.000Z',
      stateVersion: 1,
    });

    for (const cell of document.pattern.cells) {
      expect(cell?.sourceRgb).toEqual([255, 0, 0]);
      expect(document.palette.colors[cell?.colorIndex ?? -1]).toBeDefined();
    }

    const statistics = computeColorStatistics(document);
    expect(statistics).toMatchObject({ beadCount: 64, emptyCount: 0, totalCells: 64 });
    expect(statistics.usedColorCount).toBe(1);
    exerciseStatistics(document);
  });

  it('rejects a fully transparent image instead of substituting white beads', async () => {
    const request = await requestFor(solidImage(8, 8, [255, 255, 255, 0]));
    let caught: unknown;

    try {
      buildPattern(request, { now: FIXED_NOW });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(caught).toMatchObject({ code: 'EMPTY_PATTERN' });
  });

  it('keeps contain padding empty while preserving the requested 64x64 grid', async () => {
    const request = await requestFor(solidImage(8, 4, [30, 120, 200, 255]), {
      targetWidth: 64,
      targetHeight: 64,
    });
    const document = buildPattern(request, { now: FIXED_NOW });
    const statistics = computeColorStatistics(document);

    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const cell = document.pattern.cells[y * 64 + x];
        expect(cell === null).toBe(y < 16 || y >= 48);
      }
    }

    expect(statistics).toMatchObject({
      totalCells: 4096,
      beadCount: 2048,
      emptyCount: 2048,
    });
    exerciseStatistics(document);
  });

  it('is deterministic for the same image, palette and options', async () => {
    const request = await requestFor(solidImage(8, 8, [100, 150, 200, 255]));
    const first = buildPattern(request, { now: FIXED_NOW });
    const second = buildPattern(request, { now: FIXED_NOW });
    const third = buildPattern(request, { now: FIXED_NOW });

    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(second.pattern.metadata.generationKey).toBe(first.pattern.metadata.generationKey);
  });

  it('never mutates the input RGBA buffer', async () => {
    const image = solidImage(8, 8, [120, 90, 200, 255]);
    const before = Array.from(image.data);
    const request = await requestFor(image);

    buildPattern(request, { now: FIXED_NOW });

    expect(Array.from(image.data)).toEqual(before);
  });

  it('rejects source metadata dimensions that do not match the RGBA image', async () => {
    const request = await requestFor(solidImage(1, 1, [255, 0, 0, 255]));
    request.source = { ...request.source, width: 2 };

    expect(() => buildPattern(request, { now: FIXED_NOW })).toThrowError(AppError);
  });

  it('rejects a malformed RGBA buffer instead of reading outside its pixels', async () => {
    const request = await requestFor(solidImage(8, 8, [255, 0, 0, 255]));
    request.image = { ...request.image, data: new Uint8ClampedArray(12) };

    expect(() => buildPattern(request, { now: FIXED_NOW })).toThrowError(RangeError);
  });

  it('maps every palette colour to itself at 1:1', async () => {
    const palette = await loadDefaultPalette();
    const image: RgbaImage = {
      width: palette.colors.length,
      height: 8,
      data: new Uint8ClampedArray(palette.colors.length * 8 * 4),
    };

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < palette.colors.length; x += 1) {
        const color = palette.colors[x];
        const offset = (y * image.width + x) * 4;

        if (color === undefined) {
          throw new Error('Palette fixture is incomplete.');
        }

        image.data[offset] = color.displayRgb[0];
        image.data[offset + 1] = color.displayRgb[1];
        image.data[offset + 2] = color.displayRgb[2];
        image.data[offset + 3] = 255;
      }
    }

    const request: GenerationRequest = {
      image,
      source: sourceMeta(image),
      palette,
      options: defaultOptions({ targetWidth: palette.colors.length, targetHeight: 8 }),
    };
    const document = buildPattern(request, { now: FIXED_NOW });

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < palette.colors.length; x += 1) {
        const cell = document.pattern.cells[y * palette.colors.length + x];
        expect(document.palette.colors[cell?.colorIndex ?? -1]?.code).toBe(palette.colors[x]?.code);
      }
    }

    exerciseStatistics(document);
  });

  it('handles a gradient image deterministically within palette limits', async () => {
    const image: RgbaImage = { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) };

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const offset = (y * 8 + x) * 4;
        image.data[offset] = Math.round((x / 7) * 255);
        image.data[offset + 1] = Math.round((y / 7) * 255);
        image.data[offset + 2] = 96;
        image.data[offset + 3] = 255;
      }
    }

    const request = await requestFor(image);
    const document = buildPattern(request, { now: FIXED_NOW });

    expect(document.pattern.cells.every((cell) => cell !== null)).toBe(true);
    expect(computeColorStatistics(document).usedColorCount).toBeGreaterThan(1);
    exerciseStatistics(document);
  });

  it('handles a checkerboard without losing hard cell boundaries', async () => {
    const image: RgbaImage = { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) };

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const offset = (y * 8 + x) * 4;
        const isLight = (x + y) % 2 === 0;
        image.data[offset] = isLight ? 245 : 20;
        image.data[offset + 1] = isLight ? 240 : 22;
        image.data[offset + 2] = isLight ? 230 : 25;
        image.data[offset + 3] = 255;
      }
    }

    const document = buildPattern(await requestFor(image), { now: FIXED_NOW });

    expect(document.pattern.cells[0]?.colorIndex).not.toBe(
      document.pattern.cells[1]?.colorIndex ?? -1,
    );
    exerciseStatistics(document);
  });

  it('supports the maximum 128x128 target without exceeding the cell budget', async () => {
    const request = await requestFor(solidImage(1, 1, [0, 0, 0, 255]), {
      targetWidth: 128,
      targetHeight: 128,
    });
    const document = buildPattern(request, { now: FIXED_NOW });

    expect(document.pattern.cells).toHaveLength(MAX_PATTERN_CELLS);
    expect(computeColorStatistics(document).beadCount).toBe(MAX_PATTERN_CELLS);
  });

  it.each([32, 48, 64])('generates the exact %ix%i P0 preset grid', async (size) => {
    const request = await requestFor(solidImage(4, 4, [80, 120, 160, 255]), {
      targetWidth: size,
      targetHeight: size,
    });
    const document = buildPattern(request, { now: FIXED_NOW });

    expect(document.pattern.width).toBe(size);
    expect(document.pattern.height).toBe(size);
    expect(document.pattern.cells).toHaveLength(size * size);
    exerciseStatistics(document);
  });

  it('rejects dimensions below the supported minimum or above 128', async () => {
    const below = await requestFor(solidImage(1, 1, [0, 0, 0, 255]), {
      targetWidth: MIN_PATTERN_DIMENSION - 1,
    });
    const above = await requestFor(solidImage(1, 1, [0, 0, 0, 255]), {
      targetWidth: 129,
    });

    expect(() => buildPattern(below)).toThrowError(AppError);
    expect(() => buildPattern(above)).toThrowError(AppError);
  });
});

describe('optional Floyd–Steinberg dithering', () => {
  const monochromePalette: Palette = Object.freeze({
    ref: Object.freeze({
      id: 'test-monochrome',
      brand: 'TEST ONLY',
      series: 'TEST',
      variant: 'TWO COLOR',
      version: '1',
      checksum: 'a'.repeat(64),
    }),
    colors: Object.freeze([
      Object.freeze({
        code: '00',
        officialName: 'Black',
        displayRgb: Object.freeze([0, 0, 0] as const),
        source: Object.freeze({ documentId: 'test-only', page: 1 }),
      }),
      Object.freeze({
        code: '01',
        officialName: 'White',
        displayRgb: Object.freeze([255, 255, 255] as const),
        source: Object.freeze({ documentId: 'test-only', page: 1 }),
      }),
    ]),
    source: Object.freeze({
      officialPageUrl: 'https://example.test/test-only',
      documentUrl: 'https://example.test/test-only.pdf',
      documentSha256: 'b'.repeat(64),
      accessedAt: '2026-11-06',
      samplingMethod: 'Synthetic test fixture; not a brand palette.',
      colorDataSource: 'official-chart-derived' as const,
    }),
    verification: Object.freeze({
      status: 'verified' as const,
      verifiedAt: '2026-11-06',
      notes: 'Test fixture only.',
    }),
  });

  function request(dithering: 'none' | 'floyd-steinberg'): GenerationRequest {
    const image = solidImage(8, 8, [128, 128, 128, 255]);
    return {
      image,
      source: sourceMeta(image),
      palette: monochromePalette,
      options: defaultOptions({
        colorStrategy: { matcher: 'rgb-euclidean', dithering },
      }),
    };
  }

  it('remains opt-in and can increase the number of used colours', () => {
    const plain = buildPattern(request('none'), { now: FIXED_NOW });
    const dithered = buildPattern(request('floyd-steinberg'), { now: FIXED_NOW });

    expect(computeColorStatistics(plain).usedColorCount).toBe(1);
    expect(computeColorStatistics(dithered).usedColorCount).toBe(2);
    expect(dithered.pattern.cells).not.toEqual(plain.pattern.cells);
    expect(dithered.pattern.cells[0]?.sourceRgb).toEqual([128, 128, 128]);
    exerciseStatistics(dithered);
  });

  it('is deterministic and never fills transparent cells with diffused error', async () => {
    const image: RgbaImage = { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) };

    for (let index = 0; index < 8 * 8; index += 1) {
      const offset = index * 4;
      image.data[offset] = index % 2 === 0 ? 128 : 255;
      image.data[offset + 1] = image.data[offset];
      image.data[offset + 2] = image.data[offset];
      image.data[offset + 3] = index % 3 === 0 ? 0 : 255;
    }

    const patternRequest: GenerationRequest = {
      image,
      source: sourceMeta(image, 1 / 3),
      palette: monochromePalette,
      options: defaultOptions({
        colorStrategy: { matcher: 'rgb-euclidean', dithering: 'floyd-steinberg' },
      }),
    };
    const first = buildPattern(patternRequest, { now: FIXED_NOW });
    const second = buildPattern(patternRequest, { now: FIXED_NOW });

    expect(second).toEqual(first);
    expect(first.pattern.cells.filter((cell) => cell === null)).toHaveLength(22);
    exerciseStatistics(first);
  });
});
