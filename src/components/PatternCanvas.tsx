import { useEffect, useRef, useState } from 'react';

import { drawBeadScene, drawPatternScene } from '@/render/patternRenderer';
import { computeViewportGeometry, zoomAroundPoint, type ViewportGeometry } from '@/render/viewport';
import type { PatternDocument } from '@/types';

interface PatternCanvasProps {
  document: PatternDocument | null;
  view: 'pattern' | 'beads';
  onZoomChange?: (zoom: number) => void;
}

export function PatternCanvas({ document, view, onZoomChange }: PatternCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [geometry, setGeometry] = useState<ViewportGeometry | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    const resize = () => {
      setGeometry(
        computeViewportGeometry(
          document?.pattern.width ?? 64,
          document?.pattern.height ?? 64,
          { width: Math.max(1, frame.clientWidth), height: Math.max(1, frame.clientHeight) },
          { top: 38, right: 24, bottom: 24, left: 38 },
          zoom,
          pan.x,
          pan.y,
        ),
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [document, pan.x, pan.y, zoom]);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const nextZoom = Math.min(8, Math.max(0.5, zoom + (event.deltaY > 0 ? -0.1 : 0.1)));
      const result = zoomAroundPoint(
        document?.pattern.width ?? 64,
        document?.pattern.height ?? 64,
        { width: Math.max(1, frame.clientWidth), height: Math.max(1, frame.clientHeight) },
        { top: 38, right: 24, bottom: 24, left: 38 },
        zoom,
        pan.x,
        pan.y,
        point,
        nextZoom,
      );
      setZoom(result.zoom);
      setPan({ x: result.panX, y: result.panY });
      onZoomChange?.(result.zoom);
    };

    frame.addEventListener('wheel', handleWheel, { passive: false });
    return () => frame.removeEventListener('wheel', handleWheel);
  }, [document, onZoomChange, pan.x, pan.y, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || geometry === null) return;
    const context = canvas.getContext('2d');
    if (context === null) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    if (document === null) return;
    if (view === 'beads') {
      drawBeadScene(context, document, geometry);
    } else {
      drawPatternScene(context, document, geometry, {
        showCodes: true,
        showGrid: true,
        showRulers: true,
        majorGridEvery: 5,
      });
    }
  }, [document, geometry, view]);

  return (
    <div ref={frameRef} className="pattern-canvas-wrap">
      <canvas ref={canvasRef} className="pattern-canvas" aria-label="拼豆图纸预览" />
      {document === null && (
        <div className="canvas-empty">
          <div className="canvas-empty-grid" />
          <p className="font-display text-2xl font-semibold">把一张图，变成可制作的图纸</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">
            上传图片后，网格、色号和材料数量会在这里统一生成。
          </p>
        </div>
      )}
      <div className="canvas-toolbar">
        <button
          type="button"
          title="缩小"
          onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          title="放大"
          onClick={() => setZoom((value) => Math.min(8, value + 0.25))}
        >
          +
        </button>
      </div>
    </div>
  );
}
