# 使用方法

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## Summary

标准的 `gctree` 使用流程是：初始化 gc-tree、选择 provider、完成默认 `main` gc-branch 的 onboarding、在需要时创建新的 gc-branch、把仓库映射到正确的 gc-branch，并把后续长期变更交给引导式更新流程。

## 标准流程

1. 运行 `gctree init`
2. 选择偏好的 provider 模式（`claude-code`、`codex` 或 `both`）
3. 选择工作流语言（`English`、`Korean`，或手动输入语言）
4. 如果选择了 `both`，再选择这次 onboarding 要由哪个 provider 启动
5. 完成默认 `main` gc-branch 的引导式 onboarding
6. 用 `gctree resolve --query "..."` 解析相关上下文
7. 用 `gctree checkout` 创建或切换 gc-branch
8. 只有在 gc-branch 为空时才运行 `gctree onboard`
9. 通过仓库范围映射，让 gc-branch 只作用于真正相关的仓库
10. 后续长期变更使用 `gctree update-global-context`

## 核心命令

| 命令 | 说明 |
| --- | --- |
| `gctree init` | 创建 `~/.gctree` 和默认 `main` gc-branch，保存 provider 模式、实际 onboarding provider 和首选语言，给当前环境安装命令表面，并在 `main` 为空时启动引导式 onboarding。 |
| `gctree checkout <branch>` | 切换当前激活的 gc-branch。 |
| `gctree checkout -b <branch>` | 创建新的空 gc-branch 并切换过去。 |
| `gctree branches` | 列出可用 gc-branches 并显示当前 gc-branch。 |
| `gctree status` | 显示当前 gc-branch、当前仓库、当前仓库的 scope 状态、警告和偏好 provider。 |
| `gctree resolve --query TEXT` | 在相关 gc-branch 中搜索上下文。如果当前仓库还没映射，可以交互式决定如何处理。 |
| `gctree repo-map` | 显示 `branch-repo-map.json` 的当前内容。 |
| `gctree set-repo-scope --branch <name> --include` | 把当前仓库加入该 gc-branch 的 include。 |
| `gctree set-repo-scope --branch <name> --exclude` | 把当前仓库加入该 gc-branch 的 exclude。 |
| `gctree onboard` | 为当前 gc-branch 启动引导式 onboarding。只有该 gc-branch 为空时才可使用。 |
| `gctree reset-gc-branch --branch <name> --yes` | 清空一个 gc-branch，使其可以重新 onboarding。 |
| `gctree update-global-context` | 为当前 gc-branch 启动引导式长期更新。 |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context` 的别名。 |
| `gctree scaffold --host <codex|claude-code>` | 在其他环境中安装 provider 侧的命令表面。 |

## 仓库范围示例

例如 gc-branch `A` 只适用于 `B`、`C`、`D`，而不适用于 `F`，可以这样管理：

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

保存位置：

```text
~/.gctree/branch-repo-map.json
```

此时如果在 `E` 仓库里调用 `resolve`，可以选择：

1. 这次先继续
2. 以后这个仓库总是使用 `A`
3. 在这个仓库里忽略 `A`

## 首次使用示例

```bash
gctree init
```

然后：

1. 选择 `codex` 或 `claude-code`
2. 让 `gctree` 为当前环境安装命令表面
3. 完成 `main` gc-branch 的 onboarding

## 多 gc-branch 示例

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

如果在实际工作中发现某个仓库其实应该属于当前 gc-branch，更自然的流程是：

1. 先把这个仓库加入 branch repo map
2. 然后用 `update-global-context` 补充这个仓库是什么、为什么重要等长期上下文

## 集成模式

### Codex CLI / Claude Code CLI

`gctree scaffold` 会安装 provider 侧的 guided onboarding 和 guided update 命令。
这些命令在开始前都应该明确说明当前激活的是哪个 gc-branch，并且除非用户明确要求切换，否则要始终使用保存下来的工作流语言。

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

### 运行时行为

当前激活的 gc-branch 是 `~/.gctree` 里的 `HEAD` 指向的 fallback 分支。
但如果某个仓库被明确映射到另一个 gc-branch，那么对这个仓库来说，branch map 的优先级高于 HEAD。
