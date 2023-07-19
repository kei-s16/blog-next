---
title: "SEIL/x86 AyameをProxmoxにインストールする"
date: "2023-01-15T20:15:00"
tags: ["メモ", "Proxmox", "SEILx86"]
category: "技術"
---

## これはなんだ
年末年始に安くなっていたので、[SEIL/x86 Ayame](https://www.seil.jp/product/x86ayame.html)のスタンダードライセンスを買った。  
用途も決めずに買ったので、なにをするというわけでもないが、とりあえず触ってみようということでProxmoxにインストールすることにした。  
これはその時の手順メモ。  

## * おことわり *
**ProxmoxはSEIL/x86 Ayameのサポート環境ではありません。**

## インストール手順
tl;dr : KVM仮想マシンイメージから起動する。  

### イメージを落とす
まずは[公式のダウンロードページ](https://www.seil.jp/product/download.html#dl__x86ayame)からイメージを落とす。  

配布形式は

- KVM形式
- VMware形式（OVF版を同梱）
- Hyper-V形式
- Microsoft Azure形式
- Amazon AWS EC2形式

となっている。  
Proxmoxで扱うならISOがあるととても嬉しいが、ないので(ていうか性質的に無理な気がする)KVMイメージを使ってごにょごにょすることにした。  

ダウンロードしたZIPを展開するとqcow2ファイルが出てくる。これを使う。  

### 空のVMを作成する
qcow2ファイルをGUIから扱うことはできないが、[フォーラムを見るとProxmoxのシェルからなら取り扱えるらしい](https://forum.proxmox.com/threads/qcow2-to-proxmox.77894/)。これに従う。  
まず普通にVMを作成するときと同じように設定したあと、`ハードウェア` 設定からストレージを取り外せばOK。  
後の手順で使うので、作成したVM IDを控えておく(今回は100)。

### Proxmoxにqcow2ファイルを転送する
ISO形式だと管理画面からアップロードできるが、そうではないのでSCPなりUSBフラッシュメモリなりを使って転送する。  
今回は物理マシンがすぐそこにあったので、USBフラッシュメモリを使った。  
今回はProxmoxのシェルで下記のコマンドを使い、cqow2ファイルの入ったUSBフラッシュメモリを `/mnt/external` にマウントした。  

```bash
% mkdir /mnt/external
% mount /dev/sdb1 /mnt/external # デバイスは適宜読み替えること！
```

### シェルからVMにイメージをインポートする
Proxmoxの `シェル` にアクセスできるユーザを使う。今回は横着してrootユーザを使った。  

```bash
# qm importdisk {VM ID} {イメージの場所} local-lvm
% qm importdisk 100 /mnt/external/seilx86.qcow2 local-lvm
```

### ブート順を確認し、起動する
VMの `オプション` でブート順を確認し、インポートしたディスクがブートされるように設定したら起動する。  
(デフォルトの挙動がわかっていないが、もしディスクが無効化されていたら有効にする作業も必要。チェック入れるだけなはず)  
起動したら、ライセンスを入力すれば作業完了。  

## 起動
こんなかんじ。  
<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">SEIL/x86 Ayame起動できた あそぶぞー <a href="https://t.co/PEajdNjaQp">pic.twitter.com/PEajdNjaQp</a></p>&mdash; kei (@_kei_s) <a href="https://twitter.com/_kei_s/status/1614470430919917568?ref_src=twsrc%5Etfw">January 15, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script> 

## 感想
すなおにESXiでやろう。  
SEILの使いみちはこれから考えます。  
