# ADR-0010：工作台采用 Tailwind CSS v4

- 状态：Accepted（P04 初始化）
- 日期：2026-11-06
- 关联：`docs/architecture.md` 第 1、2.1、5.1 节；ADR-0001

## 背景

P03 架构原建议原生 CSS Custom Properties + CSS Modules。P04 初始化确认的技术栈明确包含 Tailwind CSS；项目需要在 72 小时内建立桌面工作台、表单、抽屉、提示条和响应式布局。样式方案不能侵入 Canvas 图纸绘制或领域算法。

## 可选方案

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| Tailwind CSS v4 + Vite 插件 | 快速建立一致的工作台布局；设计 token 与工具类便于审查；无额外 UI 运行时 | JSX 类名较长；需要团队遵守语义组件和 token 约束 | 采用 |
| CSS Modules + 原生 CSS Custom Properties | 样式局部化、无额外工具链 | 72 小时内面板与状态样式重复较多 | 被本 ADR 替代 |
| UI 组件库 | 表单和弹层现成 | 视觉同质、依赖体积大、可访问性仍需验收 | 不采用 |
| 内联样式 | 灵活 | 难以维护、状态样式易漂移 | 不采用 |

## 决策

- 使用 Tailwind CSS v4 和 `@tailwindcss/vite`。
- 用 `@theme`/CSS Custom Properties 定义画布、纸张、墨色和字体等设计 token。
- 不引入 UI 组件库；交互组件自行实现并做键盘/焦点验收。
- 图纸色块、网格、色号和图例仍由 Canvas 绘制，不使用 Tailwind 动态生成成千上万个格子类名。
- 领域层和导出层不得依赖 Tailwind。

## 代价与限制

- 增加构建期依赖和少量 CSS 产物体积，但不增加浏览器端 UI 框架。
- 类名必须保持可扫描；复杂重复样式应抽成语义组件或 CSS token，而不是堆叠任意值。
- Tailwind 版本按实际安装锁定在 lockfile；升级需重新验证构建和打印可读性。
