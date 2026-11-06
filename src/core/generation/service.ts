import { AppError } from '@/core/errors/appError';
import { buildPattern } from '@/core/pattern/builder';
import type { GenerationRequest, GenerationService, PatternDocument } from '@/types';

function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new AppError('CANCELLED', 'Generation was cancelled.');
  }
}

/** Main-thread P0 implementation of the replaceable GenerationService contract. */
export class PureGenerationService implements GenerationService {
  async generate(request: GenerationRequest, signal?: AbortSignal): Promise<PatternDocument> {
    throwIfCancelled(signal);
    const document = buildPattern(request);
    throwIfCancelled(signal);
    return document;
  }
}

export const pureGenerationService = new PureGenerationService();
