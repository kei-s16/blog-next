---
title: "Dagger.ioを使ってみた"
date: "2022-11-21T00:00:00"
description: "CI/CDツールのDagger.ioについて、使い方や使用感について書いています"
tags: ["Dagger.io", "GitHub", "Go"]
category: "技術"
---

## 前置き
[Dagger.io](https://dagger.io/)というCI/CDパイプラインエンジンがある。  

世の中にはGitHub ActionsやAWS CodeBuild, Circle CIなど、さまざまなCI/CDサービスがある。これらはそれぞれ記法が違ったり実行環境に制限があったりと、サービス提供者ごとに良くも悪くも差別化がされている。  
どのサービスも使いやすく、便利だったりするが、トレードオフとしてローカルでワークフローのテストができなかったり、他のサービスへの移行[^1]が難しかったりする。  
Dagger.ioは、そういうのをなんとかしてポータビリティが高いCI/CDパイプラインを作っちゃおうぜ、というもの。なんかDockerっぽいよね。[Dockerの人が作ってるからね](https://www.publickey1.jp/blog/22/dockerdaggergithubcircleci.html)。  

最初はCue言語でしかワークフローが書けなかった(はず)でちょっと足踏みしていたが、いつのまにか[GoのSDK](https://docs.dagger.io/sdk/go)や[PythonのSDK](https://docs.dagger.io/sdk/python)が追加されていた。  
[個人的にCIを作る必要があった](https://github.com/kei-s16/techblog-linter-settings/issues/4)ので、せっかくだしということで今回DaggerのGo SDKを使って組んでみた。  

この記事はその記録ということになる。  

## Dagger.ioの仕組み
だいたい下記の図のとおり。  
SDK対応の好きな言語でワークフローを書き、好きな言語で実行するとコンテナ上で実行されるという仕組み。他のCI/CDサービスとおおむね同じ。  

![おおまかなDagger.ioの実行フロー](/images/build-ci-cd-pipeline-with-dagger/dagger.png)

ワークフローと実行コンテナの間にDagger Engineというのがいる。  
これはGitHub ActionsやCodeBuild、CircleCIなどの実行環境に相当するもの。  
ユーザに対してはDaggerのAPIの提供、コンテナ側に対してはコンテナの起動・破棄やコマンドの伝達を行なっている(と思われる)。  
Dagger Engineは非公開の部分も多く、いまのところはSDKの範囲にない部分の公開ドキュメントは存在しないよ、というのが公式の見解。  

## ワークフローをGoで書く
仕組みもわかったところで、さっそく実装してみる。  

[前回の記事](/posts/textlint-template)にも書いたが、最近textlintを使って日本語をいい感じにlintするやつをちまちまいじっている。  
このブログもそのlinterを通すことにしたのだが、さすがに手動は……ということで、今回はDaggerでこれのCIを組みたい。  
いちおうこのブログ自体、特定のサービスに依存せず、最悪自前でホスティングできるように意識して作っているので、Daggerとの思想的な相性もいい。  
言語は慣れていないが諸事情によりGoを選択した(Rustに対応してたらそっちを選んでいたと思う)。  

最終的にできあがったものは[kei-s16/techblog-linter-settings](https://github.com/kei-s16/techblog-linter-settings)にある。  

### プロジェクトを立ち上げる
プロジェクトを立ち上げる。

```sh
$ go mod init dagger
```

その後、[公式ドキュメント](https://docs.dagger.io/sdk/go/371491/install)にしたがって依存パッケージを追加する。  
現状dockerパッケージの追加におまじないが必要らしいので、そちらも実行する。  

```sh
$ go get dagger.io/dagger@latest
$ go mod edit -replace github.com/docker/docker=github.com/docker/docker@v20.10.3-0.20220414164044-61404de7df1a---incompatible
$ go mod tidy
```

最後にファイルを作る。  

```sh
$ touch main.go
```

### ワークフローを書く
ワークフローはだいたい3段階からなる。  

1. Daggerクライアントの定義
2. Daggerワークフローを実行するコンテナの起動
3. Daggerワークフローそのもの

場合によってはここに前処理として環境変数の読み込みが入ったり、ワークフローの結果を受けて別のワークフローを起動する後処理が入ったりする(のだと思う)。  

#### Daggerクライアントの定義
なにをするにもまずDagger Engineとやりとりするクライアントが必要なので、定義する。  
クライアントを定義する際に、実行ログをstdoutに出すかどうか、実行ディレクトリをどうするか、などをArgsとして渡すことができる。  

```go
client, err := dagger.Connect(ctx, dagger.WithLogOutput(os.Stdout), dagger.WithWorkdir("../"))
if err != nil {
  return err
}
defer client.Close()
```

#### Daggerワークフローを実行するコンテナの起動
textlintの実行にはnodeの実行環境が必要なので、今回のCIはnodeコンテナ上で実行することにする。

```go
// docker-compose up -dに相当する
node := client.Container().From("node:18.11.0-alpine3.15")

// DockerfileのADDに相当する

```

#### Daggerワークフローそのもの
コンテナを起動する処理のあとは、ワークフローを書いていく。  

コマンドを実行するには、コンテナインスタンスに`Exec`というFunctionが実装されているので、それを使う。フォーマットはDockerfileのCMDと同じ。  
`Exec`はGitHub ActionsのStepに相当するものとイメージするとわかりやすく、Daggerのワークフロー出力もExec単位で分割して出力される。  

```go

  Exec(dagger.ContainerExecOpts{
    Args: []string{"npm", "ci"},
  })
```

`Exec`は繋げることができる。

```go

  Exec(dagger.ContainerExecOpts{
    Args: []string{"apk", "update"},
  }).
  Exec(dagger.ContainerExecOpts{
    Args: []string{"apk", "add", "git"},
  })

```

ちなみに、このような書き方は通らないので注意。

```go

  Exec(dagger.ContainerExecOpts{
    Args: []string{"apk", "update", "&&", "apk", "add", "git"},
  })
```

`ExitCode`でステップの処理が通ったかを判定できるので、たとえばチェックに失敗したら`--fix`を実行する、ということも可能。  
……なのだが、どうもちょっと挙動がおかしいようで、現状はできなさそう[^2]。

```go

  Exec(dagger.ContainerExecOpts{
    Args: []string{"npx", "textlint", targetDir},
  }).
  ExitCode(ctx)

// NOTE: ExitCodeが常に0を返してくるので、workaroundでerrの有無で判定する
if err != nil {
  return err
}
```

[最終的にこういうものができあがる](https://github.com/kei-s16/techblog-linter-settings/blob/main/dagger/main.go)。  
書いてみて思ったのが、ワークフローを書いている、というよりDockerfileを書いている感覚[^3]で、かなり不思議な体験だった。

## ワークフローをローカルで実行する
ここまでで記述したワークフローは、ローカルでしっかり動かすことができる。

```sh
$ go run main.go
```

![ローカルで実行して怒られた図](/images/build-ci-cd-pipeline-with-dagger/dagger-on-local.png)

## ワークフローをGitHub Actions上で実行する
そしてこのワークフローはCI/CDサービスのワークフローの中でDaggerを起動することで、そっくりそのまま各種環境でも実行できる(はず)。  
サービス側のワークフローで最低限必要なのは、

1. CI/CDサービスのワークフローに使用言語の実行環境を入れる
2. CI/CDサービスのワークフロー上でDaggerなど依存パッケージを入れる
3. ローカルで実行したのと同じコマンドを流す

の3ステップ。必要に応じてAWSやGitHubのトークンを環境変数にセットしたりする手順が挟まる。  
見てわかるとおり、Dagger特有の処理が必要なわけではなく、Actions上で特定の言語の実行環境を用意したいケースと同じことをすればいい。  

今回はこんなGitHub Actionsを組んだ。  

```yaml
on:
  pull_request:
    types: [synchronize]
    paths: 
      - content/posts/*

jobs:
  textlint-ja:
    name: lint documents
    runs-on: ubuntu-latest
    steps:
      - name: checkout source
        uses: actions/checkout@v2
      - name: setup go
        uses: actions/setup-go@v3
        with:
          go-version: 1.19.3
      - name: go get
        run: go get -v
        working-directory: ./dagger
      - name: run dagger ci
        run: go run main.go
        working-directory: ./dagger
```

そして実行すると、ローカルと同じ結果が得られた。  

![GitHubActionsで実行して怒られた図](/images/build-ci-cd-pipeline-with-dagger/dagger-on-github-actions.png)

## まとめ
使ってみて、  

- ローカルでCI/CDが実行できる
  - ローカルとCI/CDサービス、どちらで実行してもほぼ同じ結果が得られる
- GoやPythonでワークフローを書くことができる
  - (今後)複雑な分岐や並列処理を書くことができる
  - アプリケーションエンジニアがちょっとCI/CDを触りたいときの心理的ハードルが低くなる
  - yamlよりは圧倒的に可読性が高い
- CI/CD環境を自宅サーバに置くことができそう

のはおいしいなと思った。一方で、  

- ちょこちょこ不具合っぽいものがある(暫定対応策も出ているのでまあ……)
- 仕様が不明瞭なところがある

のは微妙な気もする。  
とはいえ、できてからまだまだ日が浅いツールで、ガンガン新機能・対応言語が追加されている勢いのよさを考えると、これらはすぐに解消されそう。  

個人プロジェクトにはガンガン導入していきたい。  

---

コメントや誤りの連絡は、[issue](https://github.com/kei-s16/kei-s16.github.io/issues/new)にお願いします。

[^1]: CI/CDサービスを移行したいことなんてある？ という向きもあると思うが、[Travis CI(と、heroku)のお漏らしとその事後対応](https://forest.watch.impress.co.jp/docs/news/1404282.html)を思い出してほしい。
[^2]: うまい方法を知っている人がいたら教えてください。
[^3]: 実行環境にDockerを使うのでそれはそうという感じだが
