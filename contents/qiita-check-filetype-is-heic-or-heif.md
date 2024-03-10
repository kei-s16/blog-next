---
title: "heic/heifの判定をしてみたのでJSでの実装を公開する"
date: "2022-11-01T09:00:00"
description: "JSでファイルタイプを確認する方法"
tags: ["Qiita", "JavaScript", "HEIF", "HEIC"]
category: "技術"
---

この記事は以前Qiitaにて公開したものになります。  
元記事はこちら : [heic/heifの判定をしてみたのでJSでの実装を公開する](https://qiita.com/_kei_s/items/54bbbf3af6cf7b5fc88e)  

<hr>

## はじめに
先日、私の所属するチームでheic/heif画像をjpegに変換する処理を実装したのですが、その際に、処理に渡されたファイルが本当にheic/heif形式であるかを判定する必要がありました。  
この記事では、heic/heif判定を実装する場合に必要な情報と、参考実装を記載します。

## ファイルタイプの判定に必要な情報
画像に限らずですが、たいていのバイナリファイルはファイルの先頭部分にファイルタイプを含むさまざまな情報を入れています。  
この情報を参照することで、そのバイナリファイルはどんな形式のファイルなのか？ を判別できます。  
身近なところですと、[fileコマンド](https://github.com/file/file)はこの情報を使ってファイルタイプやメタデータの表示をしているようです。

今回のように自前で判定を実装する場合には、

- ファイルのどこに必要な情報が入っているのか？
- ファイル形式を示す情報はどんな形で入っているのか？

の2点を事前に知っておく必要があります。

[nokiatech/heif](https://github.com/nokiatech/heif)によれば、heifはISO Base Media File Formatに基づいたコンテナフォーマットであるそうです。

>HEIF is a visual media container format standardized by the Moving Picture Experts Group (MPEG) for storage and sharing of images and image sequences. It is based on the well-known ISO Base Media File Format (ISOBMFF) standard.

つまり、MP4と似たような、`先頭部にファイルサイズやファイルタイプを保持し、その後ろに実際のデータを持つ`構造であることが予測できます。  
[公式ドキュメント](https://nokiatech.github.io/heif/technical.html)を参照すると、実際にそのような構造になっているようです。

## 実際にファイルを確認する
先頭部にファイルタイプ情報が格納されていることがわかりました。  
ここでは実際にファイルを確認し、ファイルタイプを保持しているのかを確認してみましょう。

```sh
% od -xc IMG.HEIC | head -n 2
0000000      0000    1800    7466    7079    6568    6369    0000    0000
          \0  \0  \0 030   f   t   y   p   h   e   i   c  \0  \0  \0  \0
```

ファイル先頭部に`ftypeheic`とファイルタイプを示すデータが格納されていることがわかります。  
この部分を読み取って、heic/heifファイルが持ちうるファイルタイプと比較してあげることで判定できそうです。

## 参考実装
ここまでで得た情報から判定処理を実装すると、下記のようになります。

```javascript
/* 
 * NOTE: heicを示すヘッダーは複数ある
 * https://nokiatech.github.io/heif/technical.html
 */
const HEIC_MAGIC_HEADERS = ["ftypmif1", "ftypmsf1", "ftypheic", "ftypheix", "ftyphevc", "ftyphevx"];

/*
 * 画像のバッファを読み込んで、heic/heifであることを確認する
 * @param {Uint8Array} ImageBuffer
 * @returns {boolean}
 */
function isHeic(ImageBuffer) {
    const heicRange = ImageBuffer.slice(4, 12); // heicファイルの場合はこの範囲にftyp～が入っている

    const heicRangeHeader = heicRange.reduce(
        (heicRangeHeader, uint8) => heicRangeHeader += String.fromCharCode(uint8),
        ""
    );

    return HEIC_MAGIC_HEADERS.includes(heicRangeHeader);
}
```

## 終わりに
業務上画像を扱う機会は多いのですが、heic/heifファイルと向きあったのは初めてでした。  
今回実装するに際してあらためてドキュメントに目を通したのですが、比較的取り扱いやすい印象です。  
みなさんもファイルタイプの判定のようなところから、気軽にバイナリファイルに触れてみてはいかがでしょうか。

## 補足
公式にheic/heifとして取り扱うファイルヘッダは参考実装に含めた6つのみですが、[fileの実装](https://github.com/file/file/blob/84eeb6f7ad24017f4248836defc08133fa86e8c7/magic/Magdir/animation#L191-L219)を読むと、それ以外にも公式ドキュメントには記載されていないものが複数存在しているようです。  
これらも判定に使ってあげることで、より確実にheic/heifの判別ができるかもしれません。


