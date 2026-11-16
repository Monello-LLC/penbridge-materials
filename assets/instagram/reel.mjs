/*
 * post.html（カルーセルと同じファイル）に動きを付け、リール用の動画に書き出す。
 *
 * 使い方: node reel.mjs <post.html>
 * 出力先: post.html と同じフォルダの output/reel.mp4（1080×1920、30fps、音なし）
 * 前提: Node.js、playwright（npm i playwright）、ffmpeg。書体は同梱の fonts/ を使うので、ネットにつながっていなくてもよい。
 *
 * 動き: 金の枠を描き、表紙の絵がアーチの下から現れる。中面は白い面が上から開き、行が1つずつ出て、
 * 蛍光ペンの線が左から引かれる。1枚の長さは表紙3.4秒、中面5.6秒、最後の面4.6秒。
 * 変えたい面には <section class="slide" data-seconds="7"> のように秒数を書く。
 * 時刻を1コマずつ進めて撮るので、何度書き出しても同じ動画になる。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { blockWebFonts, useBundledFonts } from './fonts.mjs'

const FPS = 30
const htmlPath = path.resolve(process.argv[2] ?? '')
if (!process.argv[2] || !fs.existsSync(htmlPath)) {
  console.error('usage: node reel.mjs <post.html>')
  process.exit(1)
}
const outDir = path.join(path.dirname(htmlPath), 'output')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'reel.mp4')

// Playwright のブラウザが入っていなければ、手元の Chrome を使う
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
await blockWebFonts(page)
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
await useBundledFonts(page)
await page.waitForTimeout(300)

const overflow = await page.locator('.slide.is-overflow').count()
if (overflow > 0) {
  console.error(`はみ出した面が${overflow}枚ある。先に render.mjs で確かめて直す`)
  await browser.close()
  process.exit(1)
}

const total = await page.evaluate(() => {
  const EASE = 'cubic-bezier(.2,.7,.2,1)'
  const INOUT = 'cubic-bezier(.65,0,.35,1)'
  const slides = [...document.querySelectorAll('.slide')]
  const style = document.createElement('style')
  // 1080×1350 の面を上から240pxに置く。下はInstagramの文やボタンが重なるので広く空ける
  style.textContent = `
    html, body { width: 1080px; height: 1920px; overflow: hidden; background: #00274f; }
    .slide { position: absolute !important; left: 0; top: 240px; margin: 0 !important; }
    .slide .frame { display: none; }
    mark { background-repeat: no-repeat; }
    .gframe { position: absolute; left: 0; top: 240px; width: 1080px; height: 1350px; stroke: #c3a15c; z-index: 100; }
  `
  document.head.append(style)

  const seconds = (slide, i) =>
    Number(slide.dataset.seconds) || (i === 0 ? 3.4 : i === slides.length - 1 ? 4.6 : 5.6)
  const start = []
  let t = 0
  slides.forEach((slide, i) => { start.push(t); t += seconds(slide, i) * 1000 })
  const total = t

  const enter = (el, delay, from, dur = 650, easing = EASE) =>
    el?.animate([from, {}], { delay, duration: dur, fill: 'both', easing })
  // 出て、とどまり、消えるまでを1本の動きにする
  const life = (el, s, e, inDur, outDur, from, rest, to) => {
    const d = e - s
    const frames = [{ ...from, offset: 0, easing: INOUT }, { ...rest, offset: inDur / d }]
    if (to) frames.push({ ...rest, offset: 1 - outDur / d, easing: INOUT }, { ...to, offset: 1 })
    else frames.push({ ...rest, offset: 1 })
    el.animate(frames, { delay: s, duration: d, fill: 'both' })
  }

  slides.forEach((slide, i) => {
    const s = start[i]
    const last = i === slides.length - 1
    const e = last ? total : start[i + 1] + 100
    slide.style.zIndex = String(i + 1)
    life(slide, s, e, 1, 1, { opacity: 0 }, { opacity: 1 }, last ? null : { opacity: 0 })

    const panel = slide.querySelector('.panel')
    if (panel) {
      life(panel, s, e, 750, 450, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' },
        last ? null : { clipPath: 'inset(100% 0 0% 0)' })
      panel.querySelectorAll('h2, .tbl li, .big, .txt, .sub, .pts li').forEach((el, k) =>
        enter(el, s + 550 + k * 200, { opacity: 0, transform: 'translateX(-28px)' }, 600))
      enter(slide.querySelector('.foot'), s + 300, { opacity: 0 }, 500)
      slide.querySelectorAll('mark').forEach((m, k) =>
        enter(m, s + 2200 + k * 500, { backgroundSize: '0% 100%' }, 700, INOUT))
    } else if (slide.classList.contains('cover')) {
      // 絵のまわりの線（box-shadow）まで見せるので、切り抜きは外側に20px広げる
      slide.querySelector('.cover__painting')?.animate(
        [{ clipPath: 'inset(100% -20px -20px -20px)' }, { clipPath: 'inset(-20px -20px -20px -20px)' }],
        { delay: s + 500, duration: 1300, fill: 'both', easing: INOUT })
      enter(slide.querySelector('.cover__kicker'), s + 1500, { opacity: 0, letterSpacing: '0.6em', textIndent: '0.6em' }, 900)
      enter(slide.querySelector('h1'), s + 1800, { opacity: 0, transform: 'translateY(30px)' }, 800)
    } else {
      enter(slide.querySelector('.guide__logo'), s + 200, { opacity: 0, transform: 'scale(.9)' }, 900)
      enter(slide.querySelector('h1'), s + 700, { opacity: 0, transform: 'translateY(30px)' }, 800)
      enter(slide.querySelector('.guide__text'), s + 1100, { opacity: 0 }, 800)
      enter(slide.querySelector('.search'), s + 1500, { clipPath: 'inset(0 100% 0 0)' }, 900, INOUT)
    }
  })

  // 金の枠は全部の面で同じなので、1本だけ置いて最初に描く
  document.body.insertAdjacentHTML('beforeend',
    '<svg class="gframe" viewBox="0 0 1080 1350" fill="none"><rect x="44" y="44" width="992" height="1262" stroke-width="1.5" pathLength="1" stroke-dasharray="1" /></svg>')
  enter(document.querySelector('.gframe rect'), 0, { strokeDashoffset: 1 }, 1500, INOUT)

  window.__seek = (ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms })
  window.__seek(0)
  return total
})

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'))
const frames = Math.round((total / 1000) * FPS)
for (let f = 0; f < frames; f++) {
  await page.evaluate((ms) => window.__seek(ms), (f * 1000) / FPS)
  await page.screenshot({ path: path.join(tmp, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 96 })
}
await browser.close()
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%05d.jpg'),
  '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile])
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`${outFile}（${(total / 1000).toFixed(1)}秒）`)
