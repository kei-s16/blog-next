---
title: "技術ブログ的なものをちゃんとやるためのtextlintテンプレートを作った"
date: "2022-10-24T01:00:00"
tags: ["textlint", "vim"]
category: "技術"
---

このブログ内でわりと自分でもありえないと思えるような微妙な文章を公開していたのを発見して、恥ずかしい思いをしたのでちゃんとした文章になっているかをチェックする仕組みが欲しくなった。

そういうわけで、作った。  
[kei-s16/techblog-linter-settings](https://github.com/kei-s16/techblog-linter-settings)

単純にlintしたいだけであれば、 `.textlintrc`、`package-lock.json`、 `package.json` を作業ディレクトリに置いて、

```sh
$ npm ci
```

したあと、

```sh
$ npx texlint lint対象の日本語テキストファイル
```

すれば、わりとゆるふわな設定だけど最低限のチェックはしてくれるようになる。  
プログラミング用語やサンプルコードが混ざるため、かなりの設定を無効にしているので、必要な人はよきように `.textlintrc` を編集してほしい。

テキストエディタ上でリアルタイムにチェックする方法も一応用意した。  
Visual Studio Codeを使っている人は、READMEにあるとおり、[vscode-textlint](https://marketplace.visualstudio.com/items?itemName=taichi.vscode-textlint)を導入するだけでOK。  
ただし、OSS版を使っている場合には上記の拡張が使えないので注意。

私がふだん使っているneovimでは、[mattn/efm-langserver](https://github.com/mattn/efm-langserver)を使って、textlintをLSPとして実行できるようにすることでリアルタイムチェックを有効にする。  
設定は[こんな感じにしている](https://raw.githubusercontent.com/kei-s16/dotfiles/master/.config/efm-langserver/config.yaml)。fixをかけるコマンドを追加したりもできるようだけど、そこまでは(いったん)必要としていないので、やらないでおく。

現状はただの設定ファイル群だが、今後は

- GitHub Actions(個人的には[dagger](https://dagger.io/)でやってみたいが)でCI的に実行する
- templateリポジトリにして再利用を容易にする
- lint設定をもうちょっと突き詰める
- 技術的な内容以外を書くときの設定も用意しておく

などしていきたいところ。

とりあえずはこのブログのリポジトリに今回作ったlint設定を混ぜこんで使ってみている(この記事もlintが効いていて、ここまでに既に数回怒られている)。  
現状はlint設定のゆるふわ感以外に特に不満はないが、しばらく使ってみて初めてわかることもあると思うので、ちょっと様子見。
