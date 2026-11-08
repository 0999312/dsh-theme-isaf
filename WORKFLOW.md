# 一轮对话出主题

**输入**：一条提示词 + 一张风格参考图。
**输出**：改好的 `client.js`（34 个 token × 明暗双值）+ 可选的外壳资源（启动画面 / 壁纸 / CRT）+ 自检全绿。
**约束**：一轮完成，agent 不追问；人不做手工取色，也不靠"感觉行不行"拍板。

这套流程能压到一轮，靠三个收窄：

1. **决策空间是封闭的。** 主题不是自由设计，是 28 个中性 token + 6 个强调派生 token 的双值映射，落位由语义定死。
2. **取色是机械的。** `scripts/palette.ps1` 把参考图压成 8 个色簇，给出面积、亮度、饱和度、对比度、角色提示；不需要人眼估 hex。
3. **验收是机器判的。** `scripts/smoke.mjs` 53 项断言（23 项契约 + 30 项 WCAG），红了就是红了，绿了就能交付。

所以一轮的真实工作量是：读一张表、做 5–8 个取舍、跑一次自检。

---

## 1. 输入契约

### 图（一张，够用就行）

| 要有 | 原因 |
| --- | --- |
| 一个明确的底（浅纸 / 深墨 / 中性灰均可） | 直接决定 `bg-base` 与明暗主次 |
| 一处高饱和强调色，面积占 3%–15% | 落 `brand-primary` / `link` / 业务态 |
| 两三个中性中间调 | 落 `label-secondary` / `tertiary` / `caption` 与表面层级 |

**不建议**：满是光影的照片、纯渐变背景、纯单色海报。前两者会把直方图打散成几十个 1% 色簇，取出来的是噪点而非配色；后者没有强调色可取。

遇到这类图不必换图，在提示词里写明"**图只作色相参考**"，并把强调色直接给 hex。

### 提示词（复制后填空）

```
按 dsh-theme-isaf/WORKFLOW.md 做一套主题，不要反问我，缺的信息按文档默认值补。

主题名：<名字>
包名：dsh-theme-<slug>；入口 id：theme-<slug>；设置行 id 与入口 id 保持一致
气质：<三个词，例：冷静 / 克制 / 纸感>
模式：双模（light + dark 两套都交付）
强调色：取自参考图的 <区域描述>；取不到就用 <#hex>
参考图：<本地路径或附件>

交付：改 dsh-theme-isaf 的 client.js（NEUTRAL_TOKENS + ACCENTS + 顶部常量），
跑 node scripts/smoke.mjs，全绿后把最终 28 个 token 值回填到 WORKFLOW.md 的示例表。
```

提示词里必须有的四项：**名字**（id 的根）、**气质**（决定层级差与饱和度，否则只能瞎猜）、**模式**（要几套、主哪套）、**强调色来源**（图里取还是给定值）。

---

## 2. Agent 单轮执行（8 步）

### 第 1 步：取色

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\palette.ps1 -Path "<参考图路径>" -K 8
```

先看 `hint` 列与 `share` 列，再回到第 3 节判读。加 `-Json` 可以拿结构化结果做后续脚本。

### 第 2 步：定 4 + 1 个基色

从输出里挑：

- **底**：`share` 最大且 `L ≥ 0.75`（浅底）或 `L ≤ 0.15`（深底）的那个 → `bg-base` 的明色/暗色。
- **正文**：`sat < 12`、`L` 处于另一极端的那个 → `label-primary` 的明色/暗色。
- **表面**：`share` 第二、`L` 在 0.3–0.7 的两三个 → 层级与次级文字。
- **强调**：`sat ≥ 30` 的那个 → `brand-primary`。

四类凑不齐（图里只有一个有色相的中性调）时按字节：底用 `L` 极值，正文用其反色，强调色走提示词里给的 hex。

### 第 3 步：铺 28 个中性 token

按第 4 节的组别落位。层级不要手填 hex，用 client.js 自带的 `mix(color, target, weight)` 从基色派生，权重固定：

| 层级 | light 派生 | dark 派生 |
| --- | --- | --- |
| `bg-layer-1/2/3` | `mix(bg, '#ffffff', 0.5 / 0.7 / 0.85)` | `mix(bg, '#ffffff', 0.04 / 0.07 / 0.11)` |
| `bg-overlay` | `mix(bg, ink, 0.06)` | `mix(bg, ink, 0.10)` |
| `border-l1…l4` | `ink` + alpha `0a/1a/1f/29` | `#ffffff` + alpha `0f/1f/29/3d` |
| `label-secondary/tertiary/caption` | `mix(ink, bg, 0.45 / 0.55 / 0.62)` | `mix(ink, bg, 0.35 / 0.45 / 0.52)` |
| `label-dimmed` | `mix(bg, ink, 0.14)` | `mix(bg, ink, 0.16)` |
| `markdown-*` / `sidebar-*` / `selector` | `mix(bg, ink, 0.05–0.09)` | `mix(bg, '#ffffff', 0.05–0.08)` |

