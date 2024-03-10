---
title: "zsh上でDynamic Routesのディレクトリを作成できない場合の対応"
date: "2023-07-21T09:00:00"
tags: ["Qiita", "Zsh", "Next.js"]
category: "技術"
---

この記事は以前Qiitaにて公開したものになります。  
元記事はこちら : [zsh上でDynamic Routesのディレクトリを作成できない場合の対応](https://qiita.com/_kei_s/items/b76f1d38c67e796a3bb8)  

<hr>

## tl;dr
`~/.zshenv` などに以下のように設定する。

```zsh
setopt +o nomatch
```

その後、設定ファイルを `source` する。

## これはなにか
社内の活動で、[React公式ドキュメント](https://ja.react.dev/)や[Next.jsの公式ドキュメント](https://nextjs.org/docs)の輪読会が開催されています。  
[Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)を扱う回で、手元で実際に試そうとしたときに、zsh上で指定の形式のディレクトリを作成できなかったので、この記事ではその原因と対応について書きます。

## そもそもDynamic Routesとはなにか
Dynamic Routesとは、Next.jsに存在する機能のひとつで、この機能を利用することで、与えられたURLから動的にページを生成して返すことができます。

下記はDynamic Routesを設定したNext.jsの商品紹介アプリのディレクトリ構造例です。

```
app
└── products
    └── [name]
        └── page.tsx
(省略)
```

このとき、`/products/hogepiyo` へアクセスがあると、`./app/products/[name]/page.tsx` に `name` として `hogepiyo` が渡り、対応した内容がユーザに返ります。
`/products/foobar` へアクセスがあると、今度は同じ仕組みで `foobar` が渡り、対応した内容がユーザに返ります。

このように、商品紹介ページやブログ・ニュースサイトの記事ページ、検索結果ページなど、DBの値やユーザ入力によって返すものが変動するときに利用すると便利です。

## どんなことが起きたのか
前述の例のように、Dynamic Routesで取り扱いたい値は `[name]` のように `[]` でくくったディレクトリ名として設定してあげる必要があります。
ところがzsh上でディレクトリを作成しようとしたところ、下記のようにエラーになってしまい、ディレクトリを作成できませんでした。

```zsh
$ mkdir -p ./app/products/[name]
zsh: no matches found: ./app/products/[name]
```

## どうしてこれが起きるのか
Dynamic Routesの指定するディレクトリ名が、[zshのglob展開の構文](https://zsh.sourceforge.io/Doc/Release/Expansion.html#Filename-Generation)と衝突していることから発生しています。

```zsh
$ mkdir -p ./app/products/[name]
```

このとき、zshはmkdirコマンドにファイルパスを渡す前に、 `./app/products/[name]` をglobだと判断し、ファイル名として展開しようとします。
ところが、 `./app/products/[name]` のパターンにマッチするディレクトリやファイルが存在しないため、mkdirが実行される前にzshがエラーを出して処理が止まってしまいます。
そのため、`zsh: no matches found: ` というエラーによって、ディレクトリを作成できなくなっているのです。

## 対応
### 1. エスケープする
`[`, `]` の前にバックスラッシュを追加して、globだと判定させないことで都度対応します。

```zsh
$ mkdir -p app/products/\[name\]
 ```

### 2. zshのオプションを設定する
[zshのドキュメント](https://zsh.sourceforge.io/Doc/Release/Options.html)を読むと、glob展開時、マッチしなかった場合にエラーを出して処理を止める動作は `NOMATCH` オプションで制御できることがわかります。

>     NOMATCH (+3) <C> <Z>
>
>    If a pattern for filename generation has no matches, print an error, instead of leaving it unchanged in the argument list. This also applies to file expansion of an initial ‘~’ or ‘=’. 

`~/.zshenv` などに以下のように設定します。

```zsh
setopt +o nomatch
```

その後、設定ファイルを `source` します。

以上のどちらかで、Dynamic Routesで指定されている形式のディレクトリを作成できます。
 

