import type { BeadPattern, PatternDocument, RgbaImage, Rgb8 } from '@/types';

import { codeTextColors } from './colorContrast';
import type { ViewportGeometry } from './viewport';

export interface PatternRenderOptions {
  showCodes: boolean;
  showGrid: boolean;
  showRulers: boolean;
  majorGridEvery: 5 | 10;
}

const RULER_SIZE = 30;

function cellColor(document: PatternDocument, colorIndex: number): Rgb8 {
  return document.palette.colors[colorIndex]?.displayRgb ?? ([255, 0, 255] as const);
}

function rgbCss(rgb: Rgb8, alpha = 1): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function drawCheckerboard(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const square = 8;
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = '#fffdf8';
  context.fillRect(x, y, width, height);
  context.fillStyle = 'rgba(216, 209, 196, 0.45)';

  for (let row = 0; row * square < height; row += 1) {
    for (let column = 0; column * square < width; column += 1) {
      if ((row + column) % 2 === 0) {
        context.fillRect(x + column * square, y + row * square, square, square);
      }
    }
  }

  context.restore();
}

function drawPaperShadow(context: CanvasRenderingContext2D, geometry: ViewportGeometry): void {
  context.save();
  context.shadowColor = 'rgba(53, 43, 31, 0.18)';
  context.shadowBlur = 18;
  context.shadowOffsetY = 8;
  context.fillStyle = '#fffdf8';
  context.fillRect(
    geometry.originX,
    geometry.originY,
    geometry.contentWidth,
    geometry.contentHeight,
  );
  context.restore();
}

function rulerStep(cellSize: number): number {
  if (cellSize >= 34) {
    return 1;
  }

  if (cellSize >= 17) {
    return 2;
  }

  return 5;
}

function drawRulers(
  context: CanvasRenderingContext2D,
  pattern: BeadPattern,
  geometry: ViewportGeometry,
): void {
  const cellSize = geometry.scale;
  const step = rulerStep(cellSize);
  const fontSize = Math.max(8, Math.min(11, cellSize * 0.58));
  const labelEvery = Math.max(step, Math.ceil(48 / Math.max(cellSize, 1)) * step);
  const top = geometry.originY - RULER_SIZE + 8;
  const left = geometry.originX - RULER_SIZE + 8;

  context.save();
  context.fillStyle = '#665f55';
  context.strokeStyle = 'rgba(102, 95, 85, 0.52)';
  context.lineWidth = 1;
  context.font = `500 ${fontSize}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'bottom';

  for (let column = 0; column < pattern.width; column += step) {
    const x = geometry.originX + column * cellSize;
    const isMajor = (column + 1) % 5 === 0 || column === 0;

    context.globalAlpha = isMajor ? 0.9 : 0.45;
    context.beginPath();
    context.moveTo(x, geometry.originY - 6);
    context.lineTo(x, geometry.originY);
    context.stroke();

    if ((column + 1) % labelEvery === 1 - (1 % labelEvery) || column === 0) {
      context.globalAlpha = 1;
      context.fillText(String(column + 1), x + cellSize / 2, top + 12);
    }
  }

  context.textAlign = 'right';
  context.textBaseline = 'middle';

  for (let row = 0; row < pattern.height; row += step) {
    const y = geometry.originY + row * cellSize;
    const isMajor = (row + 1) % 5 === 0 || row === 0;

    context.globalAlpha = isMajor ? 0.9 : 0.45;
    context.beginPath();
    context.moveTo(geometry.originX - 6, y);
    context.lineTo(geometry.originX, y);
    context.stroke();

    if ((row + 1) % labelEvery === 1 - (1 % labelEvery) || row === 0) {
      context.globalAlpha = 1;
      context.fillText(String(row + 1), left + 14, y + cellSize / 2);
    }
  }

  context.restore();
}

export function drawPatternScene(
  context: CanvasRenderingContext2D,
  document: PatternDocument,
  geometry: ViewportGeometry,
  options: PatternRenderOptions,
): void {
  const { pattern } = document;
  const cellSize = geometry.scale;

  drawPaperShadow(context, geometry);
  drawCheckerboard(
    context,
    geometry.originX,
    geometry.originY,
    geometry.contentWidth,
    geometry.contentHeight,
  );

  for (let row = 0; row < pattern.height; row += 1) {
    for (let column = 0; column < pattern.width; column += 1) {
      const cell = pattern.cells[row * pattern.width + column] ?? null;
      const x = geometry.originX + column * cellSize;
      const y = geometry.originY + row * cellSize;

      if (cell === null) {
        if (cellSize >= 7) {
          context.save();
          context.strokeStyle = 'rgba(119, 108, 92, 0.2)';
          context.lineWidth = 0.7;
          context.beginPath();
          context.moveTo(x + cellSize * 0.26, y + cellSize * 0.74);
          context.lineTo(x + cellSize * 0.74, y + cellSize * 0.26);
          context.stroke();
          context.restore();
        }

        continue;
      }

      const rgb = cellColor(document, cell.colorIndex);
      context.fillStyle = rgbCss(rgb);
      context.fillRect(x, y, cellSize + 0.25, cellSize + 0.25);

      if (options.showCodes && cellSize >= 11) {
        const colors = codeTextColors(rgb);
        const code = document.palette.colors[cell.colorIndex]?.code ?? '?';
        const fontSize = Math.max(6, Math.min(14, cellSize * 0.34));
        context.save();
        context.font = `600 ${fontSize}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.lineWidth = Math.max(0.8, fontSize * 0.13);
        context.strokeStyle = colors.stroke;
        context.strokeText(code, x + cellSize / 2, y + cellSize / 2, cellSize * 0.78);
        context.fillStyle = colors.fill;
        context.fillText(code, x + cellSize / 2, y + cellSize / 2, cellSize * 0.78);
        context.restore();
      }
    }
  }

  if (options.showGrid) {
    for (let column = 0; column <= pattern.width; column += 1) {
      const x = geometry.originX + column * cellSize;
      const isMajor = column % options.majorGridEvery === 0;
      context.strokeStyle = isMajor ? 'rgba(50, 45, 38, 0.66)' : 'rgba(50, 45, 38, 0.27)';
      context.lineWidth = isMajor ? 1.15 : 0.55;
      context.beginPath();
      context.moveTo(x, geometry.originY);
      context.lineTo(x, geometry.originY + geometry.contentHeight);
      context.stroke();
    }

    for (let row = 0; row <= pattern.height; row += 1) {
      const y = geometry.originY + row * cellSize;
      const isMajor = row % options.majorGridEvery === 0;
      context.strokeStyle = isMajor ? 'rgba(50, 45, 38, 0.66)' : 'rgba(50, 45, 38, 0.27)';
      context.lineWidth = isMajor ? 1.15 : 0.55;
      context.beginPath();
      context.moveTo(geometry.originX, y);
      context.lineTo(geometry.originX + geometry.contentWidth, y);
      context.stroke();
    }
  }

  context.strokeStyle = 'rgba(56, 47, 37, 0.5)';
  context.lineWidth = 1;
  context.strokeRect(
    geometry.originX,
    geometry.originY,
    geometry.contentWidth,
    geometry.contentHeight,
  );

  if (options.showRulers) {
    drawRulers(context, pattern, geometry);
  }
}

