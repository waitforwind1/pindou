# BeadCraft Studio

BeadCraft Studio 是一个面向实体制作的拼豆图纸生成网页工具。它不是普通的图片像素化滤镜，而是把用户上传的 PNG、JPEG 或 WebP 图片转换为带网格线、逐格色号、坐标、颜色图例和材料数量的生产图纸。

项目采用纯前端本地处理，原图不会上传服务器。当前首发色盘为经过来源审计的 Hama 2026 Midi Solid 67 色。

## 功能概览

- 本地上传和拖拽读取 PNG、JPEG、WebP。
- 读取 RGBA 像素，支持透明区域作为空位。
- 目标图纸尺寸支持 32、48、64 预设，以及 8–128 格自定义尺寸。
- 最近邻采样和区域平均采样。
- RGB 欧氏距离和 CIELAB ΔE76 颜色匹配。
- 可选 Floyd–Steinberg 抖动。
- Hama 2026 Midi Solid 67 色真实品牌色盘。
- 原图、拼豆图纸和实体拼豆三种预览视图。
- 网格线、逐格色号、行列坐标、空位斜线和材料统计。
- 主图 PNG 导出，文件可脱离网页独立阅读。
- 材料清单 CSV 导出。
- 大图分板 PNG 导出，支持板号和全局坐标。
- 画布内滚轮/触控板缩放，页面不会同步滚动，缩放以鼠标位置为中心。

## 技术栈

- React 19
- TypeScript 6，严格模式
- Vite 8
- Canvas 2D
- Tailwind CSS v4
- Vitest
- Playwright，Chrome/Edge
- ESLint、Prettier

项目不使用后端、数据库、外部 AI API 或 UI 组件库。

## 项目结构

```text
src/
  components/       React 工作台组件
  core/image/       RGBA、透明度、尺寸映射和采样
  core/color/       RGB、CIELAB、距离和匹配器
  core/pattern/     图纸生成、统计、重映射和分板
  palettes/         Hama 色盘快照、来源和运行时校验
  render/           Canvas 图纸和实体豆渲染
  export/           PNG、材料 CSV、分板 PNG
  store/            工作区状态和异步编排
  types/            共享领域模型

tests/unit/         核心算法、模型、统计和导出测试
tests/e2e/          Chrome/Edge 用户流程测试
docs/               需求、架构、算法、验收和 AI 记录
examples/            示例图片和演示说明
```

## 环境要求

- Node.js `>=22.12.0`
- npm
- 桌面版 Chrome 和/或 Edge，用于运行 Playwright E2E

## 安装

在项目根目录执行：

```powershell
npm install
```

项目提供 `package-lock.json`，干净环境建议使用：

```powershell
npm ci
```

## 本地启动

开发模式：

```powershell
npm run dev
```

然后打开 Vite 输出的地址，默认通常为 `http://localhost:5173`。

生产构建和本地预览：

```powershell
npm run build
npm run preview
```

## 使用流程

1. 启动开发服务器。
2. 上传或拖拽一张图片。
3. 选择图纸尺寸。P0 预设为 32、48、64；也可以输入 8–128 格的自定义宽高。
4. 选择采样策略：最近邻适合硬边像素图，区域平均适合普通照片或渐变图。
5. 选择颜色匹配：默认 CIELAB ΔE76，也可以选择 RGB 欧氏距离。
6. 按需开启 Floyd–Steinberg 抖动。
7. 点击“生成拼豆图纸”。
8. 查看原图、图纸和实体豆预览，并使用画布滚轮或按钮缩放。
9. 在右侧查看总拼豆数量、空位数量、用色数量和逐色材料清单。
10. 点击“导出 PNG”获取主图，或下载材料清单 CSV。
11. 需要制作大图时设置实体拼豆板宽高，例如 `29 × 29`，再导出分板 PNG。

## 核心算法

核心处理链路如下：

