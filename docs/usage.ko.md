# 사용 방법

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## 요약

표준적인 `gctree` 흐름은 이렇습니다. gc-tree를 초기화하고, provider를 고르고, 기본 `main` gc-branch를 온보딩하고, 필요한 컨텍스트를 resolve로 불러오고, 필요할 때 새 gc-branch를 만들고, 각 레포를 맞는 gc-branch에 매핑하고, 나중에는 가이드형 업데이트로 장기 컨텍스트를 유지합니다.

## 기본 워크플로

1. `gctree init` 실행
2. 선호하는 provider 모드 선택 (`claude-code`, `codex`, `both`)
3. 워크플로 언어 선택 (`English`, `Korean`, 또는 커스텀 언어)
4. `both`를 골랐다면 이번 온보딩을 어느 provider로 시작할지 선택
5. 기본 `main` gc-branch에 대한 가이드형 온보딩 완료
6. `gctree resolve --query "..."`로 필요한 컨텍스트 조회
7. `gctree checkout`으로 gc-branch 생성 또는 전환
8. `gctree onboard`는 비어 있는 gc-branch에서만 실행
9. repo scope 매핑으로 gc-branch가 자기 레포에서만 적용되게 유지
10. 장기 변경은 나중에 `gctree update-global-context`로 반영

## 핵심 명령

| 명령 | 용도 |
| --- | --- |
| `gctree init` | `~/.gctree`를 만들고, 기본 `main` gc-branch를 만들고, provider 모드/온보딩 provider/선호 언어를 저장하고, 현재 환경을 스캐폴딩하고, `main`이 비어 있으면 가이드형 온보딩까지 시작합니다. |
| `gctree checkout <branch>` | 활성 gc-branch를 전환합니다. |
| `gctree checkout -b <branch>` | 새로운 빈 gc-branch를 만들고 바로 전환합니다. |
| `gctree branches` | 사용 가능한 gc-branch 목록과 현재 활성 브랜치를 보여줍니다. |
| `gctree status` | 활성 gc-branch, 현재 레포, 현재 repo-scope 상태, 경고, 선호 provider를 보여줍니다. |
| `gctree resolve --query TEXT` | 관련 gc-branch에서 컨텍스트를 찾습니다. 현재 레포가 아직 매핑되지 않았다면, 이 레포를 어떻게 다룰지 물어볼 수 있습니다. |
| `gctree repo-map` | 현재 `branch-repo-map.json` 내용을 보여줍니다. |
| `gctree set-repo-scope --branch <name> --include` | 현재 레포를 해당 gc-branch에 포함된 것으로 표시합니다. |
| `gctree set-repo-scope --branch <name> --exclude` | 현재 레포를 해당 gc-branch에서 무시할 레포로 표시합니다. |
| `gctree onboard` | 활성 gc-branch에 대한 가이드형 온보딩을 시작합니다. 이 gc-branch가 비어 있을 때만 동작합니다. |
| `gctree reset-gc-branch --branch <name> --yes` | gc-branch를 비워서 다시 온보딩할 수 있게 만듭니다. |
| `gctree update-global-context` | 활성 gc-branch에 대한 가이드형 장기 업데이트를 시작합니다. |
| `gctree update-gc` / `gctree ugc` | `gctree update-global-context`의 별칭입니다. |
| `gctree scaffold --host <codex|claude-code>` | 다른 환경에도 provider용 명령 표면을 설치합니다. |

## repo scope 예시 흐름

gc-branch `A`가 `B`, `C`, `D` 레포에는 관련 있고 `F`에는 관련이 없다고 가정해봅시다.

이 경우 다음 같은 구조로 관리할 수 있습니다.

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

이 정보는 다음 위치에 저장됩니다.

```text
~/.gctree/branch-repo-map.json
```

`E` 레포에서 `resolve`를 실행했는데 branch `A`가 아직 거기에 매핑되지 않았다면, `gctree`는 다음 중 무엇을 할지 물어볼 수 있습니다.

1. 이번만 계속하기
2. `E`에서는 앞으로도 항상 `A` 사용하기
3. `E`에서는 `A` 무시하기

## 첫 실행 예시

```bash
gctree init
```

그다음:

1. `codex` 또는 `claude-code` 선택
2. `gctree`가 현재 환경을 스캐폴딩하도록 두기
3. `main` gc-branch에 대한 가이드형 온보딩 완료

## 여러 브랜치를 쓰는 예시

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

새롭게 중요해진 레포를 장기 컨텍스트에도 포함시키고 싶다면, 자연스러운 흐름은 이렇습니다.

1. 먼저 그 레포를 gc-branch에 매핑하고
2. 그다음 `update-global-context`를 실행해서 그 레포가 무엇을 하는지, 왜 중요한지 같은 장기 지식을 추가하기

## 통합 패턴

### Codex CLI / Claude Code CLI

`gctree scaffold`는 가이드형 온보딩, 가이드형 업데이트 같은 provider 명령 표면을 설치합니다.
이 명령들은 장기 컨텍스트를 수집하거나 반영하기 전에 현재 활성 gc-branch가 무엇인지 명시적으로 말해야 하고, 사용자가 따로 바꾸라고 하지 않는 한 저장된 워크플로 언어를 계속 사용해야 합니다.

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

### 런타임 동작

기본적으로 활성 gc-branch는 `~/.gctree` 안의 `HEAD`가 가리키는 브랜치입니다. 다만 특정 레포가 다른 gc-branch에 명시적으로 묶여 있다면 repo mapping이 그 기본값을 덮어쓸 수 있습니다.
덕분에 서로 무관한 세션을 많이 동시에 띄워두는 사용자에게도 gc-tree가 실용적으로 동작합니다.
