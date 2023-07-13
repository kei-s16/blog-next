---
title: "GCP Compute Engineの永久無料枠でarchlinuxを起動する"
date: "2022-08-11T16:00:00"
---

## 前置き
tailscale --- 自宅サーバ群でそれなりに快適なサーバ生活を送っていた私ですが、「やはりクラウドにも1台くらい持っておくべきだよな、社会人として」、という思いつきにより、適当にサーバを立てることにしました。  

条件は以下です。単純ですね。

- archlinuxが動くこと
- なるべく安いこと
- スペックはneovimが快適に動けばヨシ
- AWSでないこと(AWSが嫌いというわけではなく、普段使っていないものにしたい)
- リージョンはUS, JP, TWくらいならどこでもいい(EUは遠すぎる)

ハードルとしてはほとんど地面すれすれぐらいの低さです。  
この条件で海外VPSサービスなども考慮に入れると選択肢は無限大なのですが、ここは~~たまたまTwitterでみかけた記事をそのまま参考にします~~メディアの力を頼ることにします。  
[期限の制約なく無料で使えるクラウド「Free Tier」主要サービスまとめ。2022年版](https://www.publickey1.jp/blog/22/free_tier2022.html)

lifetime-freeで仮想マシンを与えてくれるサービスが2つもいたので、**なるべく安い** を飛び越して無料にすることができそうです。  
軽く調べたところ、GCPのCompute Engineには、archlinuxのイメージを使えるらしいので、記事タイトルでお察しではありますが、即決でこちらにしました。  
(ちなみに、スペックはOCIもGCPも無料にしてはいい感じでした。OCIはいろいろもうちょっと頑張って覇権取りに行く姿勢を見せてほしい……)

## やっていき
### 前準備
#### GCPのアカウントを作る
[こちら](https://cloud.google.com/gcp/?hl=ja)からどうぞ。
初回だと4万円ぶんくらいのクレジットも貰えるので、設定ミスって請求がばくはつしてもある程度はあんしんです。  
アカウントの作成と同時に、ワークスペースが作成されます。概念的にはAWSのアカウントに相当するっぽい。この中に、VPCやCE, GKEなどのリソースが作成されていくようです。  

#### ローカルにSDKを導入する
作業環境はarchlinuxです。
それ以外の環境を使っている人がもしいれば、[公式のドキュメント](https://cloud.google.com/sdk/)を参考に導入してください。

archlinuxの場合、AURから[google-cloud-sdk](https://aur.archlinux.org/packages/google-cloud-sdk)をインストールすることができます。

```sh
% yay -S google-cloud-sdk
```

このあと `gcloud` コマンドを叩いてみると、ほかに依存パッケージがいたようで、エラーを吐かれたのでそれもインストールします。

```sh
% sudo pacman -S libxcrypt-compat
```

#### gcloudコマンドにGCPの認証を通す
`aws configure` みたいなやつです。  
ブラウザを勝手に立ち上げて、いつものGoogle認証を許可すればOKで、事前にIAMユーザ作っておいてACCESS_KEY, SECRET_KEYをコピペして……みたいなことは不要でした。

```sh
% gcloud init
# いろいろ出るが省略
# GCPの認証を通す
You must log in to continue. Would you like to log in (Y/n)? # Enterを叩くとブラウザが開くので、Googleアカウントの認証を通す
You are logged in as: [your.mail.address@example.com].

# プロジェクトを選ぶ
Pick cloud project to use:
 [1] hoge-project # デフォルトで作られているプロジェクト名
 [2] Enter a project ID
 [3] Create a new project
Please enter numeric choice or text value (must exactly match list item):  1

Your current project has been set to: [hoge-project].

# デフォルトリージョンを選択する
Do you want to configure a default Compute Region and Zone? (Y/n)?

Which Google Compute Engine zone would you like to use as project default?
If you do not specify a zone via a command line flag while working with Compute Engine resources, the default is assumed.
# リストが出るが長いので省略
Too many options [104]. Enter "list" at prompt to print choices fully.
Please enter numeric choice or text value (must exactly match list item):  11 # 無料枠を使いたいのでオレゴンを選択

Your project default Compute Engine zone has been set to [us-west1-b].
You can change it by running [gcloud config set compute/zone NAME].

Your project default Compute Engine region has been set to [us-west1].
You can change it by running [gcloud config set compute/region NAME].

# このあともいろいろ出るが、ここに設定あるからね系のアナウンスなので省略
```

### archlinuxのインスタンスを起動する
イメージはGCP側で用意されているようです。  
[GoogleCloudPlatform/compute-archlinux-image-builder](https://github.com/GoogleCloudPlatform/compute-archlinux-image-builder)のREADMEに従って、インスタンスを作成・起動します。

```sh
gcloud compute instances create arch-1 \ # インスタンス・ストレージ名になる
	--image-project=arch-linux-gce \
	--image-family=arch \
	--machine-type=e2-micro \ # 永久無料枠のサイズにする
	--boot-disk-size=30GB # 30GBまでストレージ無料なので、せっかくだしデフォルトより大きくしておく

# warnが出るけど、気にしない

NAME    ZONE        MACHINE_TYPE  PREEMPTIBLE  INTERNAL_IP  EXTERNAL_IP   STATUS
arch-1  us-west1-b  e2-micro                   {INTERNAL_IP}   {EXTERNAL_IP}  RUNNING
```

これでインスタンスが作成・起動されます。
![Webコンソールのスクリーンショット](/images/setup-archlinux-on-compute-engine-free-tier/compute-engine.png)

ブラウザからSSHボタンを押すと、別窓でインスタンスに対するSSHが起動します。  
また、`gcloud compute ssh ${インスタンス名}` で、`vagrant ssh` のような感覚で、ターミナルから接続することもできます。  
接続時にはブラウザ経由の場合はGCPに登録してあるメールアドレスのユーザ名部分、`gcloud` 経由の場合には接続元のマシンのユーザ名で新規ユーザが作成されます。

### 起動後
とりあえずパッケージの更新をしておきましょう。

```sh
% sudo pacman -S archlinux-keyring
% sudo pacman -Syyu
```

これでおわりです。  
あとはお好きにどうぞ。

### そのほかやっておくこと
#### pingに応答しないようにしておく
なぜかインターネットからのpingに応答するのがデフォルトになっているので、 `default-allow-icmp` を削除する。  
設定は別画面にあるので、スクショのようにして探す。  
![ファイアウォール設定画面までののスクリーンショット](/images/setup-archlinux-on-compute-engine-free-tier/firewall.png)

#### sshのポート番号を変えておく
```sh
% sudo pacman -S vim
% export EDITOR=vim
% sudoedit /etc/ssh/sshd_config

# `# Port 22` の行を探し、`Port {任意の番号}` に変えておく

% sudo systemctl restart sshd
```

上記が終わったら、GCPのファイアウォール設定から、 `default-allow-ssh` のルールを探し、ポート番号を変更する。

#### 普通にsshできるようにする
`gcloud compute ssh` でもいいんだけど、ポート番号変えたりするとつらいところがあるので、普通にsshできるように設定をエクスポートする。

```sh
% gcloud compute config-ssh
```

これを実行すると、`~/.ssh/config` に設定が追記されるので、適宜ユーザ名やポート番号を追記・編集する。

#### 予算アラートを設定する
Webコンソールからの導線がわかりにくいので、画面上部の検索メニューに `予算とアラート` と入力して設定ページに飛ぶ。  
とりあえず1円で設定しておけばよさげ。クーポンや無料枠ぶんを反映する設定にしておかないと、割引前の請求額でアラートを飛ばすようなので、そこだけ注意。

## 感想
わりとさっくりいけたので特に書くことがない……。  
とりあえず立てたインスタンスにはこれからSELinuxをいれたりなんだりして、便利に使っていこうと思います。  

あと今回ほとんど初めてGCPを触ったけど、AWSとはやっぱり文化が違う感じがしていて、AWS, Azure, OCIに連なるサービスというより、どちらかというと強いherokuみたいな印象を受けた。  
コンソールが使いにくい・デフォルト設定がわりと不思議、みたいなところはあるけど、極端なつらみはない(Windows版firefoxで表示が崩れまくるので、別のところでつらみはあったけど)ので、個人利用程度だったら人に勧めるかも。  

そんな感じです。
