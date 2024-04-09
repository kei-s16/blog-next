---
title: "再利用可能なワークフローを使ってみた"
date: "2024-04-09T01:00:00"
tags: ["Qiita", "GitHubActions"]
category: "技術"
---

この記事は以前Qiitaにて公開したものになります。  
元記事はこちら : [再利用可能なワークフローを使ってみた](https://qiita.com/_kei_s/items/2c15dca3a88c0234a59f)  

<hr>

## まえがき
私の所属するチームではGitHub Actionsを使った各種自動化を実施しています。  
Pull Requestの作成やブランチへのコミットなどに反応して、ユニットテストやLinterなどが実行されたり、アプリケーションがデプロイされるようになっています。  
これによってレビューの手間が簡略化されたり、Pull Requestをリリースブランチにマージするだけでリリース作業を完結させられたりしています。  

その一方で、年々CI/CDでやりたいことが増え、ワークフローの定義ファイルがどんどん長くなっていき、可読性やメンテナンス性が落ちていくことに悩んでいました。  
今回はその悩みの解決のため、再利用可能なワークフローを活用してワークフローを分割したので、それについて書こうと思います。

## 抱えていた課題
私がメインで開発しているリポジトリには、  

1. テストジョブ
    1. シンタックスチェック
        1. バックエンドのシンタックスチェック
        1. フロントエンドのシンタックスチェック
    1. テストのためのビルド
    1. バックエンドのユニットテスト
    1. フロントエンドのユニットテスト
1. デプロイジョブ
    1. (リリースブランチで発火した場合のみ)デプロイ

の処理を一気に行う巨大なワークフローが存在していました。  

ひとつのファイルにまとまっていることで「ここを読めばなんとかなる」という状態ではあったものの、初めて触るメンバーにとっては敷居が高く、メンテナが固定化されてしまっていました。  
また、これはワークフローの問題ではないのですが、一部テストコードがflakyなものになっており、ときおり失敗してはワークフローをすべて再実行するため十数分待ちということも発生していました。  

そこで、再利用可能なワークフローを使って処理ごとにワークフローを分割し、

- 失敗した箇所のみを再実行できるようにする
- 各種テストを並列実行できるようにする
- コード変更の影響範囲を狭めて、触りやすくする

ことを試すことにしました。  

## 再利用可能なワークフローとは
再利用可能なワークフローとは、他のワークフローから呼び出し可能なワークフローです。  
使い始めるのは簡単で、まず、再利用したいワークフローの発火条件を以下のようにします。  

```.github/workflows/reusable.yaml
name: 再利用される側のワークフロー

on:
  workflow_call:
# ほかにも発火条件を足したければ、普通に書く

# 以下、いつも通りにジョブやステップを書く
```

その後、呼び出し元のワークフローで、再利用したいワークフローのファイルパスを指定することで、呼び出せます。  

```.github/workflows/main.yaml
# 省略
jobs:
  reuse:
    uses: ./github/workflows/reusable.yaml
```

似たものとして、[カスタムアクション](https://docs.github.com/ja/actions/creating-actions/about-custom-actions)があります。  
カスタムアクションとの大きな違いは、  

- ワークフローを置いておくリポジトリを分ける必要がない
- パッケージとして公開する必要がない

の2点になります。  
詳細については、[公式ドキュメント](https://docs.github.com/ja/actions/using-workflows/reusing-workflows)を参照してください。  

## どう分けたか

今回のケースで、私はメインのワークフローから  

- ビルド
- シンタックスチェック
- フロントエンドのテスト
- バックエンドのテスト

を再利用可能なワークフローとして切り出し、  

- PR作成時・PRへのコミット時に発火するテスト系のワークフロー
- リリースブランチへのマージ・コミット時に発火するデプロイ系のワークフロー

のそれぞれで、必要なものを呼び出すように変更を加えました。  
最終的なファイル構成は以下のようになります。  

```zsh
.github
└── workflows
   ├── deploy.yml
   ├── integration.yml
   ├── syntax-check.yml
   ├── build.yml
   ├── backend-test.yml
   ├── frontend-test.yml
   ├── etc...
```

基本的には通常のワークフローをそのまま分けていけば動くので、再利用可能にすること自体はとても簡単です。  


## 分割したまとめ
分割してしばらく経ってからこの記事を書いています。  
経過を見た感想としては、以下のよかったこと、いまいちだったことがあると感じています。  

### よかったこと
- ワークフローの依存関係が整理された
- 失敗時の再実行性が改善された
- ワークフローを小分けにしたことで、ここだけならちょっと触ってみようかな？ という人が出てきた
- 新規のワークフローを書くときに再利用性・再実行性を意識するようになった

### いまいちだったこと
- カスタムアクションEOL対応の影響範囲が増えてしまった
- 60秒未満のワークフローは60秒とみなされてしまうため、課金対象の実行時間が増えてしまう
  - 60秒以上になるように処理をまとめた箇所がある

再利用可能なワークフローはメリットも大きいですが、メンテナンス・課金回りでの影響・手間も発生してしまいます。  
そのため、全員に手放しでおすすめというわけにはいきませんが、再実行性や見通しの悪さに悩まされている方は検討してみてはいかがでしょうか。  

