# 原则

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## 摘要

`gctree` 遵循几条很小但很明确的产品规则：上下文要有分支意识，source 文档要坚持 summary-first，index 要保持轻量，repo scope 要显式管理，这样每条 gc-branch 才只会影响它真正该影响的仓库。

## 1. 让上下文具备分支意识

一台机器上应该可以同时容纳多棵全局上下文树，而且彼此不混在一起。
这也是为什么 `gctree` 使用 `checkout`、`checkout -b` 这类类似 Git 的语言，同时在面向用户的表达里把当前分支称为 **gc-branch**。

## 2. 让 repo scope 保持显式

gc-branch 不应该悄悄影响机器上的每一个仓库。
`gctree` 用 `branch-repo-map.json` 来记录一个仓库对于某条 gc-branch 处于哪种状态：

- 被该 gc-branch 包含
- 被该 gc-branch 排除
- 还没有映射

如果从一个尚未映射的仓库里调用 `resolve`，用户可以决定是只继续这一次、以后都在这里使用该 gc-branch，还是在这里忽略它。

## 3. 让 `index.md` 保持轻量

顶层的 `index.md` 是索引，不是内容倾倒区。
它的职责是帮助工具和人快速找到正确的 source 文档。
所以它应该保持紧凑、以链接为主，而不是把完整知识大段复制进去。

## 4. 让 source 文档遵循 summary-first

每一份 source-of-truth markdown 文档，都应该在靠前的位置带上 `## Summary` 段落。
这样下游工具就有一条快速路径：先读短版本，只有确实需要更多细节时再继续展开。

## 5. 让 onboarding 明确且有引导

为了创建一棵有用的上下文树，用户不应该被迫手写 onboarding JSON。
`gctree init` 和 `gctree onboard` 应该围绕用户偏好的 provider 提供引导，并把结果写入当前激活的 gc-branch。

onboarding 只适用于空的 gc-branch。
如果某条 gc-branch 已经包含上下文，正确的路径只有两种：

- 重置这条 gc-branch，然后重新 onboarding
- 或者执行一次带引导的长期更新

## 6. 让长期更新保持有意图

长期上下文不应该因为意外或隐藏式记忆而发生变化。
更新流程必须是显式的、由 provider 驱动的，并且明确绑定到当前激活的 gc-branch 上。
