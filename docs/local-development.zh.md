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

## repo-scope 测试

当前测试套件覆盖了以下内容：

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
- `tests/` — CLI 与行为测试
- `skills/` — 与工具无关的工作流技能
- `scaffolds/` — 面向不同 host 的引导模板
- `docs/` — 概念、原则、使用方式与开发文档
