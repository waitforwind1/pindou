import { splitPatternIntoBoards } from '@/core/pattern';
import type { BoardOptions, PatternDocument } from '@/types';

interface BoardPanelProps {
  document: PatternDocument | null;
  options: BoardOptions;
  disabled: boolean;
  onChange: (patch: Partial<BoardOptions>) => void;
  onExport: () => void;
}

export function BoardPanel({ document, options, disabled, onChange, onExport }: BoardPanelProps) {
  const layout = document === null ? null : splitPatternIntoBoards(document, options);

  return (
    <section className="board-panel">
      <div className="section-kicker">制作分板</div>
      <div className="board-fields">
        <label>
          板宽
          <input
            aria-label="拼豆板宽度"
            type="number"
            min={1}
            max={128}
            value={options.boardWidth}
            disabled={disabled}
            onChange={(event) => onChange({ boardWidth: Number(event.target.value) })}
          />
        </label>
        <span>×</span>
        <label>
          板高
          <input
            aria-label="拼豆板高度"
            type="number"
            min={1}
            max={128}
            value={options.boardHeight}
            disabled={disabled}
            onChange={(event) => onChange({ boardHeight: Number(event.target.value) })}
          />
        </label>
      </div>
      {layout === null ? (
        <p className="panel-muted">生成图纸后设置实体拼豆板尺寸。</p>
      ) : (
        <>
          <div className="board-summary">
            <strong>
              {layout.boardColumns} × {layout.boardRows} = {layout.boards.length} 块
            </strong>
            <span>
              {layout.totalBeadCount.toLocaleString()} / {layout.totalBeadCount.toLocaleString()} 颗
            </span>
          </div>
          <div className="board-list">
            {layout.boards.map((board) => (
              <div className="board-row" key={board.boardNumber}>
                <strong>{board.boardNumber}</strong>
                <span>
                  列 {board.globalX + 1}-{board.globalX + board.width} · 行 {board.globalY + 1}-
                  {board.globalY + board.height}
                </span>
                <em>{board.beadCount} 颗</em>
              </div>
            ))}
          </div>
          <button className="button-secondary board-export" type="button" onClick={onExport}>
            导出分板 PNG
          </button>
        </>
      )}
    </section>
  );
}