这样一套主题只剩「底、正文、强调」三个自由度，其余全是推导。

### 第 4 步：派生 6 个语义 token

`tokensFor(accentId)` 已经写好，不用改：

```text
--dsw-alias-brand-primary          = 强调色
--dsw-alias-brand-text             = 强调色
--dsw-alias-link                   = 强调色
--dsw-alias-state-business-primary = 强调色
--dsw-alias-state-business-tertiary         = mix(强调色, bg, 0.86 / 0.78)
--dsw-specific-sidebar-nav-item-active-accent = mix(强调色, bg, 0.80 / 0.70)
```

唯一要决定的是：强调色在**浅色模式用深一档**（保证白字压得住），在**深色模式用浅一档**（保证深字压得住）。两条都要 ≥ 4.5。

### 第 5 步：明暗两套同源

**不要**为 dark 再找一张图。做法是同一色相翻转亮度：

- `dark.bg ≈ light.bg` 换个色阶，`L` 落到 0.005–0.04（近黑但不纯黑，纯黑会把边框吃掉）。
- `dark.label-primary` 取 `light.label-primary` 的补位色阶，`L` 提到 0.80–0.90。
- 饱和度整体降 15% 左右；深底上同样的 S 会明显更刺眼。
- 强调色 dark 版的 `L` 提到 0.60–0.75。

判据只有一条：**同一个 token，明暗两版的对比度都过闸门**，不要求两边 hex 对称。

### 第 6 步：只改数据区

允许动的三处：`ACCENTS`（三档强调色）、`NEUTRAL_TOKENS`（28 项）、文件头常量（`PACKAGE_ID` / `ENTRY_ID` / `NS` / `STORAGE_KEY`）。

带 CRT / 启动画面 / 自带壁纸的主题，另允许改 `SHELL_CSS`、`index.js` 的 `BOOT_CSS` 与资源路由、`assets/`；仍不要改 bundle 外壳、token 覆盖逻辑、设置行注册、`MESSAGES` 的键（要改文案就改值）。主题首先是数据，外壳是可选层。

三处 id 必须一致（这是最容易漏的一步）：`package.json` 的 `name`、`cordis.patch.yml` 的 `id` / `name`、`client.js` 的 `PACKAGE_ID` / `ENTRY_ID`。

### 第 7 步：跑闸门

```powershell
node scripts/smoke.mjs
```

### 第 8 步：红了按下表调

见第 6 节。调完重跑，直到 `全部通过。`

---

## 3. `palette.ps1` 输出怎么读

```text
# ref-ink-jade.png  480x320  step=2  sampled=38400px  buckets=57
no  hex       share      L onWhite onBlack   sat  hint
1   #f4f1e8   43.2%   0.88     1.1    18.6    5%  bg
2   #8aa79b   33.6%  0.354     2.6     8.1   17%  surface
3   #d9c9a8   11.4%  0.594     1.6    12.9   23%  surface
4   #1d2624    4.6%  0.018    15.5     1.4   24%  ink
5   #2f7f6a    3.9%  0.168     4.8     4.4   63%  accent
6   #898b86    1.8%  0.255     3.4     6.1    4%  surface
```

| 列 | 含义 | 怎么用 |
| --- | --- | --- |
| `share` | 采样像素里该色簇的占比 | 底一定在 30%+；强调色 3%–15% 最典型，低于 1% 基本是抗锯齿边 |
| `L` | WCAG 相对亮度 | 直接拿来判断"这色能当底吗"「这色能当正文吗」 |
| `onWhite` / `onBlack` | 该色作文字放在白/黑上的对比度 | 选正文时看这列，≥ 4.5 才及格，≥ 7 才适合做主文本 |
| `sat` | HSV 饱和度 | ≥ 30 才像强调色；< 12 是中性，适合正文与边框 |
| `hint` | 粗角色猜测 | 只是起点，最终以第 4 节映射表为准 |

三条经验：

- **面积最大的那个不一定是底**。深色系海报里，最大面积可能是纯黑，那它既是底也是正文色，此时只需再问图里"次亮的中性调"当次级文字。
- **强调色常常排在 4–6 位**。占比小不代表不重要，`sat` 才是判据。
- **两个 1% 以下的簇直接丢**，那是压缩噪点或描边抗锯齿。

