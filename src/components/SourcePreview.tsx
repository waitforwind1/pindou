import { useEffect, useRef } from 'react';

import { sourceImageData } from '@/render/patternRenderer';
import type { RgbaImage } from '@/types';

interface SourcePreviewProps {
  image: RgbaImage | null;
}

export function SourcePreview({ image }: SourcePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext('2d');
    if (context === null) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (image === null) return;

    const scale = Math.min(canvas.clientWidth / image.width, canvas.clientHeight / image.height);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * window.devicePixelRatio));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * window.devicePixelRatio));
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    context.imageSmoothingEnabled = false;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const x = (canvas.clientWidth - drawWidth) / 2;
    const y = (canvas.clientHeight - drawHeight) / 2;
    const bitmap = document.createElement('canvas');
    bitmap.width = image.width;
    bitmap.height = image.height;
    bitmap.getContext('2d')?.putImageData(sourceImageData(image), 0, 0);
    context.drawImage(bitmap, x, y, drawWidth, drawHeight);
  }, [image]);

  return <canvas ref={canvasRef} className="preview-canvas" aria-label="原图预览" />;
}
