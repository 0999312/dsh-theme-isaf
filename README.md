# ISAF T.C. System · dsh-theme-isaf

> 为 DeepSeek Harness 做的《皇牌空战 04》同人双模主题。
> 它想呈现的不是一架战机，而是一间在反攻前夕仍然亮着的 ISAF 战术简报室。

![ISAF T.C. System 启动封面](assets/startup-poster.png)

## 这不是游戏 UI 复刻

`ISAF. T.C. System` 把 DSH 的界面设定成一台 ISAF 简报终端：深蓝玻璃面板、CRT 扫描线、战术地图网格、ISAF 三角徽章壁纸，以及一段开机时播放的预简报影像。

它没有把《皇牌空战 04》的 HUD 原样搬进聊天软件。主题取的是那场战争里的**氛围**：大陆失守后的撤退、North Point 的临时 GHQ、反攻前夜的值班室，以及一台老式终端持续运转的冷光。`T.C.` 来自启动画面上的系统标识，不强行展开成全称；军用系统只显示缩写，反而更接近那种冷峻感。

## 背景：ISAF 与《皇牌空战 04》

《皇牌空战 04：破碎的天空》（Ace Combat 04: Shattered Skies）是系列第四作，2001 年登陆 PlayStation 2。故事发生在 Strangereal 世界的 **Usea 大陆**，核心是一场由 **Erusea（艾鲁吉亚）联邦共和国** 与 **ISAF** 之间的战争。

| 时间 | 事件 |
| --- | --- |
| 1999 | 小行星 Ulysses 1994XF04 的碎片撞击 Usea。各国建造 Stonehenge 轨道炮网络拦截碎片，仍造成巨大伤亡，并有一门轨道炮损坏。 |
| 2003 | Erusea 夺取 Stonehenge，把它改造成远程防空超级武器，并入侵 Usea 大陆，包括中立国 San Salvacion。Usea 各国组成 ISAF 反击；首次摧毁 Stonehenge 的尝试失败，ISAF 退守 Stonehenge 射程外的 North Point。 |
| 2004 | ISAF 以 North Point 为基地重整，Mobius 1 参战；ISAF 开始在东线取得战果，并逐步准备反攻。 |
| 2005 | ISAF 发动反攻，摧毁 Stonehenge、解放 San Salvacion、攻占 Erusea 首都 Farbanti；Erusea 投降。此后 Mobius 1 又阻止了 Megalith 的报复性发射。 |

ISAF 的全称是 **Independent State Allied Forces**，中文常译“独立国家联合军”。它不是单一国家，而是由 **16 个 Usea 国家** 组成的军事 coalition；这一点很重要——主题里的 ISAF 徽章代表的是联合，而不是某支单独的王牌中队。

本项目取的正是这段历史的后半段：**反攻已经开始，但战争还没有结束**。所以界面是冷的、克制的、像值班室一样持续亮着，而不是庆祝胜利的亮色。

## 主题设定

| 主题元素 | 背景依据 | 实现 |
| --- | --- | --- |
| 深蓝玻璃面板 | 夜间简报室 / 航母战情室的低照度环境 | 面板用 84%–90% 深蓝半透明层，保留壁纸徽章的轮廓；不用高饱和纯黑。 |
| 昼间 / 夜间双模 | 同一间简报室的白天与夜间值班 | light 是昼间深蓝 `#0b1a2c`，dark 是夜间深蓝 `#050b16`；两套都保持蓝白文字，不做“浅色纸面 + 深色反转”。 |
| ISAF 三角徽章壁纸 | 16 国联合体的徽章 | 2560×1440 壁纸铺在 `html` 上，应用四周留 12px 壁纸边框；中心留亮、边缘压暗。 |
| `I.S.A.F. T.C.SYSTEM` 启动画面 | 游戏内简报终端的系统字样 | `startup.mp4` 预简报影像 + `startup-poster.png` 静态首帧；没有 boot-video 时也不会退回默认 HARNESS 字标。 |
| CRT 扫描线 / 战术网格 | 旧式终端与战术地图 | 72px 网格、4.5% 黑扫描线、极轻滚动扫描；reduced-motion 下关闭动态。 |
| ISAF 蓝 / 磷光青 / 警示琥珀 | 联合军蓝、CRT 磷光、雷达告警 | 三种强调色可在设置里切换，分别对应冷静、电子、警戒三种语气。 |

