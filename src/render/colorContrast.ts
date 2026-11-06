import type { Rgb8 } from '@/types';

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(rgb: Rgb8): number {
  return (
    0.2126 * channelToLinear(rgb[0]) +
    0.7152 * channelToLinear(rgb[1]) +
    0.0722 * channelToLinear(rgb[2])
  );
}

export interface CodeTextColors {
  fill: string;
  stroke: string;
}

/** Choose high-contrast production text for an arbitrary bead chart colour. */
export function codeTextColors(rgb: Rgb8): CodeTextColors {
  if (relativeLuminance(rgb) > 0.42) {
    return {
      fill: '#1f1c19',
      stroke: 'rgba(255, 253, 248, 0.7)',
    };
  }

  return {
    fill: '#fffdf8',
    stroke: 'rgba(31, 28, 25, 0.42)',
  };
}
