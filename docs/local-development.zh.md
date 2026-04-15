# 本地运行方法

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## Summary

本地开发采用标准的 Node.js 20+ 工作流：安装依赖、构建 CLI、本地运行，并在提交前用现有测试套件进行验证。

## 前置条件

- Node.js 20+
- npm
- 如果想手动验证 provider 启动流程，需要本地可用的 `codex` 或 `claude` 二进制

## 设置

```bash
npm install
npm run build
```

## 在本地运行 CLI

### 方法 1：直接运行构建后的入口

```bash
node dist/src/cli.js status
```

### 方法 2：把 CLI 链接到你的 shell

```bash
npm link
gctree status
```

如果你修改了 TypeScript 源码，请在再次测试 CLI 之前重新构建。

## 验证

提交改动前请运行：

```bash
npm run build
npm test
```

## 仓库范围相关测试

目前测试套件会验证：

- 根据仓库自动选择 gc-branch
- `resolve` 过程中的 include/exclude 交互
- branch repo map 更新
- 引导式 onboarding/update 的边界条件

## 手动 provider E2E 验证

自动测试会关闭 provider launch，只验证 launch plan，而不会真的打开 Codex 或 Claude Code 会话。
如果你想亲自验证真实启动路径，可以在临时目录里运行：

```bash
gctree init --provider codex
gctree init --provider claude-code
```

正常情况下，provider 会真正启动，并立即收到 `$gc-onboard` 或 `/gc-onboard`。

## 项目结构

- `src/` — CLI、上下文存储、provider 选择、仓库范围映射、引导式 onboarding/update 流程、scaffolding 逻辑
- `tests/` — CLI 与行为测试
- `skills/` — 工具无关的工作流技能
- `scaffolds/` — 宿主特定的 bootstrap 模板
- `docs/` — concept、principles、usage 与 development 文档
