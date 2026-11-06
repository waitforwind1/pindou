import { useCallback, useRef, useState } from 'react';

import { BrowserImageDecoder, DEFAULT_DECODE_POLICY } from '@/adapters/image';
import { AppError } from '@/core/errors/appError';
import { pureGenerationService } from '@/core/generation';
import { loadDefaultPalette } from '@/palettes';
import type { PatternDocument, PatternOptions, RgbaImage, SourceImageMeta } from '@/types';

export const P0_SIZE_PRESETS = [32, 48, 64] as const;

export interface WorkspaceState {
  projectName: string;
  image: RgbaImage | null;
  source: SourceImageMeta | null;
  previewUrl: string | null;
  document: PatternDocument | null;
  options: PatternOptions;
  status: 'idle' | 'decoding' | 'generating' | 'ready' | 'error';
  error: string | null;
  dirty: boolean;
  activeView: 'pattern' | 'beads' | 'source';
  boardOptions: { boardWidth: number; boardHeight: number };
}

export const defaultPatternOptions: PatternOptions = {
  targetWidth: 64,
  targetHeight: 64,
  fitMode: 'contain',
  samplingMode: 'nearest',
  alphaThreshold: 128,
  backgroundColor: [255, 255, 255],
  colorStrategy: {
    matcher: 'cie76',
    dithering: 'none',
  },
};

const initialState: WorkspaceState = {
  projectName: '未命名图纸',
  image: null,
  source: null,
  previewUrl: null,
  document: null,
  options: defaultPatternOptions,
  status: 'idle',
  error: null,
  dirty: false,
  activeView: 'pattern',
  boardOptions: { boardWidth: 29, boardHeight: 29 },
};

function errorMessage(error: unknown): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'FILE_TOO_LARGE':
        return '图片超过 20 MB，请换一张更小的图片。';
      case 'UNSUPPORTED_IMAGE':
        return '仅支持 PNG、JPEG 和 WebP 图片。';
      case 'SOURCE_LIMIT_EXCEEDED':
        return '图片像素超过 16,777,216，请先缩小原图。';
      case 'EMPTY_PATTERN':
        return '图片没有可用的有效像素，透明区域不会自动填充白色拼豆。';
      case 'PALETTE_INVALID':
        return 'Hama 色盘校验失败，当前无法生成图纸。';
      case 'CANCELLED':
        return '上一项处理已取消。';
      default:
        return '图片处理失败，请检查文件后重试。';
    }
  }

  return error instanceof Error ? error.message : '图片处理失败，请重试。';
}

function cloneImage(image: RgbaImage): RgbaImage {
  return {
    width: image.width,
    height: image.height,
    data: new Uint8ClampedArray(image.data),
  };
}

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const requestId = useRef(0);
  const decoder = useRef(new BrowserImageDecoder());

  const updateOptions = useCallback((patch: Partial<PatternOptions>) => {
    setState((current) => ({
      ...current,
      options: { ...current.options, ...patch },
      dirty: current.document !== null,
    }));
  }, []);

  const selectSize = useCallback(
    (size: number) => {
      updateOptions({ targetWidth: size, targetHeight: size });
    },
    [updateOptions],
  );

  const setDimensions = useCallback(
    (width: number, height: number) => {
      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < 8 ||
        height < 8 ||
        width > 128 ||
        height > 128 ||
        width * height > 16_384
      ) {
        setState((current) => ({
          ...current,
          error: '图纸尺寸必须为 8–128 格，且总格数不超过 16,384。',
        }));
        return;
      }
      updateOptions({ targetWidth: width, targetHeight: height });
    },
    [updateOptions],
  );

  const updateBoardOptions = useCallback((patch: Partial<WorkspaceState['boardOptions']>) => {
    setState((current) => {
      const next = { ...current.boardOptions, ...patch };
      if (
        !Number.isInteger(next.boardWidth) ||
        !Number.isInteger(next.boardHeight) ||
        next.boardWidth < 1 ||
        next.boardHeight < 1 ||
        next.boardWidth > 128 ||
        next.boardHeight > 128
      ) {
        return { ...current, error: '拼豆板尺寸必须为 1–128 格。' };
      }
      return { ...current, boardOptions: next, error: null };
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setState((current) => ({ ...current, status: 'decoding', error: null, dirty: false }));

    try {
      const decoded = await decoder.current.decode(file, DEFAULT_DECODE_POLICY);

      if (currentRequest !== requestId.current) {
        decoded.release();
        return;
      }

      const image = cloneImage(decoded.image);
      const source = decoded.meta;
      decoded.release();
      setState((current) => ({
        ...current,
        image,
        source,
        previewUrl: null,
        document: null,
        status: 'ready',
        error: null,
        dirty: false,
      }));
    } catch (error) {
      if (currentRequest === requestId.current) {
        setState((current) => ({ ...current, status: 'error', error: errorMessage(error) }));
      }
    }
  }, []);

  const generate = useCallback(async () => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    const snapshot = state;

    if (snapshot.image === null || snapshot.source === null) {
      setState((current) => ({ ...current, error: '请先上传一张图片。', status: 'error' }));
      return;
    }

    setState((current) => ({ ...current, status: 'generating', error: null }));

    try {
      const palette = await loadDefaultPalette();
      const result = await pureGenerationService.generate({
        image: cloneImage(snapshot.image as RgbaImage),
        source: snapshot.source as SourceImageMeta,
        palette,
        options: snapshot.options,
      });

      if (currentRequest !== requestId.current) {
        return;
      }

      setState((current) => ({
        ...current,
        document: result,
        status: 'ready',
        error: null,
        dirty: false,
      }));
    } catch (error) {
      if (currentRequest === requestId.current) {
        setState((current) => ({ ...current, status: 'error', error: errorMessage(error) }));
      }
    }
  }, [state]);

  const setView = useCallback((activeView: WorkspaceState['activeView']) => {
    setState((current) => ({ ...current, activeView }));
  }, []);

  const setProjectName = useCallback((projectName: string) => {
    setState((current) => ({ ...current, projectName }));
  }, []);

  return {
    state,
    updateOptions,
    selectSize,
    setDimensions,
    updateBoardOptions,
    uploadFile,
    generate,
    setView,
    setProjectName,
  };
}