`I.S.A.F. T.C.SYSTEM VERSION 4.03` 是启动画面的视觉锚点。它像一台仍然在线的旧终端，而不是一张会发光的桌面壁纸。

## 特性

- **双模深蓝 HUD**：light `#0b1a2c`，dark `#050b16`；两套 token 都是深底蓝白字。
- **三种强调色**：ISAF 蓝 / 磷光青 / 警示琥珀，设置路径为「设置 → 通用 → 强调色」。
- **壁纸舱**：ISAF 徽章壁纸 + 12px 壁纸边框 + 半透明玻璃面板；中心徽章会从面板后透出。
- **海报式辉光**：壁纸叠一层从中心向外压暗的冷蓝径向遮罩，参考 `startup-poster.png` 的发光层次，但不直接叠海报图，避免两个 ISAF 标识互相打架。
- **直角 HUD**：主面板、侧栏、按钮均为直角；保留 72px 战术网格与轻扫描线。
- **启动动画**：自带 5.53 秒 ISAF 预简报 MP4（H.264 + AAC，638×478）；与 `dsh-boot-video` 联动时完整播放。
- **无 backdrop-filter**：面板只用半透明底色。Chrome 在透明祖先链下会把 backdrop 采样成黑色，壁纸会被整片遮掉；这是本主题刻意避开的坑。

## 安装

需要 DSH `>=0.2.1-rc.2 <0.3.0`、Node.js `>=20`。

### 方式一：从 tgz 安装

~~~powershell
dsh plugin --profile web add <path-to>/dsh-theme-isaf-0.1.7.tgz
~~~

### 方式二：从仓库链目录

~~~powershell
git clone https://github.com/0999312/dsh-theme-isaf.git
cd dsh-theme-isaf
dsh plugin --profile web add link:$(Get-Location)
~~~

安装后刷新页面；**宿主半的资源路由与启动注入需要重启一次 DSH GUI 才生效**。确认已加载：

~~~powershell
dsh plugin --profile web list
~~~

## 启动画面与 dsh-boot-video

主题不依赖 `dsh-boot-video`，但两者可以自动联动：

1. 页面加载后检查 boot-video 是否已安装；
2. 如果 `dsh-boot-video:asset` 为空，把主题内的 `startup.mp4` 通过
   `POST /dsh-boot-video/import` 导入为固定素材 `u-isaf-boot`；
3. 只在 `dsh-boot-video:source` / `asset` 为 `null` 时补默认值，
   **不覆盖**用户已经选择的素材或「关闭」状态；
4. 宿主半检测到 profile 已有 `assets/user/u-isaf-boot.mp4` 时，才会注入默认值脚本；
5. 没有 boot-video，或用户关闭了开机动画：`BOOT_CSS` 使用 `startup-poster.png`
   做静态首帧，不会退回默认 HARNESS 字标。

启动视频播放结束后自动淡出，点击或 Esc 可跳过。当前视频约 5.53 秒，包含音轨。

## 目录

~~~text
dsh-theme-isaf/
├─ package.json        # DSH bundle / client 清单
├─ cordis.patch.yml    # Loader 行：id theme-isaf，name dsh-theme-isaf
├─ index.js            # 宿主半：首帧 CSS、启动默认值、/theme-isaf/assets 路由
├─ client.js           # 浏览器半：28+6 token、HUD 外壳、CRT、设置行
├─ assets/
│  ├─ startup.mp4      # 启动动画（H.264 + AAC，638×478）
│  ├─ startup-poster.png
│  └─ wallpaper.png    # 2560×1440 ISAF 壁纸
├─ scripts/
│  └─ smoke.mjs        # 无浏览器自检
├─ CHANGELOG.md
├─ LICENSE
└─ README.md
~~~

