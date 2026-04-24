# gc-tree

<div align="center">

```text
              __                          
             /\ \__                       
   __     ___\ \ ,_\  _ __    __     __   
 /'_ `\  /'___\ \ \/ /\`'__\/'__`\ /'__`\ 
/\ \L\ \/\ \__/\ \ \_\ \ \//\  __//\  __/ 
\ \____ \ \____\\ \__\\ \_\\ \____\ \____\
 \/___L\ \/____/ \/__/ \/_/ \/____/\/____/
   /\____/                                
   \_/__/                                 
```

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

---

## 问题所在

你每天都在用 Claude Code 或 Codex。但你的实际工作横跨多个仓库、产品和客户——而 AI 工具只认识当前文件。

于是你不得不一遍遍地做这些事：

- 重新解释哪些仓库属于同一套系统
- 把同一份架构文档反复粘贴进提示词
- 提醒 AI 它上周"已经知道"的编码规范
- 手动剔除与当前仓库无关的上下文

这不是 AI 的问题，而是**上下文管理的问题**。

---

## 安装与快速开始

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

`gctree init` 会引导你：

1. 选择 provider：`claude-code`、`codex` 或 `both`
2. 在当前仓库安装集成文件
3. 为 `main` gc-branch 完成引导式 onboarding

之后，AI 工具会安装真正的 SessionStart / UserPromptSubmit hook 集成：在开始工作前自动检查 gc-tree，并在整个会话内缓存空结果和 no-match。Hook 输出保持紧凑：只显示 found/no-match 状态以及匹配文档的标题和 ID，完整文档需要时再通过 `gctree resolve --id <id>` 打开。

- **CLI：** `gctree`
- **要求：** Node.js 20+

---

## 适合哪些人

如果以下几条符合你的情况，gc-tree 会很适合你：

- 工作横跨**多个仓库**（单体仓库团队、平台 + 客户仓库、后端 + 前端技术栈）
- 同一周内要在**多个产品或客户**之间来回切换
- 每次开 AI 会话都要**重复解释相同的上下文**
- 希望 AI 工具不只了解当前文件，还能理解**编码规范、架构和领域知识**

如果你只在一个仓库、一个产品里工作，不需要这个工具。`CLAUDE.md` 或 `.cursorrules` 就够了。

---

## gc-tree 做什么

`gc-tree` 工作在**仓库之上**。它把上下文存储为结构化的 Markdown 文件，让 AI 工具在每次会话前自动拉取相关内容。

`gctree resolve` 是 progressive-disclosure 工作流中的**紧凑索引层**：

- `gctree resolve --query "..."` → 返回带稳定 ID 的紧凑匹配列表
- `gctree related --id <match-id>` → 返回某个匹配周围的 supporting docs
- `gctree show-doc --id <match-id>` → 返回该文档的完整 markdown

另外，当 gc-branch 为空、仓库被排除、或查询没有匹配时，gc-tree 会返回明确的状态，而不是模糊地失败。

```bash
gctree resolve --query "auth token rotation policy"
```

```json
{
  "gc_branch": "main",
  "matches": [
    {
      "title": "认证与 Session 规范",
      "score": 4,
      "summary": "每次请求都做 JWT rotation，refresh token 存在 httpOnly cookie 里，access token TTL 15 分钟",
      "excerpt": "## 认证流程\nAccess token：15 分钟 TTL，每次认证请求都做 rotation..."
    }
  ]
}
```

AI 工具拿到的是正确的上下文——不是整个知识库，而是恰好相关的那一片。

**实测：每次查询只注入约 4% 的总上下文。** 其余 96% 留在磁盘上，真正需要时才进入 token 窗口。

---

## 和 CLAUDE.md 或 cursor rules 有什么区别？

`CLAUDE.md` 很好用——在单个仓库里。

一旦你有了多个仓库、客户或工作线：

|                  | `CLAUDE.md` / cursor rules | `gc-tree`                  |
| ---------------- | -------------------------- | -------------------------- |
| 作用范围         | 单个仓库                   | 多个仓库，一套上下文       |
| 持久化方式       | 仓库内的文件               | 存储在仓库外，跨会话复用   |
| 切换上下文       | 手动编辑文件               | `gctree checkout client-b` |
| 相关性过滤       | 全部或全无                 | 只注入匹配的文档（约 4%）  |
| 初始化方式       | 手写                       | 由 AI 工具引导完成         |
| 支持 Codex       | ✅                         | ✅                         |
| 支持 Claude Code | ✅                         | ✅                         |

---

## 经过验证的性能

基于真实内部文档测试（4 份 Notion 导出，中英文混合查询）：

