# 设计原则

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## 概述

`gctree` 遵循一套简明的产品准则：保持上下文的分支感知、让源文档以摘要为先、保持索引精简、明确仓库作用范围、只注入相关内容，并支持任何能够运行 shell 命令的提供商。

## 1. 保持上下文的分支感知

一台机器应该能够同时持有多个全局上下文树，且互不混淆。
这就是为什么 `gctree` 使用 `checkout` 和 `checkout -b` 这样类似 git 的语言，同时在面向用户的文案中将活跃分支称为 **gc-branch**。

## 2. 明确仓库作用范围

gc-branch 不应该悄无声息地影响机器上的每一个代码仓库。
`gctree` 使用 `branch-repo-map.json` 来记录某个代码仓库的状态：

- 已包含在某个 gc-branch 中
- 已从某个 gc-branch 中排除
- 尚未映射

如果从未映射的代码仓库调用 `resolve`，用户可以决定是继续一次、始终在该仓库使用此 gc-branch，还是在该仓库忽略它。

## 3. 保持 `index.md` 精简

顶层 `index.md` 是索引，而非内容转储。
它的职责是帮助工具和人员快速找到正确的源文档。
它应保持在 **2000 字符**以内，以链接为主，而不是将完整知识内联复制进来。

## 4. 让源文档以摘要为先

每个作为可信来源的 Markdown 文档都应在靠近顶部的位置包含一个 `## Summary` 部分。
这为下游工具提供了一条快速路径：先读取简短版本，只有在真正需要更多细节时才展开阅读。

## 5. 让 onboarding 明确且有引导

用户不应该仅仅为了创建一个有用的上下文树而手动编写 onboarding JSON。
`gctree init` 和 `gctree onboard` 应该引导用户选择首选的提供商，为该提供商启用全局激活，并将生成的上下文写入活跃的 gc-branch。

Onboarding 仅适用于空的 gc-branch。
如果一个 gc-branch 已经包含上下文，正确的做法是：

- 重置该 gc-branch 并重新 onboard
- 或者执行一次有引导的持久化更新

## 6. 让持久化更新保持刻意为之

持久化上下文不应该因意外或隐藏记忆而发生变更。
更新流程应该是显式的、由提供商驱动的，并与当前活跃的 gc-branch 绑定。

## 7. 只注入相关内容

工具会话不应收到整个知识库。
`gctree resolve` 对文档与查询进行评分，只返回匹配的文档——包含标题、摘要和摘录。只有在摘要不足时才读取完整文档。

实际上，每次查询注入的上下文约占总存储量的 4%。其余 96% 保留在磁盘上，不进入 token 窗口，直到真正需要时才读取。

## 8. 保持提供商无关性

`gctree` 将上下文存储在任何工具都能读取的纯 Markdown 文件中。
Claude Code 和 Codex 使用同一个底层存储。`gctree init` 安装全局 provider hook 表面，`gctree scaffold` 则是针对单个仓库或工作区的本地 override 路径。
添加对新提供商的支持，意味着编写一个新的 scaffold 模板——无需对核心存储或 resolve 逻辑做任何修改。
