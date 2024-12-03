---
title: "Terraformで既存ECSサービスにキャパシティプロバイダー戦略を追加するときは注意が必要"
date: "2024-12-03T23:50:00"
tags: ["terraform", "AdventCalendar2024"]
category: "技術"
---

この記事は[ひとりアドベントカレンダー(便秘解消)](/posts/advent-calendar-2024) DAY 3の記事です。  

---

## 本文

先日、既存のECSサービスに対してFARGATE_SPOTを導入しました。  

該当のECSサービスは開発環境のリソースで、

- 不意に停止されても問題がない
  - むしろ不意に落ちてくれたほうがリカバリ性を確認できる
- 似たリソースを作業ブランチごとに増やしていく可能性があるので、オンデマンドではコストが耐えられない

などの背景があったためです。  

変更対象はTerraformで管理されていたため、ドキュメントを参照し、[capacity_provider_strategy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service#capacity_provider_strategy)を設定して作業完了だと思っていました。  
ざっくりこんな感じで、本番ならオンデマンド、そうでなければSPOTを使う感じですね。  

```terraform
resource "aws_ecs_service" "nice_service" {
  name            = "nice-service"
  cluster         = aws_ecs_cluster.nice_cluster.id
  task_definition = aws_ecs_task_definition.nice_service.arn
  desired_count   = 1

  # ここから追加部分
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    base = 0
    weight = var.is_production == true ? 1 : 0
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base = 0
    weight = var.is_production == true ? 0 : 1
  }

```

これをapplyしようとしたところ、期待していた挙動はin placeなアップデートがかかることだったのですが、一度サービスをdestroyし、再作成する挙動になりました。  
開発環境は再作成でも構わないのですが、同一コードで本番も管理している都合上、ヨシ！ とはできません。  

この問題に気付いたあと、マネジメントコンソールでも同様の挙動になるのか確認したところ、マネジメントコンソールのサービス更新画面でキャパシティプロバイダ戦略を操作した場合にはECSサービスが再作成されないとわかりました。
手作業が挟まってしまうのは残念ですが、以下のようにコード上で表現しつつ管理は行われない、というなんとも微妙な解決方法をいったん採用することにしました。

```terraform
resource "aws_ecs_service" "nice_service" {
  name            = "nice-service"
  cluster         = aws_ecs_cluster.nice_cluster.id
  task_definition = aws_ecs_task_definition.nice_service.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    base = 0
    weight = var.is_production == true ? 1 : 0
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base = 0
    weight = var.is_production == true ? 0 : 1
  }

  # ここから無念の対処部分
  lifecycle {
    ignore_changes = [
      capacity_provider_strategy,
    ]
  }

```

## まとめ
- Terraformから操作する場合、マネジメントコンソールやAWS CLI, APIでは発生しないリソースの再作成が発生することもある
  - 善し悪しはともかく、ignore_changesを書くことで発生を抑えることはできるが、その場合Terraform外でのリソース操作が必要になってしまう

