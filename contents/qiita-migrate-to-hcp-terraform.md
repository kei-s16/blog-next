---
title: "HCP Terraformに既存のterraformを移行してみた"
date: "2024-06-30T09:00:00"
tags: ["Qiita", "terraform"]
category: "技術"
---

この記事は以前Qiitaにて公開したものになります。  
元記事はこちら : [HCP Terraformに既存のterraformを移行してみた](https://qiita.com/_kei_s/items/a283be447b2350ae4aac)  

<hr>

HCP TerraformはこれまでTerraform Cloudという名称のサービスでした。
一部を除き、この記事中ではサービスを示すときは `HCP Terraform` で表記を統一します。
[Introducing The Infrastructure Cloud](https://www.hashicorp.com/blog/introducing-the-infrastructure-cloud)

## 前置き
私の所属するチームでは、なるべくAWS SAMやTerraformといったIaCを使ってクラウド環境の設定をするようにしています。
主にレビューの利便性やオペレーションミスの防止を狙ってのIaC活用ですが、Terraformに関してはCI/CDが整備できておらず、反映コマンドは各メンバーの手元で、メンバーに強い権限を付与しての実行というかたちになってしまっています。
今後はLambdaを活用したアプリケーションを除いてはなるべくTerraformに寄せていきたいという思惑があるなかで、なるべく早期に解決しておきたい課題ではありつつ、既存の環境には変更をいれづらく、なかなか解消できない状態でした。

今回、たまたまゼロからリソースを作成する機会に遭遇したため、途中で思い立って試験的にHCP Terraformに移行しました。
この記事では、S3などに保存しているtfstateをHCP Terraformに移行して使い始めるまでを紹介します。

## そもそもHCP Terraformとはなんぞや
[HCP Terraform(旧 Terraform Cloud)](https://www.hashicorp.com/products/terraform)とは、ざっくり言ってしまうとTerraformの実行サービスです。
HCP Terraformを使うと、

1. Plan, Apply履歴の管理
2. tfstateの共有・管理
3. registryの管理
4. Terraformの実行環境の設定・管理
5. GitHubなどとの連携(CI/CD)

などが簡単に行えます。
Terraformを使ったことのある方なら、チーム開発でTerraformを使うに際してうれしい機能が多いと感じるのではないでしょうか。

## HCP Terraformの構成
HCP TerraformにはOrganization、Workspaceという概念があります。
Organizationについては、名前の通りで、組織(いわゆる `おひとりさま` を含む)を示す単位です。この中にWorkspaceを作成します。
Workspaceは、ひとつのtfstateと紐づく概念です。tfstateと紐づけることになるため、Terraformの管理方法によりけりですが、たいていはVCSのリポジトリやブランチと紐づくものだと思います。

まずはOrganizationを作り、その中にtfstateを保管するWorkspaceを作る、と思えば大丈夫です。

## HCP Terraformの外からの移行
すでに手元やCI/CDツールでTerraformを使っていた場合、HCP Terraformへの移行が必要になります。
tfvarsについてはリポジトリと連携した時点でコード(おそらく `variables.tf`)を読んで入力画面が出てくるので迷うことはないと思いますが、tfstateについてはコードに手を入れる必要があります。

すでにHCP Terraformアカウントを作成し、OrganizationとWorkspaceを作成した状態なら、手順は下記の4ステップです([公式ドキュメントにも手順があります](https://developer.hashicorp.com/terraform/cloud-docs/migrate#migrate-state-using-the-cli))。

1. ローカルで `terraform login` し、cliツールからHCP Terraformを叩けるようにする
1. `terraform` ブロックの中の `backend` ブロックを消す
1. `terraform` ブロックの中に `cloud` ブロックを追加する
1. `terraform init` する

```hcl:cloudブロックの例
terraform {
  cloud {
    organization = "your-organization-name"
    hostname = "app.terraform.io"

    workspaces {
      name = ["your-workspace-name"]
    }
  }
}
```

上記の手順を実行すると、`HCP Terraformにtfstateをコピーしていいか？` という確認のプロンプトが表示されます。
`yes` と回答すれば、基本的にはなにごともなくstateが移行されるはずです。
移行されたstateの内容については、Workspaceのサイドバーにあるstateから確認できます。

### 移行できないこともある
基本的には上記の手順で移行できるはずですが、移行できないこともあるようです。
今回、私も移行できないケースを踏み抜きました(しっかり検証していないのですが、リモートステートを利用していたことがあやしそうです)。
このような場合は、`terraform state push` を使うことで移行が可能でした([公式ドキュメント](https://developer.hashicorp.com/terraform/cli/commands/state/push))。

## 動作確認
tfstateを移行したら、HCP Terraform経由でPlanやApplyができるかを確認しましょう。
Workspaceに各種反映先へのアクセス情報やtfvarsの設定をしたら、HCP Terraform、ローカルでそれぞれコマンドを流してみます。

### HCP Terraform
Workspaceの右上の青いボタンから実行できます。

![image.png](/images/qiita-migrate-to-hcp-terraform/001.png)

### ローカル
`terraform login` でHCP Terraformのアカウント情報を設定し、`cloud` ブロックを設定した状態であれば、HCP Terraform上でPlanやApplyを実行できます。

このとき、リポジトリ直下(WorkspaceにWorking Directoryを設定している場合は、ローカルでterraformコマンドを実行したディレクトリの親ディレクトリ)のファイルがすべてHCP Terraformにアップロードされます。
IaCのコードを分離したリポジトリで管理していれば問題ないのですが、アプリケーションコードと同じ場所に置いているとアップロードに時間がかかってしまいます。

そのような場合は、[.terraformignore](https://developer.hashicorp.com/terraform/language/settings/backends/remote#excluding-files-from-upload-with-terraformignore) を設定することで、アップロードされるファイルを制限できます。

たとえば、アプリケーションリポジトリ直下に `terraform` ディレクトリを作成している場合は、以下のように設定することで `terraform` ディレクトリ以外のアップロードを防ぐことができます。

```.terraformignore
**
!terraform/
terraform/*.tfstate
terraform/.terraform/
```

一点注意が必要なのは、`.gitignore` と違い、**ディレクトリをignoreする場合、末尾に `/` が必要となる**点です。

## 感想
上記の手順でHCP Terraformへの移行はある程度簡単に済ませることができます。
HCP Terraformに移行するハードルを高く見ていたので、これくらいで済むのであれば早めに済ませて管理ポリシーやリモート実行などの便利な機能を活用しておけばよかった……と思っています。

今後運用をしていくに際し、Workspaceをどう切るべきだった？ VCSとの連携でどこまでやる？ 自動でApplyさせるべき？ など悩むポイントは出てくると思うので、都度記事にしていきます。


