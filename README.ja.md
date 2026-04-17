# gc-tree

AI コーディングツール向けのブランチ対応グローバルコンテキストレイヤー。

[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh.md) | [日本語](README.ja.md) | [Español](README.es.md)

## 紹介

`gctree` は AI コーディングツール向けの軽量な **Global Context Tree** です。
長期的なコンテキストに、ファイルベースで再利用しやすく、ブランチ単位で切り替えられる明確な置き場所を与え、既存のワークフローにも自然に組み込めます。

1 つの `AGENTS.md`、`CLAUDE.md`、あるいは短いプロンプト断片だけでは足りなくなったとき、`gctree` は次のことを助けます。

- プロダクト、クライアント、作業トラックごとにコンテキストを分ける
- 隠れたメモリではなく、markdown 文書を source of truth として管理する
- 小さなインデックスと summary-first ドキュメントで必要なコンテキストを素早く見つける
- 好みの LLM CLI を使ってオンボーディングと永続更新を進める
- ある gc-branch が本当に関係するリポジトリでだけ使われるようにする

## 簡単な特徴

- **Provider 駆動のオンボーディング**  
  `gctree init` はまず `claude-code`、`codex`、`both` のどの provider モードを使うかを聞き、その後に応答言語を選ばせ、選択内容を保存して必要なコマンド面を用意したうえで、デフォルトの `main` gc-branch のオンボーディングを開始します。
- **リポジトリ範囲付き gc-branch**  
  `~/.gctree/branch-repo-map.json` により、1 つの gc-branch を特定のリポジトリ群にだけ結びつけられます。たとえば A を B/C/D にだけ適用し、F では無視できます。
- **対話的な範囲ガード**  
  `gctree resolve` が現在のリポジトリをまだこの gc-branch に結び付けていないと判断した場合、今回だけ使うか、今後も使うか、ここでは無視するかを選べます。
- **Summary-first ドキュメント構造**  
  ツールはまず短い要約を読み、必要なときだけ全文を読み込めます。
- **ガイド付きの永続更新**  
  JSON ファイルを手で作らなくても、同じ provider フローでグローバルコンテキストを更新できます。

## インストールとクイックスタート

`gc-tree` はすでに npm CLI として公開できる形になっていますが、公開の unscoped リリースはまだ利用できません。
`npm install gc-tree` が `404` になるのは、その正確な名前で公開済みのパッケージが存在しないためで、一方 `npm publish` は `gc-tree` という名前が `rc-tree` に似すぎているとして npm に拒否されています。
このレジストリ問題が解決するまでは、以下のソースインストールを使ってください。

### 当面はソースからインストール

```bash
git clone https://github.com/handsupmin/gc-tree.git
cd gc-tree
npm install
npm run build
npm link
```

**要件:** Node.js 20+

### クイックスタート

#### 1) gc-tree を初期化する

```bash
gctree init
```

このコマンドは次のことを行います。

- `~/.gctree` を作成する
- デフォルトの `main` gc-branch を作成する
- provider モード（`claude-code`、`codex`、`both`）を選ばせる
- `both` を選んだ場合は、今回のオンボーディングをどちらで始めるかをさらに選ばせる
- 言語（`English`、`Korean`、または自由入力）を選ばせる
- provider モード、実際のオンボーディング provider、言語を `~/.gctree/settings.json` に保存する
- 現在の環境に必要なコマンド面を用意する
- `main` が空であれば、アクティブな gc-branch のガイド付きオンボーディングを開始する

#### 2) 現在のコンテキストを解決する

```bash
gctree resolve --query "auth token rotation"
```

現在のリポジトリがその gc-branch にまだ紐付いていない場合、`gctree` は次を選ばせます。

1. 今回だけ続行する
2. 今後もこのリポジトリでこの gc-branch を使う
3. このリポジトリではこの gc-branch を無視する

2 または 3 を選ぶと `~/.gctree/branch-repo-map.json` が更新されます。

#### 3) 別のコンテキストが必要なら新しい gc-branch を作る

```bash
gctree checkout -b client-b
```

`checkout -b` は**新しい空の gc-branch**を作ります。既存のブランチ文書はコピーしません。

#### 4) 空の gc-branch をオンボードする

```bash
gctree onboard
```

#### 5) 後から永続コンテキストを更新する

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
2. その後 `gctree update-global-context` を実行して、そのリポジトリが何を担うのか、なぜ重要なのかといった長期コンテキストを追加する

#### 6) 再オンボーディングの前に gc-branch をリセットする

```bash
gctree reset-gc-branch --branch client-b --yes
```

### ランタイムで見える provider コマンド

scaffold 後に見えるコマンドは次の通りです。

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

これらのコマンドは、長期コンテキストを集めたり更新したりする前に、現在の gc-branch を必ず明示し、ユーザーが明示的に切り替えを求めない限り、保存された言語を最後まで維持するべきです。

### 主要コマンド一覧

| 目的 | コマンド |
| --- | --- |
| gc-tree を初期化して provider を選ぶ | `gctree init` |
| 現在の gc-branch を確認する | `gctree status` |
| 現在のコンテキストを検索する | `gctree resolve --query "..."` |
| リポジトリ範囲ルールを確認する | `gctree repo-map` |
| gc-branch に対してリポジトリを明示的に含める/除外する | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| gc-branch を作成/切り替えする | `gctree checkout <branch>` / `gctree checkout -b <branch>` |
| 空の gc-branch をオンボードする | `gctree onboard` |
| 現在の gc-branch を永続更新する | `gctree update-global-context` / `gctree update-gc` / `gctree ugc` |
| 再オンボーディング前に gc-branch をリセットする | `gctree reset-gc-branch --branch <name> --yes` |
| 別環境に手動で scaffold を入れる | `gctree scaffold --host codex --target /path/to/repo` |

## ドキュメント

詳細ドキュメントは [`docs/`](docs) にまとまっています。

- **コンセプト** — [`docs/concept.ja.md`](docs/concept.ja.md)  
  `gctree` が何であり、どの課題を解決し、どこまでを担当するのかを説明します。
- **原則** — [`docs/principles.ja.md`](docs/principles.ja.md)  
  gc-branch、リポジトリ範囲、summary-first 文書、ガイド付き更新の考え方をまとめています。
- **使い方** — [`docs/usage.ja.md`](docs/usage.ja.md)  
  標準 CLI フロー、provider コマンド、リポジトリ範囲の挙動、統合パターンを案内します。
- **ローカル実行方法** — [`docs/local-development.ja.md`](docs/local-development.ja.md)  
  依存関係のインストール、CLI のローカル実行、変更確認手順を説明します。

## コントリビュート

コントリビューション歓迎です。開発フローと PR チェックリストは英語ドキュメントの [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ライセンス

MIT。詳細は [`LICENSE`](LICENSE) を参照してください。
