import { canonicalJson, type JsonValue } from '@/core/serialization/canonicalJson';
import { AppError } from '@/core/errors/appError';
import type { BeadColor, Palette } from '@/types';

function sourceJson(color: BeadColor): JsonValue {
  return {
    documentId: color.source.documentId,
    page: color.source.page,
    ...(color.source.row === undefined ? {} : { row: color.source.row }),
    ...(color.source.column === undefined ? {} : { column: color.source.column }),
  };
}

function colorJson(color: BeadColor): JsonValue {
  return {
    code: color.code,
    officialName: color.officialName,
    displayRgb: [color.displayRgb[0], color.displayRgb[1], color.displayRgb[2]],
    source: sourceJson(color),
    ...(color.translation === undefined
      ? {}
      : {
          translation: {
            zh: color.translation.zh,
            status: color.translation.status,
          },
        }),
  };
}

/** Build the checksum payload while excluding the checksum itself. */
export function paletteChecksumPayload(palette: Palette): JsonValue {
  return {
    ref: {
      id: palette.ref.id,
      brand: palette.ref.brand,
      series: palette.ref.series,
      variant: palette.ref.variant,
      version: palette.ref.version,
    },
    colors: palette.colors.map(colorJson),
    source: {
      officialPageUrl: palette.source.officialPageUrl,
      documentUrl: palette.source.documentUrl,
      documentSha256: palette.source.documentSha256,
      accessedAt: palette.source.accessedAt,
      samplingMethod: palette.source.samplingMethod,
      colorDataSource: palette.source.colorDataSource,
    },
    verification: {
      status: palette.verification.status,
      verifiedAt: palette.verification.verifiedAt,
      notes: palette.verification.notes,
    },
  };
}

export async function sha256Hex(text: string): Promise<string> {
  if (globalThis.crypto?.subtle === undefined) {
    throw new AppError('PALETTE_INVALID', 'Web Crypto SHA-256 is unavailable in this runtime.');
  }

  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function computePaletteChecksum(palette: Palette): Promise<string> {
  return sha256Hex(canonicalJson(paletteChecksumPayload(palette)));
}

export async function assertPaletteChecksum(palette: Palette): Promise<Palette> {
  const actual = await computePaletteChecksum(palette);

  if (actual !== palette.ref.checksum) {
    throw new AppError('PALETTE_INVALID', 'Palette checksum does not match its canonical data.', {
      context: {
        paletteId: palette.ref.id,
        expected: palette.ref.checksum,
        actual,
      },
    });
  }

  return palette;
}
