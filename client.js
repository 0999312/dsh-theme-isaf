/**
 * Client 半（浏览器侧 bundle）—— ISAF T.C. System 主题。
 *
 * 这个文件就是「已构建的 bundle」：宿主只消费构建产物，不跑打包器，
 * 所以它就是一段自包含的脚本，格式是平台约定的
 *
 *   window.__ModuleLoader__.load({ id, factory(require) { ...; return exports } })
 *
 * factory 的返回值就是插件对象 `{ name, inject, apply }`。
 * 只 `require('react')`（它在平台基线模块表里）；不要再 require 别的包，
 * 想用额外模块必须在 package.json 的 `dsh.client.external` 里逐个声明。
 *
 * 本主题做四件事：
 *   1. 用 `ctx.theme.overrideTokens(source, tokens)` 覆盖 28 个中性 + 6 个强调派生 token；
 *   2. 把 accent 选择持久化到 localStorage（零依赖，避开 schemastery/host Config）；
 *   3. 在设置 → 通用 里自加一行（`settings.general.item`），带壁纸横幅与三个强调色；
 *   4. 给应用外壳加 12px 壁纸边框与一层不挡鼠标的 CRT 扫描线。
 *
 * 首帧启动画面与资源路由在宿主半 index.js；两边共享包名/入口 id 与资源路径。
 */
