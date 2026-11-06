import { AppError } from '@/core/errors/appError';
import type { Palette, PaletteRef, PaletteRepository } from '@/types';

import { assertPaletteChecksum } from './checksum';
import paletteSnapshot from './hama-midi-solid-2026.palette.json';
import { validatePalette } from './validatePalette';

export const HAMA_MIDI_SOLID_COLOR_COUNT = 67;
export const HAMA_MIDI_SOLID_PALETTE_ID = 'hama-midi-solid';

function samePaletteRef(left: PaletteRef, right: PaletteRef): boolean {
  return (
    left.id === right.id &&
    left.brand === right.brand &&
    left.series === right.series &&
    left.variant === right.variant &&
    left.version === right.version &&
    left.checksum === right.checksum
  );
}

export class BuiltInPaletteRepository implements PaletteRepository {
  private defaultPalettePromise: Promise<Palette> | null = null;

  loadDefault(): Promise<Palette> {
    this.defaultPalettePromise ??= this.loadSnapshot();
    return this.defaultPalettePromise;
  }

  async load(ref: PaletteRef): Promise<Palette> {
    const palette = await this.loadDefault();

    if (!samePaletteRef(ref, palette.ref)) {
      throw new AppError('PALETTE_INVALID', 'Requested palette reference is not available.', {
        context: {
          requested: ref,
          available: palette.ref,
        },
      });
    }

    return palette;
  }

  private async loadSnapshot(): Promise<Palette> {
    const palette = validatePalette(paletteSnapshot, {
      expectedColorCount: HAMA_MIDI_SOLID_COLOR_COUNT,
    });

    if (palette.ref.id !== HAMA_MIDI_SOLID_PALETTE_ID) {
      throw new AppError(
        'PALETTE_INVALID',
        'Built-in palette identifier does not match its snapshot.',
      );
    }

    return assertPaletteChecksum(palette);
  }
}

export const paletteRepository = new BuiltInPaletteRepository();

export function loadDefaultPalette(): Promise<Palette> {
  return paletteRepository.loadDefault();
}
