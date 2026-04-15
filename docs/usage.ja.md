# 使い方

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## Summary

標準的な `gctree` の使い方は、gc-tree を初期化し、provider を選び、デフォルトの `main` gc-branch をオンボードし、必要に応じて新しい gc-branch を作り、リポジトリを正しい gc-branch に結び付け、その後の長期変更はガイド付き更新で処理する流れです。

## 標準フロー

1. `gctree init` を実行する
2. 好みの provider（`codex` または `claude-code`）を選ぶ
3. デフォルトの `main` gc-branch のガイド付きオンボーディングを完了する
4. `gctree resolve --query "..."` で関連コンテキストを解決する
5. `gctree checkout` で gc-branch を作成または切り替える
6. 空の gc-branch に対してのみ `gctree onboard` を実行する
7. リポジトリ範囲のマッピングで、gc-branch が本当に関係するリポジトリにだけ適用されるようにする
8. 以後の長期変更は `gctree update-global-context` を使う

## 主要コマンド

| コマンド | 説明 |
| --- | --- |
| `gctree init` | `~/.gctree` とデフォルトの `main` gc-branch を作成し、provider を保存し、現在の環境を scaffold したうえで、`main` が空ならガイド付きオンボーディングを開始します。 |
| `gctree checkout <branch>` | アクティブな gc-branch を切り替えます。 |
| `gctree checkout -b <branch>` | 新しい空の gc-branch を作成して切り替えます。 |
| `gctree branches` | 利用可能な gc-branches と現在の gc-branch を表示します。 |
| `gctree status` | アクティブな gc-branch、現在のリポジトリ、そのリポジトリの scope 状態、警告、保存された provider を表示します。 |
| `gctree resolve --query TEXT` | 関連する gc-branch からコンテキストを検索します。現在のリポジトリが未マッピングなら、対話的に扱い方を決められます。 |
| `gctree repo-map` | `branch-repo-map.json` の現在内容を表示します。 |
| `gctree set-repo-scope --branch <name> --include` | 現在のリポジトリをその gc-branch の include に追加します。 |
| `gctree set-repo-scope --branch <name> --exclude` | 現在のリポジトリをその gc-branch の exclude に追加します。 |
| `gctree onboard` | アクティブな gc-branch に対してガイド付きオンボーディングを開始します。空の gc-branch でのみ利用できます。 |
| `gctree reset-gc-branch --branch <name> --yes` | gc-branch を空に戻し、再オンボーディングできるようにします。 |
| `gctree update-global-context` | アクティブな gc-branch に対してガイド付きの永続更新を開始します。 |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context` の別名です。 |
| `gctree scaffold --host <codex|claude-code>` | 別環境に provider 向けコマンド面をインストールします。 |

## リポジトリ範囲の例

たとえば gc-branch `A` が `B`、`C`、`D` にだけ関係し、`F` には関係しないなら、次のように管理できます。

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

保存先:

```text
~/.gctree/branch-repo-map.json
```

この状態で `E` リポジトリから `resolve` を実行すると、次を選べます。

1. 今回だけ続行する
2. 今後も `E` で `A` を使う
3. `E` では `A` を無視する

## 初回実行の例

```bash
gctree init
```

その後:

1. `codex` または `claude-code` を選ぶ
2. `gctree` に現在の環境を scaffold させる
3. `main` gc-branch のオンボーディングを完了する

## 複数 gc-branch の例

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

実際に作業してみて、そのリポジトリが現在の gc-branch に属するべきだと分かった場合は、自然な流れはこうです。

1. まずそのリポジトリを branch repo map に追加する
2. その後 `update-global-context` を実行して、そのリポジトリが何を担うのか、なぜ重要なのかといった長期コンテキストを追加する

## 統合パターン

### Codex CLI / Claude Code CLI

`gctree scaffold` は、ガイド付きオンボーディングやガイド付き更新などの provider 向けコマンドをインストールします。
それらのコマンドは、開始前に必ず現在アクティブな gc-branch を明示するべきです。

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

### ランタイム上の扱い

現在の gc-branch は `~/.gctree` 内の `HEAD` が指す fallback ブランチです。
ただし、あるリポジトリが別の gc-branch に明示的に結び付けられている場合、そのリポジトリでは branch map が HEAD より優先されます。
