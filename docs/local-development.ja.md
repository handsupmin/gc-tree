# ローカル実行方法

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## Summary

ローカル開発は標準的な Node.js 20+ ワークフローです。依存関係を入れ、CLI をビルドし、ローカルで実行し、提出前に既存テストで検証します。

## パッケージ状況

`gc-tree` は npm パッケージとして整っていますが、公開の unscoped リリースは名前が `rc-tree` に似すぎているという npm の類似名ポリシーによって現在ブロックされています。
日常の開発は下のソースワークフローを使い、リリース前には `npm publish --dry-run` を必ず実行してください。

## 前提条件

- Node.js 20+
- npm
- provider 起動を手動で確認したい場合は、ローカルの `codex` または `claude` バイナリ

## セットアップ

```bash
npm install
npm run build
```

## ローカルで CLI を実行する

### 方法 1: ビルド済みエントリを直接実行する

```bash
node dist/src/cli.js status
```

### 方法 2: CLI をシェルにリンクする

```bash
npm link
gctree status
```

TypeScript ソースを変更した場合は、再度 CLI を試す前にビルドし直してください。

## 検証

変更を提出する前に次を実行してください。

```bash
npm run build
npm test
npm publish --dry-run
```

## リポジトリ範囲テスト

現在のテストスイートでは次を検証しています。

- provider モード（`claude-code`、`codex`、`both`）の保存
- 優先言語の保存と launch prompt での強い言語固定
- リポジトリに応じた gc-branch 選択
- `resolve` 中の include/exclude インタラクション
- branch repo map の更新
- ガイド付きオンボーディング/更新フローの境界条件

## 手動 provider E2E 検証

自動テストでは provider launch を無効にしているため、Codex や Claude Code の実セッションは開かず、launch plan だけを確認します。
実際の起動経路を手元で確認したい場合は、使い捨てディレクトリで次を実行してください。

```bash
gctree init --provider codex
gctree init --provider claude-code
```

正常なら provider が実際に起動し、すぐに `$gc-onboard` または `/gc-onboard` が渡されます。

## プロジェクト構成

- `src/` — CLI、コンテキスト保存、provider 選択、リポジトリ範囲マッピング、ガイド付きオンボーディング/更新フロー、scaffolding ロジック
- `tests/` — CLI と挙動のテスト
- `skills/` — ツール非依存のワークフロースキル
- `scaffolds/` — ホスト別 bootstrap テンプレート
- `docs/` — concept、principles、usage、development ドキュメント
