# gc-tree

面向 AI 编码工具的分支化全局上下文层。

[English](https://github.com/handsupmin/gc-tree/blob/main/README.md) | [한국어](https://github.com/handsupmin/gc-tree/blob/main/README.ko.md) | [简体中文](https://github.com/handsupmin/gc-tree/blob/main/README.zh.md) | [日本語](https://github.com/handsupmin/gc-tree/blob/main/README.ja.md) | [Español](https://github.com/handsupmin/gc-tree/blob/main/README.es.md)

## 介绍

`gctree` 是一个面向 AI 编码工具的轻量级 **Global Context Tree**。
它为长期上下文提供了一个可复用、基于文件、支持分支的明确归宿，而且可以自然接入现有工作流。

当单个 `AGENTS.md`、`CLAUDE.md` 或一段提示词已经不够时，`gctree` 可以帮助你：

- 按产品、客户或工作流隔离上下文
- 用 markdown 文档保存 source of truth，而不是依赖隐藏记忆
- 通过精简索引和 summary-first 文档更快定位当前上下文
- 通过偏好的 LLM CLI 完成 onboarding 与长期更新
- 让某个 gc-branch 只作用于真正相关的仓库

## 简要特性

- **Provider 驱动的 onboarding**
  `gctree init` 会先询问你想使用哪种 provider 模式（`claude-code`、`codex` 或 `both`），再询问响应语言，并保存这些选择，然后给当前环境安装对应的命令表面，并为默认 `main` gc-branch 启动引导式 onboarding。
- **带仓库范围的 gc-branch**
  你可以通过 `~/.gctree/branch-repo-map.json` 把某个 gc-branch 绑定到指定仓库集合，比如让 A 只作用于 B/C/D，而在 F 中忽略。
- **交互式范围保护**
  如果 `gctree resolve` 发现当前仓库还没有映射到这个 gc-branch，它可以询问是仅本次继续、以后总是使用，还是在这个仓库里忽略它。
- **Summary-first 文档结构**
  工具可以先读取简短摘要，只有在需要时才展开完整文档。
- **引导式长期更新**
  不需要手写 JSON 文件，也可以通过同样的 provider 流程更新全局上下文。

## 安装与快速开始

### 通过 npm 安装

```bash
npm install -g @handsupmin/gc-tree
```

如果你只想临时运行一次，也可以：

```bash
npx @handsupmin/gc-tree init
```

- **包名：** `@handsupmin/gc-tree`
- **CLI 命令：** `gctree`
- **要求：** Node.js 20+
如果要从源码开发，请查看 [docs/local-development.md](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.md)。

### 快速开始

#### 1) 初始化 gc-tree

```bash
gctree init
```

这个命令会：

- 创建 `~/.gctree`
- 创建默认 `main` gc-branch
- 让你选择 provider 模式（`claude-code`、`codex` 或 `both`）
- 如果你选择 `both`，再选择这次 onboarding 要由哪个 provider 启动
- 让你选择语言（`English`、`Korean`，或手动输入语言）
- 把 provider 模式、实际 onboarding provider 和语言保存到 `~/.gctree/settings.json`
- 为当前环境安装对应的命令表面
- 当 `main` 仍为空时，为当前 gc-branch 启动引导式 onboarding

#### 2) 解析当前上下文

```bash
gctree resolve --query "auth token rotation"
```

如果当前仓库不在这个 gc-branch 的映射范围内，`gctree` 可以让你选择：

1. 这次先继续
2. 以后这个仓库总是使用这个 gc-branch
3. 在这个仓库里忽略这个 gc-branch

如果选择 2 或 3，`~/.gctree/branch-repo-map.json` 会被更新。

#### 3) 需要独立上下文时创建新的 gc-branch

```bash
gctree checkout -b client-b
```

`checkout -b` 会创建一个**新的空 gc-branch**，不会复制已有分支里的文档。

#### 4) 为一个空的 gc-branch 执行 onboarding

```bash
gctree onboard
```

#### 5) 后续执行长期上下文更新

```bash
gctree update-global-context
```

简短别名：

```bash
gctree update-gc
gctree ugc
```

如果实际工作后发现某个仓库确实属于当前 gc-branch，更自然的流程是：

1. 先把这个仓库加入 branch repo map
2. 再用 `gctree update-global-context` 补充这个仓库是什么、为什么重要等长期上下文

#### 6) 重新 onboarding 前先重置 gc-branch

```bash
gctree reset-gc-branch --branch client-b --yes
```

### 运行时可见的 provider 命令

scaffold 之后，在运行时可见的命令是：

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

这些命令在开始收集或更新长期上下文之前，都应该先明确说明当前激活的是哪个 gc-branch，并且除非用户明确要求切换，否则要始终使用保存下来的语言。

### 核心命令速览

| 目标 | 命令 |
| --- | --- |
| 初始化 gc-tree 并选择 provider | `gctree init` |
| 确认当前 gc-branch | `gctree status` |
| 搜索当前上下文 | `gctree resolve --query "..."` |
| 查看仓库范围规则 | `gctree repo-map` |
| 为 gc-branch 显式设置仓库包含/排除 | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| 创建或切换 gc-branch | `gctree checkout <branch>` / `gctree checkout -b <branch>` |
| 为一个空的 gc-branch 执行 onboarding | `gctree onboard` |
| 为当前 gc-branch 执行长期更新 | `gctree update-global-context` / `gctree update-gc` / `gctree ugc` |
| 重新 onboarding 前重置 gc-branch | `gctree reset-gc-branch --branch <name> --yes` |
| 手动为其他环境安装 scaffold | `gctree scaffold --host codex --target /path/to/repo` |

## 文档

详细文档位于 [`docs/`](https://github.com/handsupmin/gc-tree/tree/main/docs) 目录下。

- **概念** — [`docs/concept.zh.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.zh.md)
  说明 `gctree` 是什么、解决什么问题，以及全局上下文层的边界。
- **原理** — [`docs/principles.zh.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.zh.md)
  介绍 gc-branch、仓库范围、summary-first 文档和引导式更新等原则。
- **使用方法** — [`docs/usage.zh.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.zh.md)
  介绍标准 CLI 流程、provider 命令、仓库范围行为和集成方式。
- **本地运行方法** — [`docs/local-development.zh.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.zh.md)
  说明依赖安装、本地运行 CLI 与提交前验证方式。

## 贡献

欢迎贡献。开发流程与 PR 检查清单位于英文文档 [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md)。

## 许可证

MIT。详见 [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)。
