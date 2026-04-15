# 概念

[English](concept.md) | [한국어](concept.ko.md) | [简体中文](concept.zh.md) | [日本語](concept.ja.md) | [Español](concept.es.md)

## Summary

`gctree` 是一个小而明确的全局上下文层，面向 AI 编码工具。它把长期上下文放在单一仓库之外的 markdown 文档中，可以按 gc-branch 切换、检索和维护，也可以限制某个 gc-branch 只在真正相关的仓库中生效。

## `gctree` 是什么

`gctree` 是一个用于管理可复用全局上下文的轻量 CLI。
它面向那些需要在多个仓库、多个会话和多种工具之间持续复用长期上下文的个人与团队。

与其把长期知识交给隐藏记忆，或者散落在多个提示文件中，`gctree` 更像是为这些知识提供了一个清晰、稳定、基于文件的归档位置。

## 它解决什么问题

很多 AI 编码工作流最初都从下面这些方式开始：

- 一个 `AGENTS.md`
- 一个 `CLAUDE.md`
- 仓库里的本地提示文件
- 一组临时复制到提示词里的笔记

一开始这样可以工作，但随着项目变复杂，往往会出现这些需求：

- 希望按产品或客户隔离上下文
- 希望把上下文放在单个仓库之外长期维护
- 希望多种工具复用同一套长期文档
- 希望用一致的方式快速找到正确的上下文
- 希望以更安全的方式持续更新长期上下文
- 同一个用户会同时在多个仓库和多个会话中并行工作

`gctree` 解决的正是这一层问题。

## 范围边界

`gctree` 有意不做以下事情：

- request-to-commit 交付编排器
- 隐式记忆系统
- 浏览器协作运行时
- 通用知识库产品

它专注于可复用的全局上下文分支，以及显式的更新流程。

## 文件结构

一个典型的 home 目录大致如下：

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

- `HEAD` 记录 fallback 的激活 gc-branch。
- `settings.json` 保存偏好的 provider。
- `branch-repo-map.json` 保存每个 gc-branch 的 include/exclude 仓库规则。
- `branch.json` 保存轻量级 gc-branch 元数据。
- `index.md` 是工具读取时的紧凑入口。
- `docs/` 存放 source-of-truth markdown 文档。

## 仓库范围行为

某个 gc-branch 不一定需要作用于所有仓库。
如果 branch `A` 只适用于 `B`、`C`、`D`，就可以把这个关系写进 `branch-repo-map.json`。

这样一来，当 `F` 仓库里运行 `gctree resolve` 时，可以选择：

- 这次先继续
- 以后这个仓库总是使用这个 gc-branch
- 在这个仓库里忽略这个 gc-branch

这让 `gctree` 更适合同时开很多会话、在多个不相关仓库里并行工作的 heavy 用户。
