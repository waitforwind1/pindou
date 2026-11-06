import { describe, expect, it, vi } from 'vitest';

import { BrowserImageGenerationService } from '@/adapters/generation';
import { AppError } from '@/core/errors/appError';
import { pureGenerationService } from '@/core/generation';
import { loadDefaultPalette } from '@/palettes';
import type {
  DecodedImage,
  GenerationRequest,
  ImageDecoder,
  PaletteRepository,
  RgbaImage,
  SourceImageMeta,
} from '@/types';

function requestFor(image: RgbaImage): GenerationRequest {
  const source: SourceImageMeta = {
    sourceId: 'service-fixture',
    fileName: 'service-fixture.png',
    mimeType: 'image/png',
    byteSize: image.data.byteLength,
    width: image.width,
    height: image.height,
    transparentPixelRatio: 0,
    orientationApplied: true,
  };

  return {
    image,
    source,
    palette: {} as never,
    options: {
      targetWidth: 8,
      targetHeight: 8,
      fitMode: 'contain',
      samplingMode: 'nearest',
      alphaThreshold: 128,
      backgroundColor: [255, 255, 255],
      colorStrategy: { matcher: 'cie76', dithering: 'none' },
    },
  };
}

describe('unified pure generation service', () => {
  it('honours cancellation before doing expensive work', async () => {
    const image: RgbaImage = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([0, 0, 0, 255]),
    };
    const controller = new AbortController();
    controller.abort();
    let caught: unknown;

    try {
      await pureGenerationService.generate(requestFor(image), controller.signal);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(caught).toMatchObject({ code: 'CANCELLED' });
  });

  it('uses the same pure builder as direct callers', async () => {
    const image: RgbaImage = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255]),
    };
    const request = requestFor(image);
    request.palette = await loadDefaultPalette();
    const document = await pureGenerationService.generate(request);

    expect(document.pattern.cells).toHaveLength(64);
    expect(document.palette.ref.id).toBe('hama-midi-solid');
  });

  it('decodes a file, generates through the unified service, and releases resources', async () => {
    const palette = await loadDefaultPalette();
    const release = vi.fn();
    const image: RgbaImage = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255]),
    };
    const decoded: DecodedImage = {
      image,
      meta: {
        sourceId: 'fake-file',
        fileName: 'fake.png',
        mimeType: 'image/png',
        byteSize: 8,
        width: 2,
        height: 2,
        transparentPixelRatio: 0,
        orientationApplied: true,
      },
      release,
    };
    const decoder: ImageDecoder = {
      decode: vi.fn().mockResolvedValue(decoded),
    };
    const repository: PaletteRepository = {
      loadDefault: vi.fn().mockResolvedValue(palette),
      load: vi.fn().mockResolvedValue(palette),
    };
    const service = new BrowserImageGenerationService(decoder, repository);
    const file = new File([new Uint8Array(8)], 'fake.png', { type: 'image/png' });
    const document = await service.generateFromFile(file, {
      options: requestFor(image).options,
    });

    expect(decoder.decode).toHaveBeenCalledOnce();
    expect(document.pattern.cells).toHaveLength(64);
    expect(document.pattern.cells.every((cell) => cell !== null)).toBe(true);
    expect(release).toHaveBeenCalledOnce();
  });
});