## 自检

不需要安装到 profile，也不需要浏览器：

~~~powershell
node scripts/smoke.mjs
~~~

输出应包含：

- 23 项 bundle / host 契约断言；
- 30 项 WCAG 对比度断言（3 个强调色 × light/dark × 5 个前景/背景组合）；
- 最后一行 `全部通过。`。

当前主文字对比度：

| 模式 | 主文本 | 次级 | 三级 | 说明文字 | 品牌色上的文字 |
| --- | ---: | ---: | ---: | ---: | ---: |
| ISAF light | 14.49 | 10.94 | 8.46 | 6.97 | 5.38 |
| ISAF dark | 15.64 | 11.25 | 8.27 | 6.58 | 8.95 |

## 定制

| 想改什么 | 改哪里 |
| --- | --- |
| 中性色 token | `client.js` 的 `NEUTRAL_TOKENS` |
| 强调色 | `client.js` 的 `ACCENTS`、`ACCENT_LABEL_KEYS`、`MESSAGES` |
| 设置行外观 | `client.js` 的 `AccentRow` 与 `CSS` |
| HUD 外壳 / 壁纸 | `client.js` 的 `SHELL_CSS` + `assets/wallpaper.png` |
| 启动画面 | `index.js` 的 `BOOT_CSS` + `assets/startup-poster.png` + `assets/startup.mp4` |
| 启动视频素材 | 同时更新 `client.js` 的 `BOOT_VIDEO_FIXED_ASSET` 与 boot-video 的 user 素材 |

改完先跑 `node scripts/smoke.mjs`，再刷新 GUI 或重启宿主。

## 设计与边界

- `overrideTokens` 的每个 token 必须同时给 `light` 和 `dark`，它是覆盖层，不是单模式补丁。
- 浏览器半只 `require('react')`；不额外耦合官方 UI 包。
- 三处 id 必须一致：`package.json` 的 `name`、`cordis.patch.yml` 的 `id` / `name`、
  `client.js` / `index.js` 的 `PACKAGE_ID` / `ENTRY_ID`。
- 不要往 `#root > [data-dsh-boot]` 里塞节点：DSH 会在 React 挂载时
  `hydrateRoot` + `dangerouslySetInnerHTML` 复用 boot DOM。启动画面只做 CSS 换皮。
- `/plugins/<pkg>/assets` 的媒体白名单不含 mp4，因此主题自建
  `/theme-isaf/assets` 前缀路由；新增资源要同步加入 `index.js` 的 `ASSETS`。
- 真实 GUI 的视觉效果（启动视频、窗口尺寸下的网格、壁纸透明度）仍需装进 profile 后目测；
  自检覆盖的是契约与对比度，不替代视觉验收。

## 背景资料与版权

背景资料用于核对设定，本项目对 ISAF / 《皇牌空战 04》的叙述是粉丝整理，不代表官方文案：

- [Independent State Allied Forces — Ace Combat Wiki](https://acecombat.wiki.gg/wiki/Independent_State_Allied_Forces)
- [Ace Combat 04: Shattered Skies — Wikipedia](https://en.wikipedia.org/wiki/Ace_Combat_04:_Shattered_Skies)
- [ACES CHRONICLE — Bandai Namco Entertainment](https://acecombat.jp/en/chronicle/details)

**非官方粉丝作品。** 本主题与 Bandai Namco Entertainment 无隶属关系。ISAF、ACE COMBAT、相关名称与图像版权归其权利人所有；仓库不附带对这些素材的再许可。

代码以 [MIT](LICENSE) 发布。`assets/` 中的 ISAF /《皇牌空战 04》相关图像与启动影像不适用 MIT 许可，仅作为粉丝主题的视觉素材；若你是权利人并希望移除其中某项素材，请开 issue 联系。

## 版本

当前 `0.1.7`：海报式中心辉光、更轻的 CRT、新的 ISAF 预简报启动视频。
完整变更见 [CHANGELOG.md](CHANGELOG.md)。
