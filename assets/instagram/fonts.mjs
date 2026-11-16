/*
 * 同梱の書体（fonts/）をページに読み込ませる。render.mjs と reel.mjs が使う。
 * ネットにつながらない環境でも、ひな形と同じ書体で書き出すためにある。
 */
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fonts')
const faces = [
  ['Shippori Mincho B1', 500, 'ShipporiMinchoB1-Medium'],
  ['Shippori Mincho B1', 600, 'ShipporiMinchoB1-SemiBold'],
  ['Shippori Mincho', 500, 'ShipporiMincho-Medium'],
  ['Shippori Mincho', 600, 'ShipporiMincho-SemiBold'],
  ['LINE Seed JP', 400, 'LINESeedJP-Regular'],
  ['LINE Seed JP', 700, 'LINESeedJP-Bold'],
]

// ページを開く前に呼ぶ。Google Fonts を待って止まらないよう、取りに行かせない
export async function blockWebFonts(page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
}

// ページを開いたあとに呼ぶ
export async function useBundledFonts(page) {
  const css = faces
    .map(([family, weight, file]) =>
      `@font-face { font-family: "${family}"; font-weight: ${weight}; font-style: normal; src: url("${pathToFileURL(path.join(dir, `${file}.woff2`)).href}") format("woff2"); }`)
    .join('\n')
  await page.addStyleTag({ content: css })
  // 使う太さをすべて読み込ませてから、はみ出しを測り直す
  await page.evaluate(async (list) => {
    await Promise.all(list.map(([family, weight]) => document.fonts.load(`${weight} 40px "${family}"`, 'あ漢A1')))
    await document.fonts.ready
    for (const slide of document.querySelectorAll('.slide')) slide.classList.remove('is-overflow')
    for (const panel of document.querySelectorAll('.panel')) {
      if (panel.scrollHeight > panel.clientHeight) panel.closest('.slide').classList.add('is-overflow')
    }
  }, faces)
}
