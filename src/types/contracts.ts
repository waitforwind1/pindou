import type {
  BeadColor,
  DecodedImage,
  ExportOptions,
  ExportResult,
  GenerationRequest,
  MatcherId,
  Palette,
  PaletteRef,
  PatternDocument,
  Rgb8,
} from './models';

export interface DecodePolicy {
  maxFileBytes: number;
  maxSourcePixels: number;
  allowedMimeTypes: readonly string[];
}

export interface ImageDecoder {
  decode(file: File, policy: DecodePolicy): Promise<DecodedImage>;
}

export interface PaletteRepository {
  loadDefault(): Promise<Palette>;
  load(ref: PaletteRef): Promise<Palette>;
}

export interface PreparedMatcher {
  match(rgb: Rgb8): number;
}

export interface ColorMatcher {
  readonly id: MatcherId;
  prepare(colors: readonly BeadColor[]): PreparedMatcher;
}

export interface ColorMatcherFactory {
  create(algorithm: MatcherId): ColorMatcher;
}

export interface GenerationService {
  generate(request: GenerationRequest, signal?: AbortSignal): Promise<PatternDocument>;
}

export interface ExportService {
  exportPng(
    document: PatternDocument,
    options: ExportOptions,
    signal?: AbortSignal,
  ): Promise<ExportResult>;
}
