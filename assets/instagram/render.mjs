/*
 * post.html の各 .slide を 1080×1350 のPNGに書き出す。
 *
 * 使い方: node render.mjs <post.html>
 * 出力先: post.html と同じフォルダの output/slide-01.png, slide-02.png, …
 * 前提: Node.js と playwright（npm i playwright）。書体を読むのでネットにつながっていること。
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const htmlPath = path.resolve(process.argv[2] ?? '')
if (!process.argv[2] || !fs.existsSync(htmlPath)) {
  console.error('usage: node render.mjs <post.html>')
  process.exit(1)
}
const outDir = path.join(path.dirname(htmlPath), 'output')
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

// Playwright のブラウザが入っていなければ、手元の Chrome を使う
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 })
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)

const slides = await page.locator('.slide').all()
let overflow = 0
for (const [i, slide] of slides.entries()) {
  const file = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`)
  if (await slide.evaluate((el) => el.classList.contains('is-overflow'))) {
    overflow += 1
    console.error(`はみ出し: ${i + 1}枚目`)
  }
  await slide.screenshot({ path: file })
  console.log(file)
}
await browser.close()
if (overflow > 0) process.exit(1)
