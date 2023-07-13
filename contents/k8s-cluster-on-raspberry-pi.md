---
title: "k8s Cluster on Raspberry Pi"
date: "2021-02-10T20:00:00"
---

[kei-s16/k8s-arch-rpi-cluster.md](https://gist.github.com/kei-s16/91cc87b127f38cfed28fe625ae8c9ba9) を元に加筆・修正を行ったものです  
基本的に2021年頭の情報になっており、すでに時代遅れであったり、間違いに気づいて実際の運用では改善済のものが記事には含まれています  

---

## なにやったのか？
rpi4 * 3 で k8s クラスタを作る

## 構成
- rpi 4 (4GB)
  - Arch Linux (ARM)

## 作業環境
### Raspbianイメージ焼くところ
Windowsの世界

### もろもろの雑用
Arch on WSL2

```
kei@Win-Desktop-wsl
OS: Arch Linux on Windows 10 x86_64
Kernel: 5.4.72-microsoft-standard-WSL2
Shell: zsh 5.8
CPU: AMD Ryzen 7 3800X (16) @ 3.892GHz
Memory: 279MiB / 12733MiB
```

### ArchLinux for ARM64がんばるところ
Raspbian(32bit)

### Kubernetesがんばるところ
ArchLinux ARM(64bit) on Raspberry Pi

## 作業手順
### 下準備フェイズ
1. 組み立てやってテンション上げる
2. メインのLANにぶらさげるLANのセットアップ
3. Raspbian を headlessでインストール
    1. ルータに有線で接続してssh
        1. 新ユーザ作ってpiユーザ消す
        2. パスワード→鍵認証はやらない(raspbianをこのあと使わないので)
4. Raspbian 上 で ArchLinux ARM を焼く

```sh
# $はすべて sudo
$ fdisk /dev/sda
# いいかんじにパーティション切る

$ mkfs.vfat /dev/sda1
$ mkdir boot
$ mount /dev/sda1 boot

$ mkfs.ext4 /dev/sda2
$ mkdir root
$ mount /dev/sda2 root

# イメージ落とす
$ wget http://os.archlinuxarm.org/os/ArchLinuxARM-rpi-aarch64-latest.tar.gz

# ここから先はsuする
$ su
% bsdtar -xpf ArchLinuxARM-rpi-4-latest.tar.gz -C root
% sync

# 64bit かつ rpi4 なので
% sed -i 's/mmcblk0/mmcblk1/g' root/etc/fstab

% mv root/boot/* boot

# マウントしたらちゃんとアンマウントしようね
% umount boot root

# これを3セット (さらに別用途で---1セットやったのは秘密)
```

### 本作業フェイズ
#### 各マシンにホスト名ふったりユーザ作ったり
- `pacman -Syyu` めっちゃ重い(国内ミラーなさそう)
- `pacman -S sudo`
- ホスト名変えた
    - kisaragi
    - mogami
    - kumano
- sudoersいじった
- 公開鍵認証以外封じた

#### Kubernetesまわりガーっとインストール
- Ansibleでやろうとしたが、pacmanだけでなくyayも使うのでちょっと厳しかった
    - ので横着してシェルスクリプト書いたが横着しすぎてコケた
        - ので最終的に半手作業……

```sh
#!/bin/bash -eu
pacman -S git base base-devel --noconfirm
mkdir ~/build/
cd ~/build
git clone https://aur.archlinux.org/yay.git
cd ~/build/yay
makepkg -si --noconfirm
cd ~/
yay -S docker kubelet-bin kubeadm-bin kubectl-bin ebtables ethtool socat conntrack-tools cni-plugins --noconfirm
```

#### Kubernetesセットアップ
##### 全体構成
- kisaragi : Master
- mogami : node
- kumano : node

お船じゃないよ

##### kisaragiのセットアップ前半戦
```sh
sudo kubeadm init --pod-network-cidr=10.244.0.0/16
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
```

##### mogami & kumanoのセットアップ
```sh
sudo systemctl enable kubelet.service
sudo systemctl start kubelete.service
sudo kubeadm join {いろんなひみつのオプション}
```

##### kisaragiのセットアップ後半戦
クラスターにノードを参加させる

```sh
kubectl label node mogami node-role.kubernetes.io/worker=worker
kubectl label node kumano node-role.kubernetes.io/worker=worker
```


```sh
kisaragi% kubectl version
Client Version: version.Info{Major:"1", Minor:"20", GitVersion:"v1.20.2", GitCommit:"faecb196815e248d3ecfb03c680a4507229c2a56", GitTreeState:"clean", BuildDate:"2021-01-13T13:28:09Z", GoVersion:"go1.15.5", Compiler:"gc", Platform:"linux/arm64"}
Server Version: version.Info{Major:"1", Minor:"20", GitVersion:"v1.20.2", GitCommit:"faecb196815e248d3ecfb03c680a4507229c2a56", GitTreeState:"clean", BuildDate:"2021-01-13T13:20:00Z", GoVersion:"go1.15.5", Compiler:"gc", Platform:"linux/arm64"}}}
```

#### なんかpod動かしてみる
オレオレDocker Registry置くことにした

deployment.yml
```yml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: docker-registry
  labels:
    app: docker-registry
spec:
  replicas: 1
  selector:
    matchLabels:
      app: docker-registry
  template:
    metadata:
      labels:
        app: docker-registry
    spec:
      hostNetwork: true
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      nodeSelector:
        kubernetes.io/hostname: kisaragi
      containers:
      - name: docker-registry
        image: registry:2.7.1
        ports:
        - containerPort: 5000
        volumeMounts:
        - name: registry
          mountPath: /var/lib/registry
      volumes:
      - name: registry
        hostPath:
          type: Directory
          path: /mnt/exthdd/registry
```

これをデプロイして、外からpull & pushしてみる


```sh
sudo docker pull hello-world
sudo docker tag hello-world kisaragi.local:5000/hello-world
sudo docker push kisaragi.local:5000/hello-world
```

**動いた！**

## その他もろもろ
### つらかったこと
- アップデートで再起動かけたら `kubectl` コケた
  - masterで `systemctl enable kubelet` 忘れてた
- 一瞬世界から孤立したサーバを産み落としてしまった
  - `~/.ssh/authorized_keys` を消してしまった
  - 別マシンでSDカードをマウントして `authorized_keys` を作ることでごまかした
    - `chmod {ユーザ名}:sudo authorized_keys` 忘れずにね

### やらなかったこと(今後やりたいこと)
- PoE(USBケーブル邪魔じゃね？)
- ノード台数の拡張
- 無線LANルータがちょっと残念だったので改善
  - ラズパイルータにしちゃう

## 結論
- ArchLinuxはいいぞ
- k8sはいいぞ
- 横着はよくないぞ

## 参考記事
- [Raspberry Pi 4 | ArchLinux ARM](https://archlinuxarm.org/platforms/armv8/broadcom/raspberry-pi-4)
- [Raspberry Pi 4 のMACアドレスの範囲が変わったぞ](https://qiita.com/tomotomo/items/2ff445377c13f9db38e2)
- [3日間クッキング【Kubernetes のラズペリーパイ包み　“サイバーエージェント風】](https://developers.cyberagent.co.jp/blog/archives/14721/)
- [Raspberry PiでおうちKubernetes構築【物理編】](https://qiita.com/go_vargo/items/d1271ab60f2bba375dcc)
- [Raspberry PiでおうちKubernetes構築【論理編】](https://qiita.com/go_vargo/items/29f6d832ea0a289b4778)
- [Raspberry Pi 4とArch Linux(64bit)で作るKubernetesクラスタ)](https://qiita.com/temeteke/items/04960c96edee113bd053)
- [Raspberry Pi 4 でおうちk8sクラスタを構築する](https://sminamot-dev.hatenablog.com/entry/2020/01/26/111949)
- [おうちk8sクラスタを作る: Dockerレジストリ編](https://qiita.com/yuyakato/items/c5b1b1293c5879e231ab)

---

## 補足
重要なものだけ補足  

> pacman -Syyu めっちゃ重い(国内ミラーなさそう)

という記述がありましたが、2021/11/18にAsahi Linuxが国内ミラーを作成してくれました！

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">We noticed that there was no Arch Linux ARM mirror in Japan, so we&#39;re sponsoring one now 😊<br><br>If you&#39;re in Japan or nearby, feel free to point your pacman.d/mirrorlist at <a href="https://t.co/GM69rZE3tC">https://t.co/GM69rZE3tC</a>!<a href="https://t.co/erKHtHwFfX">https://t.co/erKHtHwFfX</a> <a href="https://t.co/m0opnupc5i">pic.twitter.com/m0opnupc5i</a></p>&mdash; Asahi Linux (@AsahiLinux@treehouse.systems) (@AsahiLinux) <a href="https://twitter.com/AsahiLinux/status/1461268746878656513?ref_src=twsrc%5Etfw">November 18, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script> 
