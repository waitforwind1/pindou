/** sRGB channel values in the inclusive 0-255 range. */
export type Rgb8 = readonly [red: number, green: number, blue: number];

/** CIELAB components using the D65 white point. */
export type Lab = readonly [lightness: number, a: number, b: number];

export type MatcherId = 'rgb-euclidean' | 'cie76' | 'ciede2000';
export type SamplingMode = 'nearest' | 'area';
export type FitMode = 'contain';
export type CellOrigin = 'auto' | 'manual';
export type DitheringMode = 'none' | 'floyd-steinberg';

export interface ColorSourceRef {
  documentId: string;
  page: number;
  row?: number;
  column?: number;
}

export interface BeadColor {
  /** Official catalogue code, unique inside one palette. */
  code: string;
  /** Official English name; the primary name used by verification and export. */
  officialName: string;
  /** Reference sRGB sampled from the official colour chart, not an official RGB standard. */
  displayRgb: Rgb8;
  /** Location in the official source used for resampling and audit. */
  source: ColorSourceRef;
  /** Optional Chinese gloss, explicitly marked as editorial. */
  translation?: {
    zh: string;
    status: 'editorial';
  };
}

export interface PaletteRef {
  id: string;
  brand: string;
  series: string;
  variant: string;
  version: string;
  /** SHA-256 of the canonical palette JSON. */
  checksum: string;
}

export interface PaletteSource {
  officialPageUrl: string;
  documentUrl: string;
  documentSha256: string;
  accessedAt: string;
  samplingMethod: string;
  /** The chart is an official source; RGB values remain derived reference colours. */
  colorDataSource: 'official-chart-derived';
}

export interface PaletteVerification {
  status: 'verified';
  verifiedAt: string;
  notes: string;
}

export interface Palette {
  ref: PaletteRef;
  colors: readonly BeadColor[];
  source: PaletteSource;
  verification: PaletteVerification;
}

/** Runtime-only lookup data derived from a Palette. It is not persisted. */
export interface ResolvedPalette {
  palette: Palette;
  colors: readonly BeadColor[];
  labByIndex: readonly Lab[];
  indexByCode: ReadonlyMap<string, number>;
}

export interface PatternOptions {
  targetWidth: number;
  targetHeight: number;
  fitMode: FitMode;
  samplingMode: SamplingMode;
  /** Alpha values below this threshold become empty cells. P0 uses 128. */
  alphaThreshold: number;
  /** Background used only to composite translucent pixels. P0 uses white. */
  backgroundColor: Rgb8;
  colorStrategy: {
    matcher: MatcherId;
    dithering: DitheringMode;
  };
}

export interface PatternCell {
  /** Zero-based index into the immutable palette colours array. */
  colorIndex: number;
  /** Source colour after white compositing; null is allowed for manually painted cells. */
  sourceRgb: Rgb8 | null;
  origin: CellOrigin;
}

export interface SourceImageMeta {
  sourceId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  transparentPixelRatio: number;
  orientationApplied: boolean;
}

export interface BeadPattern {
  schemaVersion: 1;
  width: number;
  height: number;
  /** Row-major cells; index = row * width + column. null represents an empty cell. */
  cells: readonly (PatternCell | null)[];
  paletteRef: PaletteRef;
  options: PatternOptions;
  source: SourceImageMeta;
  metadata: {
    createdAt: string;
    /** Strictly increases after every edit on this pattern. */
    stateVersion: number;
    generationKey: string;
    engineVersion: string;
  };
}

/** The single runtime read model used by preview, editing, statistics and export. */
export interface PatternDocument {
  pattern: BeadPattern;
  palette: Palette;
}

export interface ColorCount {
  colorIndex: number;
  code: string;
  officialName: string;
  displayRgb: Rgb8;
  count: number;
}

export interface ColorStatistics {
  patternStateVersion: number;
  paletteChecksum: string;
  width: number;
  height: number;
  totalCells: number;
  beadCount: number;
  emptyCount: number;
  usedColorCount: number;
  colors: readonly ColorCount[];
}

export interface BoardOptions {
  boardWidth: number;
  boardHeight: number;
}

export interface PatternBoard {
  boardIndex: number;
  boardNumber: string;
  row: number;
  column: number;
  globalX: number;
  globalY: number;
  width: number;
  height: number;
  cells: readonly (PatternCell | null)[];
  beadCount: number;
  emptyCount: number;
}

export interface BoardLayout {
  patternWidth: number;
  patternHeight: number;
  boardWidth: number;
  boardHeight: number;
  boardColumns: number;
  boardRows: number;
  boards: readonly PatternBoard[];
  totalBeadCount: number;
  totalEmptyCount: number;
}

export type ExportFormat = 'png';

export interface ExportOptions {
  format: ExportFormat;
  /** Export cell edge length in CSS pixels. P0 requires at least 40. */
  cellSizePx: number;
  marginPx: number;
  majorGridEvery: 5 | 10;
  title?: string;
  includeCodes: true;
  includeCoordinates: true;
  includeLegend: true;
  includePaletteSource: true;
  includeColorCounts: boolean;
  maxOutputPixels: number;
  maxOutputSidePx: number;
}

export interface ExportResult {
  blob: Blob;
  fileName: string;
  widthPx: number;
  heightPx: number;
  stateVersion: number;
  format: ExportFormat;
}

export interface RgbaImage {
  width: number;
  height: number;
  /** Non-premultiplied RGBA bytes with length width * height * 4. */
  data: Uint8ClampedArray;
}

export interface DecodedImage {
  image: RgbaImage;
  meta: SourceImageMeta;
  release(): void;
}

export interface GenerationRequest {
  image: RgbaImage;
  source: SourceImageMeta;
  palette: Palette;
  options: PatternOptions;
}

export interface PatternProjectFile {
  fileSchemaVersion: 1;
  pattern: BeadPattern;
  /** Optional palette snapshot kept outside every cell for offline restoration. */
  paletteSnapshot?: Palette;
  savedAt: string;
  appVersion: string;
}
