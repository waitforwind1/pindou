# 2026-11-06：P04 项目初始化会话记录

## 范围

- 核对并保留根级 `AGENTS.md`，未改写已确认的十条规则。
- 初始化 React + TypeScript + Vite + Canvas 2D + Tailwind CSS + Vitest + Playwright 工程。
- 建立领域核心类型与首批纯算法，建立三个项目级 Skills。
- 不实现上传界面、最终色盘数据、网格渲染或 PNG 导出。

## 关键实现

- 物理目录采用 `src/core`、`src/palettes`、`src/render`、`src/export`、`src/store`、`src/types` 等简洁结构；依赖边界按 ADR-0002/0011 映射，不按目录名放宽。
- 浏览器图片解码适配器预留在 `src/adapters/image`，不进入核心层。
- `src/types/models.ts` 严格对齐 `docs/data-model.md`：空位为 `null`，格子只存 `colorIndex`/`sourceRgb`/`origin`，色盘引用带 checksum，图纸带 `stateVersion`。
- `src/core` 首批实现不依赖 React、DOM、Canvas：sRGB→Lab、CIE76、alpha 阈值/合成、contain、最近邻坐标、RGBA 读取。
- Playwright 使用本机已安装 Chrome/Edge 的 `chrome`/`msedge` channel；内置 Chromium 下载因网络重置未完成，不影响冒烟测试，但后续需要在可用网络环境复核跨浏览器证据。

## 实际验证

```text
npm run typecheck       passed
npm run lint            passed
npm test                5 files, 21 tests passed
npm run build           passed
npm run test:e2e        Chrome and Edge smoke tests passed
quick_validate.py       3 skills valid
```

## 未解决事项

- Hama 官方色盘仍未冻结，P0-04 为 `[!]`。
- 没有 UI 上传、生成、网格或 PNG 导出，P0 业务闭环未开始。
- 当前 E2E 只是工程外壳，不是 AC-01 至 AC-23 验收证据。
- 最终交付前需要补齐真实图片夹具、导出 PNG、离线查看和色盘审计证据。
