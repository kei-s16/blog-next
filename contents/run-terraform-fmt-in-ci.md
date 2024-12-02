---
title: "terraform fmtをCIで回そう"
date: "2024-12-02T21:00:00"
tags: ["GitHubActions", "terraform", "AdventCalendar2024"]
category: "技術"
---

この記事は[ひとりアドベントカレンダー(便秘解消)](/posts/advent-calendar-2024) DAY 2の記事です。  

---

## tl;dr
terraform fmtやlinterのfixは各開発者の善意に任せずCIでやろう  

---

## 本文
terraformを書いたあと、コミットする前に`terraform fmt -recursive`をかけると思います。  
そうしてfmtをかけていざコミットしようとしたら知らない差分が出てきて驚くことが多々あります。  

その原因は

- だれかがfmtし忘れた
- だれかが[recursive](https://developer.hashicorp.com/terraform/cli/commands/fmt#recursive)オプションをつけ忘れたままfmtした
  - デフォルトではカレントディレクトリしかfmtされない、という仕様は意外と知られていない(体感)

のどちらかなのですが、これを注意したとて、というところがあります。  
よく気をつけましょう、よく気をつけます、で終わってしまう話だからです。  

とはいえ、毎回なんだこの差分は、とびっくりしたくない気持ちもあります。  
そこで、fmtをCIに組み込み、強制的にフォーマットがかかるようにしました。  

```yaml
name: "terraform fmt"

on:
  pull_request:
    paths:
      - *.tf # ここのパス設定はリポジトリに合わせて変える

jobs:
  fmt:
    runs-on: ubuntu-latest
    steps:
    - name: "checkoutする"
      uses: actions/checkout@v4

    - name: "terraformを使えるようにする"
      uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: "1.10.0"

    - name: "fmtする"
      id: fmt
      run: 
        terraform fmt -recursive -diff
      # リポジトリに合わせてworking_directoryを設定する

    - name: "fmtした場合はコミット"
      if: steps.fmt.outputs.stdout != null # 差分があれば
      run: |
        git fetch
        git config --local user.name "${GITHUB_ACTOR}"
        git config --local user.email "github-action[bot]@users.noreply.github.com"
        git checkout ${{ github.head_ref }}
        git add -A
        git status
        git commit -m "terraform fmt"
        git push

```

これで人間の善意に頼らず、terraformのコードが綺麗な状態を保つことができます。  
今回はterraform fmtでしたが、linterのautofixなどにも応用が効くと思われます。  
人間の善意は機械に置き換えていきましょう。  

