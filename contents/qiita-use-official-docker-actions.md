---
title: "Docker公式のactionsを使ってGitHub Actionsからコンテナイメージをプッシュする"
date: "2024-01-31T09:00:00"
tags: ["Qiita", "Docker", "GitHubActions"]
category: "技術"
---

この記事は以前Qiitaにて公開したものになります。  
元記事はこちら : [Docker公式のactionsを使ってGitHub Actionsからコンテナイメージをプッシュする](https://qiita.com/_kei_s/items/15c067090d5142648aac)  

<hr>

## まえがき
私の所属するチームではコンテナを使ったアプリケーションを扱っています。
これらのアプリケーションをAWS上にデプロイする際、GitHub Actionsを経由してコンテナイメージの更新やクラスタ上のアプリケーションの更新などを実施しています。

そのうち、コンテナイメージの更新部分について、これまでは下記のように `run` コマンドを使っての自前ビルド・プッシュを行っていました。

```deploy.yaml
#(略)
 - name: イメージをビルドしてレジストリにプッシュする
   env:
     ECR_REGISTRY: ${{ レジストリ名 }}
     ECR_REPOSITORY: ${{ コンテナリポジトリ名 }}
     IMAGE_TAG: ${{ github.sha }}
   run: |
     docker build . \
       -f docker/nginx/Dockerfile \
       -t $ECR_REGISTRY/$ECR_REPOSITORY:latest \
       -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
     docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
     docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
#(略)
```

最近はデプロイをなるべく速く完了させたいため、`BuildKit` を使用するようにし、またそれに合わせて使いやすさの観点からDocker公式のactionsを使う形に置き換えています。

この記事では、Docker公式のactionsを使ったコンテナイメージのビルド・プッシュ方法について紹介します。

## この記事でわかること
- Docker公式のactionsの使い方がわかる
    - [docker/build-push-action](https://github.com/docker/build-push-action)
    - [docker/metadata-action](https://github.com/docker/metadata-action)
    - [docker/setup-buildx-action](https://github.com/docker/setup-buildx-action)
- Docker公式のactionsを使ったGitHub Container Registryへのイメージのプッシュ方法がわかる

## 各actionsについて
まずは、Dockerが用意しているactionsについて軽く紹介します。
詳細については各リポジトリのREADMEなどを参照してください。

### docker/setup-buildx-action
[docker/setup-buildx-action](https://github.com/docker/setup-buildx-action) は、GitHub Actionsのrunner上で [docker/buildx](https://github.com/docker/buildx) を使うためのactionsです。
buildxを使うことで、イメージビルド時の機能が拡張され、[ビルド処理の並列化や差分を検知してのビルドの省略などが行えるようになります](https://docs.docker.com/build/buildkit/)。
後述の `docker/build-push-action` がbuildxに依存しているため、前段でこのactionsを実行してあげる必要があります。

Windows/Macの場合、最近のDocker Desktopに `buildx` がバンドルされているので特別なことをしなくても使用できるのですが、Linux環境では `docker` コマンドとは別にインストールする必要があります。
`docker/setup-buildx-action` は、`buildx` のインストールや設定などを抽象化してくれるため、便利です。

### docker/metadata-action
[docker/metadata-action](https://github.com/docker/metadata-action) はイメージ名・タグ・ラベルなどを管理しやすくするためのactionsです。

設定した値はoutputとしてジョブ内で引き回されます。
このoutputは後段の `docker/setup-buildx-action` で `${{ steps.{idの値に設定した名称}.outputs.tags }}`、`${{ steps.{idの値に設定した名称}.outputs.labels }}` などの形で参照します。

このactionsを利用しなくても `docker/setup-buildx-action` で直接タグやラベルを設定できます。
ただ、値の受け渡し以外にも痒いところに手の届く機能が多いので処理を分けておくと無難だと思います。

### docker/build-push-action
[docker/build-push-action](https://github.com/docker/build-push-action) は、イメージのビルドからレジストリへのプッシュまでを実行してくれるactionsです。
キャッシュの取り扱いやビルド対象のプラットフォームの指定など、便利な機能を使いやすい形で提供してくれます。

## 実装する
紹介したactionsを組み合わせてワークフローを実装すると、以下のようになります。
`buildx` でキャッシュを活用したビルドを実行したあと、GitHub Container Registryにイメージをプッシュするだけのワークフローです。

```push.yaml
name: 'ghcr.ioへのイメージpush'

on:
  push:
    branches:
      - main

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
    - name: "checkoutする"
      uses: actions/checkout@v4
    - name: "docker buildxが使えるようにする"
      uses: docker/setup-buildx-action@v3
    # NOTE: ecr-loginなどに切り替えることで、別サービスへのプッシュも可能です
    - name: "ghcr.ioにログインする"
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - name: "メタデータを作成する"
      id: meta # 後段で参照できるようにoutputsに登録する
      uses: docker/metadata-action@v5
      with:
        images: ghcr.io/kei-s16/ghcr-container-push-demo
        tags: |
          type=raw,value=latest
          type=sha,prefix=,suffix=,format=short
    - name: "コンテナイメージをビルドしてghcr.ioにコンテナイメージをpushする"
      uses: docker/build-push-action@v5
      with:
        file: ./docker/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }} # 前ステップで設定したタグを参照する
        labels: ${{ steps.meta.outputs.labels }} # 前ステップで設定したラベルを参照する
```

最新のコードは [kei-s16/ghcr-container-push-demo](https://github.com/kei-s16/ghcr-container-push-demo) で公開しています。

## おまけ : キャッシュを使う
じつは、`buildx` を有効化しただけでも場合によっては数秒速くビルドが終わることもあります。
ただし、ビルドだけで見ると速く完了していても、ワークフローの実行全体で見ると公式actionsを使わない場合と同じかそれより少し遅い程度だったりします。
これは、たいていの場合 `docker/setup-buildx-action`、 `docker/metadata-action` 実行時間が `buildx` での短縮分を上回るからです。

そこで、ビルドキャッシュを使うようことで実行時間の短縮を目指します。

以下の設定では、レジストリへビルド結果のイメージだけでなく、キャッシュ用のイメージもプッシュし、以降のビルド時で参照できるようにしています。

```push.yaml
#(略)
    - name: "コンテナイメージをビルドしてghcr.ioにコンテナイメージをpushする"
      uses: docker/build-push-action@v5
      with:
        file: ./docker/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        # NOTE: 以下でビルドキャッシュを使うように設定しています
        cache-from: type=registry,ref=ghcr.io/kei-s16/ghcr-container-push-demo:buildcache
        cache-to: type=registry,ref=ghcr.io/kei-s16/ghcr-container-push-demo:buildcache,mode=max
```

ただし、キャッシュを使うに際して注意点が2つあります。

ひとつは、キャッシュをしっかり効かせるためには、多くの場合Dockerfileの整理が必要になることです。
Dockerのキャッシュはレイヤーごとに効くのですが、記述の順番によってはまったくキャッシュの効かないイメージができあがったりします([公式ドキュメントを参照](https://docs.docker.com/build/cache/))。
必要に応じて、十分にキャッシュが効くようにDockerfile内の処理順番を整理したり、ステージを分けたりしてあげるといいです。

もうひとつは、`type=registry` でキャッシュする場合、実行イメージとは別にビルドキャッシュ用のイメージもレジストリに保存する点です。

レジストリサービスによっては、使用容量に応じて課金が発生したり、保存できる容量に上限があったります。
無邪気に使うとコストが膨らんだり、イメージをプッシュできなくなったりします。
レジストリにキャッシュを保存する場合は定期的に古いイメージを削除する取り組みや仕組みを導入することも検討する必要があります。