非 Windows 或没有 PowerShell：用 ImageMagick 退路——`magick "<图>" -resize 80x80! -colors 8 -format "%c" histogram:info:-`，取面积前几名，亮度/对比度按第 2 节的公式手算即可。

---

## 4. 图色 → token 映射表

### 角色判据

| 图里的东西 | 判据 | 落位 |
| --- | --- | --- |
| 大面积浅色 | `share ≥ 25%` 且 `L ≥ 0.75` | `bg-base`（light） |
| 大面积深色 | `share ≥ 20%` 且 `L ≤ 0.15` | `bg-base`（dark）/ `label-primary`（light） |
| 中性极值 | `sat < 12` 且 `L ≤ 0.08` / `≥ 0.90` | `label-primary` 的明或暗 |
| 中性中间调 | `sat < 25`，`L` 0.25–0.70 | `label-secondary` / `tertiary` / `caption` / 层级底色 |
| 高饱和 | `sat ≥ 30`，`share` 1%–20% | `brand-primary` / `link` / `state-business-*` |
| 暖/冷偏色表面 | `L` 0.45–0.65 且色相明显 | `markdown-*` / `sidebar-*` / `bubble` 的底色偏移 |

### 28 个中性 token 的分组与落位

```text
画布层级  bg-base · bg-layer-1/2/3 · bg-overlay
边框      border-l1/l2/l3/l4              （用正文色 + alpha，别用实色）
文本      label-primary / secondary / tertiary / caption / dimmed / primary-foreground
交互      interactive-bg-hover / interactive-bg-active   （强调色 + 低 alpha）
代码块    markdown-code-block / -banner / markdown-inline-code / markdown-tag
外壳      specific-sidebar-fill / -nav-item-active / specific-input-major / specific-selector / specific-bubble
滚动条    scrollbar-bg-l1 / scrollbar-hover-l1
```

`label-primary-foreground` 是**品牌色上的文字色**：`brand-primary` 深 → 用 `#ffffff`；`brand-primary` 浅 → 用近黑的底色调。它和 `label-primary` 是两回事，别混。

---

## 5. 验收闸门

`node scripts/smoke.mjs` 跑两组：

**A. 契约（23 项）**

- **A1 浏览器半（11 项）** —— bundle 注册 id、插件对象形状、`factory` 只 `require('react')`、`overrideTokens` 的 source 等于包名、每个 token 都是 `{light, dark}` 双值、设置行注册在 `settings.general.item` 上、zh+en 词典齐、行组件渲染出三个按钮、点按钮回写、换色重下一层并持久化、外壳样式与 CRT 层已安装。
- **A2 宿主半（12 项）** —— `ENTRY_ID` 与 cordis 行 id 一致、`webserver/index-inject` 推了首帧样式（含 `[data-dsh-boot]` / `startup-poster.png` / 隐藏默认字标）、`BOOT_DEFAULTS_SCRIPT` 只补 null（空、off、已选三种情形）、`/theme-isaf/assets` 前缀路由已注册、壁纸/启动封面/启动 MP4 的 MIME 和字节数正确、HEAD 不带 body、相对 URL 也能取到资源、未知资源与目录探测 404、非 GET/HEAD 405。

**B. 对比度（30 项）** —— 三个强调色 × 明暗两套 × 五个位点：

| 位点 | 阈值 | 为什么是这个数 |
| --- | --- | --- |
| `label-primary` on `bg-base` | ≥ 7 | 正文，AAA 正文级 |
| `label-secondary` | ≥ 4.5 | AA 正文级 |
| `label-tertiary` | ≥ 4.5 | 次要说明 |
| `label-caption` | ≥ 4.5 | 辅助文字（最容易红） |
| `label-primary-foreground` on `brand-primary` | ≥ 4.5 | 按钮文字 |

### 红灯 → 修法

| 报错 | 原因 | 改什么 |
| --- | --- | --- |
| `token 每个都是 { light, dark } 双值` | 某 token 只给了一边 | `overrideTokens` 硬要求双值，缺一边直接补 |
| `主文本 6.4` | 正文压不住底 | `label-primary` 往 `#000`/`#fff` 推 6%–10% 的 `mix` |
| `说明文字 4.47` | caption 通常最先红 | 加深 6%（浅色模式）/ 提亮 6%（深色模式），一档一档试 |
| `品牌色上的文字 4.4` | 强调色与前景字对比不足 | 强调色压暗 8%，或把前景字从白换成近黑 |
| `override source = 包名` 失败 | `PACKAGE_ID` 与 `package.json` name 不一致 | 三处 id 对齐 |
| 渲染出 0 个按钮 | `MESSAGES` 缺键或 `ACCENTS` 键名与 `ACCENT_LABEL_KEYS` 不符 | 三个键必须一一对应 |

