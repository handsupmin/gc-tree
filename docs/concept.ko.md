# 컨셉

[English](concept.md) | [한국어](concept.ko.md) | [简体中文](concept.zh.md) | [日本語](concept.ja.md) | [Español](concept.es.md)

## Summary

`gctree`는 AI 코딩 도구를 위한 작고 명확한 글로벌 컨텍스트 레이어입니다. 장기적으로 유지할 컨텍스트를 단일 저장소 바깥의 markdown 문서로 관리하고, gc-branch 단위로 전환·조회·유지할 수 있으며, 실제로 관련 있는 레포에만 적용되도록 범위를 제한할 수도 있습니다.

## `gctree`란

`gctree`는 재사용 가능한 글로벌 컨텍스트를 관리하기 위한 경량 CLI입니다.
여러 저장소, 세션, 도구를 오가더라도 같은 장기 컨텍스트를 일관되게 이어가야 하는 팀과 개인을 위해 만들어졌습니다.

장기 지식을 숨겨진 메모리에 맡기거나 여러 프롬프트 파일에 흩어 두는 대신, `gctree`는 그 지식이 머무를 안정적인 파일 기반 홈을 제공합니다.

## 해결하는 문제

많은 AI 코딩 환경은 보통 다음 중 하나로 시작합니다.

- 하나의 `AGENTS.md`
- 하나의 `CLAUDE.md`
- 저장소 내부의 프롬프트 파일
- 프롬프트에 복붙하는 임시 메모

처음에는 이 정도로도 충분하지만, 시간이 지나면 이런 요구가 생깁니다.

- 제품이나 고객사별로 컨텍스트를 분리하고 싶다
- 특정 저장소 바깥에서도 유지되는 컨텍스트가 필요하다
- 여러 도구가 함께 재사용할 수 있는 장기 문서가 필요하다
- 필요한 컨텍스트를 빠르게 찾는 일관된 방식이 필요하다
- 장기 컨텍스트를 더 안전하게 업데이트하고 싶다
- 한 사용자가 동시에 여러 레포/세션에서 병렬 작업을 한다

`gctree`는 바로 그 레이어를 다룹니다.

## 범위 경계

`gctree`는 의도적으로 다음 역할을 맡지 않습니다.

- request-to-commit 딜리버리 오케스트레이터
- 숨겨진 메모리 시스템
- 브라우저 기반 협업 런타임
- 범용 지식베이스 제품

`gctree`는 재사용 가능한 글로벌 컨텍스트 브랜치와 명시적인 업데이트 흐름에 집중합니다.

## 파일 구조

일반적인 홈 디렉터리 구조는 다음과 같습니다.

```text
~/.gctree/
  HEAD
  settings.json
  branch-repo-map.json
  branches/
    main/
      branch.json
      index.md
      docs/
```

- `HEAD`는 fallback 활성 gc-branch를 가리킵니다.
- `settings.json`은 선호 provider를 저장합니다.
- `branch-repo-map.json`은 gc-branch별 include/exclude 레포 규칙을 저장합니다.
- `branch.json`은 가벼운 gc-branch 메타데이터를 저장합니다.
- `index.md`는 도구가 읽는 작은 진입점입니다.
- `docs/`는 source-of-truth markdown 문서를 보관합니다.

## 레포 범위 인식 동작

어떤 gc-branch가 모든 레포에 적용될 필요는 없습니다.
예를 들어 branch `A`가 `B`, `C`, `D` 레포에만 관련 있다면, 그 사실을 `branch-repo-map.json`에 기록할 수 있습니다.

그 상태에서 `F` 레포에서 `gctree resolve`가 호출되면 다음 중 하나를 고를 수 있습니다.

- 이번만 사용
- 이 레포에서 항상 사용
- 이 레포에서는 무시

이 구조 덕분에, 동시에 여러 세션을 열고 서로 다른 레포를 다루는 heavy 사용자에게도 더 안전해집니다.
