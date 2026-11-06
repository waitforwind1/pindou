import { canonicalJson } from '@/core/serialization/canonicalJson';
import type { GenerationRequest, Palette, PatternOptions, SourceImageMeta } from '@/types';

export const PATTERN_ENGINE_VERSION = 'pattern-engine-1.0.0';
export const PATTERN_SAMPLING_VERSION = 'contain-sampler-1.0.0';

export interface GenerationKeyInput {
  source: SourceImageMeta;
  palette: Palette;
  options: PatternOptions;
}

function fnv1a64Hex(text: string): string {
  let hash = 0xcbf29ce484222325n;

  for (let index = 0; index < text.length; index += 1) {
    const codeUnit = text.charCodeAt(index);

    // Stable UTF-16LE byte order, independent of browser TextEncoder details.
    for (const byte of [codeUnit & 0xff, codeUnit >>> 8]) {
      hash ^= BigInt(byte);
      hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
    }
  }

  return hash.toString(16).padStart(16, '0');
}

/** Stable cache/remap identity, excluding volatile metadata such as createdAt. */
export function createGenerationKey(request: GenerationKeyInput | GenerationRequest): string {
  const material = canonicalJson({
    engineVersion: PATTERN_ENGINE_VERSION,
    samplingVersion: PATTERN_SAMPLING_VERSION,
    source: {
      sourceId: request.source.sourceId,
      width: request.source.width,
      height: request.source.height,
    },
    palette: {
      id: request.palette.ref.id,
      version: request.palette.ref.version,
      checksum: request.palette.ref.checksum,
    },
    options: {
      targetWidth: request.options.targetWidth,
      targetHeight: request.options.targetHeight,
      fitMode: request.options.fitMode,
      samplingMode: request.options.samplingMode,
      alphaThreshold: request.options.alphaThreshold,
      backgroundColor: [
        request.options.backgroundColor[0],
        request.options.backgroundColor[1],
        request.options.backgroundColor[2],
      ],
      matcher: request.options.colorStrategy.matcher,
      dithering: request.options.colorStrategy.dithering,
    },
  });

  return `gen-v1-${fnv1a64Hex(material)}`;
}
