# penbridge-materials

PenBridgeの資料を、AIと一緒に同じ見た目で作るためのスキルです。マニュアルや研修資料の原稿を渡すと、A4横のスライドか、A4縦の文書のHTMLになり、ブラウザの印刷でPDFにできます。

Agent Skillsの形式で書いてあるので、この形式に対応したAIならどれでも使えます。

## 使い方

Webを読めるAIには、このページのURLを渡して頼みます。

```
https://github.com/Monello-LLC/penbridge-materials のスキルに従って、この原稿をPenBridgeのスライドにして。読むのは新しく入った講師です。
```

毎回URLを渡したくないときは、このページの「Code」から「Download ZIP」でZIPを落とし、ClaudeやChatGPTの設定のSkillsからアップロードします。

原稿は貼るか添付します。A4縦の文書にしたいときは「スライド」を「A4の文書」に変えます。

AIが先に構成を見せるので、確かめてから作ってもらいます。できたHTMLをChromeで開き、印刷から「PDFに保存」を選ぶとPDFになります。

## 中身

- `SKILL.md`: AIが読む手順と、文の決まり
- `references/design.md`: 色、文字、余白、ロゴの決まり
- `assets/template.html`: スライドと文書のひな形。ブラウザで開くと部品の見本が見られます
- `assets/logo/`: ロゴマーク
