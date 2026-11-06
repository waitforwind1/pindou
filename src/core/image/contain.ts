export interface ContainLayout {
  scale: number;
  contentWidth: number;
  contentHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface SourcePixelCoordinate {
  x: number;
  y: number;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
}

export function computeContainLayout(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): ContainLayout {
  assertPositiveInteger(sourceWidth, 'sourceWidth');
  assertPositiveInteger(sourceHeight, 'sourceHeight');
  assertPositiveInteger(targetWidth, 'targetWidth');
  assertPositiveInteger(targetHeight, 'targetHeight');

  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const contentWidth = sourceWidth * scale;
  const contentHeight = sourceHeight * scale;

  return {
    scale,
    contentWidth,
    contentHeight,
    offsetX: (targetWidth - contentWidth) / 2,
    offsetY: (targetHeight - contentHeight) / 2,
  };
}

/** Map a target cell centre to its source pixel, or null when contain leaves it empty. */
export function mapTargetCellToSource(
  layout: ContainLayout,
  sourceWidth: number,
  sourceHeight: number,
  targetX: number,
  targetY: number,
): SourcePixelCoordinate | null {
  const centerX = (targetX + 0.5 - layout.offsetX) / layout.scale;
  const centerY = (targetY + 0.5 - layout.offsetY) / layout.scale;

  if (centerX < 0 || centerX >= sourceWidth || centerY < 0 || centerY >= sourceHeight) {
    return null;
  }

  return {
    x: Math.floor(centerX),
    y: Math.floor(centerY),
  };
}
