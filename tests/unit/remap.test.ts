import { describe, expect, it } from 'vitest';

import { buildPattern, computeColorStatistics, remapPattern } from '@/core/pattern';
import type {
  BeadColor,
  Palette,
  PatternCell,
  PatternDocument,
  PatternOptions,
  RgbaImage,
  SourceImageMeta,
} from '@/types';

function testColor(code: string, name: string, rgb: readonly [number, number, number]): BeadColor {
  return Object.freeze({
    code,
    officialName: name,
    displayRgb: Object.freeze([rgb[0], rgb[1], rgb[2]] as const),
    source: Object.freeze({ documentId: 'synthetic-test-only', page: 1 }),
  });
}

function testPalette(id: string, colors: readonly BeadColor[]): Palette {
  return Object.freeze({
    ref: Object.freeze({
      id,
      brand: 'TEST ONLY',
      series: 'TEST',
      variant: 'FIXTURE',
      version: '1',
      checksum: id.padEnd(64, '0').slice(0, 64),
    }),
    colors: Object.freeze([...colors]),
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
}

const sourcePalette = testPalette('test-source', [
  testColor('01', 'White', [255, 255, 255]),
  testColor('02', 'Red', [255, 0, 0]),
  testColor('03', 'Green', [0, 255, 0]),
]);

const targetPalette = testPalette('test-target', [
  testColor('T1', 'Black', [0, 0, 0]),
  testColor('T2', 'Scarlet', [240, 10, 20]),
  testColor('T3', 'Emerald', [10, 220, 20]),
]);

const options: PatternOptions = {
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
};

function fixtureImage(): RgbaImage {
  const image: RgbaImage = { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4) };

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const offset = (y * 8 + x) * 4;
      const transparent = x === 0 && y === 0;
      const red = (x + y) % 2 === 0;
      image.data[offset] = red ? 255 : 255;
      image.data[offset + 1] = red ? 0 : 255;
      image.data[offset + 2] = red ? 0 : 255;
      image.data[offset + 3] = transparent ? 0 : 255;
    }
  }

  return image;
}

function source(image: RgbaImage): SourceImageMeta {
  return {
    sourceId: 'remap-fixture',
    fileName: 'remap-fixture.png',
    mimeType: 'image/png',
    byteSize: image.data.byteLength,
    width: image.width,
    height: image.height,
    transparentPixelRatio: 1 / 64,
    orientationApplied: true,
  };
}

function replaceCell(document: PatternDocument, index: number, cell: PatternCell): PatternDocument {
  const cells = [...document.pattern.cells];
  cells[index] = Object.freeze(cell);

  return {
    palette: document.palette,
    pattern: Object.freeze({
      ...document.pattern,
      cells: Object.freeze(cells),
      metadata: Object.freeze({
        ...document.pattern.metadata,
        stateVersion: document.pattern.metadata.stateVersion + 1,
      }),
    }),
  };
}

function initialDocument(): PatternDocument {
  const image = fixtureImage();

  return buildPattern(
    {
      image,
      source: source(image),
      palette: sourcePalette,
      options,
    },
    { now: () => new Date('2026-11-06T04:00:00.000Z') },
  );
}

describe('palette remapping', () => {
  it('re-matches automatic cells from sourceRgb without translating old codes', () => {
    const initial = initialDocument();
    const result = remapPattern(initial, { palette: targetPalette });
    const remapped = result.document;

    expect(remapped.pattern.paletteRef.id).toBe('test-target');
    expect(remapped.pattern.paletteRef.checksum).toBe(targetPalette.ref.checksum);
    expect(remapped.pattern.metadata.stateVersion).toBe(initial.pattern.metadata.stateVersion + 1);
    expect(remapped.pattern.cells[0]).toBeNull();
    expect(remapped.pattern.cells.filter((cell) => cell !== null)).toHaveLength(63);

    for (const cell of remapped.pattern.cells) {
      if (cell !== null) {
        expect(targetPalette.colors[cell.colorIndex]).toBeDefined();
      }
    }

    expect(result.remappedAutoCells).toBe(63);
    expect(result.preservedManualCells).toBe(0);
    expect(remapped.pattern.metadata.generationKey).not.toBe(
      initial.pattern.metadata.generationKey,
    );
  });

  it('preserves manual cell intent by visible colour by default', () => {
    const initial = replaceCell(initialDocument(), 1, {
      colorIndex: 2,
      sourceRgb: [255, 0, 0],
      origin: 'manual',
    });
    const result = remapPattern(initial, { palette: targetPalette });
    const cell = result.document.pattern.cells[1];

    expect(result.preservedManualCells).toBe(1);
    expect(result.unrecalculatedManualCells).toBe(0);
    expect(cell?.origin).toBe('manual');
    expect(cell?.sourceRgb).toEqual([255, 0, 0]);
    expect(targetPalette.colors[cell?.colorIndex ?? -1]?.code).toBe('T3');
  });

  it('can explicitly recalculate manual cells with source RGB', () => {
    const initial = replaceCell(initialDocument(), 1, {
      colorIndex: 1,
      sourceRgb: [0, 255, 0],
      origin: 'manual',
    });
    const result = remapPattern(initial, {
      palette: targetPalette,
      manualPolicy: 'recalculate',
    });

    expect(result.document.pattern.cells[1]?.origin).toBe('manual');
    expect(targetPalette.colors[result.document.pattern.cells[1]?.colorIndex ?? -1]?.code).toBe(
      'T3',
    );
  });

  it('reports a manual cell without source RGB instead of fabricating a source colour', () => {
    const initial = replaceCell(initialDocument(), 1, {
      colorIndex: 1,
      sourceRgb: null,
      origin: 'manual',
    });
    const result = remapPattern(initial, {
      palette: targetPalette,
      manualPolicy: 'recalculate',
    });

    expect(result.unrecalculatedManualCells).toBe(1);
    expect(result.document.pattern.cells[1]?.sourceRgb).toBeNull();
    expect(targetPalette.colors[result.document.pattern.cells[1]?.colorIndex ?? -1]).toBeDefined();
  });

  it('keeps all statistics invariants after remapping', () => {
    const result = remapPattern(initialDocument(), { palette: targetPalette });
    const statistics = computeColorStatistics(result.document);

    expect(statistics.beadCount + statistics.emptyCount).toBe(statistics.totalCells);
    expect(statistics.colors.reduce((sum, color) => sum + color.count, 0)).toBe(
      statistics.beadCount,
    );
    expect(statistics.paletteChecksum).toBe(targetPalette.ref.checksum);
  });
});
