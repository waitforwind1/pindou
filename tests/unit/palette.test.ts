import { describe, expect, it } from 'vitest';

import { AppError } from '@/core/errors/appError';
import {
  BuiltInPaletteRepository,
  computePaletteChecksum,
  HAMA_MIDI_SOLID_COLOR_COUNT,
  validatePalette,
} from '@/palettes';
import paletteSnapshot from '@/palettes/hama-midi-solid-2026.palette.json';

const EXPECTED_CHECKSUM = '1bdbf969e21a266269f4d983c9203af62889b3fc77b528f164daa72b3e6b66f2';

function mutableSnapshot(): Record<string, unknown> {
  return structuredClone(paletteSnapshot) as unknown as Record<string, unknown>;
}

describe('Hama Midi Solid palette snapshot', () => {
  it('loads exactly 67 unique official codes with traceable source metadata', async () => {
    const palette = await new BuiltInPaletteRepository().loadDefault();

    expect(palette.colors).toHaveLength(HAMA_MIDI_SOLID_COLOR_COUNT);
    expect(new Set(palette.colors.map((color) => color.code)).size).toBe(67);
    expect(new Set(palette.colors.map((color) => color.officialName)).size).toBe(67);
    expect(palette.colors[0]?.code).toBe('108');
    expect(palette.colors.at(-1)?.code).toBe('117');
    expect(palette.ref).toMatchObject({
      id: 'hama-midi-solid',
      brand: 'HAMA',
      series: 'MIDI',
      variant: 'SOLID',
      version: '2026',
    });
    expect(palette.source.officialPageUrl).toBe('https://hama.dk/en/pages/colour-chart');
    expect(palette.source.documentSha256).toBe(
      '6AC736AA546ADEC53DF5F82AEE900F190A79530FF8F2C796723F430AB40FA6F4',
    );
    expect(palette.source.colorDataSource).toBe('official-chart-derived');
    expect(palette.verification.status).toBe('verified');
  });

  it('recomputes the frozen checksum from canonical JSON', async () => {
    const palette = validatePalette(paletteSnapshot, {
      expectedColorCount: HAMA_MIDI_SOLID_COLOR_COUNT,
    });

    await expect(computePaletteChecksum(palette)).resolves.toBe(EXPECTED_CHECKSUM);
    expect(palette.ref.checksum).toBe(EXPECTED_CHECKSUM);
  });

  it('returns an immutable palette so loaded colour data cannot drift', async () => {
    const palette = await new BuiltInPaletteRepository().loadDefault();

    expect(Object.isFrozen(palette)).toBe(true);
    expect(Object.isFrozen(palette.ref)).toBe(true);
    expect(Object.isFrozen(palette.colors)).toBe(true);
    expect(Object.isFrozen(palette.colors[0])).toBe(true);
    expect(Object.isFrozen(palette.colors[0]?.displayRgb)).toBe(true);
    expect(() => {
      (palette.colors[0] as { code: string }).code = 'fabricated';
    }).toThrow(TypeError);
  });

  it('rejects duplicate codes before matching can become ambiguous', () => {
    const snapshot = mutableSnapshot();
    const colors = structuredClone(snapshot.colors) as Array<Record<string, unknown>>;
    colors[1] = { ...colors[1], code: colors[0]?.code };
    snapshot.colors = colors;

    expect(() => validatePalette(snapshot)).toThrowError(AppError);
  });

  it('rejects out-of-range RGB channels rather than repairing them silently', () => {
    const snapshot = mutableSnapshot();
    const colors = structuredClone(snapshot.colors) as Array<Record<string, unknown>>;
    colors[0] = { ...colors[0], displayRgb: [256, 0, 0] };
    snapshot.colors = colors;

    expect(() => validatePalette(snapshot)).toThrowError(AppError);
  });

  it('rejects a palette without traceable source data', () => {
    const snapshot = mutableSnapshot();
    delete snapshot.source;

    expect(() => validatePalette(snapshot)).toThrowError(AppError);
  });

  it('does not resolve a mismatched palette reference', async () => {
    const repository = new BuiltInPaletteRepository();
    const palette = await repository.loadDefault();

    await expect(
      repository.load({ ...palette.ref, checksum: '0'.repeat(64) }),
    ).rejects.toMatchObject({ code: 'PALETTE_INVALID' });
  });
});
