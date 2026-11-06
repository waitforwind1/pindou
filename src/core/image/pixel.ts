import type { RgbaImage, Rgb8 } from '@/types';

export interface RgbaPixel {
  rgb: Rgb8;
  alpha: number;
}

/** Validate an RGBA buffer once before a full-image operation. */
export function assertRgbaImage(image: RgbaImage): void {
  if (!Number.isInteger(image.width) || image.width <= 0) {
    throw new RangeError('RgbaImage width must be a positive integer.');
  }

  if (!Number.isInteger(image.height) || image.height <= 0) {
    throw new RangeError('RgbaImage height must be a positive integer.');
  }

  const expectedLength = image.width * image.height * 4;

  if (image.data.length !== expectedLength) {
    throw new RangeError(
      `RGBA buffer length ${image.data.length} does not match ${image.width}x${image.height}.`,
    );
  }
}

export function readRgbaPixel(image: RgbaImage, x: number, y: number): RgbaPixel {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= image.width ||
    y >= image.height
  ) {
    throw new RangeError(`Pixel coordinate (${x}, ${y}) is outside the image.`);
  }

  const offset = (y * image.width + x) * 4;
  const red = image.data[offset];
  const green = image.data[offset + 1];
  const blue = image.data[offset + 2];
  const alpha = image.data[offset + 3];

  if (red === undefined || green === undefined || blue === undefined || alpha === undefined) {
    throw new RangeError('RGBA image buffer is shorter than its declared dimensions.');
  }

  return {
    rgb: [red, green, blue],
    alpha,
  };
}
