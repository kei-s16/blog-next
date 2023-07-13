---
title: "Github PagesにHugoをデプロイする"
date: "2022-02-21T01:00:00"
---

## 目次
1. [前置き](#前置き)
    1. [背景](#背景)
    2. [選定](#選定)
2. [やっていき](#やっていき)
    1. [設計](#設計)
    2. [実装](#実装)
        1. [Hugo](#hugo)
        2. [GitHubActions](#github-actions)
        3. [GitHub Pagesの設定](#github-pagesの設定)
3. [完走した感想](#完走した感想)

## 前置き
### 背景
gistなどで管理していたもろもろのメモをもうちょっときれいに見せたくなったので、ブログ形式で残すことにしました。  
が、今日日どっかのブログサービスもなーでも自前でWordPressなんかもちょっとキツいなーという感じです。  
これだけで伝わらないと思うので、気持ち的な要件をリストアップすると、こんな感じ。  

1. テキストがブラウザ上で快適に読める状態であればそれでいい。コメントとかいらない。
2. 特定のサービスに依存する形にしたくない。なにかあったときは最悪自前で気楽に(ここ重要)ホスティングできるようにしたい。
3. セキュリティ周りをなるべく意識したくない。ログイン画面隠したりCMSのバージョン気にしたりしたくない。

もうこれ、静的サイトジェネレーター(SSG)しかないじゃん、ということで、そうしました。  

### 選定
候補は2つありました。  
1つは[Zola](https://www.getzola.org/)。Rust製のSSGツールになります。  
もうひとつは[Hugo](https://gohugo.io/)。こちらはGo製。  
どちらもmarkdownのテキストファイルからブログの形をしたhtmlを吐き出してくれるツールです。  
ドキュメントをさっと読んだ感じではZolaもHugoも機能的にはあまり差がなさそうでした。開発の活発度合いも変わりなく、強いて言えば数年先行しているHugoのほうが英語・日本語ともにドキュメントが見つかりやすい雰囲気です。  
~~宗教~~好みで言えばZolaですが、今回はサクっとやってしまいたかったので、Hugoをチョイスしました。  

サーバというか配信にはGitHub Pagesを使用することにします。  


## やっていき
### 設計
![全体の図](/images/hugo-on-github-pages/githubpages.png)

こんな感じにすることにします。  
mdファイル(というかソース)を管理するリポジトリと、公開用のリポジトリを分けているのは、なんとなくです。分ける必要もないと思うっちゃ思うのですが、せっかくだからわけることにしました。やったことでゴミみたいなコミットしてるのが外には見えないのでそれはメリットかも。  

### 実装
#### Hugo
Hugo側の設定はあまり気にすることがありません。  
強いて言えばテーマをどう管理するかくらいですが、外部テーマを使う場合はgit submoduleを使うことが推奨されているようです。  
今回私が選んだテーマは[panr/hugo-theme-terminal](https://github.com/panr/hugo-theme-terminal)です。こちらもREADMEにて手の込んだ改変をしない限りはgit submoduleを使うことを推奨していました。テーマを触る気はいまのところあんまりないので、submoduleを利用するパターンを採用します。  

#### GitHub Actions
GitHub Actions、つまりはデプロイ=記事の投稿です。  
[Scheduling Hugo Builds on GitHub pages with GitHub Actions](https://rmoff.net/2020/12/20/scheduling-hugo-builds-on-github-pages-with-github-actions/)という記事を参考に、ちょっと手を入れたデプロイを組んでいます。  

```yml
on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: checkout source
        uses: actions/checkout@v2
        with:
          submodules: true
          fetch-depth: 0
      - name: remove .gitignore
        run: rm ./.gitignore
      - name: setup hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
      - name: build
        run: hugo --minify
      - name: copy verify files to public
        run: cp ./verify/* ./public
      - name: deploy
        uses: peaceiris/actions-gh-pages@v3
        if: ${{ github.ref == 'refs/heads/main' }}
        with:
          deploy_key: ${{ secrets.ACTIONS_DEPLOY_KEY }}
          external_repository: kei-s16/kei-s16.github.io
          publish_dir: ./public
          publish_branch: main
```

やっていることは元記事と同じくhugoでビルドして、公開用リポジトリにpushしているだけです。  
違うところはといえば、

- 私の場合はgitignoreでソースリポジトリに生成物を持たない(public以下を持たない)ようにしているため、そこをごにょごにょするための処理を追加した
- GitHub Pagesで独自ドメインを当てたり、keybaseの認証をしたりするのに必要なファイル(verify以下)を一緒にデプロイしている
- 公開リポジトリには生成物(public以下)しか持たないようにした

の3点です。  
上記のコードにより、mainブランチにmdファイルやらなにやらをマージすることで、公開リポジトリにhtmlファイルを送りつけてくれるようになりました。  

#### GitHub Pagesの設定
`{ユーザ名}.github.io`ドメインのままで問題なければ、リポジトリのsettingsからpagesを有効にするだけです。  
独自ドメインを当てたい場合は公式ドキュメントを参考にしつつ、`{ユーザ名}.github.io` に対する独自ドメインのCNAMEレコードを作成してください。  
注意が必要なのが、ドメインの検証に時間がかかることと、HTTPSでの接続を有効にするのにさらに時間がかかることです。時間に余裕を持って作業しましょう。  

## 完走した感想
- Pull-Requestベースで管理できるのめっちゃ楽
- vimで書けるのめっちゃ楽
- DBのバージョンとかPHPのバージョンとかCMSのバージョンとかプラグインのバージョンとか気にしなくていいのほんと楽
