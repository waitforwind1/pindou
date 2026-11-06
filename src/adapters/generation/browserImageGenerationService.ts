import { BrowserImageDecoder, DEFAULT_DECODE_POLICY } from '@/adapters/image';
import { AppError } from '@/core/errors/appError';
import { pureGenerationService } from '@/core/generation';
import { paletteRepository } from '@/palettes';
import type {
  DecodePolicy,
  ImageDecoder,
  PaletteRepository,
  PatternDocument,
  PatternOptions,
} from '@/types';

export interface GenerateFromFileOptions {
  options: PatternOptions;
  decodePolicy?: DecodePolicy;
}

function assertNotCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new AppError('CANCELLED', 'Generation was cancelled.');
  }
}

/** End-to-end browser boundary: File -> decoded RGBA -> verified palette -> PatternDocument. */
export class BrowserImageGenerationService {
  private readonly decoder: ImageDecoder;
  private readonly palettes: PaletteRepository;

  constructor(
    decoder: ImageDecoder = new BrowserImageDecoder(),
    palettes: PaletteRepository = paletteRepository,
  ) {
    this.decoder = decoder;
    this.palettes = palettes;
  }

  async generateFromFile(
    file: File,
    request: GenerateFromFileOptions,
    signal?: AbortSignal,
  ): Promise<PatternDocument> {
    assertNotCancelled(signal);

    const palette = await this.palettes.loadDefault();
    const decoded = await this.decoder.decode(file, request.decodePolicy ?? DEFAULT_DECODE_POLICY);

    try {
      assertNotCancelled(signal);

      return await pureGenerationService.generate(
        {
          image: decoded.image,
          source: decoded.meta,
          palette,
          options: request.options,
        },
        signal,
      );
    } finally {
      decoded.release();
    }
  }
}
