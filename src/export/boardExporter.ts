import { splitPatternIntoBoards } from '@/core/pattern';
import { drawPatternScene } from '@/render/patternRenderer';
import { computeViewportGeometry } from '@/render/viewport';
import type {
  BoardOptions,
  ExportResult,
  PatternBoard,
  PatternDocument,
  PatternDocument as DocumentModel,
} from '@/types';
import { downloadBlob } from './pngExporter';

const CELL_SIZE = 48;
const MARGIN = 56;
const HEADER = 58;

function boardDocument(document: PatternDocument, board: PatternBoard): DocumentModel {
  return {
    palette: document.palette,
    pattern: {
      ...document.pattern,
      width: board.width,
      height: board.height,
      cells: board.cells,
      metadata: {
        ...document.pattern.metadata,
        generationKey: `${document.pattern.metadata.generationKey}:board:${board.boardNumber}`,
      },
    },
  };
}

export async function exportBoardsPng(
  patternDocument: PatternDocument,
  options: BoardOptions,
): Promise<ExportResult> {
  const layout = splitPatternIntoBoards(patternDocument, options);
  const panelWidths = layout.boards.map((board) => MARGIN * 2 + board.width * CELL_SIZE);
  const panelHeights = layout.boards.map((board) => HEADER + MARGIN * 2 + board.height * CELL_SIZE);
  const widthPx = Math.max(...panelWidths);
  const heightPx = panelHeights.reduce((sum, height) => sum + height, 0);
  if (widthPx > 8192 || heightPx > 8192 || widthPx * heightPx > 40_000_000) {
    throw new Error('分板导出尺寸超过浏览器安全上限，请增大底板尺寸或拆分导出。');
  }
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('无法创建分板 PNG 导出画布。');

  context.fillStyle = '#f3eee5';
  context.fillRect(0, 0, widthPx, heightPx);
  let offsetY = 0;

  for (let index = 0; index < layout.boards.length; index += 1) {
    const board = layout.boards[index];
    const panelHeight = panelHeights[index];
    if (board === undefined || panelHeight === undefined) continue;
    const boardModel = boardDocument(patternDocument, board);
    context.fillStyle = '#25231f';
    context.font = '700 20px Segoe UI, sans-serif';
    context.fillText(
      `底板 ${board.boardNumber} · 全局列 ${board.globalX + 1}-${board.globalX + board.width} · 行 ${board.globalY + 1}-${board.globalY + board.height}`,
      MARGIN,
      offsetY + 30,
    );
    context.fillStyle = '#777066';
    context.font = '12px Segoe UI, sans-serif';
    context.fillText(
      `${board.width} × ${board.height} 格 · ${board.beadCount} 颗 · ${patternDocument.palette.ref.brand} ${patternDocument.palette.ref.series} ${patternDocument.palette.ref.version}`,
      MARGIN,
      offsetY + 48,
    );

    const geometry = computeViewportGeometry(
      board.width,
      board.height,
      { width: widthPx, height: panelHeight },
      { top: HEADER, right: MARGIN, bottom: MARGIN, left: MARGIN },
      1,
    );
    const translatedGeometry = { ...geometry, originY: geometry.originY + offsetY };
    drawPatternScene(context, boardModel, translatedGeometry, {
      showCodes: true,
      showGrid: true,
      showRulers: true,
      majorGridEvery: 5,
    });
    offsetY += panelHeight;
  }

  context.fillStyle = '#777066';
  context.font = '11px Segoe UI, sans-serif';
  context.fillText(
    '分板导出 · 空位以斜线表示 · RGB 为官方色卡派生参考值，不代表官方 RGB 标准',
    MARGIN,
    heightPx - 12,
  );
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob === null) throw new Error('分板 PNG 编码失败，请重试。');
  return {
    blob,
    fileName: `beadcraft-boards-${layout.patternWidth}x${layout.patternHeight}-${options.boardWidth}x${options.boardHeight}.png`,
    widthPx,
    heightPx,
    stateVersion: patternDocument.pattern.metadata.stateVersion,
    format: 'png',
  };
}

export function downloadBoardsPng(
  patternDocument: PatternDocument,
  options: BoardOptions,
): Promise<ExportResult> {
  return exportBoardsPng(patternDocument, options).then((result) => {
    downloadBlob(result.blob, result.fileName);
    return result;
  });
}
