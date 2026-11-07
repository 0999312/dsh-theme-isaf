# Changelog

## 0.1.7 — 2026-11-08

- 以 `startup-poster.png` 为配色参考：壁纸改为中心留亮、边缘压暗的冷蓝径向遮罩，突出 ISAF 徽章。
- 主面板外圈加入极轻的青色辉光，顶部加 1px 冷蓝高光线。
- CRT 改为 4.5% 黑扫描线 + 9 秒极轻滚动扫描 + 7 秒轻微闪烁；保留 reduced-motion 降级。
- 仍为 23 项契约 + 30 项对比度全过。
- README 按 ISAF /《皇牌空战 04》背景重写，补充战役时间线、主题设定映射、版权边界与引用来源。

## 0.1.6 — 2026-11-08

- 启动动画替换为新的 ISAF 预简报视频（`assets/startup.mp4`，H.264 + AAC，638×478，5.53s）。
- 新增 `assets/startup-poster.png`，作为未安装 `dsh-boot-video` 时的静态首帧封面。
- 宿主资源路由改为 `startup.mp4` + `startup-poster.png` + `wallpaper.png`，移除旧版 `startup.gif`。
- 更新 README、WORKFLOW 与自检断言，仍为 23 项契约 + 30 项对比度全过。

## 0.1.5 — 2026-11-08

- light 与 dark 都改为深蓝 HUD；主面板直角、无圆角。
- 半透明面板改为 `color-mix`，移除会吞掉壁纸的 `backdrop-filter`。
- 修复「新会话」「费用明细」等浅色组件在深色 HUD 下的白底浅字。
- CRT 扫描线减淡到 4px 周期 / 3.5% 黑线，保留 HUD 网格与轻暗角。

## 0.1.0 — 2026-11-07

- 首个可用版本：ISAF 双模 token、三种强调色、壁纸边框、设置行、启动动画与 boot-video 联动。
