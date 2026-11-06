# 示例与演示

本目录用于最终交付演示说明。应用本身只接受 PNG、JPEG 和 WebP，因此不把 SVG 伪装成可上传样例。

## 推荐演示

1. 启动应用：`npm run dev`。
2. 使用任意本地像素画或普通照片上传。
3. 选择 `64 × 64`，点击“生成拼豆图纸”。
4. 在右侧核对总拼豆数量和颜色数量。
5. 下载主图 PNG、材料清单 CSV。
6. 将底板尺寸设置为 `29 × 29`，再下载分板 PNG。

## 自动化演示夹具

最小合法 PNG 夹具和格式/透明度测试位于 `tests/e2e/smoke.spec.ts` 与 `tests/e2e/image-decoder.spec.ts`。运行 `npm run test:e2e` 会在 Chrome 和 Edge 中完成真实上传、生成、PNG 下载和画布滚轮缩放验证。

## 截图

交付验收运行 Playwright 后，截图和报告保存在本地 `playwright-report/`；该目录是测试产物，不是应用运行时依赖。