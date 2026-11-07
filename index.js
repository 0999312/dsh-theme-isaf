/**
 * 宿主半（Host half）。
 *
 * 主题的浏览器半在 client.js 里换 token；这里只做两件浏览器半做不到的事：
 *
 *   1. 首帧启动画面：DSH 的 boot DOM（#root > [data-dsh-boot]）在 React 挂载前
 *      就由入口 bundle 建好，浏览器插件加载时已经太晚。这里通过
 *      `webserver/index-inject` 把一段 <style> 塞进 <head> 最前面，让第一帧
 *      就是 ISAF 启动动画，而不是默认的 HARNESS 字标。
 *   2. 自带资源：内置的 /plugins/<pkg>/assets 只放行 svg/png/webp/jpg/jpeg，
 *      启动 MP4 不在白名单里，所以壁纸与启动动画由本插件注册
 *      /theme-isaf/assets 前缀路由自己发。资源只读包内 assets/，不做目录穿越。
 *
 * 浏览器半用 `/theme-isaf/assets/wallpaper.png` 作 CRT 边框与设置行预览；
 * 启动画面优先由 dsh-boot-video 播放 `startup.mp4`，boot-video 缺席时
 * 用 `startup-poster.png` 做首帧静态封面。这些路由都由本文件提供。
 *
 * @param {import('cordis').Context} ctx - 宿主侧插件上下文。
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/** Loader 插件行 id，与 cordis.patch.yml 的 `id:`、client.js 的 ENTRY_ID 保持一致。 */
export const ENTRY_ID = 'theme-isaf'

/** 路由前缀：对外暴露主题自带的启动画面与壁纸。 */
const ASSET_PREFIX = '/theme-isaf/assets'

/** 资源清单：只认这几个文件名，其余一律 404（顺带挡住 ../ 之类的探测）。 */
const ASSETS = new Map([
  ['/startup.mp4', { file: 'startup.mp4', type: 'video/mp4' }],
  ['/startup-poster.png', { file: 'startup-poster.png', type: 'image/png' }],
  ['/wallpaper.png', { file: 'wallpaper.png', type: 'image/png' }]
])

/** 与 client.js 的 BOOT_VIDEO_FIXED_ASSET / KEY 保持一致。 */
const BOOT_VIDEO_ASSET_ID = 'u-isaf-boot'
const BOOT_VIDEO_SOURCE_KEY = 'dsh-boot-video:source'
const BOOT_VIDEO_ASSET_KEY = 'dsh-boot-video:asset'

/**
 * 若宿主 profile 里装了 dsh-boot-video，并且用户素材目录已经有 ISAF 的固定素材，
 * 就在 boot-video 自己的启动脚本之前把默认素材补进 localStorage。
 * 只补 null，绝不覆盖用户已经做出的选择。
 */
export const BOOT_DEFAULTS_SCRIPT = `
try {
  var storage = window.localStorage;
  var source = storage.getItem('${BOOT_VIDEO_SOURCE_KEY}');
  if (source !== 'off' && source !== '550c') {
    if (storage.getItem('${BOOT_VIDEO_SOURCE_KEY}') === null) storage.setItem('${BOOT_VIDEO_SOURCE_KEY}', 'video');
    if (storage.getItem('${BOOT_VIDEO_ASSET_KEY}') === null) storage.setItem('${BOOT_VIDEO_ASSET_KEY}', '${BOOT_VIDEO_ASSET_ID}');
  }
} catch (error) {}
`

const requireFromTheme = createRequire(import.meta.url)

/** @returns {boolean} 本机 profile 是否已 seed 固定启动素材。 */
function hasBootVideoAsset () {
  try {
    const packagePath = requireFromTheme.resolve('dsh-boot-video/package.json')
    return existsSync(join(dirname(packagePath), 'assets', 'user', BOOT_VIDEO_ASSET_ID + '.mp4'))
  } catch (error) {
    return false
  }
}

const ASSET_DIR = new URL('./assets/', import.meta.url)

/**
 * 首帧换皮：DSH 的 boot 节点稳定钩子是 `[data-dsh-boot]`，挂在 #root 下。
 * 这里用 ID + 属性选择器压过 dist 里的 `._boot_xxx`，并隐藏它自带的
 * wordmark / spinner / hint —— 动画本身已经包含系统字与徽章。
 *
 * 注意：不要往 boot 里塞节点。React 挂载时会 hydrateRoot 并用
 * dangerouslySetInnerHTML 复用 boot.innerHTML，塞自定义节点会破坏交接；
 * 纯 CSS 换背景是唯一安全的做法。
 */
