# 使用指南

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## 概述

标准的 `gctree` 工作流如下：初始化 gc-tree、选择提供商、对默认的 `main` gc-branch 执行 onboard、解析所需上下文、在工作需要独立空间时创建新的 gc-branch、将代码仓库映射到正确的 gc-branch，以及在后续使用有引导的更新流程进行持久化变更。

## 标准工作流

1. 运行 `gctree init`
2. 选择首选的提供商模式（`claude-code`、`codex` 或 `both`）
3. 选择工作流语言（`English`、`Korean` 或自定义语言）
4. 如果选择了 `both`，选择哪个提供商现在开始 onboarding
5. 对默认的 `main` gc-branch 完成有引导的 onboarding
6. 使用 `gctree resolve --query "..."` 解析相关上下文
7. 使用 `gctree checkout` 创建或切换 gc-branch
8. 仅对空的 gc-branch 运行 `gctree onboard`
9. 使用仓库作用范围映射，使 gc-branch 只在其适用的地方生效
10. 使用 `gctree update-global-context` 进行后续的持久化变更

## 核心命令

| 命令 | 用途 |
| --- | --- |
| `gctree init` | 创建 `~/.gctree`，创建默认的 `main` gc-branch，保存提供商模式、onboarding 提供商及首选语言，scaffold 当前环境，并在 `main` 为空时启动有引导的 onboarding。 |
| `gctree checkout <branch>` | 切换活跃的 gc-branch。 |
| `gctree checkout -b <branch>` | 创建并切换到一个新的空 gc-branch。 |
| `gctree branches` | 列出可用的 gc-branch 并显示当前活跃的那个。 |
| `gctree status` | 显示活跃的 gc-branch、当前仓库、当前仓库的作用范围状态、警告信息及首选提供商。 |
| `gctree resolve --query TEXT` | 在相关的 gc-branch 中搜索上下文。如果当前仓库尚未映射，`gctree` 会询问该如何处理这个仓库。 |
| `gctree repo-map` | 显示 `branch-repo-map.json` 的当前内容。 |
| `gctree set-repo-scope --branch <name> --include` | 将当前仓库标记为该 gc-branch 的包含仓库。 |
| `gctree set-repo-scope --branch <name> --exclude` | 将当前仓库标记为该 gc-branch 的忽略仓库。 |
| `gctree onboard` | 为活跃的 gc-branch 启动有引导的 onboarding。仅当该 gc-branch 为空时有效。 |
| `gctree reset-gc-branch --branch <name> --yes` | 清空一个 gc-branch，使其可以重新 onboard。 |
| `gctree update-global-context` | 为活跃的 gc-branch 启动有引导的持久化更新。 |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context` 的别名。 |
| `gctree scaffold --host <codex\|claude-code>` | 在另一个环境中安装面向提供商的命令接口。 |

## resolve 返回的内容

`gctree resolve` 对活跃 gc-branch 中的每个文档与查询内容进行评分，只返回匹配的文档。标题匹配的权重是正文匹配的两倍。

```bash
gctree resolve --query "auth token rotation policy"
```

```json
{
  "gc_branch": "main",
  "query": "auth token rotation policy",
  "matches": [
    {
      "title": "Auth & Session Conventions",
      "path": "docs/auth.md",
      "score": 4,
      "summary": "JWT rotation on every request, refresh tokens in httpOnly cookies, 15-min access token TTL",
      "excerpt": "## Auth Flow\nAccess token: 15-min TTL, rotated on every authenticated request..."
    }
  ]
}
```

工具首先接收摘要和摘录。只有在摘要不足以满足需求时，才会读取 `path` 指向的完整文档。如果查询没有任何匹配，则返回 `"matches": []`。

## 仓库作用范围示例流程

假设 gc-branch `A` 与代码仓库 `B`、`C` 和 `D` 相关，但与 `F` 无关。

可以通过以下方式管理：

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

存储在：

```text
~/.gctree/branch-repo-map.json
```

当 `resolve` 在代码仓库 `E` 中运行，而分支 `A` 尚未在 `E` 中映射时，`gctree` 会询问：

1. 继续一次
2. 始终在 `E` 中使用 `A`
3. 在 `E` 中忽略 `A`

## 首次运行示例流程

```bash
gctree init
```

然后：

1. 选择 `codex` 或 `claude-code`
2. 让 `gctree` scaffold 当前环境
3. 对 `main` gc-branch 完成有引导的 onboarding

## 多分支示例流程

```bash
gctree checkout -b client-b
gctree onboard
gctree resolve --query "billing retry policy"
```

## 更新示例流程

```bash
gctree update-global-context
```

简短别名：

```bash
gctree update-gc
gctree ugc
```

如果一个新相关的代码仓库也需要成为持久化上下文的一部分，自然的流程是：

1. 将该仓库映射到 gc-branch
2. 然后运行 `update-global-context`，添加关于该仓库用途及重要性的持久化知识

## 集成模式

### Codex CLI / Claude Code CLI

`gctree scaffold` 将面向提供商的命令文件安装到目标目录中。

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
gctree scaffold --host both --target /path/to/repo
```

**`--host codex` 写入的文件：**

```
AGENTS.md                                  ← gctree 代码片段追加到 agent 指令中
.codex/prompts/gctree-bootstrap.md         ← Codex 会话的引导上下文
.codex/skills/gc-resolve-context/SKILL.md  ← resolve 技能
.codex/skills/gc-onboard/SKILL.md          ← onboarding 技能
.codex/skills/gc-update-global-context/SKILL.md  ← 更新技能
```

**`--host claude-code` 写入的文件：**

```
CLAUDE.md                                        ← gctree 代码片段追加
.claude/hooks/gctree-session-start.md            ← 会话启动钩子
.claude/commands/gc-resolve-context.md           ← resolve 斜杠命令
.claude/commands/gc-onboard.md                   ← onboard 斜杠命令
.claude/commands/gc-update-global-context.md     ← 更新斜杠命令
```

除非传入 `--force`，否则已有文件不会被修改。

### 运行时行为

活跃的 gc-branch 由 `~/.gctree` 内的 `HEAD` 指向，但当一个代码仓库被显式绑定到另一个 gc-branch 时，仓库映射可以覆盖这一后备设置。
这使得 gc-tree 对于同时保持大量无关会话的重度用户而言非常实用。
