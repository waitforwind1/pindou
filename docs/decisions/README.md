# 技术决策记录（ADR）

本目录记录 P03 技术设计阶段的已接受决策。编码实现如果偏离这些决策，必须新增 ADR 或显式更新现有 ADR，并同步需求/验收文档。

| ADR | 决策 | 状态 |
| --- | --- | --- |
| [0001](0001-ui-stack-react-typescript-vite.md) | React + TypeScript + Vite；Canvas 之外不使用框架做像素计算 | Accepted |
| [0002](0002-frontend-only-layered-core.md) | 纯前端、领域核心与 UI/浏览器适配器分层 | Accepted |
| [0003](0003-canvas2d-hybrid-rendering.md) | Canvas 2D 静态层 + 交互覆盖层，DOM 负责工作台 | Accepted |
| [0004](0004-cie76-color-matching.md) | P0 使用 CIELAB ΔE76；CIEDE2000 留 P2 | Accepted |
| [0005](0005-nearest-neighbor-and-area-sampling.md) | P0 最近邻，P1 预乘 alpha 区域平均 | Accepted |
| [0006](0006-no-dithering-in-p0.md) | P0/P1 不启用 Floyd–Steinberg | Accepted |
| [0007](0007-defer-web-worker.md) | P0 主线程，Worker 按性能条件引入 | Accepted |
| [0008](0008-png-now-pdf-later.md) | P0 Canvas→PNG，PDF/SVG 后置 | Accepted |
| [0009](0009-palette-index-and-snapshot.md) | 色盘 checksum + 格子索引 + sourceRgb | Accepted |
| [0010](0010-tailwind-v4-workbench-styling.md) | 工作台样式采用 Tailwind CSS v4，不引入 UI 组件库 | Accepted |
| [0011](0011-concise-implementation-directories.md) | 使用简洁物理目录，按 ADR-0002 保持分层边界 | Accepted |
| [0012](0012-explicit-alternate-color-strategies.md) | CIE76 默认不变；RGB 与 Floyd–Steinberg 仅显式选择 | Accepted |

## 变更规则

- ADR 是设计约束，不是功能宣传；状态只有 `Proposed`、`Accepted`、`Superseded`、`Rejected`。
- 任何改变 P0 验收的决策必须同时更新 `docs/requirements.md` 和 `docs/acceptance.md`。
- 不能用“实现更方便”覆盖色盘真实性、空位语义、逐格可追溯或导出一致性。
- 所有日期按 `YYYY-MM-DD` 记录；新增 ADR 使用四位序号。
