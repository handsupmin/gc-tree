# 원칙

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## 요약

`gctree`는 몇 가지 작은 제품 원칙 위에서 움직입니다. 컨텍스트는 브랜치 단위로 다루고, source 문서는 summary-first로 유지하고, index는 얇게 유지하고, repo scope는 명시적으로 관리해서 gc-branch가 자기 자리에만 영향을 주게 합니다.

## 1. 컨텍스트는 브랜치 단위로 다룬다

한 대의 머신 안에서도 여러 글로벌 컨텍스트 트리를 서로 섞이지 않게 유지할 수 있어야 합니다.
그래서 `gctree`는 `checkout`, `checkout -b` 같은 Git 스타일 언어를 쓰되, 사용자에게 보이는 표현에서는 활성 브랜치를 **gc-branch**라고 부릅니다.

## 2. repo scope는 명시적으로 둔다

gc-branch가 머신 안의 모든 레포에 조용히 영향을 주면 안 됩니다.
`gctree`는 `branch-repo-map.json`을 통해 각 레포가 다음 중 어디에 속하는지 기록합니다.

- 특정 gc-branch에 포함됨
- 특정 gc-branch에서 제외됨
- 아직 매핑되지 않음

`resolve`가 아직 매핑되지 않은 레포에서 호출되면, 사용자는 이번만 계속할지, 앞으로도 그 gc-branch를 여기서 쓸지, 아니면 여기서는 무시할지 결정할 수 있습니다.

## 3. `index.md`는 얇게 유지한다

최상위 `index.md`는 지식 dump가 아니라 인덱스입니다.
역할은 사람과 도구가 올바른 source 문서를 빠르게 찾도록 돕는 것입니다.
본문 지식을 다 복붙해 넣기보다, 짧고 링크 중심의 구조를 유지해야 합니다.

## 4. source 문서는 summary-first로 만든다

source-of-truth markdown 문서라면 상단 가까이에 `## Summary` 섹션이 있어야 합니다.
그래야 도구가 먼저 짧은 버전을 읽고, 정말 더 자세한 내용이 필요할 때만 본문을 확장해서 볼 수 있습니다.

## 5. 온보딩은 명시적이고 가이드형이어야 한다

유용한 컨텍스트 트리를 만들기 위해 사용자가 온보딩용 JSON을 손으로 작성하게 하면 안 됩니다.
`gctree init`과 `gctree onboard`는 사용자가 선호하는 provider를 기준으로 흐름을 안내하고, 결과 컨텍스트를 현재 활성 gc-branch에 써 넣어야 합니다.

온보딩은 비어 있는 gc-branch에서만 해야 합니다.
이미 컨텍스트가 들어 있는 gc-branch라면 올바른 경로는 둘 중 하나입니다.

- 그 gc-branch를 리셋하고 다시 온보딩하기
- 혹은 가이드형 장기 업데이트를 실행하기

## 6. 장기 업데이트는 의도적으로만 일어나야 한다

장기 컨텍스트는 우연히 바뀌거나 숨겨진 메모리를 통해 바뀌면 안 됩니다.
업데이트 흐름은 명시적이어야 하고, provider가 주도해야 하며, 현재 활성 gc-branch와 분명히 연결되어 있어야 합니다.