```text
图片解码
  -> RGBA 像素读取
  -> contain 比例映射
  -> 最近邻/区域平均采样
  -> alpha 阈值判断
  -> 半透明像素白底合成
  -> sRGB / CIELAB 转换
  -> 当前色盘最近色匹配
  -> BeadPattern 矩阵
  -> 统计、Canvas 预览和导出
```

透明规则：

- `A < 128`：生成 `null` 空位，不参与颜色匹配。
- `A >= 128`：先与白色背景合成，再匹配到色盘。
- 全透明图片会被阻止生成。

`PatternDocument` 是预览、统计、图例、材料清单和导出的唯一可信数据源。有效格保存当前色盘中的 `colorIndex`，空位严格使用 `null`。色盘颜色会预先转换为 CIELAB，避免在每个像素匹配时重复转换。

## 色盘来源

首发色盘为 Hama Midi Solid 67 色：

- 运行时色盘：`src/palettes/hama-midi-solid-2026.palette.json`
- 来源审计：`src/palettes/hama-midi-solid-2026.source.json`
- 说明文档：`docs/palette-sources.md`

色号和英文名称来自 Hama 官方 Midi 色卡。官方来源页、PDF 地址、访问日期、PDF SHA-256、采样方式和 canonical checksum 均有记录。

色盘中的 `displayRgb` 是从官方色卡派生的参考 RGB，不是 Hama 官方公布的 RGB 标准，也不保证与所有生产批次的实体颜色完全一致。实际采购和制作应以官方色号和实物色卡为准。

## 导出说明

### 主图 PNG

主图由 `src/export/pngExporter.ts` 使用离屏 Canvas 根据 `PatternDocument` 独立重绘，不是截取网页截图。文件包含：

- 网格线和主网格线。
- 每格色号。
- 行列坐标。
- 颜色图例和每色数量。
- Hama 品牌、系列和版本。
- 图纸尺寸、生成时间、采样策略、匹配策略和抖动状态。
- 色盘来源和“参考 RGB 非官方 RGB 标准”说明。

### 材料清单 CSV

材料清单从 `computeColorStatistics(document)` 直接生成，包含色号、官方名称、参考颜色、数量、品牌、系列和色盘版本。

### 分板 PNG

分板逻辑位于 `src/core/pattern/boards.ts`。例如 70×65 图纸使用 29×29 板会生成 3×3 共 9 个区域。每个区域包含板号、全局行列范围、局部图纸和本板数量；分板数量总和与整图数量一致。

## 测试与质量检查

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run format:check
npm run check
```

当前实际验证结果记录在 `docs/final-acceptance.md` 和 `docs/tasks.md`：13 个测试文件、72 项单元/集成测试，Chrome/Edge 共 8 项 E2E 通过。

## 示例演示

- 示例图片：`examples/one-pixel.png`
- 演示说明：`examples/README.md`
- 自动化演示：`tests/e2e/smoke.spec.ts`

## 已知限制

- 当前只内置 Hama 一个真实色盘；Perler、Artkal 和品牌重映射未作为本次功能承诺。
- 当前正式导出格式为 PNG，PDF/SVG 未实现。
- 单格编辑、撤销/重做、工程文件保存/恢复未纳入本次交付。
- 分板采用无重叠矩形裁剪，不自动处理实体底板定位孔、重叠补偿或打印分页。
- 参考 RGB 会受到色卡渲染、显示器和实体批次影响。
- 超大图导出受浏览器 Canvas 像素上限约束，失败时需要降低单格尺寸或拆分导出。

## 相关文档

- 需求：`docs/requirements.md`
- 验收：`docs/acceptance.md`
- 产品设计：`docs/product-design.md`
- 架构：`docs/architecture.md`
- 数据模型：`docs/data-model.md`
- 算法：`docs/algorithm-design.md`
- 优先级：`docs/feature-priority.md`
- 最终验收：`docs/final-acceptance.md`
- AI 编程报告：`docs/AI-development-report.md`
- AI 对话记录索引：`docs/ai-sessions/README.md`