| 指标                                  | 结果              |
| ------------------------------------- | ----------------- |
| Recall——相关查询找到正确文档的比例    | **100%**（16/16） |
| Precision——无关查询返回空结果的比例   | **80%**（4/5）    |
| F1 分数                               | **88.9%**         |
| 每次查询注入的 token 占总上下文的比例 | **约 4%**         |
| 支持中英文混合查询                    | ✅                |

---

## Claude Code 和 Codex 均已验证可用

```bash
gctree init                         # 设置 ~/.gctree 和所选 provider 的全局激活
gctree scaffold --host claude-code   # 安装 CLAUDE.md 片段 + /gc-onboard、/gc-update-global-context
gctree scaffold --host codex         # 安装 AGENTS.md 片段 + $gc-onboard、$gc-update-global-context
gctree scaffold --host both          # 两者同时安装
```

两个 provider 使用同一个底层上下文存储。onboard 一次，两个工具都能用。

**Claude Code** — 使用 `/gc-resolve-context`、`/gc-onboard`、`/gc-update-global-context` 斜杠命令。

**Codex** — 使用 `$gc-resolve-context`、`$gc-onboard`、`$gc-update-global-context` skill。已通过 `codex exec` 实际验证：

```
gctree status → gc_branch: main，doc_count: 2
gctree resolve --query 'NestJS DTO plainToInstance'
→ 匹配到"后端编码规范"（score: 3）
→ DTO：class-transformer plainToInstance，class-validator 必填
→ 错误处理：基于 HttpException 的自定义异常，禁止直接抛出 raw Error
```

---

## 常用操作

### 为不同工作线创建独立上下文

```bash
gctree checkout -b client-b
gctree onboard
```

每个 gc-branch 都是完全独立的上下文通道，像 Git 分支一样自由切换。

### 按需拉取相关上下文

```bash
gctree resolve --query "billing retry policy"
```

只返回匹配的文档——标题、摘要和摘录。摘要不够用时，工具才会读完整文档。

### 保持上下文与时俱进

```bash
gctree update-global-context   # 或：gctree update-gc / gctree ugc
```

引导式更新流程——AI 工具询问发生了哪些变化，并将新上下文写回 gc-branch。

### 限定上下文作用的仓库范围

```bash
gctree set-repo-scope --branch client-b --include   # 包含当前仓库
gctree set-repo-scope --branch client-b --exclude   # 排除当前仓库
```

`gc-tree` 不会向不相关的仓库注入上下文。

---

## 上下文的存储结构

```
~/.gctree/
  branches/
    main/
      index.md          ← 压缩索引，优先加载
      docs/
        auth.md         ← 完整文档，按需读取
        architecture.md
    client-b/
      index.md
      docs/
        ...
  branch-repo-map.json  ← 哪些仓库属于哪个 gc-branch
  settings.json         ← 首选 provider、语言
```

上下文存储在仓库之外——无需 `.gitignore` 规则，不会误提交，使用同一 gc-branch 的所有项目都可复用。

---

## 核心命令

| 目标                                 | 命令                                                            |
| ------------------------------------ | --------------------------------------------------------------- |
| 初始化 gc-tree 并选择 provider       | `gctree init`                                                   |
| 确认当前激活的 gc-branch             | `gctree status`                                                 |
| 搜索当前上下文                       | `gctree resolve --query "..."`                                  |
| 创建或切换 gc-branch                 | `gctree checkout <branch>` / `gctree checkout -b <branch>`      |
| 列出所有 gc-branch                   | `gctree branches`                                               |
| 对空 gc-branch 进行引导式 onboarding | `gctree onboard`                                                |
| 对当前 gc-branch 进行引导式更新      | `gctree update-global-context` / `gctree ugc`                   |
| 查看仓库范围规则                     | `gctree repo-map`                                               |
| 为 gc-branch 包含或排除当前仓库      | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| 重新 onboarding 前重置 gc-branch     | `gctree reset-gc-branch --branch <name> --yes`                  |
| 在单个仓库中安装本地 override        | `gctree scaffold --host codex --target /path/to/repo`           |
| 移除全局 gc-tree 激活和上下文        | `gctree uninstall --yes`                                        |

---

## 文档

- **概念** — [`docs/concept.zh.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.zh.md)
- **原理** — [`docs/principles.zh.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.zh.md)
- **使用方法** — [`docs/usage.zh.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.zh.md)
- **本地开发** — [`docs/local-development.zh.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.zh.md)

---

## 贡献

欢迎贡献。开发流程与 PR 检查清单见 [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md)。

---

## 许可证

MIT。详见 [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)。
