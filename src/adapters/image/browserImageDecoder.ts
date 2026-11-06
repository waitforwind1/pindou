import { AppError } from '@/core/errors/appError';
import type { DecodePolicy, DecodedImage, ImageDecoder, SourceImageMeta } from '@/types';

export const DEFAULT_DECODE_POLICY: Readonly<DecodePolicy> = Object.freeze({
  maxFileBytes: 20 * 1024 * 1024,
  maxSourcePixels: 16_777_216,
  allowedMimeTypes: Object.freeze(['image/png', 'image/jpeg', 'image/webp']),
});

interface DecodedSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
}

interface DrawingCanvas {
  surface: OffscreenCanvas | HTMLCanvasElement;
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
}

function sourceIdFor(file: File): string {
  return `upload:${file.name}:${file.size}:${file.lastModified}`;
}

function assertPolicy(policy: DecodePolicy): void {
  if (!Number.isInteger(policy.maxFileBytes) || policy.maxFileBytes <= 0) {
    throw new AppError('IMAGE_DECODE_FAILED', 'Decode policy has an invalid file-size limit.');
  }

  if (!Number.isInteger(policy.maxSourcePixels) || policy.maxSourcePixels <= 0) {
    throw new AppError('IMAGE_DECODE_FAILED', 'Decode policy has an invalid pixel limit.');
  }
}

function createDrawingCanvas(width: number, height: number): DrawingCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    const surface = new OffscreenCanvas(width, height);
    const context = surface.getContext('2d', { willReadFrequently: true });

    if (context !== null) {
      return { surface, context };
    }
  }

  if (typeof document !== 'undefined') {
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    const context = surface.getContext('2d', { willReadFrequently: true });

    if (context !== null) {
      return { surface, context };
    }
  }

  throw new AppError('IMAGE_DECODE_FAILED', 'A 2D canvas is unavailable for image decoding.');
}

async function decodeWithImageElement(file: File): Promise<DecodedSource> {
  if (typeof Image === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new AppError('IMAGE_DECODE_FAILED', 'No browser image decoder is available.');
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('HTMLImageElement decode failed.'));
      image.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => {
        image.src = '';
      },
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function decodeSource(file: File): Promise<DecodedSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        colorSpaceConversion: 'default',
        premultiplyAlpha: 'none',
      });

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the same-size HTMLImageElement + Canvas path.
    }
  }

  return decodeWithImageElement(file);
}

function extractPixels(source: DecodedSource): {
  data: Uint8ClampedArray;
  transparentPixelRatio: number;
} {
  const canvas = createDrawingCanvas(source.width, source.height);
  canvas.context.imageSmoothingEnabled = false;
  canvas.context.drawImage(source.source, 0, 0);
  const imageData = canvas.context.getImageData(0, 0, source.width, source.height);
  let transparentPixels = 0;

  for (let offset = 3; offset < imageData.data.length; offset += 4) {
    if ((imageData.data[offset] ?? 0) < 128) {
      transparentPixels += 1;
    }
  }

  return {
    data: imageData.data,
    transparentPixelRatio: transparentPixels / (source.width * source.height),
  };
}

/** Browser-only decoder. The returned pixels are non-premultiplied RGBA bytes. */
export class BrowserImageDecoder implements ImageDecoder {
  async decode(file: File, policy: DecodePolicy = DEFAULT_DECODE_POLICY): Promise<DecodedImage> {
    assertPolicy(policy);

    if (file.size > policy.maxFileBytes) {
      throw new AppError('FILE_TOO_LARGE', 'Image file exceeds the configured size limit.', {
        context: { byteSize: file.size, maxFileBytes: policy.maxFileBytes },
      });
    }

    if (!policy.allowedMimeTypes.includes(file.type)) {
      throw new AppError('UNSUPPORTED_IMAGE', 'Image MIME type is not supported.', {
        context: { mimeType: file.type, allowedMimeTypes: policy.allowedMimeTypes },
      });
    }

    let decodedSource: DecodedSource;

    try {
      decodedSource = await decodeSource(file);
    } catch (error) {
      throw new AppError('IMAGE_DECODE_FAILED', 'The image could not be decoded.', {
        cause: error,
      });
    }

    if (
      !Number.isInteger(decodedSource.width) ||
      !Number.isInteger(decodedSource.height) ||
      decodedSource.width <= 0 ||
      decodedSource.height <= 0
    ) {
      decodedSource.release();
      throw new AppError('IMAGE_DECODE_FAILED', 'The decoded image has invalid dimensions.');
    }

    if (decodedSource.width * decodedSource.height > policy.maxSourcePixels) {
      decodedSource.release();
      throw new AppError(
        'SOURCE_LIMIT_EXCEEDED',
        'Image pixel count exceeds the supported limit.',
        {
          context: {
            width: decodedSource.width,
            height: decodedSource.height,
            maxSourcePixels: policy.maxSourcePixels,
          },
        },
      );
    }

    let pixels: ReturnType<typeof extractPixels>;

    try {
      pixels = extractPixels(decodedSource);
    } catch (error) {
      decodedSource.release();

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('IMAGE_DECODE_FAILED', 'RGBA pixels could not be read.', { cause: error });
    }

    const meta: SourceImageMeta = Object.freeze({
      sourceId: sourceIdFor(file),
      fileName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      width: decodedSource.width,
      height: decodedSource.height,
      transparentPixelRatio: pixels.transparentPixelRatio,
      orientationApplied: true,
    });
    let released = false;

    return Object.freeze({
      image: Object.freeze({
        width: decodedSource.width,
        height: decodedSource.height,
        data: pixels.data,
      }),
      meta,
      release: () => {
        if (!released) {
          released = true;
          decodedSource.release();
        }
      },
    });
  }
}
