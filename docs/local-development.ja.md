# ローカル開発

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## 要約

ローカル開発は、一般的な Node.js 20+ の流れに沿っています。依存関係を入れ、CLI をビルドし、ローカルで実行し、変更を送る前に既存のテストスイートで検証します。

## 前提条件

- Node.js 20+
- npm
- provider 起動を自分で試したい場合はローカルの `codex` と / または `claude` バイナリ

## セットアップ

```bash
npm install
npm run build
```

## CLI をローカルで実行する

### 方法 1: ビルド済みエントリを直接実行する

```bash
node dist/src/cli.js status
```

### 方法 2: CLI をシェルにリンクする

```bash
npm link
gctree status
```

TypeScript のソースを変更したら、CLI を再テストする前にもう一度ビルドしてください。

## 検証

プルリクエストを開く前に、次を実行します。

```bash
npm run build
npm test
```

## repo-scope テスト

現在のテストスイートでは、次をカバーしています。

- provider モードの保存（`claude-code`、`codex`、`both`）
- 優先言語の保存と launch prompt での強い言語維持
- リポジトリを意識した gc-branch 選択
- `resolve` 実行中の include / exclude の対話
- branch repo map の更新
- ガイド付きオンボーディング / 更新の境界条件

## provider の手動 E2E チェック

自動テストでは、Codex や Claude Code のセッションを実際に開かなくても launch plan を検証できるよう、provider 起動を無効化しています。
本物の launch path を試したい場合は、使い捨てディレクトリで次のどちらかを実行してください。

```bash
gctree init --provider codex
gctree init --provider claude-code
```

正しく動けば、provider が起動し、すぐに `$gc-onboard` または `/gc-onboard` を受け取るはずです。

## プロジェクト構成

- `src/` — CLI、本体のコンテキスト保存、provider 選択、repo-scope マッピング、ガイド付きオンボーディング / 更新フロー、scaffolding ロジック
- `tests/` — CLI と振る舞いのテスト
- `skills/` — ツール非依存のワークフロースキル
- `scaffolds/` — ホスト別のブートストラップテンプレート
- `docs/` — 概念、原則、使い方、開発ドキュメント
