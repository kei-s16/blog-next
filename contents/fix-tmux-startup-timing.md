---
title: "tmuxの起動タイミングを変更した"
date: "2024-12-01T15:00:00"
tags: ["tmux", "zsh", "AdventCalendar2024"]
category: "技術"
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
neovimの `:h` もmanも読めた。  

もしやと思いzshの設定ファイルロード順を確認することにした。  

### zshの起動処理を確認する

[zshのman](https://man.archlinux.org/man/zsh.1#STARTUP/SHUTDOWN_FILES)によると、ログイン時は以下の順で設定ファイルが読まれている

1. /etc/zsh/zshenv
1. $ZROOTDIR/.zshenv
1. /etc/zsh/zprofile
1. $ZROOTDIR/.zprofile
1. /etc/zsh/zshrc
1. $ZROOTDIR/.zshrc
1. /etc/zsh/zlogin
1. $ZROOTDIR/.zlogin

自分の環境では、`ZROOTDIR` は明示的に指定していないので、`~/` になる

今回、`zshenv` でtmuxを起動したところLANGが設定されていないような挙動を見せたため、そこを確認したい。  

```zsh
echo "LANG=$(echo $LANG) in .zprofile"
```

```zsh
LANG= in .zshenv
LANG=ja_JP.UTF-8 in .zprofile
LANG=ja_JP.UTF-8 in .zshrc
```


