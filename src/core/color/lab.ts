import type { Lab, Rgb8 } from '@/types';

const D65_X = 0.95047;
const D65_Y = 1;
const D65_Z = 1.08883;
const DELTA = 6 / 29;
const DELTA_CUBED = DELTA ** 3;
const KAPPA = 1 / (3 * DELTA ** 2);

/** Convert one 0-255 sRGB channel to linear-light RGB. */
export function srgbChannelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Convert a linear-light [0,1] channel back to a rounded 0-255 sRGB byte. */
export function linearToSrgbChannel(channel: number): number {
  const value = Math.min(1, Math.max(0, channel));
  const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;

  return Math.round(encoded * 255);
}

function labPivot(value: number): number {
  return value > DELTA_CUBED ? Math.cbrt(value) : KAPPA * value + 4 / 29;
}

/**
 * Convert an sRGB colour to CIELAB using the frozen D65 matrix and white point
 * documented in `docs/algorithm-design.md`.
 */
export function srgbToLab(rgb: Rgb8): Lab {
  const red = srgbChannelToLinear(rgb[0]);
  const green = srgbChannelToLinear(rgb[1]);
  const blue = srgbChannelToLinear(rgb[2]);

  const x = 0.4124564 * red + 0.3575761 * green + 0.1804375 * blue;
  const y = 0.2126729 * red + 0.7151522 * green + 0.072175 * blue;
  const z = 0.0193339 * red + 0.119192 * green + 0.9503041 * blue;

  const fx = labPivot(x / D65_X);
  const fy = labPivot(y / D65_Y);
  const fz = labPivot(z / D65_Z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
