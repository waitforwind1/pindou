import type { MatcherId, PatternOptions, SamplingMode } from '@/types';
import { P0_SIZE_PRESETS } from '@/store/workspaceStore';

interface ParameterPanelProps {
  options: PatternOptions;
  onSize: (size: number) => void;
  onDimensions: (width: number, height: number) => void;
  onUpdate: (patch: Partial<PatternOptions>) => void;
  disabled: boolean;
}

export function ParameterPanel({
  options,
  onSize,
  onDimensions,
  onUpdate,
  disabled,
}: ParameterPanelProps) {
  return (
    <section className="space-y-4 border-t border-ink/10 pt-5">
      <div className="section-kicker">02 / 参数</div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="field-label">图纸尺寸</label>
          <span className="field-value">
            {options.targetWidth} × {options.targetHeight} 格
          </span>
        </div>
        <div className="segmented-control">
          {P0_SIZE_PRESETS.map((size) => (
            <button
              key={size}
              className={
                options.targetWidth === size && options.targetHeight === size ? 'active' : ''
              }
              type="button"
              disabled={disabled}
              onClick={() => onSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
        <div className="dimension-inputs">
          <label>
            宽
            <input
              aria-label="图纸宽度"
              type="number"
              min={8}
              max={128}
              value={options.targetWidth}
              disabled={disabled}
              onChange={(event) => onDimensions(Number(event.target.value), options.targetHeight)}
            />
          </label>
          <span>×</span>
          <label>
            高
            <input
              aria-label="图纸高度"
              type="number"
              min={8}
              max={128}
              value={options.targetHeight}
              disabled={disabled}
              onChange={(event) => onDimensions(options.targetWidth, Number(event.target.value))}
            />
          </label>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-ink-muted">支持 8–128 格，最多 16,384 格。</p>
      </div>
      <div>
        <label className="field-label" htmlFor="palette-brand">
          品牌与色盘
        </label>
        <select
          id="palette-brand"
          className="field-control mt-2"
          value="HAMA · MIDI SOLID"
          disabled
        >
          <option>HAMA · MIDI SOLID</option>
        </select>
        <p className="mt-2 text-[11px] leading-4 text-ink-muted">
          2026 版本 · 67 色 · 官方色号可追溯
        </p>
      </div>
      <div>
        <label className="field-label" htmlFor="sampling-mode">
          采样策略
        </label>
        <select
          id="sampling-mode"
          className="field-control mt-2"
          value={options.samplingMode}
          disabled={disabled}
          onChange={(event) => onUpdate({ samplingMode: event.target.value as SamplingMode })}
        >
          <option value="nearest">最近邻 · 像素画</option>
          <option value="area">区域平均 · 照片模式</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="matcher-mode">
          颜色匹配
        </label>
        <select
          id="matcher-mode"
          className="field-control mt-2"
          value={options.colorStrategy.matcher}
          disabled={disabled}
          onChange={(event) =>
            onUpdate({
              colorStrategy: {
                ...options.colorStrategy,
                matcher: event.target.value as MatcherId,
              },
            })
          }
        >
          <option value="cie76">CIELAB ΔE76 · 推荐</option>
          <option value="rgb-euclidean">RGB 欧氏距离</option>
        </select>
      </div>
      <label className="toggle-row">
        <span>
          <span className="field-label">Floyd–Steinberg 抖动</span>
          <span className="mt-1 block text-[11px] text-ink-muted">
            增加颜色层次，也可能增加采购种类
          </span>
        </span>
        <input
          type="checkbox"
          checked={options.colorStrategy.dithering === 'floyd-steinberg'}
          disabled={disabled}
          onChange={(event) =>
            onUpdate({
              colorStrategy: {
                ...options.colorStrategy,
                dithering: event.target.checked ? 'floyd-steinberg' : 'none',
              },
            })
          }
        />
      </label>
    </section>
  );
}
