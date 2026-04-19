# 本地开发

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## 摘要

本地开发遵循一套标准的 Node.js 20+ 工作流：安装依赖、构建 CLI、在本地运行它，并且在提交修改前用现有测试套件完成验证。

## 前置条件

- Node.js 20+
- npm
- 如果你想手动体验 provider 启动流程，还需要本地的 `codex` 和 / 或 `claude` 可执行文件

## 设置

```bash
npm install
npm run build
```

## 在本地运行 CLI

### 方式 1：直接运行构建后的入口文件

```bash
node dist/src/cli.js status
```

### 方式 2：把 CLI 链接到你的 shell 中

```bash
npm link
gctree status
```

如果你改了 TypeScript 源码，在再次测试 CLI 之前记得重新 build 一次。

## 验证

在发起 PR 之前，请先运行：

```bash
npm run build
npm test
```

### 评估套件

除单元测试外，还有一套 eval 套件，用于衡量 resolve 在真实场景下的质量：

```bash
npm run eval                  # 5 场景综合测试（onboarding、resolve、token 效率、update、隔离性）
npm run eval:verbose          # 同上，输出每条用例的详情
npm run eval:multi-repo       # 跨仓库隔离测试，使用 cosmo 风格的 fixtures
npm run eval:real-docs        # 基于真实 Notion 导出文件的 recall 和 precision 测试（需要本地文档）
npm run eval:autoresearch     # 迭代式 resolve 改进循环（会直接修改 src/resolve.ts）
```

预期基线（运行 `npm run eval` 可验证）：

| 套件 | 目标 |
| --- | --- |
| 综合（5 场景） | 5/5 PASS，均值 ≥ 90% |
| 多仓库 | 整体 ≥ 80% |
| 真实文档 | Recall ≥ 90%，F1 ≥ 80% |

如果你修改了 `src/resolve.ts`，在发 PR 之前请运行 `npm test && npm run eval && npm run eval:real-docs`。

## 测试覆盖范围

当前单元测试套件覆盖了以下内容：

- provider 模式持久化（`claude-code`、`codex`、`both`）
- 偏好语言持久化，以及 launch prompt 中的强语言约束
- 面向仓库的 gc-branch 选择
- `resolve` 过程中的 include / exclude 交互
- branch repo map 更新
- 带引导的 onboarding / update 流程边界

## provider 手动 E2E 检查

自动化测试会禁用 provider 启动，这样它们就能在不真正打开 Codex 或 Claude Code 会话的情况下验证 launch plan。
如果你想亲自走一遍真实的启动路径，可以在一个临时目录里运行下面任意一个命令：

```bash
gctree init --provider codex
gctree init --provider claude-code
```

正常情况下，你会看到 provider 被拉起，并立刻收到 `$gc-onboard` 或 `/gc-onboard`。

## 项目结构

- `src/` — CLI、本地上下文存储、provider 选择、repo-scope 映射、带引导的 onboarding / update 流程，以及 scaffolding 逻辑
- `tests/` — 单元测试与 eval 脚本
- `skills/` — 与工具无关的工作流技能（供 Claude Code 使用）
- `scaffolds/` — 占位目录；scaffold 文件内容由 `src/scaffold.ts` 动态生成
- `docs/` — 概念、原则、使用方式与开发文档