window.__ModuleLoader__.load({
  id: 'dsh-theme-isaf',
  factory(require) {
    'use strict'

    /** 包名：也是 overrideTokens 的 source，以及插件对象 name。 */
    const PACKAGE_ID = 'dsh-theme-isaf'
    /** 设置行的 row key；与 cordis.patch.yml 的插件行 id 保持一致。 */
    const ENTRY_ID = 'theme-isaf'
    /** 设置行的翻译命名空间。 */
    const NS = 'dsh-theme-isaf'
    const STORAGE_KEY = 'dsh-theme-isaf/accent'
    const LOG_PREFIX = '[theme-isaf]'
    const ROW_SLOT = 'settings.general.item'
    const STYLE_ID = PACKAGE_ID + '/settings-row'
    const SHELL_STYLE_ID = PACKAGE_ID + '/shell-v7'
    /** 与 dsh-boot-video 约定：固定用户素材 id；主题只读探测，导入失败就退回启动封面。 */
    const BOOT_VIDEO_FIXED_ASSET = 'u-isaf-boot'
    const BOOT_VIDEO_SOURCE_KEY = 'dsh-boot-video:source'
    const BOOT_VIDEO_ASSET_KEY = 'dsh-boot-video:asset'

    /** 三个强调色。light 要压得住白字，dark 要压得住深色字。 */
    const ACCENTS = {
      isaf: { light: '#3e6bac', dark: '#7db4e6' },
      cyan: { light: '#0b6470', dark: '#64e0ea' },
      amber: { light: '#8a4b00', dark: '#f5b942' }
    }
    const DEFAULT_ACCENT = 'isaf'

    /**
     * 与强调色无关的骨架 token（每个都给 light/dark 两个值——这是 overrideTokens
     * 的硬要求，缺一边会直接抛错）。
     *
     * 命名都取自 ui-theme 的实际 token 表；列表是「够看」的最小子集，不是全量。
     * 想加就照着加，键名打错不会报错，只是那条覆盖不生效（原生配色留着）。
     */
    const NEUTRAL_TOKENS = {
      // 画布与层级 —— 两套都是深蓝 HUD 玻璃舱；light 是较亮的昼间蓝，dark 是夜间蓝
      '--dsw-alias-bg-base': { light: '#0b1a2c', dark: '#050b16' },
      '--dsw-alias-bg-layer-1': { light: '#10243a', dark: '#0a1422' },
      '--dsw-alias-bg-layer-2': { light: '#142a42', dark: '#0e1b2c' },
      '--dsw-alias-bg-layer-3': { light: '#19314b', dark: '#132338' },
      '--dsw-alias-bg-overlay': { light: '#091624', dark: '#08111d' },
      // 边框 —— HUD 面板用白 + alpha 的细描边
      '--dsw-alias-border-l1': { light: '#ffffff0f', dark: '#ffffff0f' },
      '--dsw-alias-border-l2': { light: '#ffffff1f', dark: '#ffffff1f' },
      '--dsw-alias-border-l3': { light: '#ffffff29', dark: '#ffffff29' },
      '--dsw-alias-border-l4': { light: '#ffffff3d', dark: '#ffffff3d' },
      // 文本 —— 参考 fro2asa70fpf1.png 的蓝白 HUD 字色
      '--dsw-alias-label-primary': { light: '#d8ecff', dark: '#d3e8f8' },
      '--dsw-alias-label-secondary': { light: '#b3d0e9', dark: '#aac7e3' },
      '--dsw-alias-label-tertiary': { light: '#97b8d6', dark: '#8dabca' },
      '--dsw-alias-label-caption': { light: '#86a7c6', dark: '#7b98b7' },
      '--dsw-alias-label-dimmed': { light: '#2b3f55', dark: '#263648' },
      '--dsw-alias-label-primary-foreground': { light: '#ffffff', dark: '#050b16' },
      // 交互底色 —— ISAF 蓝的低 alpha 悬停
      '--dsw-alias-interactive-bg-hover': { light: '#3e6bac24', dark: '#7db4e612' },
      '--dsw-alias-interactive-bg-active': { light: '#3e6bac33', dark: '#7db4e620' },
      // markdown —— 终端面板式的冷色块
      '--dsw-alias-markdown-code-block': { light: '#081522', dark: '#07111d' },
      '--dsw-alias-markdown-code-block-banner': { light: '#0f2134', dark: '#0c1828' },
      '--dsw-alias-markdown-inline-code': { light: '#0a1828', dark: '#08131f' },
      '--dsw-alias-markdown-tag': { light: '#14273c', dark: '#0f1e30' },
      // 侧栏 / 输入 / 气泡
      '--dsw-specific-sidebar-fill': { light: '#091827', dark: '#070f1b' },
      '--dsw-specific-sidebar-nav-item-active': { light: '#1a2e45', dark: '#14263a' },
      '--dsw-specific-input-major': { light: '#081522', dark: '#07111d' },
      '--dsw-specific-selector': { light: '#0f2033', dark: '#0c1929' },
      '--dsw-specific-bubble': { light: '#14283e', dark: '#10243a' },
      // 滚动条
      '--dsw-alias-scrollbar-bg-l1': { light: '#2b4057', dark: '#2a3f55' },
      '--dsw-alias-scrollbar-hover-l1': { light: '#425a73', dark: '#3f566e' }
    }

    const ACCENT_LABEL_KEYS = {
      isaf: 'accent.isaf',
      cyan: 'accent.cyan',
      amber: 'accent.amber'
    }

    const MESSAGES = {
      zh: {
        'accent.title': '强调色',
        'accent.hint': 'ISAF 系统配色：只改强调色，明暗两套自动跟随。',
        'accent.isaf': 'ISAF 蓝',
        'accent.cyan': '磷光青',
        'accent.amber': '警示琥珀'
      },
      en: {
        'accent.title': 'Accent',
        'accent.hint': 'ISAF system palette: recolours the accent only; light and dark follow automatically.',
        'accent.isaf': 'ISAF Blue',
        'accent.cyan': 'Phosphor',
        'accent.amber': 'Amber'
      }
    }

    const CSS = [
      '.tsk-group{padding:16px 0}',
      '.tsk-title{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}',
      '.tsk-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-top:2px}',
      '.tsk-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}',
      '.tsk-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;',
      'border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);',
      'font:inherit;font-size:13px;line-height:18px;cursor:pointer}',
      '.tsk-chip:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.tsk-chip[aria-pressed="true"]{border-color:var(--dsw-alias-border-l4);',
      'background:var(--dsw-alias-button-primary-dimmed)}',
      '.tsk-dot{width:12px;height:12px;border-radius:6px;background:var(--tsk-dot-light);',
      'box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}',
      'body[data-ds-dark-theme] .tsk-dot{background:var(--tsk-dot-dark)}',
      '.tsk-banner{position:relative;height:104px;margin:2px 0 16px;border-radius:8px;overflow:hidden;',
      'box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;padding:11px 14px;',
      'border:1px solid var(--dsw-alias-border-l2);background-color:#06101f;',
      'background-image:linear-gradient(90deg,rgba(3,9,18,.94) 0%,rgba(3,9,18,.62) 56%,rgba(3,9,18,.18) 100%),',
      'url("/theme-isaf/assets/wallpaper.png");',
      'background-size:cover,auto 108px;background-position:center,right 14px center;background-repeat:no-repeat}',
      '.tsk-banner::after{content:"";position:absolute;inset:0;pointer-events:none;',
      'background:repeating-linear-gradient(to bottom,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,0,0,.16) 2px,rgba(0,0,0,.16) 3px)}',
      '.tsk-banner-label{position:relative;z-index:1;font:600 12px/18px "Cascadia Mono","Consolas","SFMono-Regular",ui-monospace,monospace;',
      'letter-spacing:.18em;color:#dcecff;text-shadow:0 0 12px rgba(90,170,235,.55)}',
      '.tsk-banner-sub{position:relative;z-index:1;font:400 9px/14px "Cascadia Mono","Consolas","SFMono-Regular",ui-monospace,monospace;',
      'letter-spacing:.22em;color:rgba(150,200,255,.72)}'
    ].join('')

    /** @param {string} id */
    function accentFor(id) {
      return Object.prototype.hasOwnProperty.call(ACCENTS, id) ? ACCENTS[id] : ACCENTS[DEFAULT_ACCENT]
    }

    /**
     * 合成一套完整 token：中性骨架 + 强调色派生项。
     * @param {string} accentId
     * @returns {Record<string, { light: string, dark: string }>}
     */
    function tokensFor(accentId) {
      const accent = accentFor(accentId)
      const tokens = Object.assign({}, NEUTRAL_TOKENS)
      // 强调色直接落到「品牌 / 链接 / 业务态」这几个语义位，组件不必知道我们改了什么。
      tokens['--dsw-alias-brand-primary'] = { light: accent.light, dark: accent.dark }
      tokens['--dsw-alias-brand-text'] = { light: accent.light, dark: accent.dark }
      tokens['--dsw-alias-link'] = { light: accent.light, dark: accent.dark }
      tokens['--dsw-alias-state-business-primary'] = { light: accent.light, dark: accent.dark }
      tokens['--dsw-alias-state-business-tertiary'] = {
        light: mix(accent.light, '#ffffff', 0.86),
        dark: mix(accent.dark, '#000000', 0.78)
      }
      tokens['--dsw-specific-sidebar-nav-item-active-accent'] = {
        light: mix(accent.light, '#ffffff', 0.8),
        dark: mix(accent.dark, '#000000', 0.7)
      }
      return tokens
    }

    /**
     * 把 `color` 按 `weight` 混向 `to`（0 = 原色，1 = 目标色）。
     * 只用来做同色系的浅/深着色，不做对比度推导。
     * @param {string} color
     * @param {string} to
     * @param {number} weight
     * @returns {string}
     */
    function mix(color, to, weight) {
      const a = parseHex(color)
      const b = parseHex(to)
      if (a === null || b === null) return color
      const w = Math.max(0, Math.min(1, weight))
      const channel = (x, y) => Math.round(x + (y - x) * w).toString(16).padStart(2, '0')
      return '#' + channel(a[0], b[0]) + channel(a[1], b[1]) + channel(a[2], b[2])
    }

    /** @param {string} hex */
    function parseHex(hex) {
      if (typeof hex !== 'string') return null
      const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
      if (m === null) return null
      const n = parseInt(m[1], 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }

    /** 读本地缓存的强调色；storage 不可用（隐私模式 / 非浏览器）时回默认值。 */
    function readStoredAccent() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        return Object.prototype.hasOwnProperty.call(ACCENTS, raw) ? raw : DEFAULT_ACCENT
      } catch (error) {
        return DEFAULT_ACCENT
      }
    }

    /** @param {string} id */
    function writeStoredAccent(id) {
      try {
        window.localStorage.setItem(STORAGE_KEY, id)
      } catch (error) {
        // 写不进去就让本次会话生效，下次打开回到默认值。
      }
    }

    /**
     * 应用外壳的 CRT 化：12px 壁纸边框 + 深蓝直角玻璃舱 + HUD 网格/扫描线。
     *
     * 参考 fro2asa70fpf1.png：主面板是深蓝半透明面板、细描边、无圆角；
     * 壁纸从 12px 边框和面板后透出，正文叠在 84%–90% 的深蓝底上。
     *
     * 参考 startup-poster.png 的冷蓝辉光：中心留亮、边缘压暗、青色高光，
     * 不直接叠海报图本身，避免画面里出现两个互相打架的 ISAF 标识。
     */
    const SHELL_CSS = [
      // 12px 壁纸边框由 body padding 产生——不依赖 #root 的直接子节点结构。
      // 壁纸放在 html 上、body 透明：12px 内边距和半透明面板都能透出它。
      'html{background-color:var(--dsw-alias-bg-base)!important;',
      'background-image:radial-gradient(ellipse 92% 78% at 50% 40%,rgba(233,239,247,.10) 0%,rgba(233,239,247,.20) 48%,rgba(233,239,247,.52) 100%),url("/theme-isaf/assets/wallpaper.png")!important;',
      'background-position:center,center!important;',
      'background-size:cover,cover!important;',
      'background-repeat:no-repeat,no-repeat!important;',
      'background-attachment:fixed,fixed!important}',
      'html:has(body[data-ds-dark-theme]){',
      'background-image:radial-gradient(ellipse 92% 78% at 50% 40%,rgba(3,9,18,.18) 0%,rgba(3,9,18,.30) 50%,rgba(3,9,18,.56) 100%),url("/theme-isaf/assets/wallpaper.png")!important}',
      'body{box-sizing:border-box;padding:12px;',
      '--dsw-alias-button-elevated-fill:rgba(14,33,53,.92)!important;',
      '--dsw-alias-button-floating-fill:rgba(11,27,44,.96)!important;',
      '--dsw-alias-button-floating-hover:rgba(24,48,72,.98)!important;',
      '--dsw-alias-label-primary-inverted:#07111d!important;',
      'background-color:transparent!important;background-image:none!important}',
      'body:has(#root > [data-dsh-boot]){padding:0!important;background-image:none!important}',
      '#root{background:transparent!important}',
      '#root>div{background-color:transparent!important}',
      // 参考 fro2asa70fpf1.png：深蓝半透明面板、细描边、直角，壁纸从面板后透出。
      // 注意：不能给这些面板加 backdrop-filter——Chrome 在透明祖先链下会把 backdrop
      // 采样成黑色，壁纸会被整片遮掉；只用 color-mix 的半透明底色。
      '#root > div[class*="_frame"],#root div[class*="_frame"]{',
      'background:transparent!important;border-radius:0!important;',
      'box-shadow:0 0 0 1px rgba(126,183,230,.34),0 0 42px rgba(100,190,240,.15),0 22px 70px rgba(0,0,0,.38),inset 0 0 46px rgba(3,9,18,.16)}',
      '#root div[class*="_frame"]::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;z-index:2;pointer-events:none;background:linear-gradient(90deg,rgba(126,183,230,0),rgba(126,183,230,.55),rgba(100,224,234,.32),rgba(126,183,230,0))}',
      '#root [class*="_sidebarCol"]{',
      'background:rgba(9,24,39,.90)!important;',
      'background:color-mix(in srgb,var(--dsw-specific-sidebar-fill) 86%,transparent)!important;',
      'border-radius:0!important;box-shadow:inset -1px 0 0 rgba(126,183,230,.16);',
      '}',
      'body[data-ds-dark-theme] #root [class*="_sidebarCol"]{background:rgba(7,15,27,.84)!important;',
      'background:color-mix(in srgb,var(--dsw-specific-sidebar-fill) 88%,transparent)!important}',
      '#root [class*="_centerCol"],#root [class*="_mainPanel"],#root [class*="_rightbarCol"],#root [class*="_overlayLayer"]{background:transparent!important;border-radius:0!important}',
      '#root .wSkVaW_root,#root [data-conversation-region="chat"]{',
      'background:rgba(11,26,44,.88)!important;border-radius:0!important;',
      'background:color-mix(in srgb,var(--dsw-alias-bg-base) 84%,transparent)!important;',
      'box-shadow:inset 0 0 0 1px rgba(126,183,230,.14);',
      '}',
      'body[data-ds-dark-theme] #root .wSkVaW_root,body[data-ds-dark-theme] #root [data-conversation-region="chat"]{',
      'background:rgba(5,11,22,.82)!important;',
      'background:color-mix(in srgb,var(--dsw-alias-bg-base) 86%,transparent)!important}',
      '#root [data-conversation-content],#root [data-conversation-scroll]{background:transparent!important;border-radius:0!important}',
      '.hHd-Xa_buildVersion{background:var(--dsw-alias-brand-primary)!important;color:#fff!important;border-radius:0!important}',
      '.Dc7zOa_header .cm-btn,.cm-btn.cm-stat-header{background:rgba(14,33,53,.92)!important;color:var(--dsw-alias-label-primary)!important;border:1px solid rgba(126,183,230,.28)!important;border-radius:0!important;box-shadow:0 0 0 1px rgba(3,9,18,.30)!important}',
      '.tsk-crt{position:fixed;inset:12px;z-index:900;pointer-events:none;opacity:.34;border-radius:0;overflow:hidden;',
      'background:',
      'repeating-linear-gradient(to right,rgba(126,183,230,.025) 0px,rgba(126,183,230,.025) 1px,rgba(126,183,230,0) 1px,rgba(126,183,230,0) 72px),',
      'repeating-linear-gradient(to bottom,rgba(126,183,230,.022) 0px,rgba(126,183,230,.022) 1px,rgba(126,183,230,0) 1px,rgba(126,183,230,0) 72px),',
      'repeating-linear-gradient(to bottom,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 3px,rgba(0,0,0,.045) 3px,rgba(0,0,0,.045) 4px),',
      'radial-gradient(ellipse at center,rgba(0,0,0,0) 58%,rgba(0,0,0,.14) 100%),',
      'linear-gradient(to bottom,rgba(126,183,230,0),rgba(126,183,230,.035) 48%,rgba(126,183,230,0));',
      'box-shadow:inset 0 0 120px rgba(0,0,0,.16);',
      'animation:tsk-crt-flicker 7s steps(1,end) infinite}',
      '.tsk-crt::after{content:"";position:absolute;left:0;right:0;top:-24%;height:24%;pointer-events:none;',
      'background:linear-gradient(to bottom,rgba(126,183,230,0),rgba(126,183,230,.10),rgba(126,183,230,0));',
      'animation:tsk-crt-sweep 9s linear infinite}',
      '@keyframes tsk-crt-flicker{0%,100%{opacity:.34}43%{opacity:.315}44%{opacity:.34}71%{opacity:.325}72%{opacity:.34}}',
      '@keyframes tsk-crt-sweep{0%{transform:translateY(0)}100%{transform:translateY(520%)}}',
      'body:has(#root > [data-dsh-boot]) .tsk-crt{display:none}',
      '@media (max-width:767px){body{padding:0}',
      '.tsk-crt{inset:0;border-radius:0}',
      '#root > div[class*="_frame"],#root div[class*="_frame"]{border-radius:0;box-shadow:none}}',
      '@media (prefers-reduced-motion:reduce){.tsk-crt{opacity:.26;animation:none}.tsk-crt::after{display:none}}'
    ].join('')

    /**
     * 把主题自带的启动 MP4 接到 dsh-boot-video（若已安装）。
     *
     * 只在用户尚未选择素材时补默认值，绝不覆盖已有选择；boot-video 缺席、
     * 导入关闭或网络失败都静默退回 index.js 的 BOOT_CSS / 启动封面。
     */
    async function linkBootVideo() {
      try {
        if (typeof window === 'undefined' || typeof window.fetch !== 'function') return
        const storage = window.localStorage
        if (storage === null || storage === undefined) return
        const source = storage.getItem(BOOT_VIDEO_SOURCE_KEY)
        if (source === 'off' || source === '550c') return

        const fixedUrl = '/dsh-boot-video/asset/' + BOOT_VIDEO_FIXED_ASSET + '.mp4'
        const head = await window.fetch(fixedUrl, { method: 'HEAD' })
        if (head.ok) {
          if (storage.getItem(BOOT_VIDEO_ASSET_KEY) === null) storage.setItem(BOOT_VIDEO_ASSET_KEY, BOOT_VIDEO_FIXED_ASSET)
          if (storage.getItem(BOOT_VIDEO_SOURCE_KEY) === null) storage.setItem(BOOT_VIDEO_SOURCE_KEY, 'video')
          return
        }
        // 已有别的用户素材：不抢用户选择。
        if (storage.getItem(BOOT_VIDEO_ASSET_KEY) !== null) return

        const response = await window.fetch('/theme-isaf/assets/startup.mp4')
        if (!response.ok || typeof response.blob !== 'function') return
        const blob = await response.blob()
        const imported = await window.fetch('/dsh-boot-video/import', {
          method: 'POST',
          headers: { 'x-dshbv-name': 'isaf-boot.mp4', 'x-dshbv-size': String(blob.size) },
          body: blob
        })
        if (!imported.ok) return
        const data = await imported.json()
        const id = data && data.asset && data.asset.id
        if (typeof id !== 'string' || id.length === 0) return
        if (storage.getItem(BOOT_VIDEO_ASSET_KEY) === null) storage.setItem(BOOT_VIDEO_ASSET_KEY, id)
        if (storage.getItem(BOOT_VIDEO_SOURCE_KEY) === null) storage.setItem(BOOT_VIDEO_SOURCE_KEY, 'video')
      } catch (error) {
        // 启动装饰失败不影响主题本身。
      }
    }

    /** 插件自带的样式表（插件自有 data-plugin 标记，卸载时整条移除）。 */
    function installStyles() {
      if (typeof document === 'undefined' || !document.head) return function noop() {}
      if (document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]') !== null) {
        return function noop() {}
      }
      const tag = document.createElement('style')
      tag.dataset.plugin = PACKAGE_ID
      tag.dataset.pluginCss = STYLE_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
      return function removeStyles() {
        tag.remove()
      }
    }

    /** 外壳样式 + 一个不挡鼠标的 CRT 扫描线层；卸载时一起撤掉。 */
    function installShellStyles() {
      if (typeof document === 'undefined' || !document.head) return function noop() {}
      if (document.querySelector('style[data-plugin-css="' + SHELL_STYLE_ID + '"]') !== null) {
        return function noop() {}
      }
      const tag = document.createElement('style')
      tag.dataset.plugin = PACKAGE_ID
      tag.dataset.pluginCss = SHELL_STYLE_ID
      tag.textContent = SHELL_CSS
      document.head.appendChild(tag)

      let overlay = null
      if (document.body && typeof document.body.appendChild === 'function') {
        overlay = document.createElement('div')
        overlay.className = 'tsk-crt'
        overlay.setAttribute('aria-hidden', 'true')
        document.body.appendChild(overlay)
      }
      return function removeShellStyles() {
        tag.remove()
        if (overlay !== null) overlay.remove()
      }
    }

    /**
     * 挂载 Client 半。
     * @param {import('cordis').Context} ctx
     */
    function apply(ctx) {
      const React = require('react')
      const h = React.createElement

      let accent = readStoredAccent()
      /** @type {null | (() => void)} 最近一层的 disposer；重复覆盖时旧的会变 no-op。 */
      let layerDispose = null

      /** 覆盖层必须活在根 ThemeRuntime 上，所以由 ctx.effect 创建、卸载时显式释放。 */
      function applyLayer() {
        const tokens = tokensFor(accent)
        layerDispose = ctx.theme.overrideTokens(PACKAGE_ID, tokens)
        return tokens
      }

      ctx.effect(function themeLayerEffect() {
        applyLayer()
        return function releaseThemeLayer() {
          const dispose = layerDispose
          layerDispose = null
          if (typeof dispose === 'function') {
            try {
              dispose()
            } catch (error) {
              console.warn(LOG_PREFIX + ' theme layer dispose failed', error)
            }
          }
        }
      }, 'theme-isaf: token override layer')

      function getAccent() {
        return accent
      }

      /** @param {string} next */
      function setAccent(next) {
        if (!Object.prototype.hasOwnProperty.call(ACCENTS, next) || next === accent) return
        accent = next
        writeStoredAccent(next)
        applyLayer()
      }

      /**
       * 设置行组件。props = locale 提供的 `t` + `inject()` 的返回值。
       * 不声明 `store` 选项，所以没有 `useStore`；选中态用组件自己的 state。
       */
      function AccentRow(props) {
        const p = props !== null && typeof props === 'object' ? props : {}
        const t = typeof p.t === 'function' ? p.t : function identity(key) { return String(key) }
        const read = typeof p.getAccent === 'function' ? p.getAccent : getAccent
        const write = typeof p.setAccent === 'function' ? p.setAccent : setAccent
        const pair = React.useState(read())
        const current = pair[0]
        const setCurrent = pair[1]

        function choose(id) {
          write(id)
          setCurrent(id)
        }

        return h('div', { className: 'tsk-group' }, [
          h('div', { key: 'banner', className: 'tsk-banner', 'aria-hidden': 'true' }, [
            h('span', { key: 'label', className: 'tsk-banner-label' }, 'ISAF T.C. SYSTEM'),
            h('span', { key: 'sub', className: 'tsk-banner-sub' }, 'TACTICAL CONTROL // VERSION 4.03')
          ]),
          h('div', { key: 'title', className: 'tsk-title' }, t('accent.title')),
          h('div', { key: 'hint', className: 'tsk-hint' }, t('accent.hint')),
          h('div', { key: 'row', className: 'tsk-row' }, Object.keys(ACCENTS).map(function renderChip(id) {
            const colors = accentFor(id)
            return h('button', {
              key: id,
              type: 'button',
              className: 'tsk-chip',
              'aria-pressed': current === id,
              style: { '--tsk-dot-light': colors.light, '--tsk-dot-dark': colors.dark },
              onClick: function onChipClick() { choose(id) }
            }, [
              h('span', { key: 'dot', className: 'tsk-dot', 'aria-hidden': 'true' }),
              h('span', { key: 'label' }, t(ACCENT_LABEL_KEYS[id]))
            ])
          }))
        ])
      }

      /**
       * 注册设置行。
       *
       * `settings.general.item` 是「设置 → 通用」里的一行座位（list 型），
       * 行的选项只有 `id`（row key）与 `order`；`locale` 给组件一个绑定好的 `t`，
       * `inject` 的返回值会展开成组件 props。
       *
       * 服务通过 ctx.inject 等待，避免 slots/locale 缺失时把整个插件挂起（主题色先上）。
       */
      function setupSettingsRow() {
        if (typeof ctx.inject !== 'function') {
          console.warn(LOG_PREFIX + ' ctx.inject is unavailable; settings row skipped (theme still applies)')
          return
        }
        ctx.inject(['slots', 'locale'], function mountSettingsRow(ui) {
          try {
            ui.effect(function stylesEffect() {
              return installStyles()
            }, 'theme-isaf: settings row styles')

            ui.effect(function localeEffect() {
              return ui.locale.register(NS, MESSAGES)
            }, 'theme-isaf: settings row dictionaries')

            ui.slots.inject(ROW_SLOT, function registerRow() {
              return ui.slots.register({
                name: ROW_SLOT,
                id: ENTRY_ID,
                order: 30,
                locale: NS,
                inject: function injectRow() {
                  return { getAccent, setAccent }
                }
              }, AccentRow)
            })
          } catch (error) {
            console.warn(LOG_PREFIX + ' settings row registration failed', error)
          }
        })
      }

      if (ctx.theme === null || ctx.theme === undefined || typeof ctx.theme.overrideTokens !== 'function') {
        console.warn(LOG_PREFIX + ' theme service is unavailable; nothing to override')
        return
      }

      ctx.effect(function shellChromeEffect() {
        return installShellStyles()
      }, 'theme-isaf: CRT shell chrome')

      // 不阻塞主题挂载；函数内部已吞掉所有失败。
      void linkBootVideo()




      try {
        setupSettingsRow()
      } catch (error) {
        console.warn(LOG_PREFIX + ' could not wait for slots/locale; settings row skipped', error)
      }
    }

    return {
      name: PACKAGE_ID,
      // theme 是硬依赖（没有它这个插件没意义）；slots/locale 在 apply 内部按需等待。
      inject: ['theme'],
      apply
    }
  }
})
