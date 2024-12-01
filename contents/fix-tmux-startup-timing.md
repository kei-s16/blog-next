---
title: "tmuxの起動タイミングを変更した"
date: "2024-12-01T22:15:00"
tags: ["tmux", "zsh", "AdventCalendar2024"]
category: "技術"
---

この記事は[ひとりアドベントカレンダー(便秘解消)](/posts/advent-calendar-2024) DAY 1の記事です。  

---

## tl;dr
ログイン時にtmuxを自動で起動したい場合、起動スクリプトは `.zprofile` or `.zlogin` に書くのがよさそう  

---

## 解決したかったこと
ロケールを日本語に設定したLinuxのログインシェルでtmuxを起動したとき、日本語が表示されなかった。  
具体的には、ASCIIの範囲の文字は表示されるが、それ以外はすべて `_` として表示される。  
また、一度tmuxを終了させてzshに抜けたとき、およびあらためてtmux起動したときは正しく日本語が表示されるようになる。  

## 環境情報
- zsh
- archlinux
  - `Linux worker01 6.8.12-4-pve #1 SMP PREEMPT_DYNAMIC PMX 6.8.12-4 (2024-11-06T15:04Z) x86_64 GNU/Linux`
- SSHで出先から遊ぶサーバなので、X/Wayland環境はなし

以下のansibleを実行して、日本語ロケールを生成済。  

```yaml
- name: '日本語ロケールの生成'
  become: true
  community.general.locale_gen:
    name: ja_JP.UTF-8

- name: '日本語ロケールを使う'
  become: true
  ansible.builtin.copy:
    content: 'LANG=ja_JP.UTF-8'
    dest: /etc/locale.conf
```

https://github.com/kei-s16/homelab/blob/a4e6228e2c4715ee28cd67f9e4874de7964b1900/ansible/roles/add-worker/tasks/main.yaml#L2-L11  

tmuxの起動は、`~/.zshenv` に書かれた以下のスクリプトで実行している。  

```zsh
# TMUX
if which tmux >/dev/null 2>&1; then
    # if no session is started, start a new session
    test -z ${TMUX} && tmux

    # when quitting tmux, try to attach
    while test -z ${TMUX}; do
        tmux attach || break
    done
fi
```

## 予測
>一度tmuxを終了させてzshに抜けたとき、およびあらためてtmux起動したときは正しく日本語が表示されるようになる。  

この挙動から、初回のtmux起動までの時間で、設定したロケールが読まれていないのではないかと仮説を立てた。  

## 調査したこと
### envの差分を取る
ロケール情報は環境変数に入る。そのため、

1. ログイン後自動でtmuxを起動したとき
1. zshに抜けたとき
1. あらためてtmuxを起動したとき

の環境変数を比較した。  

```zsh
$ mkdir tmp
$ env > tmp/${現在試している状態}-env.txt
```

その後、環境変数を比較した。ソートをしないとまともなdiffが取れないので、環境変数名をキーにソートしている。  

```zsh
# 以下は初回起動とtmux再起動後の環境変数を比較している
$ zsh -c "diff -ui <(sort tmp/env-first-tmux.txt) <(sort tmp/env-re-tmux.txt)"
```

残念ながら、目星を付けていた `LANG` には差分がなく、どの状態でも `LANG=ja_JP.UTF-8` が入っていた。  

### zshrcに処理を移植する
[tmuxのドキュメント](https://github.com/tmux/tmux/wiki/FAQ#how-do-i-use-utf-8)には、

>tmux will attempt to detect if the terminal it is running in supports UTF-8 by looking at the LC_ALL, LC_CTYPE and LANG environment variables.
>(tmuxはターミナルがUTF-8をサポートしていてLC_ALL, LC_CTYPE, LANGが設定されていたらいい感じに言語設定するよ(適当訳))

とあるので、LANGが設定されている以上詰みかと思われた。  
が、ふと適当に前述したtmux起動スクリプトを `~/.zshrc` の末尾に移動してログインしなおしたところ、日本語が表示された。  
neovimの `:h` やmanもしっかり日本語で読めた。  

もしやと思いzshの設定ファイルロード順を確認することにした。  

### zshの起動処理を確認する

[zshのman](https://man.archlinux.org/man/zsh.1#STARTUP/SHUTDOWN_FILES)によると、ログイン時は以下の順で設定ファイルが読まれている

1. /etc/zsh/zshenv
1. $ZDOTDIR/.zshenv
1. /etc/zsh/zprofile
1. $ZDOTDIR/.zprofile
1. /etc/zsh/zshrc
1. $ZDOTDIR/.zshrc
1. /etc/zsh/zlogin
1. $ZDOTDIR/.zlogin

自分の環境では、`ZDOTDIR` は明示的に指定していないので、`~/` になる

今回、`zshenv` でtmuxを起動したところ、その時点ではLANGが設定されていないような挙動を見せたため、そこを確認したい。  
以下のスクリプトを`ZDOTDIR`の各設定ファイルに書けばログイン時の出力で必要最低限の出力が得られるはず。  

```zsh
echo "LANG=$(echo $LANG) in .zprofile"
```

結果は以下の通りで、やはりzshenvの段階でLANGが読めていなかった。  

```zsh
LANG= in .zshenv
LANG=ja_JP.UTF-8 in .zprofile
LANG=ja_JP.UTF-8 in .zshrc
```

## 修正したこと
ここまでの挙動から、`/etc/zsh/zshenv`, `$ZDOTDIR/.zshenv` の両方を処理したあとでtmuxを起動するのが確実そう。  

以下の記事を読むと、実際zshenvには環境変数の設定だけを書いて、コマンド実行はなるべく避けたほうがよさそう、ということがわかる。  
(つまりこれまでの設定はアンチパターンだったということ)  

- https://wiki.archlinux.jp/index.php/Zsh#.E3.82.B9.E3.82.BF.E3.83.BC.E3.83.88.E3.82.A2.E3.83.83.E3.83.97.2F.E3.82.B7.E3.83.A3.E3.83.83.E3.83.88.E3.83.80.E3.82.A6.E3.83.B3_.E3.83.95.E3.82.A1.E3.82.A4.E3.83.AB
- https://zsh.sourceforge.io/Guide/zshguide02.html

というわけで、以下のスクリプトは最終的に `~/.zlogin` で書かれることになった。  

```zsh
# TMUX
if which tmux >/dev/null 2>&1; then
    # if no session is started, start a new session
    test -z ${TMUX} && tmux

    # when quitting tmux, try to attach
    while test -z ${TMUX}; do
        tmux attach || break
    done
fi
```

## 結論
- zshenvにはパスの設定などの最低限の環境変数の設定を書く
    - なぜなら、ここに書かれたことはシェルスクリプトでも読まれるから
- CUIでしか使わない設定はzprofileに書く
- 迷ったらいったんzshrcに書いておいて、あとで調べて書き直すのが無難

