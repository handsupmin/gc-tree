# 原理

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## Summary

`gctree` 遵循一组简洁而明确的产品原则：上下文按 gc-branch 隔离、文档采用 summary-first 结构、索引保持精简，并且让每个 gc-branch 只在真正相关的仓库里生效。

## 1. 按 gc-branch 隔离上下文

一台机器可以同时保存多个全局上下文树，而且彼此不混淆。
因此 `gctree` 虽然使用 `checkout`、`checkout -b` 这样的 git 风格命令，但在用户界面里会明确把当前分支称为 **gc-branch**。

## 2. 显式管理仓库范围

某个 gc-branch 不应该悄悄影响整台机器上的所有仓库。
`gctree` 通过 `branch-repo-map.json` 记录一个仓库相对于某个 gc-branch 的状态：

- include
- exclude
- 尚未映射

当 `resolve` 在一个尚未映射的仓库里被调用时，用户可以选择是仅本次继续、以后总是使用，还是在这里忽略它。

## 3. 保持 `index.md` 精简

顶层 `index.md` 是索引，不是内容堆积区。
它的职责是把工具快速引导到正确的源文档，而不是把所有知识都内联复制进去。

## 4. 优先使用 summary-first 文档

每个 source-of-truth markdown 文档都应该在靠前位置包含 `## Summary`。
这样工具可以先读取简短版本，如果摘要已经足够，就不必再读取整篇文档。

## 5. 让 onboarding 明确且有引导

用户不应该为了创建可用的全局上下文而手写 onboarding JSON。
`gctree init` 和 `gctree onboard` 应该通过用户选择的 provider 与用户对话，并把结果写入当前 gc-branch。

onboarding 只适用于空的 gc-branch。
如果该 gc-branch 已经有内容，正确做法是：

- 重置该 gc-branch 后重新 onboarding
- 或者执行一次引导式长期更新

## 6. 让长期更新保持可控

长期上下文不应该因为隐式记忆或误操作而被改写。
更新流程应当是显式的、由 provider 驱动的，并且始终绑定到当前激活的 gc-branch。
