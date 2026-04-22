# gc-tree

<div align="center">

```text
              __                          
             /\ \__                       
   __     ___\ \ ,_\  _ __    __     __   
 /'_ `\  /'___\ \ \/ /\`'__\/'__`\ /'__`\ 
/\ \L\ \/\ \__/\ \ \_\ \ \//\  __//\  __/ 
\ \____ \ \____\\ \__\\ \_\\ \____\ \____\
 \/___L\ \/____/ \/__/ \/_/ \/____/\/____/
   /\____/                                
   \_/__/                                 
```

<img src="./logo.png" alt="gc-tree logo" width="260" />

### プロジェクトの外まで届くグローバルコンテキスト。

今使っている AI ツールに、長く使える再利用可能なコンテキストレイヤーを重ねましょう。
Git のブランチ感覚で、複数のコンテキストを分けて持てます。

[![npm version](https://img.shields.io/npm/v/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![npm downloads](https://img.shields.io/npm/dm/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![GitHub stars](https://img.shields.io/github/stars/handsupmin/gc-tree)](https://github.com/handsupmin/gc-tree/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](https://github.com/handsupmin/gc-tree/blob/main/README.md) | [한국어](https://github.com/handsupmin/gc-tree/blob/main/README.ko.md) | [简体中文](https://github.com/handsupmin/gc-tree/blob/main/README.zh.md) | [日本語](https://github.com/handsupmin/gc-tree/blob/main/README.ja.md) | [Español](https://github.com/handsupmin/gc-tree/blob/main/README.es.md)

</div>

---

## 問題

Claude Code や Codex を毎日使っています。でも実際の仕事は複数のリポジトリ、プロダクト、クライアントにまたがっていて——AI ツールは今開いているファイルしか知りません。

だから毎回こうなってしまいます：

- どのリポジトリが一緒に動くか、また最初から説明する
- 同じアーキテクチャ文書をプロンプトに貼り直す
- 先週「もう知っていた」規約をもう一度教える
- 今のリポジトリと無関係なコンテキストを手作業で取り除く

これは AI の問題ではありません。**コンテキスト管理の問題**です。

---

## こんな人に向いています

以下に当てはまるなら、gc-tree が一番よく効きます：

- **複数のリポジトリ**にまたがって仕事をしている（モノレポチーム、プラットフォーム + クライアントリポジトリ、バックエンド + フロントエンドスタック）
- 同じ週に**複数のプロダクトやクライアント**を行き来している
- AI セッションを開くたびに**同じコンテキストを繰り返し説明**している
- AI ツールに今のファイルだけでなく**規約・アーキテクチャ・ドメイン知識**まで理解してほしい

リポジトリ一つ、プロダクト一つで完結するなら、このツールは必要ありません。`CLAUDE.md` や `.cursorrules` で十分です。

---

## インストール & クイックスタート

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

`gctree init` が次のことを案内してくれます：

1. プロバイダーの選択：`claude-code`、`codex`、または `both`
2. 現在のリポジトリへの統合ファイルのインストール
3. `main` gc-branch のガイド付きオンボーディング実行

その後は、AI ツールに実際の SessionStart / UserPromptSubmit フック統合が入り、作業前に gc-tree を自動確認し、空結果や no-match をセッション中キャッシュします。

- **CLI：** `gctree`
- **動作条件：** Node.js 20+

---

## gc-tree がやること

`gc-tree` は**リポジトリより上のレイヤー**に位置します。コンテキストを構造化された Markdown ファイルに保存し、AI ツールがセッションのたびに関連するものだけを自動で引き出せるようにします。

`gctree resolve` は、progressive-disclosure ワークフローにおける **compact index layer** です。

- `gctree resolve --query "..."` → stable ID 付きの compact なマッチ一覧
- `gctree related --id <match-id>` → そのマッチの周辺にある supporting docs
- `gctree show-doc --id <match-id>` → そのドキュメントの完全な markdown

また、文書が空・リポジトリが除外対象・クエリ結果なし、といった場合も曖昧に失敗せず、明示的な status を返します。

```bash
gctree resolve --query "auth token rotation policy"
```

```json
{
  "gc_branch": "main",
  "matches": [
    {
      "title": "認証 & セッション規約",
      "score": 4,
      "summary": "すべてのリクエストで JWT rotation、refresh token は httpOnly Cookie に保存、access token の TTL は 15 分",
      "excerpt": "## 認証フロー\nAccess token：15 分 TTL、認証リクエストのたびに rotation..."
    }
  ]
}
```

AI ツールに渡るのは正しいコンテキスト——ナレッジベース全体ではなく、関係する部分だけです。

**実測値：1 クエリあたり全コンテキストの約 4% だけ注入されます。** 残り 96% は実際に必要になるまでディスクに留まり、トークンウィンドウに入りません。

---

## CLAUDE.md や cursor rules との違いは？

`CLAUDE.md` は優れています——一つのリポジトリにおいては。

複数のリポジトリ・クライアント・ワークストリームが増えた瞬間：

|                      | `CLAUDE.md` / cursor rules | `gc-tree`                                |
| -------------------- | -------------------------- | ---------------------------------------- |
| スコープ             | リポジトリ一つ             | 複数リポジトリ、コンテキスト一つ         |
| 永続化               | リポジトリ内のファイル     | リポジトリ外に保存、セッション間で再利用 |
| コンテキスト切り替え | ファイルを手で編集         | `gctree checkout client-b`               |
| 関連性フィルタリング | 全部か何もないか           | 一致したドキュメントだけ注入（約 4%）    |
| オンボーディング     | 手書き                     | AI ツールがガイド                        |
| Codex 対応           | ✅                         | ✅                                       |
| Claude Code 対応     | ✅                         | ✅                                       |

---

## 検証済みのパフォーマンス

実際の社内ドキュメントでテスト（Notion エクスポート 4 件、日本語・英語混合クエリ）：

| 指標                                         | 結果              |
| -------------------------------------------- | ----------------- |
| Recall——関連クエリが正しい文書を見つける割合 | **100%**（16/16） |
| Precision——無関係なクエリが空を返す割合      | **80%**（4/5）    |
| F1 スコア                                    | **88.9%**         |
| クエリあたりの注入トークン割合（全体比）     | **約 4%**         |
| 日英混合クエリ対応                           | ✅                |

---

## Claude Code と Codex、両方で動作検証済み

```bash
gctree init                         # ~/.gctree と選んだプロバイダーのグローバル有効化を設定
gctree scaffold --host claude-code   # CLAUDE.md スニペット + /gc-onboard、/gc-update-global-context をインストール
gctree scaffold --host codex         # AGENTS.md スニペット + $gc-onboard、$gc-update-global-context をインストール
gctree scaffold --host both          # 両方同時に
```

どちらのプロバイダーも同じ基盤のコンテキストストアを使います。一度オンボーディングすれば、どちらのツールからでも使えます。

**Claude Code** — `/gc-resolve-context`、`/gc-onboard`、`/gc-update-global-context` スラッシュコマンドを使用。

**Codex** — `$gc-resolve-context`、`$gc-onboard`、`$gc-update-global-context` スキルを使用。`codex exec` で実際に検証済み：

```
gctree status → gc_branch: main、doc_count: 2
gctree resolve --query 'NestJS DTO plainToInstance'
→「バックエンドコーディング規約」にマッチ（score: 3）
→ DTO：class-transformer plainToInstance、class-validator 必須
→ エラー処理：HttpException ベースのカスタム例外、raw Error の throw 禁止
```

---

## よく使う流れ

### ワークストリームごとに別々のコンテキストを持つ

```bash
gctree checkout -b client-b
gctree onboard
```

各 gc-branch は完全に独立したコンテキストレーンです。Git ブランチと同じ感覚で行き来できます。

### 必要なときに関連コンテキストを引き出す

```bash
gctree resolve --query "billing retry policy"
```

一致したドキュメントだけが返ります——タイトル、要約、抜粋。要約で足りなければ、ツールが全文を読みます。

### コンテキストを常に最新に保つ

```bash
gctree update-global-context   # または：gctree update-gc / gctree ugc
```

ガイド付き更新フロー——AI ツールが何が変わったかを確認し、新しいコンテキストを gc-branch に書き戻します。

### コンテキストを特定のリポジトリに限定する

```bash
gctree set-repo-scope --branch client-b --include   # 現在のリポジトリを含める
gctree set-repo-scope --branch client-b --exclude   # 現在のリポジトリを除外する
```

`gc-tree` は関係のないリポジトリにコンテキストを注入しません。

---

## コンテキストの保存構造

```
~/.gctree/
  branches/
    main/
      index.md          ← 圧縮インデックス、最初にロード
      docs/
        auth.md         ← 全文、必要なときだけ読む
        architecture.md
    client-b/
      index.md
      docs/
        ...
  branch-repo-map.json  ← どのリポジトリがどの gc-branch に属するか
  settings.json         ← 優先プロバイダー、言語
```

コンテキストはリポジトリの外に保存されます——`.gitignore` 設定不要、誤コミットの心配なし、同じ gc-branch を使うすべてのプロジェクトで再利用可能。

---

## 主要コマンド

| 目的                                             | コマンド                                                        |
| ------------------------------------------------ | --------------------------------------------------------------- |
| gc-tree を初期化してプロバイダーを選ぶ           | `gctree init`                                                   |
| アクティブな gc-branch を確認する                | `gctree status`                                                 |
| アクティブなコンテキストを検索する               | `gctree resolve --query "..."`                                  |
| gc-branch を作成または切り替える                 | `gctree checkout <branch>` / `gctree checkout -b <branch>`      |
| 全 gc-branch を一覧表示する                      | `gctree branches`                                               |
| 空の gc-branch をガイド付きオンボーディングする  | `gctree onboard`                                                |
| アクティブな gc-branch をガイド付き更新する      | `gctree update-global-context` / `gctree ugc`                   |
| リポジトリ範囲ルールを確認する                   | `gctree repo-map`                                               |
| 現在のリポジトリを gc-branch に含める / 除外する | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| 再オンボーディング前に gc-branch をリセットする  | `gctree reset-gc-branch --branch <name> --yes`                  |
| 1つのリポジトリにローカル override を入れる      | `gctree scaffold --host codex --target /path/to/repo`           |
| グローバルな gc-tree 有効化とコンテキストを外す  | `gctree uninstall --yes`                                        |

---

## ドキュメント

- **コンセプト** — [`docs/concept.ja.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.ja.md)
- **原則** — [`docs/principles.ja.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.ja.md)
- **使い方** — [`docs/usage.ja.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.ja.md)
- **ローカル開発** — [`docs/local-development.ja.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.ja.md)

---

## コントリビュート

コントリビューション歓迎です。開発フローと PR チェックリストは [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md) を参照してください。

---

## ライセンス

MIT。詳細は [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE) を参照してください。
