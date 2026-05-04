# 사용법

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## 요약

표준 `gctree` 워크플로우는 다음과 같습니다: gc-tree 초기화, 프로바이더 선택, 기본 `main` gc-branch 온보딩, 필요한 컨텍스트 resolve, 작업별로 새 gc-branch 생성, 저장소를 올바른 gc-branch에 매핑, 이후 지속 변경 시 안내된 업데이트 사용.

## 표준 워크플로우

1. `gctree init` 실행
2. 선호하는 프로바이더 모드 선택 (`claude-code`, `codex`, 또는 `both`)
3. 워크플로우 언어 선택 (`English`, `Korean`, 또는 커스텀 언어)
4. `both`를 선택한 경우, 지금 온보딩을 시작할 프로바이더 선택
5. 기본 `main` gc-branch의 안내된 온보딩 완료
6. `gctree resolve --query "..."`로 관련 컨텍스트 resolve
7. `gctree related --id <match-id>`로 supporting docs 확인
8. `gctree show-doc --id <match-id>`로 필요할 때만 전체 문서 읽기
9. `gctree checkout`으로 gc-branch 생성 또는 전환
10. 빈 gc-branch에만 `gctree onboard` 실행
11. 저장소 범위 매핑으로 gc-branch가 해당하는 곳에만 적용되도록 설정
12. 이후 지속 변경에는 `gctree update-global-context` 사용

## 핵심 명령어

| 명령어 | 설명 |
| --- | --- |
| `gctree init` | `~/.gctree` 생성, 기본 `main` gc-branch 생성, 프로바이더 모드·온보딩 프로바이더·선호 언어 저장, 전역 프로바이더 훅/명령/스킬 설치, `main`이 비어 있으면 안내된 온보딩 시작. |
| `gctree checkout <branch>` | 활성 gc-branch 전환. |
| `gctree checkout -b <branch>` | 새 빈 gc-branch를 생성하고 전환. |
| `gctree branches` | 사용 가능한 gc-branch 목록 표시 및 현재 활성 브랜치 표시. |
| `gctree status` | 활성 gc-branch, 현재 저장소, 현재 저장소 범위 상태, 경고, 선호 프로바이더 표시. |
| `gctree resolve --query TEXT` | 쿼리에 대한 compact index layer를 반환합니다. match에는 stable ID와 후속 조회 명령이 포함됩니다. |
| `gctree related --id <match-id>` | 하나의 resolved match 주변 supporting docs를 전체 markdown 없이 반환합니다. |
| `gctree show-doc --id <match-id>` | stable match ID 하나에 대한 전체 markdown source-of-truth 문서를 반환합니다. |
| `gctree repo-map` | `branch-repo-map.json`의 현재 내용 표시. |
| `gctree set-repo-scope --branch <name> --include` | 현재 저장소를 해당 gc-branch에 포함으로 표시. |
| `gctree set-repo-scope --branch <name> --exclude` | 현재 저장소를 해당 gc-branch에서 무시로 표시. |
| `gctree onboard` | 활성 gc-branch의 안내된 온보딩 실행. 해당 gc-branch가 비어 있을 때만 동작. |
| `gctree reset-gc-branch --branch <name> --yes` | gc-branch를 초기화하여 다시 온보딩할 수 있게 함. |
| `gctree update-global-context` | 활성 gc-branch의 안내된 지속 업데이트 실행. |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context`의 별칭. |
| `gctree scaffold --host <codex\|claude-code>` | 특정 저장소나 워크스페이스에 로컬 프로바이더 override 설치. |
| `gctree update` | gctree를 최신 npm 버전으로 업데이트하고 이전에 설치된 모든 프로바이더를 재스캐폴드. |
| `gctree uninstall --yes` | `~/.gctree`와 전역 gctree 활성화를 제거. |

## resolve가 반환하는 것

`gctree resolve`는 progressive-disclosure 워크플로우의 **compact index layer**입니다. 활성 gc-branch의 문서를 쿼리에 대해 점수화하고 stable ID가 포함된 match만 반환합니다. 제목 매칭은 본문 매칭보다 두 배의 가중치를 가집니다.

```bash
gctree resolve --query "auth token rotation policy"
```

```
[gc-tree] 1 matching doc  gc-branch="main"  repo="my-repo"
[Auth & Session Conventions] JWT rotation on every request, refresh tokens in httpOnly cookies, 15-min access token TTL
[Auth & Session Conventions] show full doc: gctree show-doc --id "auth" --branch "main"
```

권장 흐름은 다음과 같습니다:

1. `resolve` → compact index
2. `show-doc` → 필요할 때만 전체 markdown

Graceful degradation도 명시적입니다:

- 빈 gc-branch → gc-branch가 비어 있다는 일반 텍스트 메시지
- 제외된 repo → 해당 repo가 제외되어 있다는 일반 텍스트 메시지
- 결과 없음 → 매칭 결과가 없다는 일반 텍스트 메시지

## 저장소 범위 설정 예시 흐름

gc-branch `A`가 저장소 `B`, `C`, `D`에는 관련되지만 `F`에는 관련 없다고 가정합니다.

다음과 같이 관리할 수 있습니다:

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

저장 위치:

```text
~/.gctree/branch-repo-map.json
```

저장소 `E`에서 `resolve`를 실행할 때 브랜치 `A`가 아직 매핑되지 않은 경우, `gctree`가 다음 중 하나를 선택하도록 물어볼 수 있습니다:

1. 한 번만 계속 진행
2. `E`에서 항상 `A` 사용
3. `E`에서 `A` 무시

## 최초 실행 예시 흐름

```bash
gctree init
```

이후:

1. `codex` 또는 `claude-code` 선택
2. `gctree`가 해당 프로바이더에 대해 전역 활성화를 설치하도록 허용
3. `main` gc-branch의 안내된 온보딩 완료

## 다중 브랜치 예시 흐름

```bash
gctree checkout -b client-b
gctree onboard
gctree resolve --query "billing retry policy"
```

## 업데이트 예시 흐름

```bash
gctree update-global-context
```

단축 별칭:

```bash
gctree update-gc
gctree ugc
```

새로 관련이 생긴 저장소를 지속 컨텍스트에도 포함해야 한다면, 자연스러운 흐름은 다음과 같습니다:

1. 해당 저장소를 gc-branch에 매핑
2. `update-global-context`를 실행하여 해당 저장소가 무엇을 하고 왜 중요한지에 대한 지속 지식 추가

## 통합 패턴

### Codex CLI / Claude Code CLI

`gctree init`은 전역 프로바이더 훅 표면을 설치합니다. `gctree scaffold`는 특정 저장소에 자체 markdown 스니펫이나 로컬 명령 표면이 필요할 때 대상 디렉토리에 로컬 override를 설치합니다.

UserPromptSubmit 훅은 매 프롬프트 전에 매칭된 문서 요약을 컨텍스트에 직접 주입합니다 — AI가 제목만이 아니라 실제 패턴과 명령을 볼 수 있도록. 요약이 짧거나 일반적인 경우, 훅은 문서 본문에서 excerpt로 대체합니다. 전체 문서는 언제든 `gctree resolve --id <id>`로 필요할 때 확인할 수 있습니다.

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
gctree scaffold --host both --target /path/to/repo
```

