import { describe, expect, it } from 'vitest';

import { BrowserImageDecoder } from '@/adapters/image';
import { AppError } from '@/core/errors/appError';
import type { DecodePolicy } from '@/types';

const policy: DecodePolicy = {
  maxFileBytes: 1024,
  maxSourcePixels: 16_777_216,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
};

describe('browser image decoder preflight', () => {
  it('rejects files above the byte limit before attempting to decode', async () => {
    const file = new File([new Uint8Array(2048)], 'large.png', { type: 'image/png' });
    let caught: unknown;

    try {
      await new BrowserImageDecoder().decode(file, policy);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(caught).toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('rejects unsupported MIME types without guessing from the extension', async () => {
    const file = new File(['plain text'], 'fake.png', { type: 'text/plain' });
    let caught: unknown;

    try {
      await new BrowserImageDecoder().decode(file, policy);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(caught).toMatchObject({ code: 'UNSUPPORTED_IMAGE' });
  });

  it('reports a decode failure when no browser decoder exists in the test runtime', async () => {
    const file = new File([new Uint8Array(8)], 'pixel.png', { type: 'image/png' });
    let caught: unknown;

    try {
      await new BrowserImageDecoder().decode(file, policy);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(caught).toMatchObject({ code: 'IMAGE_DECODE_FAILED' });
  });
});
