# 사용방법

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## Summary

기본적인 `gctree` 사용 흐름은 이렇습니다. gc-tree를 초기화하고, provider를 선택하고, 기본 `main` gc-branch를 온보딩한 뒤, 필요할 때 새 gc-branch를 만들고, 레포를 올바른 gc-branch에 매핑하고, 이후 장기 변경은 가이드형 업데이트로 처리합니다.

## 기본 흐름

1. `gctree init` 실행
2. 선호 provider(`codex` 또는 `claude-code`) 선택
3. 기본 `main` gc-branch에 대한 가이드형 온보딩 완료
4. `gctree resolve --query "..."`로 관련 컨텍스트 조회
5. `gctree checkout`으로 gc-branch 생성 또는 전환
6. 비어 있는 gc-branch에서만 `gctree onboard` 실행
7. gc-branch가 실제 관련 레포에만 적용되도록 레포 범위 매핑 관리
8. 이후 장기 변경은 `gctree update-global-context`로 반영

## 핵심 명령

| 명령 | 설명 |
| --- | --- |
| `gctree init` | `~/.gctree`와 기본 `main` gc-branch를 만들고, provider를 저장하고, 현재 환경을 스캐폴딩한 뒤, `main`이 비어 있으면 가이드형 온보딩을 시작합니다. |
| `gctree checkout <branch>` | 활성 gc-branch를 전환합니다. |
| `gctree checkout -b <branch>` | 새 빈 gc-branch를 만들고 전환합니다. |
| `gctree branches` | 사용 가능한 gc-branch와 현재 gc-branch를 보여줍니다. |
| `gctree status` | 활성 gc-branch, 현재 레포, 현재 레포의 scope 상태, 경고, 선호 provider를 보여줍니다. |
| `gctree resolve --query TEXT` | 관련 gc-branch에서 컨텍스트를 검색합니다. 현재 레포가 미매핑이면 처리 방식을 물어볼 수 있습니다. |
| `gctree repo-map` | `branch-repo-map.json` 현재 내용을 보여줍니다. |
| `gctree set-repo-scope --branch <name> --include` | 현재 레포를 해당 gc-branch의 include로 등록합니다. |
| `gctree set-repo-scope --branch <name> --exclude` | 현재 레포를 해당 gc-branch의 exclude로 등록합니다. |
| `gctree onboard` | 활성 gc-branch에 대한 가이드형 온보딩을 시작합니다. 해당 gc-branch가 비어 있을 때만 동작합니다. |
| `gctree reset-gc-branch --branch <name> --yes` | gc-branch를 비워서 다시 온보딩할 수 있게 만듭니다. |
| `gctree update-global-context` | 활성 gc-branch에 대한 가이드형 장기 업데이트를 시작합니다. |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context`의 별칭입니다. |
| `gctree scaffold --host <codex|claude-code>` | 다른 환경에 provider용 명령 표면을 설치합니다. |

## 레포 범위 예시

예를 들어 gc-branch `A`가 `B`, `C`, `D` 레포에만 관련 있고 `F`와는 무관하다면, 다음과 같이 관리할 수 있습니다.

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

그 상태에서 `E` 레포에서 `resolve`를 호출하면 다음 중 하나를 고를 수 있습니다.

1. 이번만 진행
2. 앞으로 이 레포에서도 `A` 사용
3. 이 레포에서는 `A` 무시

## 최초 실행 예시

```bash
gctree init
```

그다음:

1. `codex` 또는 `claude-code` 선택
2. `gctree`가 현재 환경을 스캐폴딩하도록 둠
3. `main` gc-branch 온보딩 완료

## 다중 gc-branch 예시

```bash
gctree checkout -b client-b
gctree onboard
gctree resolve --query "billing retry policy"
```

## 업데이트 예시

```bash
gctree update-global-context
```

짧은 별칭:

```bash
gctree update-gc
gctree ugc
```

만약 실제 작업을 하다 보니 어떤 레포가 현재 gc-branch에 포함되어야 할 것 같다면, 자연스러운 흐름은 이렇습니다.

1. 먼저 branch repo map에 그 레포를 포함시키고
2. 그 다음 `update-global-context`로 이 레포가 무엇을 하는지, 왜 중요한지 같은 장기 컨텍스트를 추가

## 통합 패턴

### Codex CLI / Claude Code CLI

`gctree scaffold`는 가이드형 온보딩과 가이드형 업데이트 같은 provider용 명령을 설치합니다.
이 명령들은 항상 현재 활성 gc-branch가 무엇인지 먼저 명시해야 합니다.

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

### 런타임 동작

활성 gc-branch는 `~/.gctree` 안의 `HEAD`가 가리키는 fallback 브랜치입니다.
다만 어떤 레포가 다른 gc-branch에 명시적으로 묶여 있으면, 그 레포에 대해서는 branch map이 HEAD보다 우선합니다.
