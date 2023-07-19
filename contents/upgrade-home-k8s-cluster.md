---
title: "自宅のk8sクラスタを更新した記録"
date: "2022-09-27T21:00:21"
tags: ["k8s"]
category: "技術"
---

自宅のk8sクラスターを1.24.0から1.25.2に更新しました。  
毎回CNIやコンテナエンジンの変更に追従できず更新に失敗して泣きながらクラスタを再構築していたのですが、今回はなにごともなく完了できたので、記念にメモを残しておきます。  
逆に言うと、何事もなさすぎてみどころはないです。これから更新にチャレンジする人は[公式ドキュメント](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)を読みながらやってください。

## クラスタ

node一覧は下記の通り。OSはすべてarchlinux(ARM), ホストマシンはRaspberry Pi 4(4GB)。

|ホスト名|ロール|備考|
|-|-|-|
|kisaragi|control-plane||
|akizuki|worker|踏み台サーバ, 家庭内Ansible実行環境としても利用|
|mogami|worker||
|kumano|worker||

## control-plane
`kubeadm`, `kubelet`を更新する。今回は `yay` でパッケージを管理しているので、一括更新でやってしまう。

```sh
% yay -Syyu
```

kubeadmのバージョンが狙ったもの(今回は `1.25.2`)になっていることを確認する。

```sh
% kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"25", GitVersion:"v1.25.2", GitCommit:"5835544ca568b757a8ecae5c153f317e5736700e", GitTreeState:"clean", BuildDate:"2022-09-21T14:32:18Z", GoVersion:"go1.19.1", Compiler:"gc", Platform:"linux/arm64"}
```

dry-run的なコマンドでアップグレード内容が問題ないことを確認する。

```sh
% sudo kubeadm upgrade plan
```

問題なければバージョンを指定し、実際に反映する。

```sh
% sudo kubeadm upgrade apply v1.25.2
```

めちゃくちゃ時間かかるのでじっと待つ。実行ログが都度出るので何が起きているかは確認できるが、それでも不安なら `top` で様子を見ておく。正常に動いていれば、`kube-apiserver`, `kubelet`, `kube-controller`, `containerd` あたりが上に浮いたり沈んだりする。

## workers
control-planeで、kubeletをアップデートしたいノードにサービスやコンテナが割り当てられないようにする。

```sh
% kubectl drain ${TARGET_NODE_NAME} --ignore-daemonsets
```

アップデートしたいノードにログインし、kubeletを更新・再起動する。

```sh
% sudo systemctl daemon-restart
% sudo systemctl restart kubelet
```

再度ノードにサービスやコンテナが割り当てられるようにする。

```sh
% kubectl uncordon ${TARGET_NODE_NAME}
```

この手順をクラスタに属するノードぶん繰り返す。

## 完走した感想
なにごともなく無事に終わると書くことがない。
