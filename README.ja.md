# gc-tree

<div align="center">

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

日々の仕事が複数のリポジトリ、プロダクト、クライアント、ワークフローにまたがっている開発者のために作りました。

`gc-tree` は、AI コーディングツールに **リポジトリの外側で再利用できるコンテキストレイヤー** を足してくれます。長く使う前提の文脈は残しつつ、関係あるリポジトリにだけ効かせ、無関係な場所では静かに引っ込みます。

---

## なぜ gc-tree なのか

AI エージェントを本気で実務に入れると、リポジトリローカルのコンテキストだけではすぐ足りなくなります。

作業が複数のリポジトリやワークストリームに広がると、たとえばこんなことが起きがちです。

- 長期コンテキストがプロンプトの中に押し込まれていく
- 無関係な文脈が別のリポジトリまで漏れてしまう
- 新しいセッションを開くたびに同じ説明をやり直すことになる
- クライアントやプロダクトの知識がチャット履歴の中に埋もれる
- 作業を切り替えるたびに頭の中で手動で文脈を切り替える必要がある

`gc-tree` は、Codex や Claude Code のような AI コーディングツールをすでにしっかり使っていて、コンテキスト管理まで手作業で回したくない人のための道具です。

---

## これでできること

- **長期コンテキストを複数持てる**
  プロダクト、クライアント、ワークストリームごとに別々のコンテキストレーンを維持できます。

- **リポジトリ単位で関連性を絞れる**
  どのコンテキストをどのリポジトリにだけ適用するかをはっきり決められます。

- **スコープを賢くガードできる**
  まだ紐付いていないリポジトリに入ったとき、今回だけ続けるか、ここでは常に使うか、ここでは無視するかを選べます。

- **ガイド付きでオンボードと更新ができる**
  Codex、Claude Code、あるいは両方を使いながら、コンテキストを育てていけます。

- **summary-first の markdown ナレッジとして残せる**
  隠れたメモリではなくファイルに残し、ツールにはまず短い要約から読ませられます。

---

## インストール & クイックスタート

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

これでスタート準備は完了です。
あとはいつもどおり開発を進めれば大丈夫。`gc-tree` が普段の流れにグローバルコンテキストのレーンを足してくれます。

- **CLI コマンド:** `gctree`
- **要件:** Node.js 20+

ソースから試す場合は [docs/local-development.ja.md](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.ja.md) を参照してください。

---

## よく使う流れ

### 作業に専用レーンが欲しくなったら新しいコンテキストを切る

```bash
gctree checkout -b client-b
gctree onboard
```

クライアント、プロダクト、移行案件、期間限定の施策など、文脈を分けておきたい仕事は gc-branch を切っておくと楽です。

### 後から長期コンテキストを育てる

```bash
gctree update-global-context
```

作業が進んだら、アクティブな gc-branch に長く効く文脈を足していきます。

短い別名:

```bash
gctree update-gc
gctree ugc
```

### 必要になったタイミングでコンテキストを引く

```bash
gctree resolve --query "auth token rotation"
```

必要な瞬間だけ、関係ある文脈を呼び戻せば十分です。

---

## しっくりくる理由

**Git のブランチみたいに複数のコンテキストを持てるのに、Git のブランチみたいに逐一面倒を見る必要はありません。**

たとえば次のようにコンテキストを分けられます。

- クライアントごと
- プロダクトラインごと
- プラットフォームチームごと
- バックエンドとフロントエンドをまとめた共有スタック
- 一時的な施策や移行プロジェクト

そして、ブランチ感覚のコマンドで行き来できます。

```bash
gctree checkout -b client-b
gctree checkout main
```

ただし Git と違って、その切り替えを常に人が意識して管理する必要はありません。

今いるリポジトリが現在のコンテキストのスコープ外なら、`gc-tree` はその文脈を「今は関係ないもの」として扱えます。だから、無関係なコンテキストが別のセッションに混ざり込みません。

