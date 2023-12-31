---
title: "Dockerfileを書いてみよう"
date: "2022-03-28T02:30:00"
tags: ["docker"]
category: "技術"
---

## はじめに
Dockerfileを使ったイメージの作成と起動について人に教える機会も増えてきたこともあり、毎回アドリブでやるのもつらいし日によって質のブレも出てくるので、ここらでいったん文書化することにしました。  
想定読者はDockerなんもわからんのでやってみながら覚えたい、ふだんはアプリを書くのがメインな人です。  
基本的なshellでの操作(cd, mv, cpなど)はできるものとし、また、`Docker`はインストール済みのものとします。`compose v2`および`docker-compose`には触れません。  
最終的に簡単な(**ここ重要**)スクリプト言語の実行環境を作るためのDockerfileを書くことができるようになることが目的です。
題材にはPythonを使います。楽なので。  
また、この記事で実行するコマンドはlinux上で実行されています。実行環境によって出力が異なることがありますが、その場合は適宜読み替えをお願いします。  

## 目次
1. [Dockerとは？](#dockerとは)
2. [Dockerfileを書いていく](#dockerfileを書いていく)
    1. [2行で入門する](#2行で入門する)
    2. [自分用にタグを設定する](#自分用にタグを設定する)
    3. [ソースファイルをコンテナに同梱して、ファイルから実行できるようにする](#ソースファイルをコンテナに同梱してファイルから実行できるようにする)
    4. [ARGを使ってみよう](#argを使ってみよう)
    5. [pipを使う](#pipを使う)
3. [終わりに](#終わりに)

## Dockerとは？
そもそもDockerとは？ についてです。  
[公式](https://docs.docker.com/get-started/overview/)ドキュメントからわかりやすい部分を引用します(引用は[有志日本語訳](https://docs.docker.jp/get-started/overview.html))。

>Docker はアプリケーションの開発、導入、実行を行うためのオープンなプラットフォームです。Docker を使えば、アプリケーションをインフラストラクチャーから切り離すことができるため、ソフトウエアをすばやく提供することができます。Docker であれば、アプリケーションを管理する手法をそのまま、インフラストラクチャーの管理にも適用できます。

これは、より簡単に、こう言い換えることができます。  
_Dockerは、任意の必要なソフトウェアだけでアプリケーションの実行を可能[^1]にし、開発・運用を簡単にすることが**できる**ものです_。

`任意の必要なソフトウェアだけでアプリケーションの実行を可能にする`とはどういうことでしょうか。  
一般的に、アプリケーションの実行環境は複数のソフトウェアの集合です。たとえば、「Hello World!」とだけ書かれたwebページを返すだけのPythonで書かれたアプリのことを考えてみてください。これを、Dockerではない通常のLinux環境で実行する場合、どれくらいのソフトウェアが必要になるでしょうか。  
私もすべてを挙げることはできませんが、すぐに思いつく範囲では下記のようなものがあります。

- `Python`(当然ですね)
- `sshd` or `ftp`(コードをデプロイするのに必要です)
- なにかしらのネットワークマネージャ
- 上記のソフトウェアをインストールするためのパッケージマネージャ(`apt`や`pacman`)
- 上記のソフトウェアを実行するためのプロセス管理システム(`init.d`や`systemd`)
- linux kernel

上記のソフトウェア群はそれぞれが動作のために別のソフトウェアを要求します。アプリケーションを運用するということは、大量のソフトウェアを運用することです。  
どこまで厳密にやるかはともかく、パフォーマンスのため、セキュリティレベル維持のため、アプリケーションのソースコードに加えて、これらのうちある程度の管理が必要ということです。具体的には`Ansible`や`Chef`などの構成管理ツールや`cloud-init`などを利用してサーバの状態を一定にしたり、カーネルのバージョンアップをしたり[^2]です。  
このレイヤーの出来事はアプリケーションの健全な実行に必要ですが、開発者としては若干別領域、たとえばインフラエンジニアやSREの領域に見えるため、本格的にやるにはちょっと躊躇する部分かもしれません。  
ところが、この部分を開発者以外に任せることにすると、別の複数の問題が発生します。たとえば、ミドルウェアレベルの構成変更にチーム外の人間とのやりとりが必要になったり、アプリケーション実行環境の全体像がアプリケーション開発者にぼんやりとしか見えなくなったりです。これらは最終的に開発速度の低下を引き起こします。  

そこで、Dockerの出番というわけです。  
Docker[^3]を利用することで、深いlinuxサーバの知識がなくとも、実行環境を簡単な定義ファイル[^4]だけで整えることができるようになります。  

とだけ書くと、まるで夢のような技術に聞こえてしまうのですが、ここで先ほどのテキストの太字部分を思い出してください。  

>開発・運用を簡単にすることが**できる**

**できる**とあります。**簡単になる**ではないことに留意してください。  
DockerにはDockerの作法があり、作法を逸脱するとわりとつらい思いをします。コンテナの概念に慣れていないと、この作法の逸脱をしてしまいがちです。Dockerの不便さを解消しようとするまえに、あなたが不便に思うこと、そして解消したいことがコンテナの考え方に反していないかを考えてみてください。少しオーウェル的ですが、その不便さこそがコンテナの利便性を提供しているものかもしれません[^5]。  

それでは、やっていきましょう  

## Dockerfileを書いていく
扱うファイルが多いので、あらかじめできあがったものを公開しています。必要に応じて参照したり、cloneしてご利用ください。  
[kei-s16/blog-docker-examples](https://github.com/kei-s16/blog-docker-examples)

### 2行で入門する
このセクションのサンプルは[example1](https://github.com/kei-s16/blog-docker-examples/tree/main/example1)にあります。  

Dockerコンテナを起動するためにはコンテナイメージと呼ばれるものが必要で、コンテナイメージを作るためにはDockerfileという定義ファイルを書いてあげる必要があります。このセクションでは、この一連の流れを体験しましょう。

まずはDockerfileを書いて、コンテナイメージをビルドし、コンテナを立ち上げるためだけの小さなPythonコードを考えます。  
最初から大きくやるとたいてい失敗するので、極端なほど小さく始めましょう。  

```python
print("Hello World!")
```

はい、Hello Worldです。

```bash
python -c 'print("Hello World!")'
```

```bash
% python -c 'print("Hello World!")'
Hello World!
```

まごうことなきHello Worldですね。  
まずはこのコマンドをそのままコンテナ環境で実行できるようにしていきましょう。  
作業ディレクトリに、Dockerfileという名前のファイルを作成し、内容を下記の通りに編集してください。  

```dockerfile
FROM python:3.10.4-bullseye
CMD ["python", "-c", "print('Hello World!')"]
```

1行目は、`FROM`というベースとなるイメージを取得してくるコマンドを実行しています。値として、`イメージ名:タグ(任意)`の形式の文字列を与えることで、コンテナレジストリ[^6]からイメージをダウンロードしてきます(Dockerではこれを`pull`といいます)。また、タグが明示的に指定されなかった場合(今回であれば、`FROM python`)には、最新のイメージ(`latest`タグのイメージ)が指定されたものとして振る舞います。
今回は、`Python`が実行できるイメージのうち、Pythonのバージョンが3.10.4でdebianのbullseyeならだいたい入ってそうなパッケージの詰まったもの(`3.10.4-bullseye`)を持ってくるようにしています。  
こうしたコンテナイメージは、[Dockerhub](https://hub.docker.com/)で探すことができます。

2行目は、`CMD`コマンドです。`CMD`はDockerfileの中で一度しか使えないコマンドで、コンテナ起動時のデフォルトの挙動を定義します。今回はPythonでprintを実行するコマンドをデフォルトで定義しているので、コマンドの上書きをして実行をしなければ、コンテナ起動時にHello World! とプリントされます。`CMD`には値として、`実行したいコマンドをスペース区切りごとにダブルクォートで括ったもの`を`[]`で括った文字列を渡します。  

では、このDockerfileをビルドして、ビルドしたイメージを起動してみましょう。  

まずはこのコマンドでビルドします。

```bash
% docker build -f ./Dockerfile .
```

おそらく、末尾に下記のような文言が出力されるはずです。IMAGE IDの部分を控えておいてください。

```bash
Successfully built {IMAGE ID}
```

(ここから追記)

Docker for Macを使っている場合はこの部分の出力が違うそうです。

```bash
=> exporting to image 0.0s
=> => exporting layers 0.0s
=> => writing image {IMAGE ID}
```

(ここまで追記)

次に、このコマンドを実行することでコンテナが起動します。

```bash
% docker run {IMAGE ID}
```

どうですか？ `Hello World!` と出力され、正常に処理が終了したためコンテナも終了し、ターミナルに戻ったはずです。Dockerfileを書いて、コンテナイメージをビルドし、コンテナを立ち上げるという一連の流れを体験することができましたね！

### 自分用にタグを設定する
ところで、先ほどの手順でIMAGE IDを利用するのが面倒ではありませんでしたか？  
実は、`--tag`(省略形は`-t`)オプションを使うことで自分用にタグをつけることができ、そのタグを使ってコンテナイメージを指定することができます。
たとえばこんな感じです。

```
% docker build -f ./Dockerfile --tag="python-tutorial:step1".
% docker run python-tutorial:step1
```

### ソースファイルをコンテナに同梱して、ファイルから実行できるようにする
このセクションのサンプルは[example2](https://github.com/kei-s16/blog-docker-examples/tree/main/example2)にあります。  

さきほどの手順では、コマンドラインから渡す形式でしかPythonスクリプトを実行することができませんでした。  
しかし、実際のアプリケーションは複数のコマンドからなるため、ファイルにまとめられているはずです。さきほどの手順では、本格的なアプリケーションが実行できないのです[^8]。  
というわけで、このセクションではソースファイルからアプリを実行できるDockerコンテナを作成してみます。  

前のセクションで使ったDockerfileを編集するか、新しく作業ディレクトリを作成してDockerfileという名前のファイルを作成するかのどちらかを実施し、内容を下記の通りにしてください(改行は省略してもかまいません)。  

```Dockerfile
FROM python:3.10.4-bullseye

WORKDIR /usr/src/app
COPY ./src .

CMD ["python", "./main.py"]
```

その後、Dockerfileのあるディレクトリに`src`という名前のディレクトリを作成し、その中に`main.py`というファイルを作成してください。中身は下記のように編集してください。

```python
print("Hello World!")
```

さて、ここまでの手順で、作業ディレクトリの構造はこのようになっているはずです。

```
- 作業ディレクトリ
  - Dockerfile
  - src
    - main.py
```

ディレクトリの中身が正しいことを確認したら、下記のコマンドを実行して、どうなるか見てみましょう。

```
% docker build -f ./Dockerfile --tag="python-tutorial:step2" .
% docker run python-tutorial:step2
```

どうでしたか？ `Hello World!` と出力されましたか？

ではここで、Dockerfileの中に書いた、新しいコマンドについて説明します。  
`WORKDIR`は、Dockerfileに書かれたコマンドを実行するディレクトリを変更するコマンドです。たとえば、`WORKDIR /usr/src/app`を実行したあとの処理で`pwd`を実行すれば`/usr/src/app`と出力されますし、`cat ./hoge`とすれば`/usr/src/app/hoge`を出力しようとします。また、`WORKDIR`で存在するディレクトリを指定するとそのディレクトリに移動するだけですが、存在しないディレクトリを指定した場合は、移動先のディレクトリを作成してから移動します。  
`COPY`は、コンテナをビルドする環境のファイルシステムから、コンテナに対してファイルをコピーするコマンドです。`COPY ./src .`は、ビルド環境のカレントディレクトリにある`src`ディレクトリを、コンテナのカレントディレクトリにコピーすることを意味します。

これを踏まえて今回のDockerfileを読むと、

1. `/usr/src/app`に移動する
2. ホストマシンの`./src`から`/usr/src/app`にファイルをコピーする
3. デフォルトでは`python /usr/src/app/main.py`を実行するように設定する

という処理がビルド時に実行されることがわかります。

注意点として、あたりまえですが`COPY`したファイルはコンテナイメージに含まれます。コンテナイメージをダウンロードした人は誰でもコンテナの中に置かれたファイルを見ることができるようになるということです。業務でも個人プロジェクトでもそうですが、機密情報はコンテナイメージの外(S3やDBなど)に持つようにする、`ENV`コマンドを使うことで環境変数として起動時に初めて渡すようにし、イメージ内部には持たないようにするなどしましょう。そもそも機密を含むものが誰でも利用できるようになること自体避けたいわけですが(プロダクション用のイメージなどはプライベートレジストリを使うべきです)。

### ARGを使ってみよう
ここまで書いたDockerfileはすべてタグを固定で書いています。別のイメージを試したくなったときはDockerfileに手を加える必要があるわけですが、試すだけなのにエディタを開くのはちょっとおっくうです。  
そこで、ビルドコマンドの引数でタグを渡してあげればいい感じに`FROM`で持ってくるイメージを変えることができるようにしてみましょう。

```Dockerfile
ARG TAG="3.10.4-bullseye"
FROM python:$TAG

WORKDIR /usr/src/app
COPY ./src .

CMD ["python", "./main.py"]
```

新しく追加した`ARG`コマンドは、ビルド時に受けつける追加の引数名と、そのデフォルト値を定義できるコマンドです。例では、`TAG`という引数を受けつけるようにし、その引数が与えられなかった場合は`python:3.10.4-bullseye`が与えられたものとして振る舞うように設定されています。そして、`TAG`は`FROM`コマンドで利用されています。これで、ビルド時の引数としてイメージタグを受け取れるようになったわけです。  
引数は`--build-arg`オプションで与えます。  

```bash
% docker build -f ./Dockerfile --tag="python-tutorial:extra" --build-arg TAG="3.11-rc-bullseye".
```

ユースケースとしては、上記の例のように実行環境を気軽に上げて検証できるようにする、などがあります。その他にも、様々な使い方があります。いずれ活用してみてください。

### pipを使う
このセクションのサンプルは[example3](https://github.com/kei-s16/blog-docker-examples/tree/main/example3)にあります。  

ここまでである程度ちゃんとしたPythonの実行を作成できるようになりましたが、なにか抜けていませんか？ そう、外部パッケージの利用です。  
愚直な方法はビルドを実行するマシンで`pip install`して、それを参照することですが、なんというかいろいろ問題がありますね。pipを使ううまみがほとんどないというか……。  
でも、現時点で私たちが知っているビルドにコマンドを実行する方法は`CMD`コマンドだけです。ここにコマンドを書いても、実行時コマンドの上書きで実行されない可能性がありますし、なにより`CMD`はDockerfileのなかで一度しか使うことができません。  
というわけで、`CMD`以外のコマンドを使って、コンテナらしくビルド中に`pip`を使えるようにし、コンテナ上のPythonで外部パッケージを扱ってみましょう。  

今回は、[colorama](https://pypi.org/project/colorama/)を利用して、文字列を赤く出力してみます。  
[example3](https://github.com/kei-s16/blog-docker-examples/tree/main/example3)を参考に、お手元に必要なファイルを用意し、ビルドと実行をしてみてください。うまくいけば、赤文字でHello World! と表示されるはずです。

さて、どうやって`pip install`と`python main.py`のふたつを実行できるようにしたのでしょうか？ 答えはこの行にあります。

```Dockerfile
RUN pip install --no-cache-dir -r requirements.txt
```

ここで登場する`RUN`というコマンドは、コンテナのビルドの途中で任意のコマンドを実行するために使われます。`CMD`と違い、コマンドはふだんシェルで入力する形で与えることもできます。`CMD`で実行する処理に必要な前準備は、`RUN`を使って記述します。たとえば、今回のようなアプリケーションが利用する外部パッケージのインストールのほか、外部サービスから設定をダウンロードしてきたり、ソースコードから実行可能なバイナリをビルドしたりするのには`RUN`コマンドを使うといいと思います[^9]。

## 終わりに
今回は、基本的なアプリケーションを実行するために必要な最低限のDockerfile知識をまとめました。  
この次のステップは、自分のサービスを動かしてみることになると思います。そのステップをやりきるには、この記事にある情報だけでは難しいと思います。公式ドキュメントに軽く目を通しながら進めていくことを強くおすすめします。  
また、記事では触れませんでしたが、リポジトリには`ステージ`とそれを活用した`マルチステージビルド`の例も置いています[^10]。気になる方はどうぞ。

コメントや誤りの連絡は、[issue](https://github.com/kei-s16/kei-s16.github.io/issues/new)にお願いします。

[^1]: 厳密には、`カーネルレベルの依存関係をすべてホストマシンに委ねることで、Dockerを利用している開発者の視点では任意の必要なソフトウェアだけでのアプリケーションの実行が可能になっているように見える`。Dockerの実行環境自身がときどきこのあたり意識することを要求してくる。ECSやCloud Runなどのマネージドなコンテナ実行環境を利用するなら、この部分はクラウド事業者が管理してくれるのである程度無視できる。
[^2]: このセクションには理想が多分に含まれている。
[^3]: 厳密にはコンテナ仮想化技術。
[^4]: 誰向けなのかわからない注釈 : Vagrantfileのようなものを想像するとわかりやすい。
[^5]: なんでこんなことを書いているのかって？ ひどい目にあったからですよ(なんもわかってないときに書いたDockerfileを直しながら)。
[^6]: タグだけ与えた場合はデフォルトではDockerhubから取得してくる。URIを与えることで、任意のコンテナレジストリ[^7]から取得することができる。
[^7]: Elastic Container Registry, Github Contgainer Registry, 自宅に立てたオレオレレジストリなど。
[^8]: ここでワンライナーを持ち出すのはやめてください。
[^9]: とはいえ、`RUN`にはビルドの仕組みを知らないとひっかかりやすい落とし穴があったりする。ガリガリ書き始めるまえに、公式ドキュメントを読むことをおすすめします。
[^10]: 途中で力尽きたとも言う。想定読者的にはまだいらんじゃろという気持ちもある
