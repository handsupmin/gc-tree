# 使い方

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## 要約

標準的な `gctree` の流れはこうです。gc-tree を初期化し、provider を選び、デフォルトの `main` gc-branch をオンボードし、必要な文脈を resolve で引き、必要になったら新しい gc-branch を作り、各リポジトリを正しい gc-branch に結び付け、長期的な変更はガイド付き更新で反映していきます。

## 標準ワークフロー

1. `gctree init` を実行する
2. 好みの provider モードを選ぶ（`claude-code`、`codex`、`both`）
3. ワークフロー言語を選ぶ（`English`、`Korean`、またはカスタム言語）
4. `both` を選んだ場合は、今回のオンボーディングをどちらの provider で始めるか選ぶ
5. デフォルトの `main` gc-branch に対するガイド付きオンボーディングを完了する
6. `gctree resolve --query "..."` で必要なコンテキストを取り出す
7. `gctree checkout` で gc-branch を作る / 切り替える
8. `gctree onboard` は空の gc-branch に対してだけ使う
9. repo scope を設定して gc-branch が本来のリポジトリにだけ効くようにする
10. 後からの長期変更には `gctree update-global-context` を使う

## 主要コマンド

| コマンド | 役割 |
| --- | --- |
| `gctree init` | `~/.gctree` を作成し、デフォルトの `main` gc-branch を作り、provider モード / オンボーディング provider / 優先言語を保存し、現在の環境を scaffold し、`main` が空ならガイド付きオンボーディングまで開始します。 |
| `gctree checkout <branch>` | アクティブな gc-branch を切り替えます。 |
| `gctree checkout -b <branch>` | 新しい空の gc-branch を作成し、そのまま切り替えます。 |
| `gctree branches` | 利用可能な gc-branch 一覧と、現在アクティブなものを表示します。 |
| `gctree status` | アクティブな gc-branch、現在のリポジトリ、現在の repo-scope 状態、警告、優先 provider を表示します。 |
| `gctree resolve --query TEXT` | 関係する gc-branch からコンテキストを検索します。現在のリポジトリが未マップなら、そのリポジトリをどう扱うかを尋ねる場合があります。 |
| `gctree repo-map` | 現在の `branch-repo-map.json` の内容を表示します。 |
| `gctree set-repo-scope --branch <name> --include` | 現在のリポジトリを、その gc-branch に含まれるものとして記録します。 |
| `gctree set-repo-scope --branch <name> --exclude` | 現在のリポジトリを、その gc-branch では無視するものとして記録します。 |
| `gctree onboard` | アクティブな gc-branch に対するガイド付きオンボーディングを開始します。空の gc-branch でのみ動作します。 |
| `gctree reset-gc-branch --branch <name> --yes` | gc-branch を空にして再オンボード可能にします。 |
| `gctree update-global-context` | アクティブな gc-branch に対するガイド付き長期更新を開始します。 |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context` の別名です。 |
| `gctree scaffold --host <codex|claude-code>` | 別の環境に provider 向けコマンド面をインストールします。 |

## repo scope の例

gc-branch `A` が repo `B`、`C`、`D` には関係し、`F` には関係しないとします。

その場合は、たとえば次のように管理できます。

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

保存先は次のとおりです。

```text
~/.gctree/branch-repo-map.json
```

repo `E` から `resolve` を実行し、branch `A` がまだそこにマップされていない場合、`gctree` は次のどれにするかを尋ねられます。

1. 今回だけ続ける
2. `E` では今後も常に `A` を使う
3. `E` では `A` を無視する

## 初回実行の例

```bash
gctree init
```

そのあと:

1. `codex` か `claude-code` を選ぶ
2. `gctree` に現在の環境を scaffold させる
3. `main` gc-branch のガイド付きオンボーディングを完了する

## 複数ブランチを使う例

```bash
gctree checkout -b client-b
gctree onboard
gctree resolve --query "billing retry policy"
```

## 更新の例

```bash
gctree update-global-context
```

短い別名:

```bash
gctree update-gc
gctree ugc
```

新しく重要になったリポジトリを長期コンテキストにも組み込みたい場合、自然な流れは次のとおりです。

1. まずそのリポジトリを gc-branch にマップする
2. その後 `update-global-context` を実行して、そのリポジトリが何を担い、なぜ重要なのかという長期知識を追加する

## 統合パターン

### Codex CLI / Claude Code CLI

`gctree scaffold` は、ガイド付きオンボーディングやガイド付き更新などの provider 向けコマンド面をインストールします。
これらのコマンドは、長期コンテキストを集めたり適用したりする前に、現在アクティブな gc-branch を明示的に伝えるべきです。また、ユーザーが明示的に切り替えを求めない限り、保存されたワークフロー言語を使い続けるべきです。

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

### ランタイムの振る舞い

デフォルトのアクティブ gc-branch は `~/.gctree` の `HEAD` が指しているものですが、特定のリポジトリが別の gc-branch に明示的に結び付けられている場合は、repo mapping がその既定値を上書きできます。
このおかげで、互いに無関係なセッションをたくさん同時に開いているヘビーユーザーでも gc-tree を実用的に使えます。
