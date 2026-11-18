/*
 * 書き出しページ（リポジトリ直下の index.html）を手元のChromeで開き、post.html をPNGとリール動画に書き出す。
 * 人は公開した同じページに post.html と表紙の絵をドロップして書き出す。このスクリプトは、そのページを自動で動かす。
 *
 * 使い方: node export.mjs <post.html> [--reel]
 * 出力先: post.html と同じフォルダの output/slide-01.png, slide-02.png, …。--reel を付けると output/reel.mp4 も出す
 * 前提: Node.js、playwright（npm i playwright）、Google Chrome。ページは動画を作る部品をネットから読む。
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const withReel = args.includes('--reel')
const htmlArg = args.find((arg) => !arg.startsWith('--'))
const htmlPath = path.resolve(htmlArg ?? '')
if (!htmlArg || !fs.existsSync(htmlPath)) {
  console.error('usage: node export.mjs <post.html> [--reel]')
  process.exit(1)
}
const dir = path.dirname(htmlPath)
const outDir = path.join(dir, 'output')
const IMAGE = /\.(png|jpe?g|webp|avif|gif)$/i
// 同じフォルダの絵と、post.html が url(...) で指す手元の絵を渡す。ページは名前で突き合わせるので、同じ名前は1つにする
const images = new Map(fs.readdirSync(dir).filter((name) => IMAGE.test(name)).map((name) => [name, path.join(dir, name)]))
for (const [, src] of fs.readFileSync(htmlPath, 'utf8').matchAll(/url\(\s*["']?([^"')]+?)["']?\s*\)/g)) {
  if (/^(data:|[a-z]+:\/\/|\/\/)/i.test(src)) continue
  let file
  try {
    file = path.resolve(dir, decodeURIComponent(src.split(/[?#]/)[0]))
  } catch {
    continue
  }
  if (IMAGE.test(file) && fs.existsSync(file)) images.set(path.basename(file), file)
}

// リポジトリ直下を配る。ページは assets/instagram/ のひな形と書体を読む
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const types = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' }
const server = http.createServer((req, res) => {
  let file
  try {
    file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname))
  } catch {
    res.writeHead(400).end()
    return
  }
  if (file.endsWith(path.sep)) file = path.join(file, 'index.html')
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

// 動画（H.264）を作るには、Playwright 同梱のChromiumではなくGoogle Chromeが要る
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
page.on('pageerror', (error) => console.error(error))
const finish = async (code) => {
  await browser.close()
  server.close()
  process.exit(code)
}
const waitState = (states, timeout) =>
  page.waitForFunction((list) => list.includes(document.body.dataset.state), states, { timeout })

await page.goto(`http://127.0.0.1:${server.address().port}/`)
await waitState(['idle', 'error'], 120_000)
if ((await page.evaluate(() => document.body.dataset.state)) === 'error') {
  console.error((await page.textContent('#msg')).trim())
  await finish(1)
}
await page.setInputFiles('#files', [htmlPath, ...images.values()])
await waitState(['ready', 'overflow', 'error'], 120_000)
const state = await page.evaluate(() => document.body.dataset.state)
const message = (await page.textContent('#msg')).trim()
if (state === 'error') {
  console.error(message)
  await finish(1)
}

// 画面に出ている面の絵をそのまま保存する。はみ出した面は赤い枠が付いた絵になる
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
const pngs = await page.evaluate(() =>
  Promise.all(
    [...document.querySelectorAll('#slides img')].map(async (img) => {
      const blob = await (await fetch(img.src)).blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      })
    }),
  ),
)
for (const [i, base64] of pngs.entries()) {
  const file = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`)
  fs.writeFileSync(file, Buffer.from(base64, 'base64'))
  console.log(file)
}
if (state === 'overflow') {
  console.error(message)
  await finish(1)
}

if (withReel) {
  // 動画づくりに失敗するとページは error になり、保存は起きない
  const download = page.waitForEvent('download', { timeout: 600_000 })
  const failed = waitState(['error'], 600_000).then(() => null)
  download.catch(() => {})
  failed.catch(() => {})
  await page.click('#save-reel')
  const result = await Promise.race([download, failed])
  if (!result) {
    console.error((await page.textContent('#msg')).trim())
    await finish(1)
  }
  const file = path.join(outDir, 'reel.mp4')
  await result.saveAs(file)
  console.log(`${file}（${(await page.textContent('#msg')).trim()}）`)
}
await finish(0)
