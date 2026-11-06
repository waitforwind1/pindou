import type { Lab } from '@/types';

/** Squared CIE76 distance. The square root is not needed for ordering. */
export function deltaE76Squared(left: Lab, right: Lab): number {
  const deltaLightness = left[0] - right[0];
  const deltaA = left[1] - right[1];
  const deltaB = left[2] - right[2];

  return deltaLightness * deltaLightness + deltaA * deltaA + deltaB * deltaB;
}

export function deltaE76(left: Lab, right: Lab): number {
  return Math.sqrt(deltaE76Squared(left, right));
}
