---
title: "Cloudformationの小技"
date: "2022-09-02T00:00:00"
---

最近Cloudformationを書く機会が増えて~~terraformではなにも考えなくてもよかったのにCloudformationだとものによってはDependsOnを使って依存関係を明示的に指定してあげる必要があったりだとか、おなじCloudformationでもSAMだと方言がつらかったりだとかする現実と戦わなければいけないハメにあって~~いて、それに伴い小技みたいなものを人に話す機会も増えたので、メモしておく。  
Cloudformationをちゃんと触り始めて2週間くらいなので、もっといい方法あるよとか間違ってるよとかあったら教えてください。Twitterとかで。  

## Parameterを選択式にしたい
AllowedValuesを指定してあげることで、マネジメントコンソールのParameter欄を入力式から選択式にできる

```yml
Parameters:
  Stage:
    Type: String
    AllowedValues:
      - production
      - develop
```

## Parameterの入力を見て、使う値をいい感じに変更したい
たとえば、既存のネットワークリソースの中に作成するコンピューティングリソースを定義するCloudformationを書くとする。同じCloudformationで複数のステージにデプロイできるようにもしたい。  
このとき、コンピューティングリソースを作成するVPC IDや関連づけるサブネットのIDを素直にParameterで入力させるもありだが、対象が少ないうちはまだしもテンプレートが膨れ上がって入力すべき値が増えてくると入力が大変。そこで、MappingsとFindInMapを使って、Parameterの値を元に事前に決めた値を参照するように書いてあげる。

```yml
Parameters:
  Stage:
    Type: String
    AllowedValues:
      - production
      - develop

Mappings:
  StageMap:
    production:
      vpcId: vpc-hogehoge
      publicSubnets: ["subnet-hoge", "subnet-fuga"]
    develop:
      vpcId: vpc-piyopiyo
      publicSubnets: ["subnet-foo", "subnet-bar"]

Resources:
  ExampleResource:
    Type: AWS::Example::ResourceType # 実際にこんなリソースはないのでコピッペではうごかない
    Properties:
      Vpc: !FindInMap [StageMap, !Ref Stage, vpcId]
      Subnets: !FindInMap [StageMap, !Ref Stage, publicSubnets]
```

## Parameterの入力を見て、リソースを作成するかどうかいい感じに決めてほしい
前述のケースでは環境ごとにリソースの設定値を切り替えられたが、そもそもリソースがいらない場合もある。  
たとえば、本番はサーバ2台いるけど開発はべつに1台でもいいよねとか。  
そんなときはConditionsを使う。[Resourcesの中にConditionを指定してあげると、Trueな場合のみリソースが作成される](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html)ので、この仕組みをうまいこと使ってあげる。

### Parameterで都度受けつけるパターン
```yml
Parameters:
  Stage:
    Type: String
    AllowedValues:
      - production
      - develop
  RequireStandbyInstance:
    Type: String
    AllowedValues:
      - true
      - false

Conditions:
  isRequireStandbyInstance:
    !Equals [true, !Ref RequireStandbyInstance]

Resources:
  StandbyInstance:
    Condition: isRequireStandbyInstance
```

### Stageごとに決め打ちするパターン
```yml
Parameters:
  Stage:
    Type: String
    AllowedValues:
      - production
      - develop

Mappings:
  StageMap:
    production:
      requireStandbyInstance: "true"
    develop:
      requireStandbyInstance: "false"

Conditions:
  isRequireStandbyInstance:
    !Equals [true, !FindInMap [StageMap, !Ref Stage, requireStandbyInstance]

Resources:
  StandbyInstance:
    Condition: isRequireStandbyInstance
```