その結果、長く使うコンテキストを複数抱えたままでも、毎回すべてを全部のセッションに持ち込まずに済みます。

---

## 現実的なワークフロー

たとえば、こんな構成で仕事をしているとします。

- 共通のプラットフォームリポジトリが 1 つ
- クライアント向けリポジトリが 2 つ
- 社内ツール用リポジトリが 1 つ

`gc-tree` がないと、新しい AI セッションを開くたびに説明し直すことになります。

- 今どのクライアントの話なのか
- どのリポジトリ同士がひとまとまりなのか
- ここで重要なワークフローは何か
- 今はどの文脈がむしろノイズになるのか

`gc-tree` があれば、レーンごとにコンテキストを持ち分けて、セッションをまたいで再利用し、repo scope のルールで不要な文脈の流入も防げます。

要するに、本当にやりたいのはこういうことです。

> プロンプトをもっと溜め込むことではなく、
> **仕事の単位に合ったコンテキストを、正しいレイヤーで管理すること。**

---

## コア概念

- **gc-branch**
  1 つのプロダクト、クライアント、ワークストリーム、ドメインのための長期コンテキストレーンです。

- **repo scope**
  そのコンテキストをどのリポジトリで効かせるかを決めるルールです。

- **provider-guided flow**
  JSON を手で書く代わりに、好みの AI コーディングツールでオンボードと更新を進める流れです。

- **context tree**
  `gc-tree` は内部的には、ブランチを意識したファイルベースの知識ツリーとしてコンテキストを整理します。
  ユーザーが得る価値は、プロジェクトの外までつながる再利用可能なコンテキストです。

---

## ランタイムで見える provider コマンド

scaffold 後に見えるコマンドは次の通りです。

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

これらのコマンドは、長期コンテキストを集めたり更新したりする前に、現在の gc-branch を必ず明示し、ユーザーが明示的に切り替えを求めない限り、保存された言語を最後まで維持するべきです。

---

## 主要コマンド一覧

| 目的 | コマンド |
| --- | --- |
| gc-tree を初期化して provider を選ぶ | `gctree init` |
| 現在の gc-branch を確認する | `gctree status` |
| アクティブなコンテキストを検索する | `gctree resolve --query "..."` |
| リポジトリ範囲ルールを確認する | `gctree repo-map` |
| gc-branch に対してリポジトリを明示的に含める / 除外する | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| gc-branch を作成 / 切り替えする | `gctree checkout <branch>` / `gctree checkout -b <branch>` |
| 空の gc-branch をオンボードする | `gctree onboard` |
| 現在の gc-branch を長期更新する | `gctree update-global-context` / `gctree update-gc` / `gctree ugc` |
| 再オンボーディング前に gc-branch をリセットする | `gctree reset-gc-branch --branch <name> --yes` |
| 別環境に手動で scaffold を入れる | `gctree scaffold --host codex --target /path/to/repo` |

---

## ドキュメント

詳細ドキュメントは [`docs/`](https://github.com/handsupmin/gc-tree/tree/main/docs) にまとまっています。

- **コンセプト** — [`docs/concept.ja.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.ja.md)
  `gctree` が何であり、どの課題を解決し、どこまでを担当するのかを説明します。
- **原則** — [`docs/principles.ja.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.ja.md)
  gc-branch、リポジトリ範囲、summary-first 文書、ガイド付き更新の考え方をまとめています。
- **使い方** — [`docs/usage.ja.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.ja.md)
  標準 CLI フロー、provider コマンド、リポジトリ範囲の挙動、統合パターンを案内します。
- **ローカル実行方法** — [`docs/local-development.ja.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.ja.md)
  依存関係のインストール、CLI のローカル実行、変更確認手順を説明します。

---

## コントリビュート

コントリビューション歓迎です。開発フローと PR チェックリストは英語ドキュメントの [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md) を参照してください。

---

## ライセンス

MIT。詳細は [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE) を参照してください。
