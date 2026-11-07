/**
 * 骨架自检（不需要浏览器、不需要装进 profile）：
 *
 *   1. 在 vm 里加载 client.js，假装 `window.__ModuleLoader__`，把 bundle 跑起来；
 *   2. 用一个假的 cordis ctx 调 apply()，验证：
 *      - 只 require('react')（其它模块直接抛错）；
 *      - overrideTokens 收到 PACKAGE_ID + 一整套 light/dark 双值 token；
 *      - settings.general.item 上注册了一行，id/order/locale 齐全；
 *      - 换强调色会重下一层（token 值确实变了）并写进 localStorage；
 *      - 行组件真的能渲染出三个按钮。
 *   3. 对实际 token 值做 WCAG 对比度体检（正文 ≥ 4.5:1，主文本 ≥ 7:1）。
 *
 * 跑法：node scripts/smoke.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE_ID = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).name
const ENTRY_ID = (/- id:\s*([^\s]+)/.exec(fs.readFileSync(path.join(ROOT, 'cordis.patch.yml'), 'utf8')) || [])[1]
const STORAGE_KEY = PACKAGE_ID + '/accent'
const ROW_SLOT = 'settings.general.item'
const SOURCE = path.join(ROOT, 'client.js')

const failures = []
const notes = []

function check(label, fn) {
  try {
    fn()
    notes.push('  ok   ' + label)
  } catch (error) {
    failures.push(label + ': ' + (error && error.message ? error.message : String(error)))
    notes.push('  FAIL ' + label)
  }
}

async function checkAsync(label, fn) {
  try {
    await fn()
    notes.push('  ok   ' + label)
  } catch (error) {
    failures.push(label + ': ' + (error && error.message ? error.message : String(error)))
    notes.push('  FAIL ' + label)
  }
}

// ---------------------------------------------------------------- 假的运行时

const store = new Map()
const requireLog = []
const React = {
  createElement(type, props, ...children) {
    return { type, props: props || {}, children: children.flat(Infinity) }
  },
  useState(initial) {
    return [initial, function noopSetState() {}]
  }
}
function fakeRequire(name) {
  requireLog.push(name)
  if (name === 'react') return React
  throw new Error('bundle require an undeclared module: ' + name)
}

const appended = []
const sandbox = {
  console,
  window: {
    __ModuleLoader__: {
      load(definition) {
        sandbox.__definition = definition
      }
    },
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null
      },
      setItem(key, value) {
        store.set(key, String(value))
      }
    }
  },
  document: {
    head: {
      appendChild(node) {
        appended.push(node)
      }
    },
    body: {
      appendChild(node) {
        appended.push(node)
      }
    },
    querySelector() {
      return null
    },
    createElement() {
      return {
        dataset: {},
        className: '',
        textContent: '',
        setAttribute() {},
        remove() {}
      }
    }
  }
}
sandbox.globalThis = sandbox

vm.runInNewContext(fs.readFileSync(SOURCE, 'utf8'), sandbox, { filename: SOURCE })

const definition = sandbox.__definition
const plugin = definition ? definition.factory(fakeRequire) : null

// ---------------------------------------------------------------- 假的 ctx

const calls = { override: [], rows: [], locale: [], effects: [], injects: [] }

function makeChildContext() {
  return {
    effect(fn, label) {
      calls.effects.push(label)
      const dispose = fn()
      return function disposeEffect() {
        if (typeof dispose === 'function') dispose()
      }
    },
    locale: {
      register(namespace, dictionaries) {
        calls.locale.push({ namespace, dictionaries })
        return function unregister() {}
      }
    },
    slots: {
      inject(name, callback) {
        calls.injects.push('slot:' + name)
        return callback()
      },
      register(options, Component) {
        calls.rows.push({ options, Component })
        return function unregister() {}
      }
    }
  }
}

const ctx = {
  theme: {
    overrideTokens(source, tokens) {
      calls.override.push({ source, tokens })
      return function disposeLayer() {}
    }
  },
  effect(fn, label) {
    calls.effects.push(label)
    const dispose = fn()
    return function disposeEffect() {
      if (typeof dispose === 'function') dispose()
    }
  },
  inject(deps, callback) {
    calls.injects.push(deps.join(','))
    return callback(makeChildContext())
  }
}

// ---------------------------------------------------------------- 1. bundle 与插件对象

check('bundle 通过 __ModuleLoader__ 注册且 id 正确', () => {
  assert.ok(definition, '__ModuleLoader__.load 没有被调用')
  assert.equal(definition.id, PACKAGE_ID)
})

check('插件对象 = { name, inject, apply }', () => {
  assert.equal(plugin.name, PACKAGE_ID)
  assert.deepEqual([...plugin.inject], ['theme'])
  assert.equal(typeof plugin.apply, 'function')
})

// ---------------------------------------------------------------- 2. apply 行为

plugin.apply(ctx)

check('factory 只 require 了 react', () => {
  assert.deepEqual([...new Set(requireLog)], ['react'])
})

check('apply 下了一层 override，source = 包名', () => {
  assert.equal(calls.override.length, 1)
  assert.equal(calls.override[0].source, PACKAGE_ID)
  assert.equal(calls.override[0].tokens['--dsw-alias-brand-primary'].light, '#3e6bac')
  assert.equal(calls.override[0].tokens['--dsw-alias-label-primary'].light, '#d8ecff')
  assert.equal(calls.override[0].tokens['--dsw-alias-label-caption'].light, '#86a7c6')
})

check('装了外壳样式与 CRT 扫描线层', () => {
  const shellStyle = appended.find((node) => node.dataset && node.dataset.pluginCss === PACKAGE_ID + '/shell-v6')
  assert.ok(shellStyle, '没有外壳 <style>')
  assert.match(shellStyle.textContent, /tsk-crt/)
  assert.match(shellStyle.textContent, /padding:12px/)
  assert.match(shellStyle.textContent, /rgba\(233,239,247,\.22\)/)
  assert.match(shellStyle.textContent, /color-mix\(in srgb,var\(--dsw-alias-bg-base\) 84%,transparent\)/)
  assert.match(shellStyle.textContent, /color-mix\(in srgb,var\(--dsw-specific-sidebar-fill\) 86%,transparent\)/)
  assert.doesNotMatch(shellStyle.textContent, /backdrop-filter:blur/)
  assert.match(shellStyle.textContent, /#root\{background:transparent/) 
  assert.match(shellStyle.textContent, /border-radius:0/)
  assert.match(shellStyle.textContent, /repeating-linear-gradient\(to right/)
  assert.ok(appended.some((node) => node.className === 'tsk-crt'), '没有 CRT 扫描线层')
})

check('token 每个都是 { light, dark } 双值、6/8 位 hex', () => {
  const tokens = calls.override[0].tokens
  const names = Object.keys(tokens)
  assert.equal(names.length, 34, '应当是 28 个中性 + 6 个强调派生，实际 ' + names.length)
  for (const name of names) {
    assert.match(name, /^--dsw-(alias|specific)-/, '不是 --dsw-alias-/--dsw-specific- 前缀：' + name)
    const pair = tokens[name]
    assert.equal(typeof pair, 'object', name + ' 不是对象')
    for (const mode of ['light', 'dark']) {
      assert.match(pair[mode], /^(#[0-9a-f]{6}|#[0-9a-f]{8})$/, name + ' 的 ' + mode + ' 值必须是 6/8 位 hex：' + pair[mode])
    }
  }
})

check('注册了 settings.general.item 一行', () => {
  assert.equal(calls.rows.length, 1)
  const options = calls.rows[0].options
  assert.equal(options.name, ROW_SLOT)
  assert.equal(options.id, ENTRY_ID)
  assert.equal(typeof options.order, 'number')
  assert.equal(options.locale, PACKAGE_ID)
  assert.equal(typeof calls.rows[0].Component, 'function')
  assert.ok(calls.injects.includes('slot:' + ROW_SLOT), '没有 inject 到 ' + ROW_SLOT)
})

check('注册了 zh + en 词典', () => {
  assert.equal(calls.locale.length, 1)
  const dictionaries = calls.locale[0].dictionaries
  assert.ok(dictionaries.zh['accent.title'])
  assert.ok(dictionaries.en['accent.title'])
})

check('行组件渲染出 3 个强调色按钮', () => {
  const Component = calls.rows[0].Component
  const element = Component({ t: (key) => key, getAccent: () => 'isaf', setAccent() {} })
  const buttons = []
  const walk = (node) => {
    if (node === null || node === undefined) return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (typeof node !== 'object') return
    if (node.type === 'button') buttons.push(node)
    if (node.children) walk(node.children)
  }
  walk(element)
  assert.equal(buttons.length, 3)
  for (const button of buttons) {
    assert.equal(typeof button.props.onClick, 'function')
    assert.match(button.props.style['--tsk-dot-light'], /^#[0-9a-f]{6}$/)
    assert.match(button.props.style['--tsk-dot-dark'], /^#[0-9a-f]{6}$/)
  }
  const pressed = buttons.filter((button) => button.props['aria-pressed'] === true)
  assert.equal(pressed.length, 1, '默认应当只有一个被选中')
})

check('点按钮会回写选中值', () => {
  const Component = calls.rows[0].Component
  const written = []
  const element = Component({ t: (key) => key, getAccent: () => 'isaf', setAccent: (id) => written.push(id) })
  const buttons = []
  const walk = (node) => {
    if (node === null || node === undefined) return
    if (Array.isArray(node)) return node.forEach(walk)
    if (typeof node !== 'object') return
    if (node.type === 'button') buttons.push(node)
    if (node.children) walk(node.children)
  }
  walk(element)
  buttons[1].props.onClick()
  assert.deepEqual(written, ['cyan'])
})

check('换色会重下 override 层并持久化', () => {
  const actions = calls.rows[0].options.inject()
  assert.equal(typeof actions.setAccent, 'function')
  assert.equal(actions.getAccent(), 'isaf')
  actions.setAccent('cyan')
  assert.equal(calls.override.length, 2, '第二次没有重新覆盖')
  assert.equal(calls.override[1].tokens['--dsw-alias-brand-primary'].light, '#0b6470')
  assert.equal(store.get(STORAGE_KEY), 'cyan')
  actions.setAccent('cyan')
  assert.equal(calls.override.length, 2, '同一个值不该重下')
  actions.setAccent('nope')
  assert.equal(calls.override.length, 2, '未知值应被忽略')
})

// ---------------------------------------------------------------- 3. 对比度体检

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const linear = channels.map((channel) => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((left, right) => right - left)
  return (x + 0.05) / (y + 0.05)
}

const table = []
const expectContrast = (label, foreground, background, minimum) => {
  const value = contrast(foreground, background)
  const passed = value >= minimum
  check(label + ' 对比度 ' + value.toFixed(2) + ':1 >= ' + minimum, () => {
    assert.ok(passed, label + ' 只有 ' + value.toFixed(2) + ':1')
  })
  return value
}

const actions = calls.rows[0].options.inject()
for (const accentId of ['isaf', 'cyan', 'amber']) {
  actions.setAccent(accentId)
  const tokens = calls.override[calls.override.length - 1].tokens
  for (const mode of ['light', 'dark']) {
    const bg = tokens['--dsw-alias-bg-base'][mode]
    const row = { accent: accentId, mode, tokens }
    row.primary = expectContrast('[' + accentId + '·' + mode + '] label-primary / bg-base', tokens['--dsw-alias-label-primary'][mode], bg, 7)
    row.secondary = expectContrast('[' + accentId + '·' + mode + '] label-secondary / bg-base', tokens['--dsw-alias-label-secondary'][mode], bg, 4.5)
    row.tertiary = expectContrast('[' + accentId + '·' + mode + '] label-tertiary / bg-base', tokens['--dsw-alias-label-tertiary'][mode], bg, 4.5)
    row.caption = expectContrast('[' + accentId + '·' + mode + '] label-caption / bg-base', tokens['--dsw-alias-label-caption'][mode], bg, 4.5)
    row.onBrand = expectContrast(
      '[' + accentId + '·' + mode + '] label-primary-foreground / brand-primary',
      tokens['--dsw-alias-label-primary-foreground'][mode],
      tokens['--dsw-alias-brand-primary'][mode],
      4.5
    )
    table.push(row)
  }
}

// ---------------------------------------------------------------- 4. host 半

const host = await import(pathToFileURL(path.join(ROOT, 'index.js')).href)

check('host 半 ENTRY_ID 与 cordis id 一致', () => {
  assert.equal(host.ENTRY_ID, ENTRY_ID)
})

const hostEvents = []
const hostRoutes = []
const hostCtx = {
  on(event, handler, options) {
    hostEvents.push({ event, handler, options })
    return function off() {}
  },
  inject(deps, callback) {
    return callback({
      effect(fn) {
        return fn()
      },
      webServer: {
        register(route) {
          hostRoutes.push(route)
          return function unregister() {}
        }
      }
    })
  }
}
host.apply(hostCtx)

check('host 半向 webserver/index-inject 推了首帧样式', () => {
  assert.ok(hostEvents.length >= 1, '没有 index-inject 监听器')
  const styleEvent = hostEvents.find((event) => {
    const table = []
    event.handler(table)
    return table.some((row) => row.kind === 'style')
  })
  assert.ok(styleEvent, '没有推 style 的监听器')
  assert.equal(styleEvent.event, 'webserver/index-inject')
  assert.equal(styleEvent.options.prepend, true)
  const table = []
  styleEvent.handler(table)
  const styleRow = table.find((row) => row.kind === 'style')
  assert.match(styleRow.text, /\[data-dsh-boot\]/)
  assert.match(styleRow.text, /startup-poster\.png/)
  assert.doesNotMatch(styleRow.text, /startup\.gif/)
  assert.match(styleRow.text, /opacity: 0/)
})

check('host 半导出 boot-video 默认素材脚本，只补 null', () => {
  assert.equal(typeof host.BOOT_DEFAULTS_SCRIPT, 'string')
  assert.match(host.BOOT_DEFAULTS_SCRIPT, /dsh-boot-video:source/)
  assert.match(host.BOOT_DEFAULTS_SCRIPT, /dsh-boot-video:asset/)
  assert.match(host.BOOT_DEFAULTS_SCRIPT, /u-isaf-boot/)
  assert.match(host.BOOT_DEFAULTS_SCRIPT, /=== null/)
})

check('BOOT_DEFAULTS_SCRIPT 只补 null，不覆盖 off', () => {
  const run = (initial) => {
    const storage = new Map(Object.entries(initial))
    vm.runInNewContext(host.BOOT_DEFAULTS_SCRIPT, {
      window: { localStorage: {
        getItem(key) { return storage.has(key) ? storage.get(key) : null },
        setItem(key, value) { storage.set(key, String(value)) }
      } }
    })
    return storage
  }
  const empty = run({})
  assert.equal(empty.get('dsh-boot-video:source'), 'video')
  assert.equal(empty.get('dsh-boot-video:asset'), 'u-isaf-boot')
  const off = run({ 'dsh-boot-video:source': 'off' })
  assert.equal(off.get('dsh-boot-video:source'), 'off')
  assert.equal(off.has('dsh-boot-video:asset'), false)
  const chosen = run({ 'dsh-boot-video:source': 'video', 'dsh-boot-video:asset': 'u-someone' })
  assert.equal(chosen.get('dsh-boot-video:asset'), 'u-someone')
})

check('host 半注册了前缀资源路由', () => {
  assert.equal(hostRoutes.length, 1)
  assert.equal(hostRoutes[0].kind, 'prefix')
  assert.equal(hostRoutes[0].path, '/theme-isaf/assets')
  assert.equal(typeof hostRoutes[0].resource, 'function')
})

const serve = hostRoutes[0].resource
const assetUrl = (name) => 'http://127.0.0.1:3080/theme-isaf/assets/' + name

await checkAsync('GET wallpaper.png 返回 image/png 与完整字节数', async () => {
  const response = await serve(new Request(assetUrl('wallpaper.png')))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/png')
  assert.match(response.headers.get('cache-control'), /max-age=\d+/)
  const bytes = await response.arrayBuffer()
  assert.equal(bytes.byteLength, fs.statSync(path.join(ROOT, 'assets', 'wallpaper.png')).size)
  assert.equal(response.headers.get('content-length'), String(bytes.byteLength))
})

await checkAsync('GET startup-poster.png 返回 image/png 与完整字节数', async () => {
  const expected = fs.statSync(path.join(ROOT, 'assets', 'startup-poster.png')).size
  const response = await serve(new Request(assetUrl('startup-poster.png')))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/png')
  assert.equal((await response.arrayBuffer()).byteLength, expected)
})

await checkAsync('GET startup.mp4 返回 video/mp4 与完整字节数', async () => {
  const expected = fs.statSync(path.join(ROOT, 'assets', 'startup.mp4')).size
  const response = await serve(new Request(assetUrl('startup.mp4')))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'video/mp4')
  assert.equal((await response.arrayBuffer()).byteLength, expected)
})

await checkAsync('HEAD 只回头、不带 body', async () => {
  const response = await serve(new Request(assetUrl('wallpaper.png'), { method: 'HEAD' }))
  assert.equal(response.status, 200)
  assert.equal(response.body, null)
  assert.equal(response.headers.get('content-type'), 'image/png')
})

await checkAsync('相对 URL 也能取到资源', async () => {
  const response = await serve({ url: '/theme-isaf/assets/wallpaper.png', method: 'GET' })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/png')
})

await checkAsync('未知资源与目录探测返回 404', async () => {
  const unknown = await serve(new Request(assetUrl('nope.png')))
  assert.equal(unknown.status, 404)
  const traversal = await serve(new Request('http://127.0.0.1:3080/theme-isaf/assets/%2e%2e/package.json'))
  assert.equal(traversal.status, 404)
})

await checkAsync('非 GET/HEAD 返回 405 且带 allow', async () => {
  const response = await serve(new Request(assetUrl('wallpaper.png'), { method: 'POST' }))
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'GET, HEAD')
})

// ---------------------------------------------------------------- 输出

console.log('\nbundle / host 自检')
for (const line of notes.filter((line) => !line.includes('对比度'))) console.log(line)

console.log('\n对比度体检（全部三个强调色）')
console.log('  ' + ['强调色·模式', '主文本', '次级', '三级', '说明文字', '品牌色上的文字'].join(' | '))
for (const row of table) {
  console.log('  ' + [
    row.accent + '·' + row.mode,
    row.primary.toFixed(2),
    row.secondary.toFixed(2),
    row.tertiary.toFixed(2),
    row.caption.toFixed(2),
    row.onBrand.toFixed(2)
  ].join(' | '))
}

const contrastChecks = notes.filter((line) => line.includes('对比度'))
console.log('  (' + contrastChecks.length + ' 项对比度断言，' + (contrastChecks.length - failures.filter((f) => f.includes('对比度')).length) + ' 通过)')

if (failures.length > 0) {
  console.error('\n' + failures.length + ' 项失败：')
  for (const failure of failures) console.error(' - ' + failure)
  process.exitCode = 1
} else {
  console.log('\n全部通过。')
}
