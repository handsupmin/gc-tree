# 使用方法

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## 摘要

标准的 `gctree` 工作流大致是这样的：先初始化 gc-tree，选择 provider，为默认的 `main` gc-branch 完成 onboarding，用 resolve 拉取当前需要的上下文，在需要的时候创建新的 gc-branch，把仓库映射到正确的 gc-branch，后续再通过带引导的更新来维护长期上下文。

## 标准工作流

1. 运行 `gctree init`
2. 选择你偏好的 provider 模式（`claude-code`、`codex` 或 `both`）
3. 选择工作流语言（`English`、`Korean` 或自定义语言）
4. 如果你选择了 `both`，再决定这次 onboarding 由哪个 provider 先启动
5. 完成默认 `main` gc-branch 的引导式 onboarding
6. 用 `gctree resolve --query "..."` 拉取相关上下文
7. 用 `gctree checkout` 创建或切换 gc-branch
8. `gctree onboard` 只用于空的 gc-branch
9. 通过 repo scope 映射，让 gc-branch 只在它该生效的仓库里生效
10. 之后的长期变化用 `gctree update-global-context` 来补充

## 核心命令

| 命令 | 用途 |
| --- | --- |
| `gctree init` | 创建 `~/.gctree`，创建默认 `main` gc-branch，保存 provider 模式 / onboarding provider / 偏好语言，为当前环境安装 scaffold，并在 `main` 为空时启动引导式 onboarding。 |
| `gctree checkout <branch>` | 切换当前激活的 gc-branch。 |
| `gctree checkout -b <branch>` | 创建一个新的空 gc-branch 并立即切换过去。 |
| `gctree branches` | 列出可用的 gc-branch，并标出当前激活的是哪一个。 |
| `gctree status` | 显示当前 gc-branch、当前仓库、当前 repo-scope 状态、告警以及偏好的 provider。 |
| `gctree resolve --query TEXT` | 从相关 gc-branch 中搜索上下文。如果当前仓库还没有映射，`gctree` 可能会询问应该如何处理这个仓库。 |
| `gctree repo-map` | 显示当前 `branch-repo-map.json` 的内容。 |
| `gctree set-repo-scope --branch <name> --include` | 把当前仓库标记为该 gc-branch 的包含仓库。 |
| `gctree set-repo-scope --branch <name> --exclude` | 把当前仓库标记为该 gc-branch 下应忽略的仓库。 |
| `gctree onboard` | 为当前激活的 gc-branch 启动引导式 onboarding。只有在该 gc-branch 为空时才可用。 |
| `gctree reset-gc-branch --branch <name> --yes` | 清空某条 gc-branch，让它可以重新 onboarding。 |
| `gctree update-global-context` | 为当前激活的 gc-branch 启动一次带引导的长期更新。 |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context` 的简短别名。 |
| `gctree scaffold --host <codex|claude-code>` | 在其他环境里安装 provider 对应的命令表面。 |

## repo scope 示例流程

假设 gc-branch `A` 与仓库 `B`、`C`、`D` 相关，但与 `F` 无关。

你可以这样管理：

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

这份配置保存在：

```text
~/.gctree/branch-repo-map.json
```

当你在仓库 `E` 中执行 `resolve`，而 branch `A` 还没有映射到这里时，`gctree` 可以询问你是否要：

1. 只这一次继续
2. 以后在 `E` 中始终使用 `A`
3. 在 `E` 中忽略 `A`

## 首次运行示例

```bash
gctree init
```

然后：

1. 选择 `codex` 或 `claude-code`
2. 让 `gctree` 为当前环境安装 scaffold
3. 完成 `main` gc-branch 的引导式 onboarding

## 多分支示例

```bash
gctree checkout -b client-b
gctree onboard
gctree resolve --query "billing retry policy"
```

## 更新示例

```bash
gctree update-global-context
```

简短别名：

```bash
gctree update-gc
gctree ugc
```

如果某个新变得重要的仓库也应该进入长期上下文，更自然的流程是：

1. 先把这个仓库映射到对应的 gc-branch
2. 再执行 `update-global-context`，补充这个仓库做什么、为什么重要等长期知识

## 集成模式

### Codex CLI / Claude Code CLI

`gctree scaffold` 会安装面向 provider 的命令表面，比如引导式 onboarding 和引导式更新。
这些命令在开始收集或应用长期上下文之前，都应该明确说明当前激活的是哪条 gc-branch，并且除非用户明确要求切换，否则应继续使用已经保存的工作流语言。

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

### 运行时行为

默认情况下，激活的 gc-branch 是 `~/.gctree` 中 `HEAD` 指向的那一条。但如果某个仓库被显式绑定到了另一条 gc-branch，repo mapping 就可以覆盖这个默认值。
这使得 gc-tree 对那些同时在许多互不相关仓库里开很多会话的重度用户来说也依然实用。
