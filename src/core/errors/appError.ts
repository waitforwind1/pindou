import type { AppErrorCode } from '@/types';

export interface AppErrorOptions {
  context?: Readonly<Record<string, unknown>>;
  cause?: unknown;
}

/** Serializable domain error boundary. UI maps codes to user-facing copy. */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.context = options.context ?? {};
  }
}
