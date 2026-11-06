# 最终交付验收矩阵

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| 图片上传 PNG/JPEG/WebP | 已完成 | `src/adapters/image/browserImageDecoder.ts`；`tests/e2e/image-decoder.spec.ts`；Chrome/Edge E2E 通过 |
| 图片像素读取与目标尺寸处理 | 已完成 | `src/core/image/`、`src/core/pattern/builder.ts`；`tests/unit/nearest.test.ts`、`area.test.ts`、`pattern.test.ts` |
| 透明像素作为空位 | 已完成 | `src/core/image/alpha.ts`；`A=127`/`A=128` 和全透明测试 |
| 真实品牌基础色盘 | 已完成 | Hama 2026 Midi Solid 67 色；`src/palettes/`、`docs/palette-sources.md` |
| 色号、名称、参考颜色和来源追溯 | 已完成 | `hama-midi-solid-2026.palette.json`、`hama-midi-solid-2026.source.json`、运行时 checksum 校验 |
| RGB 欧氏距离匹配 | 已完成 | `src/core/color/rgbEuclideanMatcher.ts`、`tests/unit/rgbMatcher.test.ts` |
| CIELAB ΔE76 匹配 | 已完成 | `src/core/color/cie76Matcher.ts`、`tests/unit/cie76.test.ts` |
| 每个有效格映射真实色号 | 已完成 | `BeadPattern.colorIndex` + 统计不变量测试 |
| 图纸网格、色号、坐标 | 已完成 | `src/render/patternRenderer.ts`、`src/components/PatternCanvas.tsx` |
| PNG 独立导出 | 已完成 | `src/export/pngExporter.ts`；离屏 Canvas；E2E 真实下载 |
| PNG 图例和品牌信息 | 已完成 | `pngExporter.ts` 动态图例和来源脚注 |
| 材料用量统计 | 已完成 | `src/core/pattern/statistics.ts`、`src/components/StatsPanel.tsx` |
| 材料清单 CSV | 已完成 | `src/export/materialExporter.ts`；`tests/unit/boards-and-materials.test.ts` |
| 自定义图纸尺寸 | 已完成 | `ParameterPanel`、`workspaceStore`；8–128 格校验 |
| 大图分板 | 已完成 | `src/core/pattern/boards.ts`、`src/export/boardExporter.ts`、`BoardPanel.tsx` |
| 分板数量守恒和全局坐标 | 已完成 | 70×65/29×29 单元测试；分板 PNG 导出 |
| 画布滚轮局部缩放 | 已完成 | 非 passive 原生监听；`PatternCanvas.tsx`；Chrome/Edge 8 项 E2E |
| README、依赖和运行说明 | 已完成 | `README.md` |
| 示例图片和演示说明 | 已完成 | `examples/one-pixel.png`、`examples/README.md` |
| AI 编程报告 | 已完成 | `docs/AI-development-report.md` |
| AI 对话记录索引 | 已完成 | `docs/ai-sessions/README.md`、初始化原始记录 |

## 自动化门禁

| 命令 | 结果 | 时间/证据 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | TypeScript 严格检查，无错误 |
| `npm run lint` | 通过 | ESLint，无错误 |
| `npm test` | 通过 | 13 个测试文件，72 项测试 |
| `npm run build` | 通过 | Vite 生产构建成功 |
| `npm run check` | 通过 | typecheck、lint、test、build 全部成功 |
| `npm run format:check` | 通过 | Prettier 全量通过 |
| `npm run test:e2e` | 通过 | Chrome、Edge 共 8 项通过；包含滚轮缩放不触发页面滚动 |

## 未完成或未验证

- PDF/SVG 未实现；PNG 是本次正式导出格式。
- 第二真实品牌、品牌重映射、单格编辑、撤销/重做、工程文件保存/恢复未实现，且已从本次范围移除或延期。
- 完整 AC-01 至 AC-23 的独立人工黑盒记录、断网独立图片查看器截图、1440×900/1280×800/1024×768 人工版式检查未在仓库中形成独立证据包，因此标记为未验证，不将其冒充为自动化通过。
- 当前没有新的 Git commit；交付内容以当前工作区文件为准。