---
title: "GitHub Actionsとecspressoを使ってECSへアプリをデプロイする"
date: "2023-11-30T09:00:00"
tags: ["Qiita", "ECS", "GitHubActions"]
category: "技術"
---

この記事は以前Qiitaにて公開したものになります。  
元記事はこちら : [GitHub Actionsとecspressoを使ってECSへアプリをデプロイする](https://qiita.com/_kei_s/items/1c4a3455f18ba287f785)  

<hr>

## tl;dr
- ECSへのアプリデプロイの基本は3ステップ
    1. コンテナのビルド
    1. タスク定義の更新
    1. コンテナの入れ替え
- [kayac/ecspresso](https://github.com/kayac/ecspresso) を使うと便利

## はじめに
私の所属するチームでは [Amazon ECS](https://aws.amazon.com/jp/ecs/) on Fargateで稼動しているサービスを開発しています。
ECS on Fargateを選択することで、[サーバ自体の管理はAWSにお任せできるため、アプリケーションやその周辺リソースのみに集中すればよいため](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/bestpracticesguide/security-shared.html)、開発者として体験がよく、また運用の負荷も低いです。
少し大変なのが初期構築とデプロイなのですが、デプロイについては [kayac/ecspresso](https://github.com/kayac/ecspresso) を使うと簡単にできるようになります。

今回、チームメンバーが新規でCDを作成することになったため、チーム内で利用しているecspressoを使ったデプロイについて解説します。

## 前提
### 内容
この記事で解説すること・しないことについては以下の通りです

#### この記事で書くこと
- ECSのアプリ入れ替えの流れ
- GitHub Actionsとecspressoを使ったECSへのデプロイ方法

#### この記事で書かないこと
- ecspressoのしっかりした説明
- ECSの詳細
- ECSを実行するインフラ環境の設定方法

### 構成
今回、ECSへのデプロイ解説のために以下のような構成を想定します。
NAT Gatewayをプライベートサブネットに配置していますが、代わりにECRへのPrivate Linkを設定するとよりコストが抑えられます。

![今回の対象構成](/images/qiita-deploy-container-to-ecs-with-ecspresso/image001.png)


## ECSのデプロイについておさらい
### 仕組み
ECSのデプロイは、以下のようなフローで実施されます。

まず、開発者がなんらかの方法でコンテナイメージとタスク定義を更新します。
![ECSデプロイ-デプロイの仕組み-1.png](/images/qiita-deploy-container-to-ecs-with-ecspresso/deploy001.png)

その後、同様に開発者がサービスに紐づくタスク定義を最新にします。
![ECSデプロイ-デプロイの仕組み-2.png](/images/qiita-deploy-container-to-ecs-with-ecspresso/deploy002.png)

その後は、ECSサービスが新しいタスク定義を満たすようにコンテナを起動していきます。
まず、コンテナを起動するためにコンテナイメージをpullします。
![ECSデプロイ-デプロイの仕組み-3.png](/images/qiita-deploy-container-to-ecs-with-ecspresso/deploy003.png)

そして、pullしたイメージとタスク定義を基にコンテナを起動します。
![ECSデプロイ-デプロイの仕組み-4.png](/images/qiita-deploy-container-to-ecs-with-ecspresso/deploy004.png)

タスク定義に設定されたヘルスチェックを満たし、サービスから見て新しいタスクが安定したら、古いタスクを削除し、デプロイ完了になります。
![ECSデプロイ-デプロイの仕組み-5.png](/images/qiita-deploy-container-to-ecs-with-ecspresso/deploy005.png)


### デプロイのまとめ
ここまでで確認したように、ECSへのアプリデプロイには、

- アプリのコンテナイメージ
- ECSのタスク定義
- ECSのサービスが参照するタスク定義

の3つの登場人物が存在します。
そして、それぞれに更新をかける必要があります。

タスク定義とサービスについては馴染みのない方も多いと思います。
そこで、ローカル開発環境でよく採用されるDockerの概念に例えると、タスク定義はcompose.yaml(docker-compose.yaml)に、サービスはDockerデーモンに相当します。
タスク定義はどんなコンテナイメージを使ってどんなサービスを起動するかを管理し、サービスはタスク定義を見て実際にタスクを起動したり、逆に終了したりします。

もちろん、よく似ているだけで実際には違うものなので、興味のある方は[公式ドキュメント](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/Welcome.html)を参照してください。

## GitHub Actionsでデプロイする
仕組みのおさらいでは、開発者がなんらかの方法を用いて手動でそれぞれを更新していました。
たとえば、AWSのマネジメントコンソールを使って画面操作で更新してもいいし、AWS CLIを使って更新してもいいし、あるいはAWS SDKを使って自前でデプロイツールを作成してもいいわけです。

今回は、タスク定義・サービスの更新については [kayac/ecspresso](https://github.com/kayac/ecspresso) という便利なツールを使いつつ、GitHub Actions上にECSのデプロイフローを構築していきます。

このあと例示するデプロイフローは、以下のようなディレクトリ構成のPythonアプリを想定して作成しています。
必要に応じて読み替えてください。

```zsh
.
├── .github
│  └── workflows
│     └── deploy.yaml
├── deploy # ecspressoなどのデプロイ情報が格納されているディレクトリ
│  ├── ecspresso.yaml
│  └── ecs-task-def.json
├── docker # コンテナイメージ
│  └── python
│     └── Dockerfile
├── README.md
└── src # アプリのディレクトリ
   ├── main.py
   └── requirements.txt
```

### デプロイフロー
#### 情報整理
今回のデプロイに必要な作業を順番に起こすと、

1. コンテナイメージのビルド
1. コンテナイメージのECRへのpush
1. タスク定義の作成
1. タスク定義の更新
1. サービス定義の更新
1. 新しいタスクへの切り替え確認

といった具合になります。
今回は、ecspressoを使用するので、ECS操作周辺が簡略化され、

1. コンテナイメージのビルド
1. コンテナイメージのECRへのpush
1. ecspressoでタスク定義とサービスの更新をする

の3ステップに圧縮できます。

#### ecspresso使用準備
ecspressoでデプロイを行うには、以下のファイルが必要です。

- ecspresso.yaml
    - デプロイ先のクラスタ名やリージョン情報などを指定するために必要。
    - [ドキュメントはこちら](https://github.com/kayac/ecspresso#configuration-file)。
- タスク定義のテンプレートファイル
    - ecspressoがアップロードするために必要。
    - jsonかyamlの任意の形式で用意する。
    - [Goの text/template 構文](https://github.com/kayac/ecspresso#template-syntax) でenvなどからパラメータを後付けできる。
    - [AWSの公式ドキュメント](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/example_task_definitions.html)を参考に書くのがおすすめ。

##### サンプル
以下は `ap-northeast-1` にある `iketeru-cluster` の `iketeru-service` に紐づいているタスク定義を更新したいときのecspresso.yamlの例です。
`task_definition` で指定しているファイルはecspresso.yamlと同一のディレクトリに設置します。

```deploy/ecspresso.yaml
region: ap-northeast-1
cluster: iketeru-cluster
service: iketeru-service
task_definition: ecs-task-def.json
timeout: 15m0s
```

ecs-task-def.jsonは、以下のように設定します。
[AWSの公式ドキュメント](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/example_task_definitions.html) を参考に各パラメータをいったんベタ書きで設定したあと、環境ごとに変更したい値やリポジトリで管理したくない値については環境変数から受け取るテンプレート構文に置き換えると楽です。

```deploy/ecs-task-def.json
{
  "containerDefinitions": [
    {
      "cpu": 0,
      "environment": [
        {
          "name": "TZ",
          "value": "Asia/Tokyo"
        }
      ],
      "essential": true,
      "image": "{{ must_env `AWS_ACCOUNT_ID` }}.dkr.ecr.ap-northeast-1.amazonaws.com/{{ must_env `APP_IMAGE_NAME` }}:latest",
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/iketeru-service/app",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "mountPoints": [],
      "name": "python",
      "portMappings": [],
      "volumesFrom": []
    }
  ],
  "cpu": "256",
  "executionRoleArn": "arn:aws:iam::{{ must_env `AWS_ACCOUNT_ID` }}:role/ecsTaskExecutionRole",
  "family": "iketeru-service",
  "memory": "512",
  "networkMode": "awsvpc",
  "placementConstraints": [],
  "requiresCompatibilities": [
    "FARGATE"
  ],
  "taskRoleArn": "arn:aws:iam::{{ must_env `AWS_ACCOUNT_ID` }}:role/iketeru-service-task-role",
  "volumes": []
}
```

#### ワークフローの作成
前述の作業フローをGitHub Actionsのワークフローとしてざっくり実装してみると、以下のようになります。
以下のワークフローでは、コードに載せるべきではない情報をGitHub Actionsのenv, secretsに保存します。
そして、必要なタイミングでWorkflow上の環境変数に展開しています。

```deploy.yaml
name: deploy

on:
  push:
    branches:
      - main

jobs:
  deploy-to-ecs:
    runs-on: ubuntu-latest
    steps:
      # 事前準備
      - name: "作業ブランチにcheckoutする"
        uses: actions/checkout@v4

      - name: "AWSの認証情報を取得する"
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1

      # ビルドしたイメージのpushができるようにECRの認証を通す
      - name: "ECRへログインする"
        uses: aws-actions/amazon-ecr-login@v1
        id: login-ecr
      
      - name: "アプリのコンテナイメージをビルドしてECRにpushする"
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ${{ env.ECR_REPOSITORY_NAME }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build \
            -f docker/python/Dockerfile \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: "ecspressoのインストール"
        uses: kayac/ecspresso@v2
        with:
          version: v2.2.4

      - name: "ecspressoを使ってECSへのデプロイを実行"
        run: ecspresso deploy --config ecspresso.yml --tasks=-1
        working-directory: ./deploy
        env:
          AWS_ACCOUNT_ID: ${{ env.AWS_ACCOUNT_ID }}
          ECR_REPOSITORY: ${{ env.ECR_REPOSITORY_NAME }}
          APP_IMAGE_NAME: ${{ env.APP_IMAGE_NAME }}
```


## まとめ
以上がecspressoを使ってGitHub ActionsからECSへデプロイするために必要な設定です。
最小限のサンプルということもありますが、それを考慮してもかなりシンプルではないでしょうか。

また、今回はデプロイツールとしてecspressoを扱いましたが、デプロイ以外のECSに対する操作するツールとしても非常に便利です。
ぜひ、公式ドキュメントを参照して活用してみてください。

