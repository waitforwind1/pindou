import { expect, test } from '@playwright/test';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('renders the BeadCraft workbench shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'BeadCraft Studio' })).toBeVisible();
  await expect(page.getByText('把一张图，变成可制作的图纸')).toBeVisible();
  await expect(page.locator('#palette-brand')).toHaveValue('HAMA · MIDI SOLID');
  await expect(page.getByRole('button', { name: '生成拼豆图纸' })).toBeDisabled();
});

test('uploads a real image and generates a pattern from the core pipeline', async ({ page }) => {
  await page.goto('/');

  await page.locator('input[type=file]').setInputFiles({
    name: 'fixture.png',
    mimeType: 'image/png',
    buffer: onePixelPng,
  });

  await expect(page.getByText('fixture.png')).toBeVisible();
  const generate = page.getByRole('button', { name: '生成拼豆图纸' });
  await expect(generate).toBeEnabled();
  await generate.click();

  await expect(page.getByRole('heading', { name: '64 × 64 图纸' })).toBeVisible();
  await expect(page.getByText('总拼豆')).toBeVisible();
  await expect(page.getByText('HAMA MIDI SOLID · 2026')).toBeVisible();
  const exportButton = page.getByRole('button', { name: '导出 PNG' });
  await expect(exportButton).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/beadcraft-64x64-hama-midi-solid\.png/);
});

test('keeps wheel zoom inside the pattern canvas', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'fixture.png',
    mimeType: 'image/png',
    buffer: onePixelPng,
  });
  await page.getByRole('button', { name: '生成拼豆图纸' }).click();
  const canvasFrame = page.locator('.pattern-canvas-wrap');
  await expect(canvasFrame).toBeVisible();
  const box = await canvasFrame.boundingBox();
  if (box === null) throw new Error('Pattern canvas frame is not visible.');
  const initialScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -100);
  await expect(page.locator('.canvas-toolbar span')).toHaveText('110%');
  expect(await page.evaluate(() => window.scrollY)).toBe(initialScrollY);
});
