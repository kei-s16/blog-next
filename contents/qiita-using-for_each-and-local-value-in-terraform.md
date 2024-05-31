---
title: "Local Valueとfor_eachを使ってリソース定義を楽したい"
date: "2024-05-31T23:30:00"
tags: ["terraform", "Qiita"]
category: "技術"
---

この記事は以前Qiitaにて公開したものになります。  
元記事はこちら : [Local Valueとfor_eachを使ってリソース定義を楽したい](https://qiita.com/_kei_s/items/2f1690d61d325e46a57b)  

<hr>

## tl;dr
[Local Value](https://developer.hashicorp.com/terraform/language/values/locals)で定義したいリソースのパラメータを事前に用意し、 `for_each` でそれを読み込むとresource定義はひとつで済むので便利。  

## まえがき
terraformでリソースを定義するとき、名前や保持期間など、一部パラメータが違うだけのほとんど同じリソースを複数定義することがあります。  
AWSで言うと、たとえばElastic Container RegistryやCloudwatch Logsのロググループなどが該当します。  

これらのリソースを一個一個定義するのもいいのですが、時には短く書きたい場合もあります。  
そんなときに便利な、`Local Value` と `for_each` について紹介します。  

## やってみる
### キーだけを参照するシンプルな例
まずは実際のコードを例示します。  
以下のコードは、Elastic Container Registryのリポジトリを `for_each` で定義するものです。  

まずは、Local Valueとしてリソースごとに変更させたいもののリストを定義します。  
今回はリポジトリ名のみを可変にしたいので、`aws_ecr_repository.repositories` という名前の `list(string)` 型の変数として定義します。  

```locals.tf
locals {
  aws_ecr_repository = {
    repositories = [
      "php",
      "nginx",
    ]
  }
}
```

その後、リソースを定義する時に、リソースの中で[for_each](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each)を使います。  

```ecr.tf
# リストを元にリソースを作成する
resource "aws_ecr_repository" "repositories" {
  for_each = toset(local.aws_ecr_repository.repositories) # aws_ecr_repository.repositories の数だけリソースを定義する

  name = each.key # repositoriesのキー(php, nginx)が参照される
  image_tag_mutability = "MUTABLE"
}
```

これをapplyすると、`aws_ecr_repository.repositories[]` が定義されます。  
他のリソースから特定のリポジトリを参照したい場合は、`aws_ecr_repository.repositories[リストのキー]` で参照できます。  
上記のサンプルコードだと、`aws_ecr_repository.repositories["php"]`, `aws_ecr_repository.repositories["nginx"]` のようにします。  

### キー・バリューを活用する例
先ほどの例では、シンプルに名前のリストを作ってそのぶんだけリソースを作る、というものでした。  
実際には、リソースごとに微妙に変えたい値があるケースもあります。  
そうした場合、下記のようにkey-valueの形式を使って、リソースによって変えたい値を含めたLocal Valueを定義すると便利です。  

CloudflareのDNSレコードを定義するコードで例示します。  

まずは、このようにLocal Valueを定義します。  

```locals.tf
locals {
  records = {
    "example.com" = { value = "example.com", comment = "hoge", proxied = false }
    "www"         = { value = "example.com", comment = "piyo", proxied = true }
  }
}
```

そして、以下のようにkeyに加えてvalueも参照します。  

```cname.tf
# CNAME Records
resource "cloudflare_record" "cname" {
  for_each = local.records

  zone_id         = var.cloudflare_zone_id
  name            = each.key # "example.com", "www" が参照される
  comment         = each.value.comment
  type            = "CNAME"
  value           = each.value.value
  proxied         = each.value.proxied
  allow_overwrite = false
}
```

DNSのTTLや向き先、ログの保持期間など、リソースごとのちょっとした差分についてもLocal Valueを使うことで吸収し `for_each` で楽してリソース定義できます。  

## まとめ
こうした `for_each` を使った書き方を使うことで、同じようなリソースの定義が楽になります。  
また、嬉しい副作用として、localsを見ればそのtfファイルで何を定義しているかがすぐにわかるようにもなります。  

使ったことがなければ、一度試してみることをおすすめします。  

(もちろん、複雑な差分がある場合には個別にresourceブロックを記述することをおすすめします。あくまでシンプルな差分で使うのがよさそうです！)

