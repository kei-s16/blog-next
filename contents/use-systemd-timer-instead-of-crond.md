---
title: "systemctl timer unitを使ってcronを置き換えたときのメモ"
date: "2020-06-17T20:00:00"
---

移植 : https://gist.github.com/kei-s16/eb5eb5f6657e17eb8e9a422c167e62e0

---

### 概略
systemdのユニットを定期的に再起動するために

- 再起動用のサービスユニット
- 上記ユニットのタイマーユニット

を作成し、ついでに実行時にwebhookを使ってDiscordに通知を飛ばす

### 前提とかおことわりとか

- Indigo(6vCPU, 8GB)上のUbuntu 18.04で動かしています。
- 今回定期的に再起動したいサービスユニットは、[ARKのプライベートサーバ](https://ark.gamepedia.com/Dedicated_Server_Setup)
- 上記のサービスユニットをこの記事では(wikiと同じく)`ark-dedicated.service`という名前で登録しています。別名で登録している場合や別のユニットを対象とする場合は適宜読み替えてください。
- systemdまわりめちゃくちゃ浅い理解で書いてます。
- コケたときのことはなにも考えてません。

### まずは定期的に再起動するように

#### 再起動用のサービスユニットを作る
``` restart-ark-dedicated.service
[Unit]
Description=Restart ark-dedicated.service

[Service]
Type=oneshot
ExecStart=/bin/systemctl try-restart ark-dedicated.service
```

#### タイマーユニットを作る
今回は誰も遊んでいないであろう毎週水曜日正午に再起動処理を実行することにします。

``` restart-ark-dedicated.timer
[Unit]
Description=Restart ark-dedicated.service every wednesday

[Timer]
OnCalendar=Wed 12:00
Persistent=True

[Install]
WantedBy=timers.target
```

### webhookで通知する
いちいち再起動するよーとかしたよーとか言うのもめんどうなので。

#### まずは試してみる
`通知をしたいDiscordサーバのサーバ設定→ウェブフック`からウェブフックを作り、webhook URLを取得します。

とりあえず下記コマンドで雑にメッセージを投げてみる。

```
curl -X POST -H 'Content-Type: application/json' -d '{"content" : "test"}' webhookのurl
```

#### 再起動の開始と終了に合わせて通知を飛ばす
`restart-ark-dedicated.service`を再び編集し、`ExecStartPre`で`ExecStart`の実行前に、`ExecStartPost`で`ExecStart`の実行後に走らせるコマンドをそれぞれ指定します。

``` restart-ark-dedicated.service(編集後)
[Unit]
Description=Restart ark-dedicated.service

[Service]
Type=oneshot
ExecStartPre=/usr/bin/curl -X POST -H 'Content-Type: application/json' -d '{"content" : "[定期]サーバ再起動開始"}' webhookのurl
ExecStart=/bin/systemctl try-restart ark-dedicated.service
ExecStartPost=/usr/bin/curl -X POST -H 'Content-Type: application/json' -d '{"content" : "[定期]サーバ再起動完了"}' webhookのurl
```

### おわりに
このままだと再起動開始通知から速攻で再起動処理が動くのであんまりよくない。
人に優しくありたいなら30分とか1時間前に通知するようにしましょう。

### 参考
- [systemd - ArchWiki](https://wiki.archlinux.jp/index.php/Systemd)
- [systemd/タイマー - ArchWiki](https://wiki.archlinux.jp/index.php/Systemd/%E3%82%BF%E3%82%A4%E3%83%9E%E3%83%BC)
- [Discord Developer Portal — Documentation — Webhook](https://discord.com/developers/docs/resources/webhook#execute-webhook-jsonform-params)
