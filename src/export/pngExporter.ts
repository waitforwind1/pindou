import { computeColorStatistics } from '@/core/pattern';
import { drawPatternScene } from '@/render/patternRenderer';
import { computeViewportGeometry } from '@/render/viewport';
import type { ExportOptions, ExportResult, PatternDocument } from '@/types';

const defaultOptions: ExportOptions = {
  format: 'png',
  cellSizePx: 48,
  marginPx: 72,
  majorGridEvery: 5,
  includeCodes: true,
  includeCoordinates: true,
  includeLegend: true,
  includePaletteSource: true,
  includeColorCounts: true,
  maxOutputPixels: 40_000_000,
  maxOutputSidePx: 8192,
};

function drawLegend(
  context: CanvasRenderingContext2D,
  document: PatternDocument,
  options: ExportOptions,
  x: number,
  y: number,
  width: number,
): number {
  const statistics = computeColorStatistics(document);
  const columns = Math.max(1, Math.floor(width / 220));
  const rowHeight = 24;
  context.fillStyle = '#25231f';
  context.font = '600 16px Segoe UI, sans-serif';
  context.fillText('材料清单 / Color legend', x, y);
  context.font = '13px Segoe UI, sans-serif';
  statistics.colors.forEach((color, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const itemX = x + column * 220;
    const itemY = y + 24 + row * rowHeight;
    context.fillStyle = `rgb(${color.displayRgb.join(',')})`;
    context.fillRect(itemX, itemY - 12, 16, 16);
    context.strokeStyle = 'rgba(37,35,31,0.24)';
    context.strokeRect(itemX, itemY - 12, 16, 16);
    context.fillStyle = '#25231f';
    context.fillText(
      `${color.code}  ${color.officialName}${options.includeColorCounts ? ` · ${color.count} 颗` : ''}`,
      itemX + 24,
      itemY,
    );
  });
  const rows = Math.ceil(statistics.colors.length / columns);
  const footY = y + 36 + rows * rowHeight;
  context.fillStyle = '#777066';
  context.font = '11px Segoe UI, sans-serif';
  const notes = [
    `${document.palette.ref.brand} ${document.palette.ref.series} · ${document.palette.ref.version} · RGB 为官方色卡派生参考值，不代表官方 RGB 标准`,
    `图纸 ${document.pattern.width} × ${document.pattern.height} 格 · ${statistics.beadCount} 颗 · 生成于 ${document.pattern.metadata.createdAt}`,
    `采样：${document.pattern.options.samplingMode === 'nearest' ? '最近邻' : '区域平均'} · 匹配：${document.pattern.options.colorStrategy.matcher} · 抖动：${document.pattern.options.colorStrategy.dithering === 'none' ? '关闭' : 'Floyd–Steinberg'}`,
    `色盘来源：${document.palette.source.officialPageUrl} · 非官方工具，颜色值仅作实体色卡参考`,
  ];
  notes.forEach((note, index) => context.fillText(note, x, footY + index * 16));
  return footY + notes.length * 16 + 16;
}

function estimateLegendHeight(
  patternDocument: PatternDocument,
  options: ExportOptions,
  width: number,
): number {
  const colorCount = computeColorStatistics(patternDocument).colors.length;
  const columns = Math.max(1, Math.floor(width / 220));
  const rows = Math.ceil(colorCount / columns);
  const rowHeight = 24;
  const titleHeight = 36;
  const notesHeight = options.includePaletteSource ? 4 * 16 + 16 : 0;
  return titleHeight + rows * rowHeight + notesHeight + 24;
}

export async function exportPatternPng(
  patternDocument: PatternDocument,
  overrides: Partial<ExportOptions> = {},
): Promise<ExportResult> {
  const options = { ...defaultOptions, ...overrides };
  const patternWidth = options.marginPx * 2 + patternDocument.pattern.width * options.cellSizePx;
  const patternHeight = options.marginPx * 2 + patternDocument.pattern.height * options.cellSizePx;
  const legendHeight = options.includeLegend
    ? estimateLegendHeight(patternDocument, options, patternWidth - options.marginPx * 2)
    : 0;
  const widthPx = Math.ceil(patternWidth);
  const heightPx = Math.ceil(patternHeight + legendHeight);

  if (
    widthPx > options.maxOutputSidePx ||
    heightPx > options.maxOutputSidePx ||
    widthPx * heightPx > options.maxOutputPixels
  ) {
    throw new Error('导出图纸尺寸超过浏览器安全上限，请降低单格尺寸。');
  }

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('无法创建 PNG 导出画布。');
  context.fillStyle = '#f3eee5';
  context.fillRect(0, 0, widthPx, heightPx);
  context.fillStyle = '#25231f';
  context.font = '700 18px Segoe UI, sans-serif';
  context.fillText(
    options.title ??
      `BeadCraft Studio · ${patternDocument.pattern.width} × ${patternDocument.pattern.height} 图纸`,
    options.marginPx,
    30,
  );
  context.fillStyle = '#777066';
  context.font = '11px Segoe UI, sans-serif';
  context.fillText(
    `${patternDocument.palette.ref.brand} ${patternDocument.palette.ref.series} ${patternDocument.palette.ref.version} · 状态版本 ${patternDocument.pattern.metadata.stateVersion}`,
    options.marginPx,
    48,
  );
  const geometry = computeViewportGeometry(
    patternDocument.pattern.width,
    patternDocument.pattern.height,
    { width: widthPx, height: patternHeight },
    {
      top: options.marginPx,
      right: options.marginPx,
      bottom: options.marginPx,
      left: options.marginPx,
    },
    1,
  );
  drawPatternScene(context, patternDocument, geometry, {
    showCodes: options.includeCodes,
    showGrid: true,
    showRulers: options.includeCoordinates,
    majorGridEvery: options.majorGridEvery,
  });
  if (options.includeLegend)
    drawLegend(
      context,
      patternDocument,
      options,
      options.marginPx,
      patternHeight + 28,
      widthPx - options.marginPx * 2,
    );
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob === null) throw new Error('PNG 编码失败，请重试。');
  const fileName = `beadcraft-${patternDocument.pattern.width}x${patternDocument.pattern.height}-${patternDocument.palette.ref.id}.png`;
  return {
    blob,
    fileName,
    widthPx,
    heightPx,
    stateVersion: patternDocument.pattern.metadata.stateVersion,
    format: 'png',
  };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
