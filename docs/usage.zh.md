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
7. 使用 `gctree related --id <match-id>` 查看 supporting docs
8. 仅在需要时使用 `gctree show-doc --id <match-id>` 读取完整文档
9. 使用 `gctree checkout` 创建或切换 gc-branch
10. 仅对空的 gc-branch 运行 `gctree onboard`
11. 使用仓库作用范围映射，使 gc-branch 只在其适用的地方生效
12. 使用 `gctree update-global-context` 进行后续的持久化变更

## 核心命令

| 命令 | 用途 |
| --- | --- |
| `gctree init` | 创建 `~/.gctree`，创建默认的 `main` gc-branch，保存提供商模式、onboarding 提供商及首选语言，安装全局 provider hook/command/skill，并在 `main` 为空时启动有引导的 onboarding。 |
| `gctree checkout <branch>` | 切换活跃的 gc-branch。 |
| `gctree checkout -b <branch>` | 创建并切换到一个新的空 gc-branch。 |
| `gctree branches` | 列出可用的 gc-branch 并显示当前活跃的那个。 |
| `gctree status` | 显示活跃的 gc-branch、当前仓库、当前仓库的作用范围状态、警告信息及首选提供商。 |
| `gctree resolve --query TEXT` | 返回查询的紧凑索引层。匹配项包含稳定 ID 和后续深入查看的命令。 |
| `gctree related --id <match-id>` | 返回某个 resolved 匹配周围的 supporting docs，而不立即展开完整 markdown。 |
| `gctree show-doc --id <match-id>` | 返回某个稳定匹配 ID 对应的完整 markdown source-of-truth 文档。 |
| `gctree repo-map` | 显示 `branch-repo-map.json` 的当前内容。 |
| `gctree set-repo-scope --branch <name> --include` | 将当前仓库标记为该 gc-branch 的包含仓库。 |
| `gctree set-repo-scope --branch <name> --exclude` | 将当前仓库标记为该 gc-branch 的忽略仓库。 |
| `gctree onboard` | 为活跃的 gc-branch 启动有引导的 onboarding。仅当该 gc-branch 为空时有效。 |
| `gctree reset-gc-branch --branch <name> --yes` | 清空一个 gc-branch，使其可以重新 onboard。 |
| `gctree update-global-context` | 为活跃的 gc-branch 启动有引导的持久化更新。 |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context` 的别名。 |
| `gctree scaffold --host <codex\|claude-code>` | 在单个仓库或工作区中安装本地 provider override。 |
| `gctree uninstall --yes` | 删除 `~/.gctree` 和全局 gctree 激活。 |

## resolve 返回的内容

`gctree resolve` 是 progressive-disclosure 工作流中的**紧凑索引层**。它对活跃 gc-branch 中的每个文档与查询内容进行评分，只返回带稳定 ID 的匹配文档。标题匹配的权重是正文匹配的两倍。

```bash
gctree resolve --query "auth token rotation policy"
```

```json
{
  "gc_branch": "main",
  "query": "auth token rotation policy",
  "status": "matched",
  "matches": [
    {
      "id": "auth",
      "title": "Auth & Session Conventions",
      "path": "docs/auth.md",
      "score": 4,
      "summary": "JWT rotation on every request, refresh tokens in httpOnly cookies, 15-min access token TTL",
      "excerpt": "## Auth Flow\nAccess token: 15-min TTL, rotated on every authenticated request...",
      "commands": {
        "show_doc": "gctree show-doc --id \"auth\" --home \"~/.gctree\" --branch \"main\"",
        "related": "gctree related --id \"auth\" --home \"~/.gctree\" --branch \"main\""
      }
    }
  ]
}
```

推荐的流程是：

1. `resolve` → 紧凑索引
2. `related` → 某个匹配周围的 supporting docs
3. `show-doc` → 仅在需要时读取完整 markdown

Graceful degradation 也是显式的：

- 空 gc-branch → `status: "empty_branch"`
- 被排除的 repo → `status: "excluded"`
- 无匹配结果 → `status: "no_match"`
- 文档 ID 不存在 → `status: "doc_not_found"`

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
2. 让 `gctree` 为该 provider 安装全局激活
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

`gctree init` 会安装全局 provider hook 表面。`gctree scaffold` 则在某个仓库需要自己的 markdown 片段或本地命令表面时，将本地 override 安装到目标目录中。

UserPromptSubmit hook 只注入紧凑的 pre-task context：found/no-match 状态以及匹配文档的标题/ID。默认不内联摘要或长 excerpt；需要时用 `gctree resolve --id <id>` 打开完整文档。

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
gctree scaffold --host both --target /path/to/repo
```

**Codex 全局文件（`gctree init`）：**

```
~/.codex/hooks.json                              ← SessionStart / UserPromptSubmit 自动 resolve hook
~/.codex/prompts/gctree-bootstrap.md            ← Codex 会话引导上下文
~/.codex/skills/gc-resolve-context/SKILL.md     ← resolve 技能
~/.codex/skills/gc-onboard/SKILL.md             ← onboarding 技能
~/.codex/skills/gc-update-global-context/SKILL.md  ← 更新技能
```

**`gctree scaffold --host codex` 的本地 override 文件：**

```
AGENTS.md                                  ← gctree 代码片段追加到 agent 指令中
.codex/hooks.json                         ← SessionStart / UserPromptSubmit 自动 resolve hook
.codex/prompts/gctree-bootstrap.md         ← Codex 会话的引导上下文
.codex/skills/gc-resolve-context/SKILL.md  ← resolve 技能
.codex/skills/gc-onboard/SKILL.md          ← onboarding 技能
.codex/skills/gc-update-global-context/SKILL.md  ← 更新技能
```

**Claude Code 全局文件（`gctree init`）：**

```
~/.claude/hooks/hooks.json                         ← SessionStart / UserPromptSubmit 自动 resolve hook
~/.claude/hooks/gctree-session-start.md            ← 会话启动 fallback 说明
~/.claude/commands/gc-resolve-context.md           ← resolve 斜杠命令
~/.claude/commands/gc-onboard.md                   ← onboard 斜杠命令
~/.claude/commands/gc-update-global-context.md     ← 更新斜杠命令
```

**`gctree scaffold --host claude-code` 的本地 override 文件：**

```
CLAUDE.md                                        ← gctree 代码片段追加
.claude/hooks/hooks.json                         ← SessionStart / UserPromptSubmit 自动 resolve hook
.claude/hooks/gctree-session-start.md            ← 会话启动 fallback 说明
.claude/commands/gc-resolve-context.md           ← resolve 斜杠命令
.claude/commands/gc-onboard.md                   ← onboard 斜杠命令
.claude/commands/gc-update-global-context.md     ← 更新斜杠命令
```

除非传入 `--force`，否则已有本地文件不会被修改。

### 运行时行为

活跃的 gc-branch 由 `~/.gctree` 内的 `HEAD` 指向，但当一个代码仓库被显式绑定到另一个 gc-branch 时，仓库映射可以覆盖这一后备设置。
这使得 gc-tree 对于同时保持大量无关会话的重度用户而言非常实用。
