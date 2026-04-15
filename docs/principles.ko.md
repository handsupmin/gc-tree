# 원리

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## Summary

`gctree`는 몇 가지 단순한 제품 원칙을 따릅니다. 컨텍스트는 gc-branch 단위로 분리하고, 문서는 summary-first로 작성하며, 인덱스는 작게 유지하고, 각 gc-branch가 실제로 관련 있는 레포에서만 영향을 주도록 범위를 명시합니다.

## 1. 컨텍스트는 gc-branch 단위로 분리한다

한 머신 안에서도 여러 글로벌 컨텍스트 트리를 섞지 않고 운영할 수 있어야 합니다.
그래서 `gctree`는 `checkout`, `checkout -b` 같은 git 스타일 명령을 쓰되, 사용자에게는 현재 브랜치를 **gc-branch**라고 명시합니다.

## 2. 레포 범위를 명시적으로 관리한다

어떤 gc-branch가 머신의 모든 레포에 조용히 영향을 주면 안 됩니다.
`gctree`는 `branch-repo-map.json`을 통해 각 레포가 해당 gc-branch에 대해 어떤 상태인지 기록합니다.

- include
- exclude
- 아직 미지정

`resolve`가 미지정 레포에서 호출되면, 이번만 사용할지 / 항상 사용할지 / 여기서는 무시할지를 고를 수 있습니다.

## 3. `index.md`는 작게 유지한다

최상위 `index.md`는 지식 덤프가 아니라 인덱스입니다.
역할은 도구를 올바른 source document로 빠르게 안내하는 것이지, 모든 내용을 인라인으로 복제하는 것이 아닙니다.

## 4. summary-first 문서를 우선한다

모든 source-of-truth markdown 문서는 상단 근처에 `## Summary` 섹션을 두는 것이 좋습니다.
이렇게 하면 도구가 먼저 짧은 버전을 읽고, 요약만으로 충분할 때는 전체 문서를 읽지 않아도 됩니다.

## 5. 온보딩은 명시적이고 가이드형이어야 한다

유용한 글로벌 컨텍스트를 만들기 위해 사용자가 직접 onboarding JSON을 손으로 작성할 필요는 없어야 합니다.
`gctree init`과 `gctree onboard`는 사용자가 고른 provider를 통해 질문을 주고받으며 활성 gc-branch에 결과를 기록해야 합니다.

온보딩은 비어 있는 gc-branch에서만 실행합니다.
이미 컨텍스트가 있다면 다음 중 하나가 올바른 경로입니다.

- gc-branch를 리셋하고 다시 온보딩한다
- 또는 가이드형 장기 업데이트를 실행한다

## 6. 장기 업데이트는 의도적으로 수행한다

장기 컨텍스트는 실수로 바뀌거나 숨겨진 메모리로 덮어써지면 안 됩니다.
업데이트는 명시적이어야 하고, provider를 통해 진행되며, 항상 현재 활성 gc-branch에 연결되어야 합니다.
