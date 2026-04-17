# 概念

[English](concept.md) | [한국어](concept.ko.md) | [简体中文](concept.zh.md) | [日本語](concept.ja.md) | [Español](concept.es.md)

## 摘要

`gctree` 是一层面向 AI 编码工具的轻量级全局上下文层。它把长期上下文放在单个仓库之外、以显式 markdown 文档的形式保存，让你可以在不同 gc-branch 之间切换，并且把每条 gc-branch 的影响范围限制在真正相关的仓库里。

## `gctree` 是什么

`gctree` 是一个用来管理可复用全局上下文的 CLI。
它面向的是这样一种需求：长期上下文需要在多个仓库、多个会话、多个工具之间持续存在，但又不能变成一个看不见、摸不着的“隐式记忆黑盒”。

与其把重要知识分散在提示词文件、仓库内笔记和临时指令里，不如让 `gctree` 给这些知识一个稳定、可追踪、由文件承载的家。

## 它解决什么问题

很多 AI 编码环境一开始都很简单：

- 一个 `AGENTS.md`
- 一个 `CLAUDE.md`
- 一个仓库内提示词文件
- 几段需要时再复制进提示词里的笔记

一开始这样完全够用。但一旦进入真实工作场景，这套做法很快就会吃力。

- 不同产品需要不同的上下文
- 客户项目之间必须隔离
- 可复用的指导信息应该放在单个仓库之外
- 多个工具应该能读取同一份 source of truth
- 长期上下文应该通过安全、可审阅的流程来演进
- 同一个人可能同时在多个仓库里跑很多个会话

`gctree` 存在的目的，就是把这一层问题单独而清晰地解决掉。

## 边界在哪里

`gctree` 有意不去做下面这些事：

- 从需求一路编排到 commit 的交付系统
- 隐藏式记忆系统
- 浏览器协作运行时
- 通用知识库产品

它只专注一件事：管理可复用的全局上下文分支，以及这些分支上的显式更新。

## 文件模型

一个典型的主目录结构大致如下：

```text
~/.gctree/
  HEAD
  settings.json
  branch-repo-map.json
  branches/
    main/
      branch.json
      index.md
      docs/
```

- `HEAD` 记录默认激活的 gc-branch。
- `settings.json` 保存 provider 模式、运行时启动时选用的 onboarding provider，以及偏好的工作流语言。
- `branch-repo-map.json` 保存每条 gc-branch 对哪些仓库包含或排除。
- `branch.json` 保存轻量级的 gc-branch 元数据。
- `index.md` 是工具首先进入的紧凑入口。
- `docs/` 用来保存 source-of-truth markdown 文档。

## 面向仓库的行为

gc-branch 不需要在所有地方都生效。
如果 branch `A` 只和仓库 `B`、`C`、`D` 有关，`gctree` 就可以把这件事记录到 `branch-repo-map.json` 里。

这样一来，当你在另一个仓库 `F` 里执行 `gctree resolve` 时，它可以这样处理：

- 只这一次继续
- 以后在 `F` 里始终使用这条 gc-branch
- 在 `F` 里忽略这条 gc-branch

对于那些同时在多个互不相关仓库里开很多并行会话的重度用户来说，这会让 gc-tree 安全得多，也更实用。