**Codex 전역 파일 (`gctree init`):**

```
~/.codex/hooks.json                              ← SessionStart/UserPromptSubmit 자동 resolve 훅
~/.codex/prompts/gctree-bootstrap.md            ← Codex 세션 부트스트랩 컨텍스트
~/.codex/skills/gc-resolve-context/SKILL.md     ← resolve 스킬
~/.codex/skills/gc-onboard/SKILL.md             ← 온보딩 스킬
~/.codex/skills/gc-update-global-context/SKILL.md  ← 업데이트 스킬
```

**`gctree scaffold --host codex` 로컬 override 파일:**

```
AGENTS.md                                  ← 에이전트 지시사항에 gctree 스니펫 추가
.codex/hooks.json                         ← SessionStart/UserPromptSubmit 자동 resolve 훅
.codex/prompts/gctree-bootstrap.md         ← Codex 세션의 부트스트랩 컨텍스트
.codex/skills/gc-resolve-context/SKILL.md  ← resolve 스킬
.codex/skills/gc-onboard/SKILL.md          ← 온보딩 스킬
.codex/skills/gc-update-global-context/SKILL.md  ← 업데이트 스킬
```

**Claude Code 전역 파일 (`gctree init`):**

```
~/.claude/hooks/hooks.json                         ← SessionStart/UserPromptSubmit 자동 resolve 훅
~/.claude/hooks/gctree-session-start.md            ← 세션 시작 fallback 메모
~/.claude/commands/gc-resolve-context.md           ← resolve 슬래시 명령
~/.claude/commands/gc-onboard.md                   ← onboard 슬래시 명령
~/.claude/commands/gc-update-global-context.md     ← 업데이트 슬래시 명령
```

**`gctree scaffold --host claude-code` 로컬 override 파일:**

```
CLAUDE.md                                        ← gctree 스니펫 추가
.claude/hooks/hooks.json                         ← SessionStart/UserPromptSubmit 자동 resolve 훅
.claude/hooks/gctree-session-start.md            ← 세션 시작 fallback 메모
.claude/commands/gc-resolve-context.md           ← resolve 슬래시 명령
.claude/commands/gc-onboard.md                   ← onboard 슬래시 명령
.claude/commands/gc-update-global-context.md     ← 업데이트 슬래시 명령
```

`--force`를 전달하지 않으면 기존 로컬 파일은 그대로 유지됩니다.

### 런타임 동작

활성 gc-branch는 `~/.gctree` 내의 `HEAD`가 가리키는 브랜치이지만, 저장소가 다른 gc-branch에 명시적으로 바인딩된 경우 저장소 매핑이 해당 폴백을 재정의할 수 있습니다.
이를 통해 관련 없는 여러 세션을 동시에 열어두는 헤비 유저에게도 gc-tree가 실용적으로 동작합니다.
