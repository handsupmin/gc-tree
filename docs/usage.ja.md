# 使い方

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## 概要

標準的な `gctree` の流れはこうです。gc-tree を初期化し、プロバイダーを選び、デフォルトの `main` gc-branch をオンボードし、必要なコンテキストを resolve で引き、作業に応じて新しい gc-branch を作り、リポジトリを適切な gc-branch に結び付け、後からの永続的な変更はガイド付き更新で反映していきます。

## 標準ワークフロー

1. `gctree init` を実行する
2. 好みのプロバイダーモードを選ぶ（`claude-code`、`codex`、`both`）
3. ワークフロー言語を選ぶ（`English`、`Korean`、またはカスタム言語）
4. `both` を選んだ場合は、今回のオンボーディングをどちらのプロバイダーで始めるか選ぶ
5. デフォルトの `main` gc-branch に対するガイド付きオンボーディングを完了する
6. `gctree resolve --query "..."` で必要なコンテキストを取り出す
7. `gctree related --id <match-id>` で supporting docs を確認する
8. `gctree show-doc --id <match-id>` で必要なときだけフルドキュメントを読む
9. `gctree checkout` で gc-branch を作成または切り替える
10. `gctree onboard` は空の gc-branch に対してだけ使う
11. repo scope を設定して gc-branch が本来のリポジトリにだけ作用するようにする
12. 後からの永続的な変更には `gctree update-global-context` を使う

## 主要コマンド

| コマンド | 役割 |
| --- | --- |
| `gctree init` | `~/.gctree` を作成し、デフォルトの `main` gc-branch を作り、プロバイダーモード・オンボーディングプロバイダー・優先言語を保存し、グローバルなプロバイダーフック/コマンド/スキルをインストールし、`main` が空ならガイド付きオンボーディングまで開始します。 |
| `gctree checkout <branch>` | アクティブな gc-branch を切り替えます。 |
| `gctree checkout -b <branch>` | 新しい空の gc-branch を作成し、そのまま切り替えます。 |
| `gctree branches` | 利用可能な gc-branch 一覧と、現在アクティブなものを表示します。 |
| `gctree status` | アクティブな gc-branch、現在のリポジトリ、現在の repo-scope 状態、警告、優先プロバイダーを表示します。 |
| `gctree resolve --query TEXT` | クエリに対する compact index layer を返します。各 match には stable ID と次の確認コマンドが含まれます。 |
| `gctree related --id <match-id>` | 1つの resolved match に関連する supporting docs を、フル markdown を開かずに返します。 |
| `gctree show-doc --id <match-id>` | stable match ID に対応するフル markdown の source-of-truth ドキュメントを返します。 |
| `gctree repo-map` | 現在の `branch-repo-map.json` の内容を表示します。 |
| `gctree set-repo-scope --branch <name> --include` | 現在のリポジトリを、その gc-branch に含まれるものとして記録します。 |
| `gctree set-repo-scope --branch <name> --exclude` | 現在のリポジトリを、その gc-branch では無視するものとして記録します。 |
| `gctree onboard` | アクティブな gc-branch に対するガイド付きオンボーディングを開始します。空の gc-branch でのみ動作します。 |
| `gctree reset-gc-branch --branch <name> --yes` | gc-branch を空にして再オンボード可能な状態にします。 |
| `gctree update-global-context` | アクティブな gc-branch に対するガイド付き永続的更新を開始します。 |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context` の別名です。 |
| `gctree scaffold --host <codex\|claude-code>` | 1つのリポジトリやワークスペースにローカルなプロバイダー override をインストールします。 |
| `gctree uninstall --yes` | `~/.gctree` とグローバルな gctree 有効化を削除します。 |

## resolve が返す内容

`gctree resolve` は progressive-disclosure ワークフローにおける **compact index layer** です。アクティブな gc-branch 内のドキュメントをクエリに対してスコアリングし、stable ID 付きの match だけを返します。タイトルの一致は本文の一致の 2 倍の重みを持ちます。

```bash
gctree resolve --query "auth token rotation policy"
```

```json
{
  "gc_branch": "main",
  "query": "auth token rotation policy",
  "status": "matched",
  "matches": [
    {
      "id": "auth",
      "title": "Auth & Session Conventions",
      "path": "docs/auth.md",
      "score": 4,
      "summary": "JWT rotation on every request, refresh tokens in httpOnly cookies, 15-min access token TTL",
      "excerpt": "## Auth Flow\nAccess token: 15-min TTL, rotated on every authenticated request...",
      "commands": {
        "show_doc": "gctree show-doc --id \"auth\" --home \"~/.gctree\" --branch \"main\"",
        "related": "gctree related --id \"auth\" --home \"~/.gctree\" --branch \"main\""
      }
    }
  ]
}
```

推奨フローは次のとおりです。

1. `resolve` → compact index
2. `related` → その match の周辺にある supporting docs
3. `show-doc` → 必要なときだけフル markdown

Graceful degradation も明示的です。

- 空の gc-branch → `status: "empty_branch"`
- 除外された repo → `status: "excluded"`
- ヒットなし → `status: "no_match"`
- 文書 ID が見つからない → `status: "doc_not_found"`

## repo scope の設定例

gc-branch `A` がリポジトリ `B`・`C`・`D` には関係し、`F` には関係しないとします。

その場合は次のように管理できます。

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

リポジトリ `E` から `resolve` を実行し、ブランチ `A` がまだそこにマップされていない場合、`gctree` は次のどれにするかを尋ねられます。

1. 今回だけ続ける
2. `E` では今後も常に `A` を使う
3. `E` では `A` を無視する

## 初回実行の例

```bash
gctree init
```

そのあと:

1. `codex` か `claude-code` を選ぶ
2. `gctree` にそのプロバイダー向けのグローバル有効化をインストールさせる
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

新しく重要になったリポジトリを永続的なコンテキストにも組み込みたい場合、自然な流れは次のとおりです。

1. まずそのリポジトリを gc-branch にマップする
2. その後 `update-global-context` を実行して、そのリポジトリが何を担い、なぜ重要なのかという永続的な知識を追加する

## 統合パターン

### Codex CLI / Claude Code CLI

`gctree init` はグローバルなプロバイダーフック面をインストールします。`gctree scaffold` は特定のリポジトリに独自の markdown スニペットやローカルなコマンド面が必要なときに、ターゲットディレクトリへローカル override をインストールします。

UserPromptSubmit フックが注入するのは compact な pre-task context だけです。found/no-match 状態、マッチしたドキュメント ID、要約を示し、長い excerpt はデフォルトではインラインしません。要約だけで足りない場合は `gctree resolve --id <id>` で全文を開きます。

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
gctree scaffold --host both --target /path/to/repo
```

