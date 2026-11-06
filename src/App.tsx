import { useState } from 'react';

import { downloadBoardsPng, downloadMaterialCsv, downloadBlob, exportPatternPng } from '@/export';
import { BoardPanel } from '@/components/BoardPanel';
import { ParameterPanel } from '@/components/ParameterPanel';
import { PatternCanvas } from '@/components/PatternCanvas';
import { SourcePreview } from '@/components/SourcePreview';
import { StatsPanel } from '@/components/StatsPanel';
import { UploadPanel } from '@/components/UploadPanel';
import { useWorkspace } from '@/store/workspaceStore';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status, dirty }: { status: string; dirty: boolean }) {
  if (status === 'decoding' || status === 'generating') {
    return (
      <span className="status-badge is-busy">
        <span className="spinner" />
        {status === 'decoding' ? '读取图片' : '生成图纸'}
      </span>
    );
  }
  if (dirty)
    return (
      <span className="status-badge is-dirty">
        <span className="status-dot" />
        参数已改变
      </span>
    );
  if (status === 'ready')
    return (
      <span className="status-badge">
        <span className="status-dot" />
        本地工作区
      </span>
    );
  return <span className="status-badge">未开始</span>;
}

export default function App() {
  const {
    state,
    updateOptions,
    selectSize,
    setDimensions,
    updateBoardOptions,
    uploadFile,
    generate,
    setView,
    setProjectName,
  } = useWorkspace();
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const canGenerate = state.image !== null && state.source !== null;
  const isBusy = state.status === 'decoding' || state.status === 'generating';
  const handleExport = async () => {
    if (state.document === null || state.dirty) {
      setNotice('请先重新生成图纸，再导出当前版本。');
      return;
    }
    setExporting(true);
    setNotice(null);
    try {
      const result = await exportPatternPng(state.document);
      downloadBlob(result.blob, result.fileName);
      setNotice(`已下载 ${result.fileName}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '导出失败，请重试。');
    } finally {
      setExporting(false);
    }
  };

  const handleMaterialsExport = () => {
    if (state.document === null || state.dirty) {
      setNotice('请先重新生成图纸，再导出材料清单。');
      return;
    }
    downloadMaterialCsv(state.document);
    setNotice('材料清单 CSV 已下载。');
  };

  const handleBoardsExport = async () => {
    if (state.document === null || state.dirty) {
      setNotice('请先重新生成图纸，再导出分板。');
      return;
    }
    setExporting(true);
    try {
      const result = await downloadBoardsPng(state.document, state.boardOptions);
      setNotice(`已下载 ${result.fileName}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '分板导出失败，请重试。');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-symbol">B</div>
          <div>
            <h1>BeadCraft Studio</h1>
            <p>实体拼豆图纸工作台</p>
          </div>
        </div>
        <div className="project-title">
          <input
            aria-label="项目名称"
            value={state.projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
          <StatusBadge status={state.status} dirty={state.dirty} />
        </div>
        <div className="top-actions">
          <button
            className="button-primary"
            type="button"
            disabled={exporting || state.document === null}
            onClick={handleExport}
          >
            {exporting ? '导出中…' : '导出 PNG'}
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="left-rail">
          <UploadPanel
            fileName={state.source?.fileName ?? null}
            sourceSize={
              state.source === null
                ? null
                : `${state.source.width} × ${state.source.height} · ${formatBytes(state.source.byteSize)}`
            }
            transparentRatio={state.source?.transparentPixelRatio ?? null}
            onUpload={(file) => void uploadFile(file)}
          />
          <ParameterPanel
            options={state.options}
            onSize={selectSize}
            onDimensions={setDimensions}
            onUpdate={updateOptions}
            disabled={isBusy}
          />
          <button
            className="generate-button"
            type="button"
            disabled={!canGenerate || isBusy}
            onClick={() => void generate()}
          >
            <span>
              {isBusy ? '正在处理…' : state.document === null ? '生成拼豆图纸' : '重新生成图纸'}
            </span>
            <span className="button-arrow">↗</span>
          </button>
          {state.error !== null && <div className="error-box">{state.error}</div>}
        </aside>

        <section className="main-stage">
          <div className="stage-head">
            <div>
              <div className="section-kicker">工作区 / 图纸画布</div>
              <h2>
                {state.document === null
                  ? '等待一张图片'
                  : `${state.document.pattern.width} × ${state.document.pattern.height} 图纸`}
              </h2>
            </div>
            <div className="view-switcher">
              <button
                className={state.activeView === 'source' ? 'active' : ''}
                type="button"
                disabled={state.image === null}
                onClick={() => setView('source')}
              >
                原图
              </button>
              <button
                className={state.activeView === 'pattern' ? 'active' : ''}
                type="button"
                disabled={state.document === null}
                onClick={() => setView('pattern')}
              >
                图纸
              </button>
              <button
                className={state.activeView === 'beads' ? 'active' : ''}
                type="button"
                disabled={state.document === null}
                onClick={() => setView('beads')}
              >
                实体豆
              </button>
            </div>
          </div>
          <div className="stage-canvas">
            {state.activeView === 'source' ? (
              <SourcePreview image={state.image} />
            ) : (
              <PatternCanvas document={state.document} view={state.activeView} />
            )}
          </div>
          <div className="stage-footer">
            <span>滚轮缩放 · 画布保持比例 · 空位以斜线表示</span>
            <span>
              {state.document === null
                ? 'HAMA MIDI SOLID · 2026'
                : `版本 ${state.document.pattern.metadata.stateVersion} · ${state.document.palette.colors.length} 色`}
            </span>
          </div>
        </section>

        <aside className="right-rail">
          <StatsPanel document={state.document} onExportMaterials={handleMaterialsExport} />
          <BoardPanel
            document={state.document}
            options={state.boardOptions}
            disabled={isBusy || state.document === null}
            onChange={updateBoardOptions}
            onExport={() => void handleBoardsExport()}
          />
          <div className="dimension-note">
            <div className="section-kicker">实体估算</div>
            <div className="dimension-value">
              {state.options.targetWidth * 5} × {state.options.targetHeight * 5}
              <span> mm</span>
            </div>
            <p>按 Hama Midi 中心距约 5 mm 估算；不代表精确打印尺寸。</p>
          </div>
        </aside>
      </div>

      {notice !== null && (
        <button className="toast" type="button" onClick={() => setNotice(null)}>
          {notice}
        </button>
      )}
    </main>
  );
}
