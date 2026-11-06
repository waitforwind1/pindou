import { computeColorStatistics } from '@/core/pattern';
import type { PatternDocument } from '@/types';
import { downloadBlob } from './pngExporter';

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportMaterialCsv(patternDocument: PatternDocument): Blob {
  const statistics = computeColorStatistics(patternDocument);
  const { palette, pattern } = patternDocument;
  const rows = [
    ['色号', '官方英文名', '参考颜色', '数量', '品牌', '系列', '色盘版本'],
    ...statistics.colors.map((color) => [
      color.code,
      color.officialName,
      `#${color.displayRgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase(),
      color.count,
      palette.ref.brand,
      palette.ref.series,
      palette.ref.version,
    ]),
    [],
    [
      '总拼豆数量',
      statistics.beadCount,
      '',
      '',
      palette.ref.brand,
      palette.ref.series,
      palette.ref.version,
    ],
    [
      '空位数量',
      statistics.emptyCount,
      '',
      '',
      palette.ref.brand,
      palette.ref.series,
      palette.ref.version,
    ],
    [
      '图纸尺寸',
      `${pattern.width}×${pattern.height}`,
      '',
      '',
      palette.ref.brand,
      palette.ref.series,
      palette.ref.version,
    ],
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((cell) => csvCell(cell)).join(',')).join('\r\n')}\r\n`;
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

export function downloadMaterialCsv(patternDocument: PatternDocument): void {
  const fileName = `beadcraft-materials-${patternDocument.pattern.width}x${patternDocument.pattern.height}.csv`;
  downloadBlob(exportMaterialCsv(patternDocument), fileName);
}
