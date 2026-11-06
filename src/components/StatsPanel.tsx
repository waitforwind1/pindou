import { computeColorStatistics } from '@/core/pattern';
import type { PatternDocument } from '@/types';

interface StatsPanelProps {
  document: PatternDocument | null;
  onExportMaterials: () => void;
}

export function StatsPanel({ document, onExportMaterials }: StatsPanelProps) {
  const statistics = document === null ? null : computeColorStatistics(document);

  return (
    <section className="stats-panel">
      <div className="section-kicker">材料清单</div>
      {statistics === null ? (
        <div className="empty-list">生成图纸后，这里会显示实际用量。</div>
      ) : (
        <>
          <button
            className="button-secondary material-export"
            type="button"
            onClick={onExportMaterials}
          >
            下载材料清单 CSV
          </button>
          <div className="stats-hero">
            <div>
              <span>总拼豆</span>
              <strong>{statistics.beadCount.toLocaleString()}</strong>
            </div>
            <div>
              <span>空位</span>
              <strong>{statistics.emptyCount.toLocaleString()}</strong>
            </div>
            <div>
              <span>用色</span>
              <strong>{statistics.usedColorCount}</strong>
            </div>
          </div>
          <div className="material-list">
            {statistics.colors.map((color) => (
              <div className="material-row" key={color.code}>
                <span
                  className="swatch"
                  style={{ backgroundColor: `rgb(${color.displayRgb.join(',')})` }}
                />
                <span className="material-code">{color.code}</span>
                <span className="material-name">{color.officialName}</span>
                <strong>{color.count}</strong>
              </div>
            ))}
          </div>
          <p className="source-footnote">HAMA MIDI SOLID · 2026 · 参考 RGB 来自官方色卡派生采样</p>
        </>
      )}
    </section>
  );
}
