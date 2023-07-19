---
title: "2023年 令和最新版 archlinux インストールオレオレ手順"
date: "2023-01-14T14:30:00"
description: "ARCHLINUXINSTALLBATTLE"
tags: ["archlinux", "メモ"]
category: "技術"
---

## これはなにか
Windows 11が入っているマシンにarchlinuxを追加してデュアルブート設定までやったときのメモ。  
最低限のツールを設定して、デスクトップ環境を立ち上げるところまでやっている。便利な開発系ツールのインストールやおしゃれ設定などはしていない。  

[将来的に自動化するときに楽できるように、細かくコマンドを書いておく](https://yakst.com/ja/posts/5564)という趣旨。  

## 背景
年末年始に半額だったので、[SEIL/x86 Ayame](https://www.seil.jp/product/x86ayame.html)を衝動買いしたが、それを動かすマシンがなかった。  
せっかくなのでまたProxmoxサーバを組んでもいいかなと思ったが、試算したところちょっと予算オーバー気味だったので、archlinuxデスクトップマシンを潰してそちらをProxmoxサーバに切り替えることにした。  
ただ、linuxデスクトップが自宅から消滅するといろいろと不便なのは目に見えていたので、Windowsマシンにメモリとストレージを盛ってarchlinuxをデュアルブートすることにした。  

## ハードウェア構成
THE 型落ちみたいな。  
Ryzen 7000番台とSocket AM5マザボがもうちょい安くなったら買い換えたい。  

| 種類 | 名称 | 備考 |
|---|---|---|
| MB | ASUS PRIME B450-PLUS |  |
| CPU | AMD Ryzen 7 3800X |  |
| GPU | ZOTAC GAMING GeForce GTX 1660 Ti 6GB GDDR6 / ZT-T16610F-10L |  |
| Memory | CK8GX4-D4U3200H 8GB*2 | BTOで買ったときに刺さってたやつ |
| Memory | CORSAIR VENGEANCE LPX DDR4-3200 16GB*2 | 追加購入 |
| Storage | WD Green WDS240G2G0A | 240GB, SSD |
| Storage | WD20EZAZ-RT | 2TB, HDD |
| Storage | KIOXIA EXCERIA PLUS G2 SSD-CK500N3PG2/N  | 500GB, M.2, 追加購入 |
| Storage | KIOXIA EXCERIA SSD-CK960S/N | 960GB, SSD, 追加購入 |
| Storage | Seagate BarraCuda ST2000DM008  | 2TB, HDD, 追加購入 |
| PSU | CWT GPT500SATC |  |

## ストレージ構成
事前にWindows 11をクリーンインストールしている。  
Windows 11側では `/dev/sdc`, `/dev/sdd`, `/dev/nvme0n1` を使っている。  
今回は、以前Windows側で使っていた `/dev/sda`, `/dev/sdb` にarchlinuxをインストールする。  

```zsh
$ lsblk
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sda           8:0    0 223.6G  0 disk
sdb           8:16   0   1.8T  0 disk
sdc           8:32   0   1.8T  0 disk # Windows D ドライブ
├─sdc1        8:33   0    16M  0 part
└─sdc2        8:34   0   1.8T  0 part
sdd           8:48   0 894.3G  0 disk # Windows E ドライブ
├─sdd1        8:49   0    16M  0 part
└─sdd2        8:50   0 894.2G  0 part
nvme0n1     259:0    0 465.8G  0 disk # Windows C ドライブ
├─nvme0n1p1 259:1    0   100M  0 part
├─nvme0n1p2 259:2    0    16M  0 part
├─nvme0n1p3 259:3    0   465G  0 part
└─nvme0n1p4 259:4    0   668M  0 part
```

## インストール手順
refs: [インストールガイド - ArchWiki](https://wiki.archlinux.jp/index.php/%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB%E3%82%AC%E3%82%A4%E3%83%89)  

### archisoでの作業
archisoは `archlinux-2023.01.01-x86_64.iso` を使った。  

#### IPアドレスを割り振る
我が家はコンセントに繋がるものは固定IP、バッテリ駆動できるものはDHCPを使うようにしている。  
今回はデスクトップマシンなので、固定IPの設定が必要になる。  

refs: [ネットワーク設定 - ArchWiki](https://wiki.archlinux.jp/index.php/%E3%83%8D%E3%83%83%E3%83%88%E3%83%AF%E3%83%BC%E3%82%AF%E8%A8%AD%E5%AE%9A)  

```sh
$ ip link
$ ip link set eth0 up # 有効化
$ ip address add 192.168.11.16/24 broadcast --- dev eth0 # IPアドレスを割り振る
```

#### 疎通確認
一応繋がるかどうか見ておく。  

```sh
$ ping -c 5 192.168.11.1 # GW
$ ping -c 5 192.168.11.5 # NAS
$ ping -c 5 archlinux.jp # 外
```

#### ストレージ確認
`lsblk` を使って、ストレージが正しく認識されているかどうかを一応見ておく。  

```sh
$ lsblk
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sda           8:0    0 223.6G  0 disk
sdb           8:16   0   1.8T  0 disk
sdc           8:32   0   1.8T  0 disk # Windows D ドライブ
├─sdc1        8:33   0    16M  0 part
└─sdc2        8:34   0   1.8T  0 part
sdd           8:48   0 894.3G  0 disk # Windows E ドライブ
├─sdd1        8:49   0    16M  0 part
└─sdd2        8:50   0 894.2G  0 part
nvme0n1     259:0    0 465.8G  0 disk # Windows C ドライブ
├─nvme0n1p1 259:1    0   100M  0 part
├─nvme0n1p2 259:2    0    16M  0 part
├─nvme0n1p3 259:3    0   465G  0 part
└─nvme0n1p4 259:4    0   668M  0 part
```

#### パーティショニング
refs: [パーティショニング - ArchWiki](https://wiki.archlinux.jp/index.php/%E3%83%91%E3%83%BC%E3%83%86%E3%82%A3%E3%82%B7%E3%83%A7%E3%83%8B%E3%83%B3%E3%82%B0)  

今回はこんな感じにする。  

| パーティション | パス | 備考 |
|---|---|---|
| /dev/nvme0n1p1 | /boot/efi | Windowsのものを使う |
| /dev/sda1 | /boot | 300MiBくらいあれば十分だけど、気分で512MiB振る |
| /dev/sda2 | / |  |
| /dev/sdb1 | /home | /home以下は分けたほうがいいと聞くので、分ける |

`fdisk` を使ってパーティショニングを行なう。  

```sh
$ fdisk /dev/sda
# ここからfdiskのプロンプト
n # あたらしいパーティションを切る
Partition Number: <CR>
First Sector: <CR>
Last Sector: ---512M
n
Partition Number: <CR>
First Sector: <CR>
Last Sector: <CR>
w # 書き込んでおわり
```

```sh
$ fdisk /dev/sdb
# ここからfdiskのプロンプト
n # あたらしいパーティションを切る
Partition Number: <CR>
First Sector: <CR>
Last Sector: <CR>
w # 書き込んでおわり
```

#### パーティショニングできてるか確認
こんな感じになるはず。  

```sh
$ lbslk
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sda           8:0    0 223.6G  0 disk
├─sda1        8:1    0   512M  0 part
└─sda2        8:2    0 223.1G  0 part
sdb           8:16   0   1.8T  0 disk
└─sdb1        8:17   0   1.8T  0 part
sdc           8:32   0   1.8T  0 disk
├─sdc1        8:33   0    16M  0 part
└─sdc2        8:34   0   1.8T  0 part
sdd           8:48   0 894.3G  0 disk
├─sdd1        8:49   0    16M  0 part
└─sdd2        8:50   0 894.2G  0 part
nvme0n1     259:0    0 465.8G  0 disk
├─nvme0n1p1 259:1    0   100M  0 part
├─nvme0n1p2 259:2    0    16M  0 part
├─nvme0n1p3 259:3    0   465G  0 part
└─nvme0n1p4 259:4    0   668M  0 part
```

#### btrfsにする
refs: [Btrfs - ArchWiki](https://wiki.archlinux.jp/index.php/Btrfs)  

これまで漫然と `ext4` を使っていたけど、せっかくなので `btrfs` を使うことにする。  

```sh
$ mkfs.fat -F 32 /dev/sda1
$ mkfs.btrfs -L root /dev/sda2
$ mkfs.btrfs -L home /dev/sdb1
```

#### マウントする
```sh
$ mount /dev/sda2 /mnt
$ mkdir /mnt/boot
$ mount /dev/sda1 /mnt/boot
$ mkdir /mnt/boot/efi
$ mount /dev/nvme0n1p1 /mnt/boot/efi # Windowsのespをマウント
$ mkdir /mnt/home
$ mount /dev/sdb1 /mnt/home
```

#### Jp Mirrorにしておく
一応日本のミラーを向かせる。  
refs: [ミラー - ArchWiki](https://wiki.archlinux.jp/index.php/%E3%83%9F%E3%83%A9%E3%83%BC)  

```sh
$ vim /etc/pacman.d/mirrorlist
# 一番上に追加する

```

#### 必要なものを入れる
とりあえず最低限必要なものを `pacstrap` で入れる。  
今回はデスクトップ用途なので、[zen-kernel](https://github.com/zen-kernel/zen-kernel)を選択している。  

```sh
$ pacstrap -K /mnt base linux-zen linux-firmware
```

#### fstab作る
```sh
$ genfstab -U /mnt >> /mnt/etc/fstab
$ cat /mnt/etc/fstab # 内容確認
```

#### arch-chrootする
```sh
$ arch-chroot /mnt
```

### arch-chrootでの作業
#### タイムゾーン&時刻設定
```bash
% ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime
% hwclock --systohc
```

#### 作業用にvimを入れる
```bash
% pacman -S vim
```

#### locale 生成
```bash
% vim /etc/locale.gen
# en_US.UTF-8 ja_JP.UTF-8 をコメント解除する
% locale-gen
% vim /etc/locale.conf # 中身を LANG=ja_JP.UTF-8 にする
```

#### hostnameを変更
```bash
% vim /etc/hostname
```

#### /etc/hostsを書く
```bash
vim /etc/hosts
```
```/etc/hosts
127.0.0.1	localhost
::1		localhost
127.0.0.1	${ここにhostnameで設定したのを同じものを書く}
```

#### パッケージ追加
これから作るユーザのデフォルトシェルを `zsh` にしたいのでその関連パッケージを入れる。  
また、入れたほうがよさそうなものもまとめて入れておく。  

```bash
% pacman -S linux-zen-docs linux-zen-headers
% pacman -S zsh zsh-completions
% pacman -S base-devel
% pacman -S btrfs-progs
```

#### 再ビルドしておく
```bash
% mkinitcpio -P
```

#### rootのパスワードを設定する
```bash
% passwd
```

#### ブートローダのインストール
grubをとりあえず入れる。  
この段階だとなぜか `os-prober` が `/dev/nvme0n1p1` を認識してくれず、Windows BootloaderをGRUBメニューに追加できないので、設定は後ほど行う。  
この段階で一度Windowsがブートできなくなるので、なにかWindowsでやっておくべきことがあるなら済ませておく。  

```bash
% pacman -S grub efibootmgr
% grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=GRUB

```

#### 再起動
```bash
% umount -R /mnt
% reboot
```

再起動したら、archisoの入ったUSBフラッシュメモリを取り外しておく。  

### archlinux(root)
ここから先はrootユーザで作業する。  

#### systemdでネットワーク設定をする
refs: [systemd-networkd - ArchWiki](https://wiki.archlinux.jp/index.php/Systemd-networkd)  

再起動した段階ではネットワーク設定が消えているので、外に通信できない。  
接続のため、 `systemd-networkd`, `systemd-resolved` を使うので、その設定をする。  

```bash
% vim /etc/systemd/network/20-wired.network
```

```network
[Match]
Name=enp4s0

[Network]
Address=192.168.11.16/24
Gateway=192.168.11.1
DNS=192.168.11.1
```

起動・有効化までする。  

```bash
% systemctl start systemd-networkd
% systemctl start systemd-resolved
% systemctl enable systemd-networkd
% systemctl enable systemd-resolved
```

#### WindowsをGRUBのメニューに追加する
```bash
% pacman -S os-prober
% grub-mkconfig -o /boot/grub/grub.cfg # WindowsがGRUBに登録される
```

#### Windows Updateが楽になるように、デフォルトの選択肢をWindowsに
Windows Updateで再起動を複数回要求されたときに、GRUBデフォルトの選択肢がarchlinuxだと放置できない。  
月1で面倒な思いをしたくないので、デフォルトをWindowsに変えておく。  

```bash
% vim /etc/default/grub # 今回は3番目がWindowsなので、GRUB_DEFAULT=2
% grub-mkconfig -o /boot/grub/grub.cfg # Windowsがデフォルトになる
```

#### 一般ユーザを追加
```bash
% useradd -m -G wheel -s /usr/bin/zsh kei
% passwd kei # パスワードを設定する
```

#### 追加したユーザがsudoできるようにする
ここから先はrootで作業したくないので、権限を振る。  

```bash
% pacman -S sudo
% EDITOR=vim visudo # %sudo ALL=(ALL:ALL) ALL にする
% groupadd sudo
% usermod -aG sudo kei
```

### archlinux(user)
先ほど作成した `sudo` ができるユーザでログインしなおす。  

#### 最低限のデスクトップ環境を構築する
[dotfiles](https://github.com/kei-s16/dotfiles)をGitHubから拾ってくるためにデスクトップ環境があると便利なので、そのためにまず最低限のパッケージを入れる。  
ディスプレイマネージャには[sddm](https://wiki.archlinux.jp/index.php/SDDM)を、ウィンドウマネージャには[i3](https://i3wm.org/)を使う。  
日本語入力やオーディオまわりなどはあとから設定する。  

```zsh
$ sudo pacman -S xorg sddm i3 xf86-video-nouveau mesa alacritty
$ sudo pacman -S noto-fonts noto-fonts-cjk noto-fonts-emoji # LANG=ja_JP.UTF-8しているので日本語フォントを入れておく
$ sudo systemctl enable sddm
```

i3configを編集し、alacrittyを呼び出せるようにするのを忘れない。  
忘れて起動してしまい、ターミナルが起動できなくなった場合は `Ctrl --- Alt + F[2-6]` で黒い画面に戻れるので、そこで設定を変える。  

```zsh
$ sudo reboot
```


### archlinux(user-xorg)
#### GitHub連携してdotfiles引っ張ってこれるようにする
firefoxとopensshを入れて、git cloneできるようにする。  
鍵追加などの手順は[公式ドキュメント](https://docs.github.com/ja/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)に従う。  

```zsh
$ sudo pacman -S git openssh firefox
```

#### paruを入れる
これまでAURヘルパーには `yay` を使っていたが、今回は気分で `paru` を使ってみることにした。  

```zsh
$ sudo pacman -S rustup
$ rustup install nightly # 好み
$ rustup default nightly
$ git clone https://aur.archlinux.org/paru.git
$ cd paru
$ makepkg -si
```

#### デスクトップ環境で使うものをまるっと入れる
[i3の設定ファイル](https://github.com/kei-s16/dotfiles/blob/2a6965dffc7dc9726cdcbbf8c250d82da899902a/.config/i3/config#L183-L209)に書いてあるものを中心にインストールする。  
また、i3は最新版の機能を使いたいので、AURにある `i3-git` に差し替える。  

```zsh
$ sudo pacman -S nemo nemo-share gvfs-smb rofi flameshot pulseaudio pavucontrol xsel feh
$ paru -S conky rofi-greenclip
$ paru -S ttf-rounded-mplus
$ paru -S i3-git # gaps使いたいので
```

| パッケージ | 説明 | 備考 |
|---|---|---|
| nemo | ファイラー | nemo-share, gvfs-smb を入れることでsambaサーバに接続できるようになる |
| rofi | アプリケーションランチャー(---α) | rofi-greenclip を入れて、クリップボード機能を追加している |
| flameshot | スクリーンショットツール |  |
| feh | 画像ビューア | 壁紙表示ツールとして使っている |
| pavucontrol | オーディオまわりの管理ツール | pulseaudioが必要 |
| xsel | クリップボードツール | neovim でクリップボード連携するために入れている |
| conky | リソースモニタ | おしゃれツールだけどデフォルトで使っているのでおしゃれじゃない |

#### 日本語入力(skk)
日本語入力ができるようにする。  

```zsh
$ sudo pacman -Ss fcitx5-skk fcitx5-configtool fcitx5-gtk fcitx5-qt skk-jisyo
```

i3のconfigに書いてある分でいい感じに起動してくれるはずだったが、今回なぜか起動してくれなかったので `.xprofile` を追加で書いた。  

```zsh
$ touch ~/.xprofile
```

```~/.xprofile
export GTK_IM_MODULE=fcitx5
export QT_IM_MODULE=fcitx5
export XMODIFIERS="@im=fcitx5"
```

#### neovim
エディタには `neovim` を使っている。  
HEADを使うので、GitHubからソースを落としてきてビルドする。  

```zsh
$ sudo pacman -S cmake unzip ninja tree-sitter curl
$ clone git@github.com:neovim/neovim.git
$ make
$ sudo make install
```

また、使っているプラグインは `deno` を要求するので、`asdf` を使ってインストールしておく。
`~/.zshenv` に下記のように書いてから、もろもろをインストールする。  

```~/.zshenv
# for asdf
. /opt/asdf-vm/asdf.sh
```

```zsh
$ paru -S asdf-vm
$ source ~/.zshenv
$ asdf plugin-add deno https://github.com/asdf-community/asdf-deno.git
$ asdf install deno 1.29.2
$ asdf global deno 1.29.2
```

#### dotfilesの展開
dotfilesを展開する。  

```zsh
$ git clone git@github.com:kei-s16/dotfiles.git
$ rm -rfv ~/.config # ~/.config/i3/config とかがあって、dotfilesが撒けないので
$ cd dotfiles
$ make
$ make skk # skk辞書のダウンロード
```

上記のコマンドを実行したあと、ログインしなおすと設定が反映される。  
必要ならこの時neovimを起動して、プラグインのインストールを済ませておく。  

#### 時間系
デュアルブートだとどちらかのOSの時間が9時間ずれてしまう。  
ArchWikiに従い、UTCを使うように設定する。  
refs: [Windows と Arch のデュアルブート - ArchWiki](https://wiki.archlinux.jp/index.php/Windows_%E3%81%A8_Arch_%E3%81%AE%E3%83%87%E3%83%A5%E3%82%A2%E3%83%AB%E3%83%96%E3%83%BC%E3%83%88)  

時刻合わせには `ntpd` を使う。  

```zsh
$ sudo pacman -S ntp
$ sudoedit /etc/ntp.conf # jstにする
$ sudo ntpd # いったん合わせておく
$ sudo systemctl enable ntpd # systemdに登録する
```

### 終わり
再起動してWindowsとarchlinux、どちらも問題なく起動することが確認できたら終わり。  

## 今回のやらかし
- `/dev/nvme0n1p1` を `/boot` にマウントした
  - 当然容量不足で `vmlinuz-linux` や `initramfs-linux-zen.img` が配置できないので困る
  - 修正は正しくマウントしなおしてゴミを消すだけだったので、致命傷ではなかった
