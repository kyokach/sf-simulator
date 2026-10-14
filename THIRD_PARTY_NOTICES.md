# Third-party notices

このリポジトリには、以下の第三者の成果物が含まれる、または利用されています。
This repository includes or uses the following third-party material.

## Satisfactory（ゲームの内容） / Satisfactory game content

Satisfactory, its item, recipe and building names, and its game values are the property of
**Coffee Stain Studios**. This project is an unofficial fan-made tool and is not affiliated with,
endorsed by, or sponsored by Coffee Stain Studios. No game artwork (icons, images, audio) and no
in-game descriptive text (item or building descriptions) is included in this repository; only the
names and numeric values needed for production calculations are used.

Satisfactory は Coffee Stain Studios の作品です。アイテム名・レシピ・装置名・ゲーム内の数値の権利は
Coffee Stain Studios に帰属します。本ツールは非公式のファンメイドであり、Coffee Stain Studios とは
関係ありません。ゲームの画像・アイコン・音声や、アイテム・装置の説明文は含めていません。
生産計算に必要な名称と数値のみを使用しています。

## SatisfactoryTools — game data extraction

`src/data.json`（および `index.html` に埋め込まれたデータ）は、SatisfactoryTools が公開している
`data/data1.0.json` を `src/build_data.py` で変換・抜粋したものです。SatisfactoryTools の画像素材
（`www/assets/images/items`）は使用していません。

`src/data.json` (and the data embedded in `index.html`) is derived from `data/data1.0.json`
published by SatisfactoryTools, converted by `src/build_data.py`. The image assets of
SatisfactoryTools (`www/assets/images/items`) are **not** used.

Source: https://github.com/greeny/SatisfactoryTools

```
MIT License

Copyright (c) 2019 greeny

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Building dimensions / 装置の寸法

The building footprints used by the layout simulator (width × length × height in metres, in
`src/js/05-sim.js`) are factual in-game sizes as listed in the building infoboxes of the
Satisfactory Wiki (https://satisfactory.wiki.gg/). Only these numbers are used; no wiki text or
images are included.

配置シミュレーターの装置の寸法（`src/js/05-sim.js`）は、Satisfactory Wiki の各装置の情報欄に
載っているゲーム内の大きさ（数値のみ）です。Wiki の文章や画像は含めていません。

## three.js (loaded from cdnjs at runtime, not redistributed)

The 3D view of the layout simulator loads three.js r128 from
`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` when it is first opened.
three.js is not included in this repository.

Source: https://github.com/mrdoob/three.js — MIT License, Copyright © 2010-2021 three.js authors

## Fonts (loaded from Google Fonts, not redistributed)

| Font | License |
| --- | --- |
| Chakra Petch — Cadson Demak | SIL Open Font License 1.1 |
| IBM Plex Sans JP — IBM | SIL Open Font License 1.1 |

フォントは Google Fonts から読み込んでおり、このリポジトリには含めていません。
