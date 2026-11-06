import { useRef } from 'react';

interface UploadPanelProps {
  fileName: string | null;
  sourceSize: string | null;
  transparentRatio: number | null;
  onUpload: (file: File) => void;
}

export function UploadPanel({
  fileName,
  sourceSize,
  transparentRatio,
  onUpload,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="space-y-3">
      <div className="section-kicker">01 / 素材</div>
      <div
        className="upload-zone group"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file !== undefined) onUpload(file);
        }}
      >
        <div className="upload-mark">+</div>
        <div>
          <p className="font-medium text-ink">拖入图片，或选择本地文件</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">PNG / JPEG / WebP · 本地处理</p>
        </div>
        <button
          className="button-secondary mt-2"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          选择图片
        </button>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) onUpload(file);
            event.target.value = '';
          }}
        />
      </div>
      {fileName !== null && (
        <div className="file-meta">
          <span className="status-dot" />
          <span className="truncate">{fileName}</span>
          <span className="ml-auto shrink-0 text-ink-muted">{sourceSize}</span>
        </div>
      )}
      {transparentRatio !== null && transparentRatio > 0 && (
        <p className="notice-note">
          透明区域 {Math.round(transparentRatio * 100)}%，将保留为空位。
        </p>
      )}
    </section>
  );
}
