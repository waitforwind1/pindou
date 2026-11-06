import { expect, test } from '@playwright/test';

test('browser decoder reads supported formats, alpha and limits', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const decoderModulePath = '/src/adapters/image/browserImageDecoder.ts';
    const { BrowserImageDecoder } = await import(decoderModulePath);
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const policy = {
      maxFileBytes: 20 * 1024 * 1024,
      maxSourcePixels: 16_777_216,
      allowedMimeTypes,
    };

    async function makeFile(type: string, transparent = false): Promise<File> {
      const canvas = new OffscreenCanvas(2, 2);
      const context = canvas.getContext('2d');

      if (context === null) {
        throw new Error('Test canvas is unavailable.');
      }

      context.fillStyle = 'rgb(255, 0, 0)';
      context.fillRect(0, 0, 1, 1);
      context.fillStyle = 'rgb(0, 255, 0)';
      context.fillRect(1, 0, 1, 1);
      context.fillStyle = 'rgb(0, 0, 255)';
      context.fillRect(1, 1, 1, 1);

      if (!transparent) {
        context.fillStyle = 'rgb(255, 255, 255)';
        context.fillRect(0, 1, 1, 1);
      }

      const blob = await canvas.convertToBlob({ type });
      const extension = type.split('/')[1] ?? 'bin';
      return new File([blob], `fixture.${extension}`, { type, lastModified: 1 });
    }

    const decoder = new BrowserImageDecoder();
    const formats: Array<{ mimeType: string; width: number; height: number; alpha: number }> = [];

    for (const mimeType of allowedMimeTypes) {
      const decoded = await decoder.decode(await makeFile(mimeType), policy);
      formats.push({
        mimeType: decoded.meta.mimeType,
        width: decoded.image.width,
        height: decoded.image.height,
        alpha: decoded.image.data[3] ?? -1,
      });
      decoded.release();
      decoded.release();
    }

    const transparent = await decoder.decode(await makeFile('image/png', true), policy);
    const transparentSummary = {
      width: transparent.image.width,
      height: transparent.image.height,
      dataLength: transparent.image.data.length,
      transparentPixelRatio: transparent.meta.transparentPixelRatio,
      orientationApplied: transparent.meta.orientationApplied,
      red: Array.from(transparent.image.data.slice(0, 4)),
      emptyAlpha: transparent.image.data[11],
    };
    transparent.release();

    let limitError: string | null = null;

    try {
      await decoder.decode(await makeFile('image/png'), { ...policy, maxSourcePixels: 3 });
    } catch (error) {
      limitError = (error as { code?: string }).code ?? null;
    }

    const corrupt = new File([new Uint8Array([1, 2, 3, 4])], 'corrupt.png', {
      type: 'image/png',
    });
    let corruptError: string | null = null;

    try {
      await decoder.decode(corrupt, policy);
    } catch (error) {
      corruptError = (error as { code?: string }).code ?? null;
    }

    return { formats, transparentSummary, limitError, corruptError };
  });

  expect(result.formats).toEqual([
    { mimeType: 'image/png', width: 2, height: 2, alpha: 255 },
    { mimeType: 'image/jpeg', width: 2, height: 2, alpha: 255 },
    { mimeType: 'image/webp', width: 2, height: 2, alpha: 255 },
  ]);
  expect(result.transparentSummary).toMatchObject({
    width: 2,
    height: 2,
    dataLength: 16,
    transparentPixelRatio: 0.25,
    orientationApplied: true,
    emptyAlpha: 0,
  });
  expect(result.transparentSummary.red).toEqual([255, 0, 0, 255]);
  expect(result.limitError).toBe('SOURCE_LIMIT_EXCEEDED');
  expect(result.corruptError).toBe('IMAGE_DECODE_FAILED');
});
