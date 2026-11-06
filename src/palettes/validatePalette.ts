import { AppError } from '@/core/errors/appError';
import type {
  BeadColor,
  ColorSourceRef,
  Palette,
  PaletteRef,
  PaletteSource,
  PaletteVerification,
  Rgb8,
} from '@/types';

export interface ValidatePaletteOptions {
  expectedColorCount?: number;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function invalid(path: string, reason: string): never {
  throw new AppError('PALETTE_INVALID', `Invalid palette at ${path}: ${reason}.`, {
    context: { path, reason },
  });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordAt(value: unknown, path: string): UnknownRecord {
  if (!isRecord(value)) {
    invalid(path, 'expected an object');
  }

  return value;
}

function stringAt(record: UnknownRecord, key: string, path: string): string {
  const value = record[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(`${path}.${key}`, 'expected a non-empty string');
  }

  return value;
}

function positiveIntegerAt(record: UnknownRecord, key: string, path: string): number {
  const value = record[key];

  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    invalid(`${path}.${key}`, 'expected a positive integer');
  }

  return value;
}

function optionalPositiveIntegerAt(
  record: UnknownRecord,
  key: string,
  path: string,
): number | undefined {
  if (!(key in record)) {
    return undefined;
  }

  return positiveIntegerAt(record, key, path);
}

function dateAt(record: UnknownRecord, key: string, path: string): string {
  const value = stringAt(record, key, path);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalid(`${path}.${key}`, 'expected an ISO calendar date (YYYY-MM-DD)');
  }

  return value;
}

function sha256At(record: UnknownRecord, key: string, path: string): string {
  const value = stringAt(record, key, path);

  if (!/^[0-9A-Fa-f]{64}$/.test(value)) {
    invalid(`${path}.${key}`, 'expected a 64-character hexadecimal SHA-256 digest');
  }

  return value;
}

function httpsUrlAt(record: UnknownRecord, key: string, path: string): string {
  const value = stringAt(record, key, path);

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    invalid(`${path}.${key}`, 'expected an absolute URL');
  }

  if (parsed.protocol !== 'https:') {
    invalid(`${path}.${key}`, 'expected an HTTPS URL');
  }

  return value;
}

function validatePaletteRef(input: unknown): PaletteRef {
  const ref = recordAt(input, 'ref');

  return Object.freeze({
    id: stringAt(ref, 'id', 'ref'),
    brand: stringAt(ref, 'brand', 'ref'),
    series: stringAt(ref, 'series', 'ref'),
    variant: stringAt(ref, 'variant', 'ref'),
    version: stringAt(ref, 'version', 'ref'),
    checksum: sha256At(ref, 'checksum', 'ref'),
  });
}

function validateSourceColor(input: unknown, path: string): ColorSourceRef {
  const source = recordAt(input, path);
  const documentId = stringAt(source, 'documentId', path);
  const page = positiveIntegerAt(source, 'page', path);
  const row = optionalPositiveIntegerAt(source, 'row', path);
  const column = optionalPositiveIntegerAt(source, 'column', path);

  if ((row === undefined) !== (column === undefined)) {
    invalid(path, 'row and column must either both be present or both be absent');
  }

  return Object.freeze({
    documentId,
    page,
    ...(row === undefined ? {} : { row }),
    ...(column === undefined ? {} : { column }),
  });
}

function validateRgb(input: unknown, path: string): Rgb8 {
  if (!Array.isArray(input) || input.length !== 3) {
    invalid(path, 'expected an RGB tuple with exactly three channels');
  }

  const channels = input.map((channel: unknown, index: number) => {
    if (typeof channel !== 'number' || !Number.isInteger(channel) || channel < 0 || channel > 255) {
      invalid(`${path}[${index}]`, 'expected an integer from 0 to 255');
    }

    return channel;
  });

  const [red, green, blue] = channels;

  if (red === undefined || green === undefined || blue === undefined) {
    invalid(path, 'expected exactly three RGB channels');
  }

  return Object.freeze([red, green, blue] as const);
}

function validateColor(input: unknown, index: number): BeadColor {
  const path = `colors[${index}]`;
  const color = recordAt(input, path);
  const translationInput = color.translation;
  let translation: BeadColor['translation'];

  if (translationInput !== undefined) {
    const translationRecord = recordAt(translationInput, `${path}.translation`);
    const status = stringAt(translationRecord, 'status', `${path}.translation`);

    if (status !== 'editorial') {
      invalid(`${path}.translation.status`, 'expected "editorial"');
    }

    translation = Object.freeze({
      zh: stringAt(translationRecord, 'zh', `${path}.translation`),
      status: 'editorial' as const,
    });
  }

  return Object.freeze({
    code: stringAt(color, 'code', path),
    officialName: stringAt(color, 'officialName', path),
    displayRgb: validateRgb(color.displayRgb, `${path}.displayRgb`),
    source: validateSourceColor(color.source, `${path}.source`),
    ...(translation === undefined ? {} : { translation }),
  });
}

function validateSource(input: unknown): PaletteSource {
  const source = recordAt(input, 'source');
  const colorDataSource = stringAt(source, 'colorDataSource', 'source');

  if (colorDataSource !== 'official-chart-derived') {
    invalid('source.colorDataSource', 'expected "official-chart-derived"');
  }

  return Object.freeze({
    officialPageUrl: httpsUrlAt(source, 'officialPageUrl', 'source'),
    documentUrl: httpsUrlAt(source, 'documentUrl', 'source'),
    documentSha256: sha256At(source, 'documentSha256', 'source'),
    accessedAt: dateAt(source, 'accessedAt', 'source'),
    samplingMethod: stringAt(source, 'samplingMethod', 'source'),
    colorDataSource: 'official-chart-derived' as const,
  });
}

function validateVerification(input: unknown): PaletteVerification {
  const verification = recordAt(input, 'verification');
  const status = stringAt(verification, 'status', 'verification');

  if (status !== 'verified') {
    invalid('verification.status', 'expected "verified"');
  }

  return Object.freeze({
    status: 'verified' as const,
    verifiedAt: dateAt(verification, 'verifiedAt', 'verification'),
    notes: stringAt(verification, 'notes', 'verification'),
  });
}

/**
 * Validate and clone untrusted palette data. The returned palette and every
 * nested array/object are frozen so a loaded palette cannot drift at runtime.
 */
export function validatePalette(input: unknown, options: ValidatePaletteOptions = {}): Palette {
  const root = recordAt(input, 'palette');
  const ref = validatePaletteRef(root.ref);

  if (!Array.isArray(root.colors)) {
    invalid('colors', 'expected an array');
  }

  const colors = Object.freeze(root.colors.map((color, index) => validateColor(color, index)));

  if (options.expectedColorCount !== undefined && colors.length !== options.expectedColorCount) {
    invalid(
      'colors',
      `expected exactly ${options.expectedColorCount} entries, received ${colors.length}`,
    );
  }

  if (colors.length === 0) {
    invalid('colors', 'expected at least one colour');
  }

  const codes = new Set<string>();

  for (const color of colors) {
    if (codes.has(color.code)) {
      invalid('colors', `duplicate official code "${color.code}"`);
    }

    codes.add(color.code);
  }

  return Object.freeze({
    ref,
    colors,
    source: validateSource(root.source),
    verification: validateVerification(root.verification),
  });
}