调法固定为「一档 `i`% 地挪，跑一次看一行」，不要凭感觉一次改到位——一轮内的迭代成本就是 `node scripts/smoke.mjs` 的 0.2 秒。

---

## 6. 实例：ISAF T.C. System（isaf）

**输入**：一张 93% 面积都是 ISAF 蓝的徽章壁纸 + 一段 CRT 启动动画（近黑深蓝底 + 磷光蓝）+ 一张深蓝战术 HUD 截图（文字色参考）+ 提示词「气质：冷静 / 科幻 / CRT；双模；强调色取参考图整体」。

**第 1 步取色**：壁纸 `#3e6bac` 占 93.4%（`sat` 64%）、粉笔白 `#fffef7` 占 5.7%；GIF 帧的底是 `#000327`–`#001743`，发光蓝 `#579bc5`。

**决策 4 条**：

1. 双模都是深蓝 HUD：light 用昼间深蓝 `#0b1a2c`，dark 用 GIF 底色的提亮版 `#050b16`，保留蓝相、不落纯黑。初版 light 是浅色纸面，用户要求「深蓝半透明面板、不要圆角」后改成昼间 HUD；对比度断言按深底成立。
2. 文字色按 `fro2asa70fpf1.png` 的战术 HUD 整理：亮字核心 `#c3def2`、说明句 `#96c8ff`、暗处小字 `#5880b0`，落到四级蓝白文字；light 主文 `#d8ecff`（14.49）、caption `#86a7c6`（6.97），dark 主文 `#d3e8f8`（15.64）、caption `#7b98b7`（6.58）。
3. 强调色直接用壁纸的 `#3e6bac`（白字 5.38）；深色模式提亮到 `#7db4e6`（深底反差 8.95），否则在近黑底上发闷。
4. 表面层级整体向蓝灰偏，代码块做成终端面板式的深色；cyan / amber 两档来自磷光青与警示琥珀。

**非 token 外壳**（本主题额外交付，不属于 28 个 token）：

- **启动画面**：宿主半在 `<head>` 最前注入 `BOOT_CSS`，用 `#root > [data-dsh-boot]` 的背景换成 `startup-poster.png`，并隐藏自带 wordmark/spinner/hint。不能往 boot DOM 塞节点——React 会用 `hydrateRoot` + `dangerouslySetInnerHTML` 复用它的 innerHTML。
- **启动 MP4 联动**：`startup.mp4` 使用新版 ISAF 预简报视频（638×478、H.264 + AAC、5.53 秒、2,454,350 B）。客户端加载后若检测到已安装 `dsh-boot-video`，只在用户没选素材时导入并写 `u-isaf-boot`；宿主半在 profile 已 seed 该文件时，额外注入 `BOOT_DEFAULTS_SCRIPT` 补齐 `null` 默认值。
- **资源**：内置 `/plugins/<pkg>/assets` 的媒体白名单只有 svg/png/webp/jpg/jpeg，所以壁纸、启动封面与 MP4 由宿主半注册 `/theme-isaf/assets` 前缀路由自己发。
- **CRT 外壳**：壁纸铺在 `html`、`body` 透明，12px padding 让应用舱浮起来；frame 透明、直角，侧栏与聊天阅读区用 84%–88% 的 `color-mix` 半透明面板，让壁纸从面板后透出。**不要加 `backdrop-filter`**：Chrome 在透明祖先链下会把 backdrop 采样成黑色，壁纸会被整片遮掉。`.tsk-crt` 固定层叠 4px 周期、4.5% 黑线扫描线、极轻的 9s 滚动扫描与 14% 轻暗角；壁纸再叠一层中心留亮、边缘压暗的径向遮罩，参考 `startup-poster.png` 的发光层次。

**28 个 token 的最终值**（就是这一轮的产出）：

