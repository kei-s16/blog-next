---
title: "複数環境にデプロイすることを考慮したterraformディレクトリ設計"
date: "2023-10-30T09:00:00"
tags: ["Qiita", "terraform"]
category: "技術"
---

この記事は以前Qiitaにて公開したものになります。  
元記事はこちら : [複数環境にデプロイすることを考慮したterraformディレクトリ設計](https://qiita.com/_kei_s/items/d0239966727e3889a7ee)  

<hr>

## tl;dr
[backend config](https://developer.hashicorp.com/terraform/language/settings/backends/configuration), [tfvars](https://developer.hashicorp.com/terraform/language/values/variables#variable-definitions-tfvars-files)を使って同じtfファイルで複数環境にデプロイするとちょっと手間が増えるけどなんやかんや便利

## 前書き
私の所属するチームでは、新規プロジェクトに積極的にAWS SAM(Cloudformation)、terraformなどのIaCツールを採用しています。
背景としては、

- インフラ構成をファイルベースで確認できるようにして、構成・変更レビューの手間を減らしたい
- 手作業による意図しないインフラ差分の発生を検知、あるいは防止したい
- コマンド一発で新サービスのインフラ構築・デプロイを済ませて早く帰りたい

などがあります。
今回の記事では触れませんが、AWS SAMを利用することで、ローカル開発環境の構築を簡略化できる、などの副次的な効果もあります。

## terraformについて
terraformは構成管理ツールのひとつです。
単にterraformと呼ばれるとき、

- 各種サービスのSDKやAPIをhclで扱えるようにしたプロバイダー
- hclを解釈し、プロバイダーを使って各種クラウドなどへのデプロイや差分検知を行うterraform本体

のセットを指すことが多いように思います。
この記事では、単純にterraformと指したときはこの定義を指すものとします。

## 既存のterraformのディレクトリ戦略
これまで、社内の基本的なterraform管理リポジトリのディレクトリ構造は以下のようなものでした。

```
- hoge-service
  - develop
    - main.tf
    - terraform.lock.hcl
    - .terraform-version
    - s3.tf
    - iam.tf
    - ...
  - production
    - main.tf
    - terraform.lock.hcl
    - .terraform-version
    - s3.tf
    - iam.tf
    - ...
- common
  - modules
    - basic-roles
    - basic-security-groups
    - ...
```

サービスディレクトリ - 各ステージディレクトリ - 各種tfファイル、というベーシックな構成です。
この構成には、以下のようなメリットがあります。

### メリット
- 環境直下のファイル構成がフラットなので、全体を把握しやすい
- 反映も単純なコマンド(`terraform init`, `terraform plan`, `terraform apply`)実行で完結する
- `.terraform` 以下が環境で完全に分離されるので、環境切り替えに伴うミスが発生しない
  - うっかり本番のtfstateに開発環境のtfstateをmigrateするなど
- 環境ごとの構成差分を設定しやすい
  - 本番環境と開発環境でインスタンスサイズや冗長構成の有無を分けたい場合などに楽

一方、以下のようなデメリットも抱えています

### デメリット
- 同一、もしくはほぼ同一のファイルを環境ごとにコピーする必要がある
  - symlinkを活用することである程度回避することは可能だが、tfファイルの分け方が難しくなる
- 環境ごとの意図しない構成差分を発生させやすい
  - メリットで挙げた点と表裏一体

シンプルでわかりやすい構成な反面、複数の環境を管理していると

- 後からリソースを追加もしくは編集する際の手間が大きい(環境数に応じて増える)
- 環境間での差分が意図したものなのか、単純に反映漏れなのかが後から追いにくい

などのいまいちな点があり、運用負荷が高いなと感じていました。

## 今回採用したterraformのディレクトリ戦略
今回新規で作成するインフラでは、既存の運用負荷の高いポイントを解消するため、以下のような構成を採用しています。
リソース定義はserviceモジュールに閉じ、環境差分の吸収は `backend config` や `tfvars` を経由して行うことで、ひとつのディレクトリで複数環境へのデプロイを実現しつつ、全体としてはシンプルな構成に留めています。

```
- hoge-service
  - main.tf
  - variables.tf
  - terraform.lock.hcl
  - .terraform-version
  - service
    - variables.tf
    - s3.tf
    - iam.tf
    - ...
  - backends
    - production.tfbackend
    - develop.tfbackend
  - tfvars
    - production.tfvars
    - develop.tfvars
```

### 役割
#### main.tf
ここでは、プロバイダーの設定やbackendの定義のみ行います。
実際のリソース定義はserviceモジュールで行うため、必要に応じてtfvarsで設定したグローバル変数の受け渡しもここで定義します。

```hcl:main.tf
terraform {
  required_version = ">= 1.6.1"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.21.0"
    }
  }

  backend "s3" {
    # バケット、プロファイルなどはbackends/{stage}.configから自動で取得される
    # Qiita用NOTE: tfstateはS3で管理しています
  }
}

provider "aws" {
  region  = "ap-northeast-1"
}

# service以下のtfファイルを読み込む
module "service" {
  source = "./service"

  stage = var.stage
}

```

#### variables.tf
tfvarsで受けとる変数名や、必要に応じて型などを明示的に宣言します。
この内容を満たすようにtfvarsを設定します。

```hcl:variables.tf
variable "stage" {}
```

#### backends
terraform init時に使用する値をここに保存します。
たとえば、aws providerに渡すアカウント情報やリージョン情報、backendに渡すtfstateの保存場所や名前などはここで取り扱います。

```config:develop.tfbackend
bucket  = "your-iac-resources-bucket"
region  = "us-east-1"
key     = "super-iketeru-service-name/terraform.tfstate"
encrypt = true
```

#### tfvars
環境差分として与えたい値をここで管理します。
たとえば、リソース名に使う環境情報や各種コンピューティングリソースのインスタンスサイズなどが該当します。

```hcl:develop.tfvars
stage = "develop"
```

#### service
アプリケーションの動作に必要なリソースは、すべてこのディレクトリに置かれたtfファイルで管理します。
このディレクトリはモジュールの形でmain.tfから呼び出します。

## 〆
このterraform構成は、「各環境ごとに独立したtfファイルを持たないようにすることで、運用負荷の低減・環境差分の抑止を実現したい」というところから設計しました。
今回、構築対象となったサービスが非常にシンプルだったため、すべての環境でほぼ同じリソースをデプロイする前提でtfファイルを記述できましたが、ある程度複雑な構成になってくると難しいポイントも出てくるだろう、という考えています。

たとえば、この構成を取ると冗長構成や開発環境のみの設定(たとえばアクセス制限にかかわる設定)などについては、`count` や `for_each` を使って表現することになります。
環境差分の理由がすべてコードで表現されることになるので、多少なりとも差分の発生理由を追跡しやすくなる一方で、初心者から見ると若干のとっつきにくさが生まれてしまうかもしれない、という懸念もあります。

terraformは環境構築ツールではなく構成管理ツールです。継続運用が前提のツールです。
そんなツールなので、初回構築の段階ではわからなかったが、継続的に運用していくことで見えてくる課題もありそうです。
引き続き運用を続けて、よりよい形を目指したいなと思います。

