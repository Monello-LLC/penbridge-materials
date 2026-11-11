# penbridge-materials

PenBridgeの資料を、AIと一緒に同じ見た目で作るためのスキルです。マニュアルや研修資料の原稿を渡すと、A4横のスライドか、A4縦の文書のHTMLになり、ブラウザの印刷でPDFにできます。

Agent Skillsの形式で書いてあるので、この形式に対応したAIならどれでも使えます。

## 入れ方

ClaudeやChatGPTのアプリでは、このページの「Code」から「Download ZIP」でZIPを落とし、設定のSkillsからアップロードします。

スキルに対応していないAIでは、ZIPを会話に添付して「このフォルダの `SKILL.md` に従って資料を作って」と頼みます。

## 頼み方

原稿を貼るか添付して、次のように頼みます。

```
この原稿をPenBridgeのスライドにして。読むのは新しく入った講師です。
```

AIが先に構成を見せるので、確かめてから作ってもらいます。できたHTMLをChromeで開き、印刷から「PDFに保存」を選ぶとPDFになります。

## 中身

- `SKILL.md`: AIが読む手順と、文の決まり
- `references/design.md`: 色、文字、余白、ロゴの決まり
- `assets/template.html`: スライドと文書のひな形。ブラウザで開くと部品の見本が見られます
- `assets/logo/`: ロゴマーク
