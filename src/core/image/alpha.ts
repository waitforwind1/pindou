import type { Rgb8 } from '@/types';

export const P0_ALPHA_THRESHOLD = 128;

export function isTransparentAlpha(alpha: number, threshold = P0_ALPHA_THRESHOLD): boolean {
  return alpha < threshold;
}

/** Composite an sRGB colour over an opaque background using the documented formula. */
export function compositeOnBackground(rgb: Rgb8, alpha: number, background: Rgb8): Rgb8 {
  const opacity = alpha / 255;
  const inverseOpacity = 1 - opacity;

  return [
    Math.round(rgb[0] * opacity + background[0] * inverseOpacity),
    Math.round(rgb[1] * opacity + background[1] * inverseOpacity),
    Math.round(rgb[2] * opacity + background[2] * inverseOpacity),
  ];
}

export function compositeOnWhite(rgb: Rgb8, alpha: number): Rgb8 {
  return compositeOnBackground(rgb, alpha, [255, 255, 255]);
}
