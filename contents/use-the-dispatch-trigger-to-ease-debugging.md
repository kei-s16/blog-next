---
title: "dispatchトリガーを使ってGitHub Actionsのデバッグをちょっと楽する"
date: "2024-10-22T02:00:00"
description: ""
tags: ["GitHub", "GitHubActions"]
category: "技術"
---

GitHub Actionsには[様々なトリガー条件があります](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows)。  
`push`, `pull_request` などを設定して、リリースブランチにコミットがあったらデプロイする、PRの各コミットでlinterやテストを動かす、などが一般的な使い方でしょうか。  

そこから一歩進めて[特定のファイルに差分があれば～](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#running-your-workflow-only-when-a-push-affects-specific-files)のようなトリガー条件を設定したとき、動作確認やデバッグで思うように発火させられずにちょっとだけ面倒な思いをしたことはありませんか？ 私はあります。あなたもあるはずです[^1]。  
たとえばこのブログを管理しているリポジトリにも[そういう形跡はあって](https://github.com/kei-s16/blog-next/pull/7)[^2]、[このような涙ぐましいコミット](https://github.com/kei-s16/blog-next/pull/7/commits/d0401b44dee88040f4718ec96e7eabaaf736f90d)をしてなんとか誤魔化していたようです。  
他の解法としては、トリガー条件を緩くする、などでしょうか。  
なんにせよ、作業のたびに虚無の変更を加えたり、トリガー条件の戻し忘れに震えたりしないといけないのはいまいちであります。  

このような苦しみを抱えている人は、ワークフローファイルの通常のトリガーに加えて、[workflow_dispatch](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_dispatch)を追加しておくのがおすすめです。  

```test.yaml
on:
  push:
    paths:
      - **.ts
      - **.tsx
  workflow_dispatch:
```

workflow_dispatchを設定することで、[リポジトリのActionsタブやGitHub CLIから任意のタイミングでワークフローを起動できるようになります](https://docs.github.com/ja/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow)。そのため、テストやLintなど、構築後も定期的に設定を見直すものについてはとりあえずworkflow_dispatchを添えておくといざというときに便利です。  

この便利さに気付いてからというもの、誰かがCI職人をしていると[^3]「それ、workflow_dispatch追加しときな～」と声をかける不審者おじさんになってしまいました。終わり。  

--- 
[^1]: Actionsのデバッグももちろんながら、linterの設定だったり外部ツールとの連携だったりとこういう苦しみを背負う瞬間は思ったより多い
[^2]: こういうのを見て、rebaseして綺麗なコミットログを作れと言われることもあるが、綺麗なコミットログよりも苦しんだ時の思考を追跡できたほうが便利だと思っているので基本そのままにしている
[^3]: デプロイワークフローは手元から発火できるとまずいので例外
