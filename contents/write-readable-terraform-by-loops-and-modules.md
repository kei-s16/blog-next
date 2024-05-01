---
title: "モジュールとループを駆使して可読性の高いterraformを書きたい"
date: "2024-04-21T19:00:00"
description: "モジュールとループを駆使して可読性の高いterraformを目指したメモ"
tags: ["terraform"]
category: "技術"
---

[以前の記事](/posts/qiita-terraform-directory-structure-with-multiple-envs)の拡張エキスパンション的な記事。  
上記を読んでる前提で書くので、先に読んでおくとわかりやすい、かも。  


## これはなんの記事か
最近terraformを書くときに、意識的に同じようなリソース定義を繰り返さない実装をしている。  
具体的には、

- 子モジュールの作成
- ループを使ったリソース定義

の2つを積極的に取り入れている。  

たぶん半年くらいすると自分で意図がわからなくなっているので、未来の自分に向けて記録を残す。  

## そもそも解決したいこと
リポジトリ、もしくはserviceモジュール直下のtfファイルは、そこで管理されているterraform全体で定義したいものが読み解けることが必要だと考えている。  
ところが、リソースを律儀に定義しているとtfファイルがどんどん肥大化して可読性が落ちてしまう。これをなんとかしたい。  

より具体的にすると、

- main.tfの中身とリポジトリ/serviceモジュール直下のls結果でなにを定義したいのかがなんとなくわかる
- ファイルを開いたらスクロールしなくてもなんとなく定義されているものがわかる
- terraform graphがある程度機能する

あたりを目指す。  

## 実装と意図
### 依存関係を閉じる目的でのモジュールの作成
基本的にterraformはモジュールを使わなくても使える。  
モジュールは再利用したい=複数回定義したいリソース群をまとめるのが一般的な使い方だと思うが、最近はあえて一度きりしか定義しないものもモジュール化している。  

これは依存関係をわかりやすくするため。  
terraformは、同一ディレクトリ内で定義されたリソースやデータに対して自由に参照できる。  
便利な一方で、「このリソースってどこで定義しているんだっけ？」「このリソースそこからも参照してるの？」みたいなことが時々起きる。  

モジュールを使うことで、これを防ぐ。  
モジュールで定義されたリソースやデータには直接参照することができず、またモジュール側もモジュールの外のリソースを直接参照することができない。  
モジュール-モジュールの外部の入出力はそれぞれ`variable`, `output`で明示的に定義する必要があり、これを安全装置として使おうという試み。  

- `variable`, `output`をいちいち定義するのはめんどうなので周辺の依存関係を自然とモジュールにまとめるようになる  
- どうしても必要な外部依存はモジュールのREADMEや`variable`, `output`のdescriptionでドキュメント化される
  - また、呼び出し元(`main.tf`を想定)を見ればだいたいどんなリソースが定義されるのか俯瞰できるようになる、はず

の2点をねらっている。  

また、適度にモジュール化されていると、`terraform graph`の出力がある程度綺麗になってセイシンテキがとてもいい。  

### ループを使ったリソース定義
まず、このようにlocalsを使ってリソースのリストを作る。

```terraform
locals {
  cname_records = {
    "blog"                     = { value = "cname.vercel-dns.com.", comment = "blog on Vercel", proxied = false }
    "k16em.net"                = { value = "k16em-net.pages.dev", comment = "LP on Cloudflare Pages / using CNAME flattening", proxied = true }
    "www"                      = { value = "k16em-net.pages.dev", comment = "LP on Cloudflare Pages", proxied = true }
  }
  txt_records = {
    "k16em.net"        = { value = "keybase-site-verification=tpgM8Hmp9bkePa9j-qMD7G_Hy1KoCkpEgPi_OQVqzW8", comment = "for keybase" }
    "blog"             = { value = "keybase-site-verification=udbQAxp-I1L3AHezcTnOAXhSPpq_CbLz1P9KCj9lkfo", comment = "for keybase" }
  }
}
```

それをもとに、`for_each`を使って実体を定義する。

```terraform
# CNAME Records
resource "cloudflare_record" "cname" {
  for_each = local.cname_records

  zone_id         = var.cloudflare_zone_id
  name            = each.key
  comment         = each.value.comment
  type            = "CNAME"
  value           = each.value.value
  proxied         = each.value.proxied
  allow_overwrite = false
}

# TXT Records
resource "cloudflare_record" "txt" {
  for_each = local.txt_records

  zone_id         = var.cloudflare_zone_id
  name            = each.key
  comment         = each.value.comment
  type            = "TXT"
  value           = each.value.value
  allow_overwrite = false
}
```

やっていることは単純で、事前に定義したいパラメータのリストを作り、それをループで回しているだけ。  
この書き方にはメリットがあり、

1. localsを見ればそのtfファイルで何を定義しているかがすぐにわかる
    - ファイル先頭で定義しておくとよりヨシ
1. リソース名で悩まなくなる

とくに、リソース名で悩まなくなったのが大きい。  
これまでは、`cloudflare_record.txt_blog` , `cloudflare_record.cname_blog` のような形でリソースを定義していた。  
あれ、これってサフィックスだっけ？ プレフィックスだっけ？ DNS名ってどこまで書くんだっけ？ と、意外と命名には脳ミソを使っていた。  
今回から、`cloudflare_record.DNSの種別['ドメイン名']`の形にしたので、なにも悩まなくなった。  

例では`cloudflare_record`を挙げたが、この他にも`aws_ecr_repository`や`aws_ecs_cluster`などもこの形で定義しており、今後は基本的にこの形で書いていくつもり。  
[aws_lb_listener_rule](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule)のような、複数のblockが定義できるリソースをどうするかは要検討。  