**Codex のグローバルファイル（`gctree init`）:**

```
~/.codex/hooks.json                              ← SessionStart / UserPromptSubmit の自動 resolve フック
~/.codex/prompts/gctree-bootstrap.md            ← Codex セッション向けのブートストラップコンテキスト
~/.codex/skills/gc-resolve-context/SKILL.md     ← resolve スキル
~/.codex/skills/gc-onboard/SKILL.md             ← オンボーディングスキル
~/.codex/skills/gc-update-global-context/SKILL.md  ← 更新スキル
```

**`gctree scaffold --host codex` のローカル override ファイル:**

```
AGENTS.md                                  ← gctree のスニペットがエージェント指示に追記される
.codex/hooks.json                         ← SessionStart / UserPromptSubmit の自動 resolve フック
.codex/prompts/gctree-bootstrap.md         ← Codex セッション向けのブートストラップコンテキスト
.codex/skills/gc-resolve-context/SKILL.md  ← resolve スキル
.codex/skills/gc-onboard/SKILL.md          ← オンボーディングスキル
.codex/skills/gc-update-global-context/SKILL.md  ← 更新スキル
```

**Claude Code のグローバルファイル（`gctree init`）:**

```
~/.claude/hooks/hooks.json                         ← SessionStart / UserPromptSubmit の自動 resolve フック
~/.claude/hooks/gctree-session-start.md            ← セッション開始のフォールバックメモ
~/.claude/commands/gc-resolve-context.md           ← resolve スラッシュコマンド
~/.claude/commands/gc-onboard.md                   ← onboard スラッシュコマンド
~/.claude/commands/gc-update-global-context.md     ← 更新スラッシュコマンド
```

**`gctree scaffold --host claude-code` のローカル override ファイル:**

```
CLAUDE.md                                        ← gctree のスニペットが追記される
.claude/hooks/hooks.json                         ← SessionStart / UserPromptSubmit の自動 resolve フック
.claude/hooks/gctree-session-start.md            ← セッション開始のフォールバックメモ
.claude/commands/gc-resolve-context.md           ← resolve スラッシュコマンド
.claude/commands/gc-onboard.md                   ← onboard スラッシュコマンド
.claude/commands/gc-update-global-context.md     ← 更新スラッシュコマンド
```

`--force` を渡さない限り、既存のローカルファイルは変更されません。

### ランタイムの動作

デフォルトのアクティブ gc-branch は `~/.gctree` 内の `HEAD` が指しているものですが、リポジトリが別の gc-branch に明示的に結び付けられている場合は、repo mapping がそのフォールバックを上書きできます。
これにより、互いに無関係なセッションを多数同時に開いているヘビーユーザーでも gc-tree を実用的に使えます。