export function drawBeadScene(
  context: CanvasRenderingContext2D,
  document: PatternDocument,
  geometry: ViewportGeometry,
): void {
  const { pattern } = document;
  const cellSize = geometry.scale;

  drawPaperShadow(context, geometry);
  drawCheckerboard(
    context,
    geometry.originX,
    geometry.originY,
    geometry.contentWidth,
    geometry.contentHeight,
  );

  for (let row = 0; row < pattern.height; row += 1) {
    for (let column = 0; column < pattern.width; column += 1) {
      const cell = pattern.cells[row * pattern.width + column] ?? null;

      if (cell === null) {
        continue;
      }

      const rgb = cellColor(document, cell.colorIndex);
      const centerX = geometry.originX + (column + 0.5) * cellSize;
      const centerY = geometry.originY + (row + 0.5) * cellSize;
      const radius = Math.max(0.8, cellSize * 0.43);

      context.fillStyle = rgbCss(rgb);
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fill();

      if (cellSize >= 7) {
        context.strokeStyle = 'rgba(31, 28, 25, 0.2)';
        context.lineWidth = Math.max(0.5, cellSize * 0.045);
        context.stroke();
        context.fillStyle = 'rgba(255, 253, 248, 0.2)';
        context.beginPath();
        context.ellipse(
          centerX - radius * 0.28,
          centerY - radius * 0.34,
          radius * 0.2,
          radius * 0.13,
          -0.6,
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      if (cellSize >= 13) {
        context.fillStyle = 'rgba(36, 31, 27, 0.25)';
        context.beginPath();
        context.arc(centerX, centerY, radius * 0.22, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
}

export function drawSourceScene(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  geometry: ViewportGeometry,
): void {
  void imageWidth;
  void imageHeight;
  drawPaperShadow(context, geometry);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    image,
    geometry.originX,
    geometry.originY,
    geometry.contentWidth,
    geometry.contentHeight,
  );
  context.strokeStyle = 'rgba(56, 47, 37, 0.45)';
  context.lineWidth = 1;
  context.strokeRect(
    geometry.originX,
    geometry.originY,
    geometry.contentWidth,
    geometry.contentHeight,
  );
}

export function sourceImageData(image: RgbaImage): ImageData {
  return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
}
