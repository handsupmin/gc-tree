# gc-tree

<div align="center">

<img src="./logo.png" alt="gc-tree logo" width="260" />

### 不止于项目内部的全局上下文。

在你现有的 AI 工具之上，再加一层可复用、能长期积累的上下文。
像管理 Git 分支一样管理多条上下文线索。

[![npm version](https://img.shields.io/npm/v/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![npm downloads](https://img.shields.io/npm/dm/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![GitHub stars](https://img.shields.io/github/stars/handsupmin/gc-tree)](https://github.com/handsupmin/gc-tree/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](https://github.com/handsupmin/gc-tree/blob/main/README.md) | [한국어](https://github.com/handsupmin/gc-tree/blob/main/README.ko.md) | [简体中文](https://github.com/handsupmin/gc-tree/blob/main/README.zh.md) | [日本語](https://github.com/handsupmin/gc-tree/blob/main/README.ja.md) | [Español](https://github.com/handsupmin/gc-tree/blob/main/README.es.md)

</div>

这是为那些日常工作横跨多个仓库、产品、客户和工作流的开发者准备的。

`gc-tree` 给 AI 编码工具补上了一层 **仓库之上的可复用上下文层**。该长期保留的上下文可以留下来，只在相关仓库里生效，不相关的时候就安静退场。

---

## 为什么是 gc-tree？

只要你开始认真把 AI 代理用进日常开发，repo-local context 很快就不够用了。

一旦工作同时分布在多个仓库和多个工作流上，常见问题就会一起出现：

- 长期上下文被不断塞进提示词里
- 不相关的上下文泄漏到别的仓库
- 每开一个新会话都要重新讲一遍背景
- 客户或产品知识只藏在聊天记录里
- 每次切换工作流，都得靠人脑手动切换上下文

`gc-tree` 是给那些已经深度使用 Codex、Claude Code 等 AI 编码工具、但不想再手动维护上下文的人准备的。

---

## 它能直接带来什么

- **多条可长期维护的上下文**
  你可以按产品、客户或工作流，分别维护自己的上下文线。

- **按仓库控制相关性**
  可以明确指定某条上下文只该作用于哪些仓库。

- **更聪明的范围保护**
  当你进入一个尚未映射的仓库时，可以选择只继续这一次、以后都在这里启用，或者在这里忽略它。

- **带引导的 onboarding 与更新**
  可以用 Codex、Claude Code，或者两者一起，把上下文建立起来并持续维护。

- **summary-first 的 markdown 知识结构**
  知识留在文件里，而不是藏在隐式记忆里；工具可以先读摘要，再决定要不要展开全文。

---

## 安装与快速开始

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

这样就可以开工了。
之后照你原来的开发方式继续就行，`gc-tree` 只是把一层可复用的全局上下文加在你现有流程外面。

- **CLI 命令：** `gctree`
- **要求：** Node.js 20+

如果你想从源码开发，请看 [docs/local-development.zh.md](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.zh.md)。

---

## 常用操作

### 当一个工作流值得拥有自己的上下文时，先开一条新分支

```bash
gctree checkout -b client-b
gctree onboard
```

不管是客户项目、产品线、迁移工作，还是某个阶段性的专项，只要值得单独维护背景，就给它单开一个 gc-branch。

### 之后再把长期上下文补进去

```bash
gctree update-global-context
```

随着工作推进，把真正值得长期保留的信息补到当前激活的 gc-branch 里。

简短别名：

```bash
gctree update-gc
gctree ugc
```

### 需要的时候再把上下文取出来

```bash
gctree resolve --query "auth token rotation"
```

等你真的需要某段背景时，再把它拉回当前时刻。

---

## 为什么它用起来很顺手

**你可以像管理 Git 分支一样保留多条上下文，但不用像管理 Git 分支那样时时盯着。**

你可以把上下文拆成这些维度：

- 客户
- 产品线
- 平台团队
- 一起演进的后端 + 前端技术栈
- 临时专项或迁移项目

切换方式也很熟悉：

```bash
gctree checkout -b client-b
gctree checkout main
```

但和 Git 不一样的是，这种切换不需要你一直手动维护。

如果你当前所在的仓库根本不在这条上下文的作用范围内，`gc-tree` 可以把它判断为“此处无关”，而不是硬塞进当前会话里。

这样一来，你可以长期保留多条上下文，却不用把所有背景都拖进每一次工具会话里。

---

## 一个更贴近现实的工作流

假设你平时同时在这些地方工作：

- 一个共享平台仓库
- 两个客户项目仓库
- 一个内部工具仓库

没有 `gc-tree` 的话，每次开新的 AI 会话都得重新交代：

- 现在讨论的是哪个客户
- 哪些仓库其实是一组
- 当前最重要的工作流是什么
- 哪些上下文放进来反而会干扰

有了 `gc-tree`，你就可以按工作线维护不同上下文，在会话之间复用，并用 repo scope 规则挡住那些不该混进来的背景。

它真正解决的不是“多存一点提示词”，而是：

> **在对的工作层级上，管理对的上下文。**

---

## 核心概念

- **gc-branch**
  面向某个产品、客户、工作流或领域的一条长期上下文线。

- **repo scope**
  决定这条上下文应该在哪些仓库里生效的规则。

- **provider-guided flow**
  不手写 JSON，而是借助你熟悉的 AI 编码工具完成 onboarding 和更新。

- **context tree**
  在实现上，`gc-tree` 把上下文组织成一棵按分支感知、由文件承载的知识树。
  对用户来说，核心价值就是：项目之外也能复用的上下文。

---

## 运行时里可见的 provider 命令

scaffold 完成后，运行时可见的命令是：

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

这些命令在开始收集或更新长期上下文之前，都应该先说明当前激活的是哪个 gc-branch，并且除非用户明确要求切换，否则应持续使用已经保存的语言。

---

## 核心命令速览

| 目标 | 命令 |
| --- | --- |
| 初始化 gc-tree 并选择 provider | `gctree init` |
| 确认当前 gc-branch | `gctree status` |
| 搜索当前激活的上下文 | `gctree resolve --query "..."` |
| 查看仓库范围规则 | `gctree repo-map` |
| 为 gc-branch 显式设置仓库包含 / 排除 | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| 创建或切换 gc-branch | `gctree checkout <branch>` / `gctree checkout -b <branch>` |
| 为一个空的 gc-branch 执行 onboarding | `gctree onboard` |
| 为当前 gc-branch 执行长期更新 | `gctree update-global-context` / `gctree update-gc` / `gctree ugc` |
| 重新 onboarding 前重置 gc-branch | `gctree reset-gc-branch --branch <name> --yes` |
| 手动为其他环境安装 scaffold | `gctree scaffold --host codex --target /path/to/repo` |

---

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

---

## 贡献

欢迎贡献。开发流程与 PR 检查清单位于英文文档 [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md)。

---

## 许可证

MIT。详见 [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)。
