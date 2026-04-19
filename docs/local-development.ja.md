# ローカル開発

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## 概要

ローカル開発は標準的な Node.js 20+ の流れに沿っています。依存関係をインストールし、CLI をビルドし、ローカルで実行し、変更を送る前に既存のテストスイートで検証します。

## 前提条件

- Node.js 20+
- npm
- プロバイダー起動を手元で試したい場合はローカルの `codex` や `claude` バイナリ

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

### eval スイート

ユニットテストに加えて、eval スイートがリアルなフィクスチャに対して resolve の品質を測定します。

```bash
npm run eval                  # 5 シナリオの合成スイート（オンボーディング、resolve、トークン効率、更新、分離）
npm run eval:verbose          # 同上、ケースごとの詳細付き
npm run eval:multi-repo       # cosmo スタイルのフィクスチャを使ったクロスリポジトリ分離テスト
npm run eval:real-docs        # 実際の Notion エクスポートに対する再現率と適合率（ローカルドキュメントが必要）
npm run eval:autoresearch     # 反復的な resolve 改善ループ（src/resolve.ts をその場で変更します）
```

期待されるベースライン（`npm run eval` を実行して確認）:

| スイート | 目標 |
| --- | --- |
| 合成（5 シナリオ） | 5/5 PASS、平均 ≥ 90% |
| マルチリポジトリ | 全体 ≥ 80% |
| 実ドキュメント | 再現率 ≥ 90%、F1 ≥ 80% |

`src/resolve.ts` を変更した場合は、PR を開く前に `npm test && npm run eval && npm run eval:real-docs` を実行してください。

## テストカバレッジ

現在のユニットテストスイートでは次をカバーしています。

- プロバイダーモードの永続化（`claude-code`、`codex`、`both`）
- 優先言語の永続化と起動プロンプトでの言語強制
- リポジトリを意識した gc-branch 選択
- `resolve` 実行中の include / exclude の対話的な決定
- branch repo map の更新
- ガイド付きオンボーディング・更新フローの境界条件

## プロバイダーの手動 E2E チェック

自動テストでは、Codex や Claude Code のセッションを実際に開かなくても起動計画を検証できるよう、プロバイダー起動を無効化しています。
本物の起動パスを試したい場合は、使い捨てディレクトリで次のどちらかを実行してください。

```bash
gctree init --provider codex
gctree init --provider claude-code
```

正しく動けば、プロバイダーが起動し、すぐに `$gc-onboard` または `/gc-onboard` を受け取るはずです。

## プロジェクト構成

- `src/` — CLI、コンテキストストレージ、プロバイダー選択、repo-scope マッピング、ガイド付きオンボーディング・更新フロー、および scaffolding ロジック
- `tests/` — ユニットテストと eval スクリプト
- `skills/` — ツールに依存しないワークフロースキル（Claude Code が使用）
- `scaffolds/` — プレースホルダーディレクトリ。scaffold ファイルの内容は `src/scaffold.ts` でプログラム的に生成されます
- `docs/` — コンセプト・原則・使い方・開発ドキュメント
