# 品牌色盘来源与数据口径

## 1. 当前首发色盘

| 项目 | 内容 |
| --- | --- |
| 品牌 | HAMA |
| 系列 | MIDI |
| 变体 | SOLID（基础实色） |
| 数据版本 | 2026 |
| 色数 | 67 |
| Palette ID | `hama-midi-solid` |
| 运行时快照 | `src/palettes/hama-midi-solid-2026.palette.json` |
| 采集审计记录 | `src/palettes/hama-midi-solid-2026.source.json` |
| accessedAt | 2026-11-06 |
| canonical checksum | `1bdbf969e21a266269f4d983c9203af62889b3fc77b528f164daa72b3e6b66f2` |

## 2. 官方来源

- 官方色卡入口：<https://hama.dk/en/pages/colour-chart>
- 官方英文 Midi 色卡 PDF：<https://cdn.shopify.com/s/files/1/0726/3771/0492/files/Midi_-_Colour_palette.pdf?v=1777369953>
- 英文 Midi PDF SHA-256：`6AC736AA546ADEC53DF5F82AEE900F190A79530FF8F2C796723F430AB40FA6F4`
- 官方数字编号图 PDF：<https://cdn.shopify.com/s/files/1/0726/3771/0492/files/colour-chart-number.pdf?v=1777215620>
- 数字编号图 PDF SHA-256：`9AA7344AE09710CD15127EF1FC5ED217077344E2E8797BC69C084D9FF63C82FA`

英文 Midi 色卡第 1 页为 Solid 色盘；第 2 页包含特殊/效果豆，当前快照明确排除。第 1 页逐行数量为 `9,9,8,8,9,7,9,8`，合计 67 色。

## 3. 哪些是官方信息

- **色号**：来自官方 Hama Midi 色卡。
- **英文名称**：来自官方英文色卡页。
- **系列、变体和 2026 数据版本**：来自本次官方色卡快照的采集记录。

## 4. 哪些是派生数据

`displayRgb` 是**官方色卡派生参考色**，不是 Hama 官方公布的 RGB 标准，也不保证与不同生产批次的实物颜色完全一致。

当前采样方法记录在快照与 source JSON 中：

1. 使用 Poppler `pdftoppm` 将官方英文 PDF 第 1 页以 300 dpi 栅格化。
2. 对每个色豆图片取内部矩形 `x = code-left + 2..39 pt`、`y = code-baseline + 12..38 pt`。
3. 对渲染像素逐通道取中位数并四舍五入到 8-bit RGB。
4. 避开标签、边框和大部分高光；结果仍属于照片派生近似值。

因此：

- 可以说“彩豆映射到已核验的官方色号和参考色”。
- 不可以说 `displayRgb` 是“Hama 官方 RGB”。
- 不可以用其他品牌相同或相近的编号替换这里的官方色号。

## 5. 运行时校验

`BuiltInPaletteRepository` 在首次加载时执行：

1. 运行时结构校验：67 条、色号唯一、名称/来源/页码齐全、RGB 为 0-255 整数。
2. 来源校验：官方页面、文档 URL、PDF SHA-256、访问日期和 `official-chart-derived` 标记齐全。
3. canonical JSON SHA-256 校验，必须等于 `PaletteRef.checksum`。
4. 深度冻结返回色盘，防止运行时改色或漂移。

任一检查失败都返回 `PALETTE_INVALID` 并阻止生成，不使用部分色盘继续。
