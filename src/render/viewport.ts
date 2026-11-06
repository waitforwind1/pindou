export interface ViewportSize {
  width: number;
  height: number;
}

export interface ViewportPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewportGeometry {
  scale: number;
  fitScale: number;
  originX: number;
  originY: number;
  contentWidth: number;
  contentHeight: number;
}

export interface ViewportPoint {
  x: number;
  y: number;
}

export interface ZoomAroundPointResult {
  zoom: number;
  panX: number;
  panY: number;
}

export interface PatternCoordinate {
  column: number;
  row: number;
  index: number;
}

export const MIN_VIEW_ZOOM = 0.5;
export const MAX_VIEW_ZOOM = 8;

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive number.`);
  }
}

export function clampViewZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return 1;
  }

  return Math.min(MAX_VIEW_ZOOM, Math.max(MIN_VIEW_ZOOM, zoom));
}

export function computeViewportGeometry(
  contentWidth: number,
  contentHeight: number,
  viewport: ViewportSize,
  padding: ViewportPadding,
  zoom = 1,
  panX = 0,
  panY = 0,
): ViewportGeometry {
  assertPositive(contentWidth, 'contentWidth');
  assertPositive(contentHeight, 'contentHeight');
  assertPositive(viewport.width, 'viewport.width');
  assertPositive(viewport.height, 'viewport.height');

  const availableWidth = Math.max(1, viewport.width - padding.left - padding.right);
  const availableHeight = Math.max(1, viewport.height - padding.top - padding.bottom);
  const fitScale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
  const scale = fitScale * clampViewZoom(zoom);
  const scaledWidth = contentWidth * scale;
  const scaledHeight = contentHeight * scale;

  return {
    scale,
    fitScale,
    originX: (viewport.width - scaledWidth) / 2 + panX,
    originY: (viewport.height - scaledHeight) / 2 + panY,
    contentWidth: scaledWidth,
    contentHeight: scaledHeight,
  };
}

export function pointToPatternCoordinate(
  point: ViewportPoint,
  geometry: ViewportGeometry,
  columns: number,
  rows: number,
): PatternCoordinate | null {
  const localX = (point.x - geometry.originX) / geometry.scale;
  const localY = (point.y - geometry.originY) / geometry.scale;

  if (localX < 0 || localX >= columns || localY < 0 || localY >= rows) {
    return null;
  }

  const column = Math.floor(localX);
  const row = Math.floor(localY);

  return { column, row, index: row * columns + column };
}

export function zoomAroundPoint(
  contentWidth: number,
  contentHeight: number,
  viewport: ViewportSize,
  padding: ViewportPadding,
  zoom: number,
  panX: number,
  panY: number,
  point: ViewportPoint,
  nextZoom: number,
): ZoomAroundPointResult {
  const current = computeViewportGeometry(
    contentWidth,
    contentHeight,
    viewport,
    padding,
    zoom,
    panX,
    panY,
  );
  const clampedNextZoom = clampViewZoom(nextZoom);
  const contentX = (point.x - current.originX) / current.scale;
  const contentY = (point.y - current.originY) / current.scale;
  const nextScale = current.fitScale * clampedNextZoom;
  const centeredOriginX = (viewport.width - contentWidth * nextScale) / 2;
  const centeredOriginY = (viewport.height - contentHeight * nextScale) / 2;

  return {
    zoom: clampedNextZoom,
    panX: point.x - contentX * nextScale - centeredOriginX,
    panY: point.y - contentY * nextScale - centeredOriginY,
  };
}
