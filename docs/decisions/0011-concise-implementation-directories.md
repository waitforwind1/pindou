# ADR-0011：采用简洁物理目录并保持分层边界

- 状态：Accepted（P04 初始化）
- 日期：2026-11-06
- 关联：`docs/architecture.md` 第 5、5.1 节；ADR-0002

## 背景

P03 架构以 `app/domain/infrastructure/ui` 表达依赖层；P04 用户建议按 `core/image`、`core/color`、`palettes`、`render`、`export`、`store`、`types` 组织。两者表达的是同一边界，但物理目录不同，必须避免“目录简化后核心开始依赖 UI”的漂移。

## 可选方案

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| 使用 P03 完整目录 | 架构名称一一对应 | 对 72 小时项目层级偏深，查找成本高 | 不采用 |
| 使用 P04 简洁目录 + 映射文档 | 模块直观、依赖边界可检查 | 需要文档持续维护映射 | 采用 |
| 两套目录并存/转发文件 | 看似兼容 | 导入路径分裂，容易形成双真相 | 不采用 |

## 决策

采用 `src/core`、`src/palettes`、`src/adapters`、`src/render`、`src/export`、`src/store`、`src/components`、`src/types`。具体职责见 `docs/architecture.md` 5.1。

- `src/core/**` 仍是纯领域核心，禁止 React/DOM/Canvas/File。
- 浏览器解码、Canvas 和下载动作留在适配层。
- `PatternDocument` 仍是预览、统计、编辑和导出的唯一业务读模型。
- 如果后续模块增长到单目录难以审查，可在不改变依赖方向的前提下拆分；不能用目录调整作为修改 P0 语义的理由。

## 代价与限制

- P03 目录图保留为逻辑分层参考，P04 映射是实际实现结构。
- 代码审查必须按 `AGENTS.md` 的边界检查，而不是仅看目录名。
