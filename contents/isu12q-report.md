---
title: "ISUCON初参加のふりかえり"
date: "2022-07-26T22:00:00"
tags: ["isucon", "ふりかえり"]
category: "日記"
---

ISUCONというパフォーマンスチューニングの大会、あるいはイベントがあります。  
過去に社内イベントで競技者として1回、運営として1回参加し、なかなかおもしろかったのでいつか本家にも出てみたいなと思っていたところ、会社の後輩が参加登録に成功し、チームに誘ってもらえたので[ISUCON12](https://isucon.net/archives/56571716.html)の予選に初めて参加しました。  
そして当然のごとく予選落ちしました。

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">朝食の肖像 <a href="https://t.co/2Ks8PbZJei">pic.twitter.com/2Ks8PbZJei</a></p>&mdash; kei (@_kei_s) <a href="https://twitter.com/_kei_s/status/1550632062256033792?ref_src=twsrc%5Etfw">July 23, 2022</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script> 
(起床に成功したので調子に乗っていた人間の肖像)

チーム全体としてのふりかえりは別のメンバーがしてくれると思うので、この記事では個人的なふりかえりをしようと思います。

## やったこと
### 前日まで
- 当日のスケジュールをおおまかに引いた
- メンバーの使える言語がばらばらだったので、まずは読むだけなら負荷の低いPythonでいこうと決めた
- さくらのクラウドに練習環境を作成して、夜間はチームが遊べるようにした
- 下記の理由で、ローカル開発環境は用意しない判断をした
  - 社内ISUCONにおいて、あると便利だけど事前準備のあてが外れるとキツいと思った
  - 結局サーバ内であーだこーだ言いながら作業している時間の方が長かった
- GitHubのプライベートリポジトリを切って、そこに見るべきポイントをissueとして用意した
  - 当日はまずissueを全部消化するところからスタートしていく想定
- メンバーの役割をある程度決めた(速攻で崩れた)
  - 代表 本業インフラ : アプリとDB
  - メンバー 本業アプリ : DBとインフラ
  - 私 本業不明 : その他雑用とインフラ・アプリ

### 当日朝
- 7時に起きた
- スポンサーや事前に配られたCFnから考えて当日環境はアプリ --- MySQLがEC2に乗ってる素直な構成だろうなというヤマ張りをした
  - じつは全部k8sですとかDBはMongoDBですとかならなきゃ手も足も出ないことはないだろうという話をして緊張をほぐした
    - フラグだった
- モンスターを飲んだ
- ISUCON公式配信を見た
  - マルチテナントの7文字でつらくなった

{{< youtube 75YnJ_3289g >}}

### 競技中
だいたいこんなスケジュールを想定した

```
- ～ 11:00 マニュアル確認
- ～ 12:00 初期状態での計測
  - 計測ツール入れる
    - New Relic導入
    - スロークエリログ有効化
    - alpなど入れる
  - ベンチマークひたすらまわす
  - ベンチマーク結果からアタリをつける
- ～ 12:30 午後から触る場所を決める
- ～ 13:30 休憩
- ～ 終了1時間前 KAIZEN
- ～ 終了 作業止める
```

私がやったことは

- 全員に `~/.ssh/config` 配った
- 全サーバの
  - `/etc/hosts` 書き換え
  - 参考実装切り替え
  - `.vimrc` 配置
  - `.bashrc` に `export EDITOR=vim`
- 初期化処理を雰囲気把握した()
- NewRelicを見た
- nginxのログから重い処理を探った
  - `reqtime` を使ってログを出し、ベンチを流して吐かれたログをシェル芸でいい感じにソートして、重い処理のリストを作った
- 他の人が書いたnginx.confをレビューした
- PythonからPyPyに切り替えようとした
- SQLiteがいることに気付いてしまった
  - SQLiteを雰囲気知っていたので、軽く概要と、こいつがいるとスケールさせるのが難しいことをメンバーに伝えた
  - SQLiteのVSCode拡張を探してメンバーに教えた
    - 自分はvimプラギンを探すのがめんどうだったのでやらなかった
  - SQLiteをMySQLにするのはむりだと判断した
  - SQLiteのディレクトリをNFSとかで共有すればいい感じにいけるのではと思った
    - 気付いたのが遅かったのでできなかった
- 誰かがアプリやDBを壊すたびに直した
- 戯れにPythonからGoに実装を戻したら点数が上がることに気付いてしまった
  - Goをちゃんと書ける人がいなかったので、なにもかもダメだったら戻そうと言った
  - ダメだったので戻してクエリだけ書き換える決断をした(点数が上がった)
  - なんだかんだでがんばってGo書こうとした
    - 一部処理を書き換えたが効果がなかったので差し戻した

## わかったこと
- もっと調査に時間をかけてもいい。全体的なスコアグラフも午後から急に伸び始めた記憶がある。
  - ただし、調査をするための準備を事前にしておく必要がある
    - 調査用にnginx.confをある程度用意しておくとか
    - 監視ツールをさくっと導入できるようにしておくとか
- issueベースでやることを切っておくと当日やり忘れが少ない
- 予想外が出てくると人は思考が鈍る
  - SQLiteの衝撃
- 自動デプロイとローカル開発環境はやはり必要
- Goははやい
- 感想戦を眺めたり、他の人の記事を読んだ感じ、目のつけどころは悪くなかったけど実現できなかったところが多かった
  - [カラテが不足している](https://dic.nicovideo.jp/a/%E3%83%8E%E3%83%BC%E3%83%BB%E3%82%AB%E3%83%A9%E3%83%86%E3%80%81%E3%83%8E%E3%83%BC%E3%83%BB%E3%83%8B%E3%83%B3%E3%82%B8%E3%83%A3)

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">発想はよかったけどカラテが足りず、SQL理解マンの力にすべて頼った形 やはりノーカラテノーニンジャ……</p>&mdash; kei (@_kei_s) <a href="https://twitter.com/_kei_s/status/1550776364957319168?ref_src=twsrc%5Etfw">July 23, 2022</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script> 


## つぎやること
1. 監視・計測周りのツールキットを用意しておく
1. 使用言語のコンテナ環境、あるいはある程度整備されたVagrantを用意しておく(チーム内共通の作業環境をすぐ立ち上げられるようにする)
1. VPSへのデプロイフローを用意しておく
1. nginxやmysqlなどの鉄板設定を用意しておく

この4点は手軽さに対して効果が大きいのでは、と思っています(というか今回意図的にやらなかったのでやっぱ必要だよねこれとなっている)。
というか、インフラ・ミドルウェアまでは事前準備で済ませて、当日はアプリに集中するのがよさそう。

あとは個人的に、ここ数ヶ月ずっとシェルスクリプトみたいなものとかYAMLやHCLばかり書いていたのもあってアプリが前ほど書けなくなっていたのに気付かされたので、アプリに対してのやっていきの精神が高まってます。

## 総括
来年も(参加競争に勝てたら)がんばるぞ。
