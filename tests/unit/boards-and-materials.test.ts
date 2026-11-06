import { describe, expect, it } from 'vitest';

import { buildPattern, computeColorStatistics, splitPatternIntoBoards } from '@/core/pattern';
import { exportMaterialCsv } from '@/export/materialExporter';
import { loadDefaultPalette } from '@/palettes';
import type { PatternOptions, RgbaImage, SourceImageMeta } from '@/types';

function image(width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    data[offset] = index % 2 === 0 ? 30 : 220;
    data[offset + 1] = 120;
    data[offset + 2] = 180;
    data[offset + 3] = index % 11 === 0 ? 0 : 255;
  }
  return { width, height, data };
}

async function documentFor(width: number, height: number) {
  const source = image(width, height);
  const options: PatternOptions = {
    targetWidth: width,
    targetHeight: height,
    fitMode: 'contain',
    samplingMode: 'nearest',
    alphaThreshold: 128,
    backgroundColor: [255, 255, 255],
    colorStrategy: { matcher: 'cie76', dithering: 'none' },
  };
  const meta: SourceImageMeta = {
    sourceId: 'board-test',
    fileName: 'board.png',
    mimeType: 'image/png',
    byteSize: source.data.byteLength,
    width,
    height,
    transparentPixelRatio: 1 / 11,
    orientationApplied: false,
  };
  return buildPattern({
    image: source,
    source: meta,
    palette: await loadDefaultPalette(),
    options,
  });
}

describe('pattern board splitting', () => {
  it('splits 70x65 into 3x3 boards without losing cells', async () => {
    const document = await documentFor(70, 65);
    const layout = splitPatternIntoBoards(document, { boardWidth: 29, boardHeight: 29 });
    const statistics = computeColorStatistics(document);

    expect(layout.boardColumns).toBe(3);
    expect(layout.boardRows).toBe(3);
    expect(layout.boards).toHaveLength(9);
    expect(layout.totalBeadCount).toBe(statistics.beadCount);
    expect(layout.totalEmptyCount).toBe(statistics.emptyCount);
    expect(layout.boards.at(-1)).toMatchObject({
      boardNumber: 'C3',
      globalX: 58,
      globalY: 58,
      width: 12,
      height: 7,
    });
  });

  it('keeps exact board dimensions and edge board sizes', async () => {
    const document = await documentFor(58, 58);
    const layout = splitPatternIntoBoards(document, { boardWidth: 29, boardHeight: 29 });
    expect(layout.boards.every((board) => board.width === 29 && board.height === 29)).toBe(true);
  });
});

describe('material CSV export', () => {
  it('exports the same counts as the pattern statistics', async () => {
    const document = await documentFor(8, 8);
    const csv = await exportMaterialCsv(document).text();
    const statistics = computeColorStatistics(document);
    expect(csv).toContain('色号,官方英文名,参考颜色,数量');
    expect(csv).toContain(`总拼豆数量,${statistics.beadCount}`);
    for (const color of statistics.colors) {
      expect(csv).toContain(`${color.code},`);
      expect(csv).toContain(`,${color.count},`);
    }
  });
});