| token | light | dark |
| --- | --- | --- |
| `bg-base` | `#0b1a2c` | `#050b16` |
| `bg-layer-1/2/3` | `#10243a` / `#142a42` / `#19314b` | `#0a1422` / `#0e1b2c` / `#132338` |
| `bg-overlay` | `#091624` | `#08111d` |
| `border-l1…l4` | `#ffffff0f` / `1f` / `29` / `3d` | `#ffffff0f` / `1f` / `29` / `3d` |
| `label-primary` | `#d8ecff` | `#d3e8f8` |
| `label-secondary` | `#b3d0e9` | `#aac7e3` |
| `label-tertiary` | `#97b8d6` | `#8dabca` |
| `label-caption` | `#86a7c6` | `#7b98b7` |
| `label-dimmed` | `#2b3f55` | `#263648` |
| `label-primary-foreground` | `#ffffff` | `#050b16` |
| `interactive-bg-hover/active` | `#3e6bac24` / `#3e6bac33` | `#7db4e612` / `#7db4e620` |
| `markdown-code-block` / `-banner` | `#081522` / `#0f2134` | `#07111d` / `#0c1828` |
| `markdown-inline-code` / `-tag` | `#0a1828` / `#14273c` | `#08131f` / `#0f1e30` |
| `sidebar-fill` / `nav-item-active` | `#091827` / `#1a2e45` | `#070f1b` / `#14263a` |
| `input-major` / `selector` / `bubble` | `#081522` / `#0f2033` / `#14283e` | `#07111d` / `#0c1929` / `#10243a` |
| `scrollbar-bg-l1` / `hover-l1` | `#2b4057` / `#425a73` | `#2a3f55` / `#3f566e` |

**强调色**：`isaf` = `#3e6bac` / `#7db4e6`（另外两档为 `cyan` / `amber`）。

**闸门输出**：

```text
  isaf·light   | 14.49 | 10.94 | 8.46 | 6.97 | 5.38
  isaf·dark    | 15.64 | 11.25 | 8.27 | 6.58 | 8.95
  cyan·light   | 14.49 | 10.94 | 8.46 | 6.97 | 6.84
  cyan·dark    | 15.64 | 11.25 | 8.27 | 6.58 | 12.56
  amber·light  | 14.49 | 10.94 | 8.46 | 6.97 | 6.80
  amber·dark   | 15.64 | 11.25 | 8.27 | 6.58 | 11.16
  (30 项对比度断言，30 通过)
  全部通过。
```

**复现**：把上面 28 行贴进 `NEUTRAL_TOKENS`、`ACCENTS.isaf` 换成 `#3e6bac` / `#7db4e6`，`node scripts/smoke.mjs`。

---

## 7. 什么时候才需要第二轮

一轮流程的前提是「用 token 表描述风格」。以下四种情况它描述不了，此时第二轮只做局部，不要重开：

| 情况 | 第二轮要做的 |
| --- | --- |
| 图是照片/复杂光影，色相都要人确认 | 只确认「底/正文/强调」三个色相，其余仍走推导 |
| 需要 token 覆盖不到的组件级细化 | 另加一条 `<style>`（`installStyles()` 已有管道），别去改基座 |
| 明暗两套要不同色相（品牌双色） | 拆成两个 `NEUTRAL_TOKENS` 变体，仍是一次结构改动 |
| 要换产品图标 | 走 `webapp` 的 `icons` 契约，属于另一条链路，不是 token 工作 |

判断标准很硬：**如果差异能用「换一个 hex」表达，就还在一轮流程里；如果需要「加一段逻辑」，才进第二轮。**

---

## 8. 落地检查清单

- [ ] `package.json` 的 `name` = `client.js` 的 `PACKAGE_ID` = `cordis.patch.yml` 的 `name`
- [ ] `cordis.patch.yml` 的 `id` = `ENTRY_ID` = 设置行注册的 `id`
- [ ] `NEUTRAL_TOKENS` 28 项、每项双值；`ACCENTS` 三档、每档双值
- [ ] `node scripts/smoke.mjs` → `全部通过。`
- [ ] `assets/startup.mp4`、`assets/startup-poster.png` 与 `assets/wallpaper.png` 存在，`package.json` 的 `files` 含 `"assets"`
- [ ] 装了 `dsh-boot-video` 时，`assets/user/u-isaf-boot.mp4` 与 `labels.json` 已 seed；`HEAD /dsh-boot-video/asset/u-isaf-boot.mp4` 返回 200 `video/mp4`
- [ ] 真实 GUI 里看过首帧动画、12px 壁纸边框与设置行横幅（都靠 CSS 换皮，未改 boot DOM）
- [ ] `dsh plugin --profile web add link:<绝对路径>` → 重启 GUI
- [ ] Settings → General 多出一行「强调色」，点一下整套配色跟手变
- [ ] 明暗切换看一遍：`body[data-ds-dark-theme]` 由 `colorScheme` 驱动，不由主题 id 驱动
