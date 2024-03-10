---
title: "Dockerボリュームをマウントしたときの所有者問題を回避したい"
date: "2023-06-01T09:00:00"
description: "ENTRYPOINTの中でボリュームの所有権をがちゃがちゃやる"
tags: ["Qiita", "Docker", "docker-compose"]
category: "技術"
---
この記事は以前Qiitaにて公開したものになります。  
元記事はこちら : [Dockerボリュームをマウントしたときの所有者問題を回避したい](https://qiita.com/_kei_s/items/393059ca6d04edd02724)

<hr>

先日、ローカル開発環境用のcompose.yamlのレビューリクエストが届きました。
簡単なメールの送受信をテストするための[mailhog](https://github.com/mailhog/MailHog)コンテナで受信したメールが保存できない状態になっており、それに対して下記のようにコンテナの実行ユーザを `root` に切り替えるような変更を加えるというものです。

```diff_yaml
services:
  mailhog:
    image: mailhog/mailhog:latest
+   user: root
    volumes:
      - type: volume
        source: mailhog-storage
        target: /mailhog/inbox
    environment:
      MH_UI_WEB_PATH: mailhog
      MH_STORAGE: maildir
      MH_MAILDIR_PATH: /mailhog/inbox
      
volumes:
  mailhog-storage:
    driver: local
```

このPRのレビューを通して、ボリュームの取り扱いについての知見を関係者と共有したのでまとめておきます。

## お品書き

この記事では

- そもそも何が起きているのか?
- 所有者問題にぶつかったときにどうするか

について説明します

## 検証環境
Proxmox上に立てたLinuxサーバで検証していきます。

```bash
$ uname -r
6.3.5-arch1-1
$ docker -v
Docker version 24.0.2, build cb74dfcd85
$ docker compose version
Docker Compose version 2.18.1
```

## そもそも何が起きているのか?
### 再現
最小の再現環境は下記で用意できます。

```compose.yaml
services:
  mailhog:
    image: mailhog/mailhog:latest
    volumes:
      - type: volume
        source: mailhog-storage
        target: /mailhog/inbox
    environment:
      MH_UI_WEB_PATH: mailhog
      MH_STORAGE: maildir
      MH_MAILDIR_PATH: /mailhog/inbox

volumes:
  mailhog-storage:
    driver: local
```

コンテナは正常に起動しますが、送受信したメールを保存しようとするとコンテナのログにエラーが出力されるはずです。

### 何が起きているのか?
コンテナの中に入って、実行ユーザや保存ディレクトリの情報を確認してみましょう。

```sh
~ $ ps
PID   USER     TIME  COMMAND
    1 mailhog   0:00 MailHog
   29 mailhog   0:00 sh
   35 mailhog   0:00 ps
~ $ whoami
mailhog
~ $ ls -l /mailhog/
total 0
drwxr-xr-x    1 root     root             0 May 31 01:01 inbox
```

`Mailhog` は `mailhog` ユーザによって実行されていますが、`Mailhog` がデータを保存するための `/mailhog/inbox` ディレクトリは `root` ユーザが所有しており、それ以外のユーザは `inbox` に対して書き込みができないことがわかります。

なぜ `root` になってしまうかというと、コンテナがマウントするvolumesの置き場所がデフォルトでは `/var/lib/docker` にあり、ここの所有者情報を引き継いでしまうからです(詳細は[公式ドキュメントを参照](https://docs.docker.com/storage/volumes/))。

```sh
$ sudo ls -l /var/lib/docker/volumes
total 24
brw------- 1 root root 0, 24 May 31 09:54 backingFsBlockDev
drwx-----x 1 root root    10 May 31 10:01 mailhog_mailhog-storage
-rw------- 1 root root 32768 May 31 10:01 metadata.db
```

この情報だけ見ると、コンテナの実行ユーザを `root` に切り替えてしまうのも問題解決の方法として選択肢には挙げられるのですが、それは避けたいところです。

## そもそもボリュームマウントが必要かどうかを検討する
ボリュームマウントは永続的にデータを保存しておきたい場合に利用する機能です。
そのため、

- データを永続的に保存する必要があるか?
- 保存する必要がある場合、それはコンテナ自身のストレージに持つ必要があるか?

をまず検討し、どちらもYesな場合にのみ、ボリュームマウントを活用するといいです。
(基本的に、スケーラブルなコンテナ運用を検討すると両方Noになっていくはずです)

今回は、ローカル開発環境でのみの利用ということもあって、
>- データを永続的に保存する必要があるか?

こちらがNoだったため、最終的にボリュームマウント機能を使わないように変更を加えました。

```compose.yaml
services:
  mailhog:
    image: mailhog/mailhog:latest
    environment:
      MH_UI_WEB_PATH: mailhog
      MH_STORAGE: maildir
      MH_MAILDIR_PATH: /home/mailhog/inbox
```
 
## Entrypointを活用することでボリュームマウント時にコンテナでの所有者問題を回避する
では、検討の結果ボリュームマウントを使いたくなった場合にどうするか、という話です。

コンテナの起動は下記の流れになっています。

1. コンテナの起動
    - Volumeのマウントはここで実行
2. EntrypointがDockerfileかcompose.yamlに設定されていればそれを実行
3. CMDがDockerfileかcompose.yamlに設定されていれば実行
    - ただし、[Entrypointの書き方によってはCMDが設定されていても実行されない可能性あり](https://docs.docker.jp/engine/reference/builder.html#cmd-entrypoint)

2のEntrypoint実行のタイミングがボリューム周辺に介入できるポイントになります。
Entrypointに所有者を変更する処理(`chown`)を挟むことで、当該ディレクトリの所有者を実行ユーザに渡すことができます。

```diff_yaml
services:
  mailhog:
    image: mailhog/mailhog:latest
    volumes:
      - type: volume
        source: mailhog-storage
        target: /mailhog/inbox
    environment:
      MH_UI_WEB_PATH: mailhog
      MH_STORAGE: maildir
      MH_MAILDIR_PATH: /mailhog/inbox
+    entrypoint: >
+      sh -c "
+          sudo chown -R mailhog:mailhog /mailhog/inbox && \
+          MailHog
+      "

volumes:
  mailhog-storage:
    driver: local
```

(注: このcomposeファイルは、mailhogコンテナにsudoが入っていないため、起動しません)

ただし、注意点があります。

### 注意点1: もともとのEntrypointを確認する
コンテナの起動処理は `Entrypoint` と `CMD` 、どちらに書いてもOKになっています。
今回のようにEntrypointを上書きしたとき、元々の起動処理がEntrypointに書かれていた場合、「起動するための前処理は動いたが肝心の動かしたいプロセスを起動していない」なんてことが起きるかもしれません。
それを避けるため、ベースイメージのEntrypointとCMDの記述を事前に確認しておきましょう。
下記のコマンドで確認することができます。

```sh
$ docker inspect {コンテナイメージ名}
```

### 注意点2: イメージそのままだとrootでコマンドが実行できないことがある
コンテナの実行ユーザはデフォルトではrootが指定されています。基本的にさらに一段上の `privileged` なコンテナでなければ問題は起きにくいのですが、[CVE-2022-0492](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-0492)のように、常に安全というわけでもありません。

安全や開発時の利便性のため、rootで実行することを避ける動きもあり、配布されているイメージには時々rootでないユーザで実行されるように設定されているものがあります(今回例として挙げたmailhogコンテナもこれに該当します)。
このようなコンテナでは、ベースイメージにもよりますが、**`sudo` コマンドが入っていない**ことがあり、Entrypoint内で一時的にrootとして振る舞うことが難しくなります。
この場合は、`/tmp` にマウントする、リスクを把握した上でrootユーザを使うなどして問題を回避することなります。

## まとめ
Dockerボリュームをマウントしたとき、ボリュームの所有者と実行ユーザが異なって問題が発生した場合、

1. そもそもボリュームマウントが必要かどうかを確認する
2. 必要な場合はEntrypointの上書きを使い、所有者を変更して回避する
3. 2が難しい場合は、rootユーザで実行することを検討する

の順番で対策を検討していくのがよさそうです。

## おまけ
Entrypointでがんばるサンプル

```Dockerfile
FROM mailhog/mailhog:latest

USER root

RUN apk update && apk add sudo
RUN echo 'mailhog ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers

USER mailhog
WORKDIR /home/mailhog

ENTRYPOINT ["MailHog"]
EXPOSE 1025 8025
```

```compose.yaml
services:
  mailhog:
    build:
      context: .
      dockerfile: ./Dockerfile
    volumes:
      - type: volume
        source: mailhog-storage
        target: /mailhog/inbox
    environment:
      MH_UI_WEB_PATH: mailhog
      MH_STORAGE: maildir
      MH_MAILDIR_PATH: /mailhog/inbox
    entrypoint: >
      sh -c "
          sudo chown -R mailhog:mailhog /mailhog/inbox && \
          MailHog
      "

volumes:
  mailhog-storage:
    driver: local
```