export const BOOT_CSS = `
html:has(#root > [data-dsh-boot]),
body:has(#root > [data-dsh-boot]) {
  background-color: #000 !important;
}

#root > [data-dsh-boot] {
  position: relative !important;
  background-color: #000 !important;
  background-image:
    repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.22) 2px, rgba(0, 0, 0, 0.22) 3px),
    radial-gradient(ellipse at 50% 50%, rgba(24, 72, 128, 0.5) 0%, rgba(2, 8, 18, 0) 66%),
    radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 52%, rgba(0, 0, 0, 0.62) 100%),
    url("/theme-isaf/assets/startup-poster.png") !important;
  background-position: center, center, center, center !important;
  background-size: cover, cover, cover, contain !important;
  background-repeat: no-repeat, no-repeat, no-repeat, no-repeat !important;
}

#root > [data-dsh-boot] > * {
  opacity: 0 !important;
  pointer-events: none !important;
}

#root > [data-dsh-boot]::before {
  content: "I.S.A.F. T.C. SYSTEM  //  BOOT SEQUENCE 4.03";
  position: absolute;
  left: 26px;
  bottom: 22px;
  z-index: 2;
  font: 500 10px/1.6 "Cascadia Mono", "Consolas", "SFMono-Regular", ui-monospace, monospace;
  letter-spacing: 0.22em;
  color: rgba(146, 198, 240, 0.64);
  text-shadow: 0 0 10px rgba(88, 163, 224, 0.55);
  pointer-events: none;
}

@media (max-width: 520px) {
  #root > [data-dsh-boot]::before {
    left: 14px;
    bottom: 14px;
    font-size: 8px;
    letter-spacing: 0.14em;
  }
}

@media (prefers-reduced-motion: reduce) {
  #root > [data-dsh-boot] {
    background-image:
      radial-gradient(ellipse at 50% 50%, rgba(24, 72, 128, 0.5) 0%, rgba(2, 8, 18, 0) 66%),
      url("/theme-isaf/assets/startup-poster.png") !important;
  }
}
`

/** 一张资源图对应的 Response；HEAD 只回头。 */
async function assetResponse(request, asset) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' }
    })
  }
  const data = await readFile(new URL(asset.file, ASSET_DIR))
  const headers = {
    'content-type': asset.type,
    'content-length': String(data.byteLength),
    // 本地资源，版本随包走；给一天缓存，避免每次刷新重拉启动视频。
    'cache-control': 'public, max-age=86400'
  }
  return new Response(request.method === 'HEAD' ? null : data, { status: 200, headers })
}

/**
 * 挂载宿主半。
 * @param {import('cordis').Context} ctx
 */
export function apply (ctx) {
  // 首帧样式：prepend 保证它排在 dist 的 CSS 之前，第一帧就生效。
  ctx.on('webserver/index-inject', function injectBootStyle (table) {
    table.push({ kind: 'style', text: BOOT_CSS })
  }, { prepend: true })

  // 只有本机 profile 已 seed 固定素材时才改 boot-video 的默认值；
  // 否则 boot-video 会去请求一个不存在的 u-isaf-boot.mp4。
  if (hasBootVideoAsset()) {
    ctx.on('webserver/index-inject', function injectBootDefaults (table) {
      table.push({ kind: 'script', text: BOOT_DEFAULTS_SCRIPT })
    }, { prepend: true })
  }

  // webServer 可能晚于本插件就绪；ctx.inject 会等它出现，插件不因此挂起。
  ctx.inject(['webServer'], function registerAssets (child) {
    child.effect(function assetRouteEffect () {
      return child.webServer.register({
        kind: 'prefix',
        path: ASSET_PREFIX,
        resource: async function serveAsset (request) {
          let suffix = ''
          try {
            suffix = new URL(request.url, 'http://theme.local').pathname.slice(ASSET_PREFIX.length)
          } catch (error) {
            return new Response('Bad Request', { status: 400 })
          }
          const asset = ASSETS.get(suffix)
          if (asset === undefined) {
            return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })
          }
          return assetResponse(request, asset)
        }
      })
    }, 'theme-isaf: boot assets')
  })
}
