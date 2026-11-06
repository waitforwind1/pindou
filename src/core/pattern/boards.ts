import type { BoardLayout, BoardOptions, PatternBoard, PatternDocument } from '@/types';

function assertBoardDimension(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0 || value > 128) {
    throw new RangeError(`${label} must be an integer from 1 to 128.`);
  }
}

function boardLabel(row: number, column: number): string {
  let value = row + 1;
  let letters = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return `${letters}${column + 1}`;
}

export function splitPatternIntoBoards(
  document: PatternDocument,
  options: BoardOptions,
): BoardLayout {
  assertBoardDimension(options.boardWidth, 'boardWidth');
  assertBoardDimension(options.boardHeight, 'boardHeight');

  const { pattern } = document;
  const boardColumns = Math.ceil(pattern.width / options.boardWidth);
  const boardRows = Math.ceil(pattern.height / options.boardHeight);
  const boards: PatternBoard[] = [];

  for (let row = 0; row < boardRows; row += 1) {
    for (let column = 0; column < boardColumns; column += 1) {
      const globalX = column * options.boardWidth;
      const globalY = row * options.boardHeight;
      const width = Math.min(options.boardWidth, pattern.width - globalX);
      const height = Math.min(options.boardHeight, pattern.height - globalY);
      const cells = [];
      let beadCount = 0;

      for (let localRow = 0; localRow < height; localRow += 1) {
        for (let localColumn = 0; localColumn < width; localColumn += 1) {
          const cell =
            pattern.cells[(globalY + localRow) * pattern.width + globalX + localColumn] ?? null;
          cells.push(cell);
          if (cell !== null) beadCount += 1;
        }
      }

      boards.push({
        boardIndex: boards.length,
        boardNumber: boardLabel(row, column),
        row,
        column,
        globalX,
        globalY,
        width,
        height,
        cells: Object.freeze(cells),
        beadCount,
        emptyCount: width * height - beadCount,
      });
    }
  }

  return Object.freeze({
    patternWidth: pattern.width,
    patternHeight: pattern.height,
    boardWidth: options.boardWidth,
    boardHeight: options.boardHeight,
    boardColumns,
    boardRows,
    boards: Object.freeze(boards),
    totalBeadCount: boards.reduce((sum, board) => sum + board.beadCount, 0),
    totalEmptyCount: boards.reduce((sum, board) => sum + board.emptyCount, 0),
  });
}
