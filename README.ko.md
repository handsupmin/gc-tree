# gc-tree

<div align="center">

<img src="./logo.png" alt="gc-tree 로고" width="260" />

### 프로젝트 밖까지 이어지는 글로벌 컨텍스트.

기존 AI 도구 위에 오래 가는, 재사용 가능한 컨텍스트 레이어를 얹어보세요.
Git 브랜치 다루듯 여러 컨텍스트를 나눠 관리할 수 있습니다.

[![npm version](https://img.shields.io/npm/v/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![npm downloads](https://img.shields.io/npm/dm/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![GitHub stars](https://img.shields.io/github/stars/handsupmin/gc-tree)](https://github.com/handsupmin/gc-tree/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](https://github.com/handsupmin/gc-tree/blob/main/README.md) | [한국어](https://github.com/handsupmin/gc-tree/blob/main/README.ko.md) | [简体中文](https://github.com/handsupmin/gc-tree/blob/main/README.zh.md) | [日本語](https://github.com/handsupmin/gc-tree/blob/main/README.ja.md) | [Español](https://github.com/handsupmin/gc-tree/blob/main/README.es.md)

</div>

실제 업무가 여러 레포, 제품, 고객사, 워크플로에 걸쳐 있는 개발자를 위해 만들었습니다.

`gc-tree`는 AI 코딩 도구에 **레포 바깥 레벨의 재사용 가능한 컨텍스트 레이어**를 붙여줍니다. 오래 가는 맥락은 유지하고, 관련 있는 레포에서만 적용하고, 지금 레포와 무관할 때는 조용히 빠집니다.

---

## 왜 gc-tree인가요?

AI 에이전트를 진짜 실무에 쓰기 시작하면 repo-local context만으로는 금방 한계가 옵니다.

작업이 여러 레포와 여러 워크스트림으로 퍼지기 시작하면 보통 이런 문제가 생깁니다.

- 장기 컨텍스트가 프롬프트 안으로 계속 밀려 들어감
- 상관없는 컨텍스트가 다른 레포까지 새어 나감
- 새 세션을 열 때마다 같은 설명을 또 해야 함
- 고객사나 제품 지식이 채팅 기록 속에만 숨어 있음
- 작업 전환 때마다 사람 머리로 컨텍스트 스위칭을 직접 해야 함

`gc-tree`는 Codex, Claude Code 같은 AI 코딩 도구를 이미 깊게 쓰고 있고, 이제는 컨텍스트 관리까지 수작업으로 하고 싶지 않은 사람을 위한 도구입니다.

---

## 바로 얻는 것들

- **여러 개의 장기 컨텍스트**
  제품, 고객사, 워크스트림마다 컨텍스트 레인을 따로 유지할 수 있습니다.

- **레포 기준의 관련성 관리**
  어떤 컨텍스트가 어떤 레포에만 적용되어야 하는지 명확하게 묶을 수 있습니다.

- **스마트한 범위 가드**
  아직 매핑되지 않은 레포에 들어가면, 이번만 계속할지 / 여기서는 항상 쓸지 / 여기서는 무시할지를 고를 수 있습니다.

- **가이드형 온보딩과 업데이트**
  Codex, Claude Code, 혹은 둘 다를 써서 컨텍스트를 처음 만들고 계속 다듬을 수 있습니다.

- **summary-first markdown 지식 구조**
  숨겨진 메모리가 아니라 파일에 남기고, 도구는 먼저 짧은 요약부터 읽게 할 수 있습니다.

---

## 설치 & 빠른 시작

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

이 정도면 시작 준비는 끝입니다.
그다음부터는 원래 하던 방식대로 개발하면 됩니다. `gc-tree`가 평소 워크플로 바깥에서 글로벌 컨텍스트만 붙여줍니다.

- **CLI 명령어:** `gctree`
- **요구 사항:** Node.js 20+

소스 기반 개발은 [docs/local-development.ko.md](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.ko.md)를 참고하세요.

---

## 자주 쓰는 흐름

### 작업 흐름이 갈라지면 새 컨텍스트 만들기

```bash
gctree checkout -b client-b
gctree onboard
```

고객사, 제품, 마이그레이션, 특정 이니셔티브처럼 별도 맥락이 필요한 일은 gc-branch를 따로 파두면 됩니다.

### 나중에 장기 컨텍스트 업데이트하기

```bash
gctree update-global-context
```

작업이 쌓이면 활성 gc-branch에 장기 컨텍스트를 덧붙이세요.

짧은 별칭:

```bash
gctree update-gc
gctree ugc
```

### 필요할 때만 컨텍스트 불러오기

```bash
gctree resolve --query "auth token rotation"
```

지금 필요한 순간에만 관련 맥락을 다시 꺼내 쓰면 됩니다.

---

## 왜 자연스럽게 느껴질까요?

**Git 브랜치처럼 여러 컨텍스트를 유지하되, Git 브랜치처럼 매번 신경 쓸 필요는 없습니다.**

다음처럼 컨텍스트를 따로 나눌 수 있습니다.

- 고객사
- 제품 라인
- 플랫폼 팀
- 함께 움직이는 백엔드 + 프론트엔드 스택
- 일시적인 이니셔티브나 마이그레이션

그리고 익숙한 브랜치 느낌의 명령으로 오갈 수 있습니다.

```bash
gctree checkout -b client-b
gctree checkout main
```

하지만 Git과 달리, 이 전환을 사용자가 계속 수동으로 챙길 필요는 없습니다.

현재 들어와 있는 레포가 활성 컨텍스트의 범위 밖이라면, `gc-tree`는 그 컨텍스트를 관련 없는 것으로 판단하고 조용히 비켜날 수 있습니다. 덕분에 상관없는 컨텍스트가 엉뚱한 세션으로 새지 않습니다.

즉, 여러 개의 장기 컨텍스트를 오래 들고 가면서도 매번 모든 세션에 다 끌고 들어갈 필요가 없습니다.

---

## 현실적인 워크플로

예를 들어 이런 식으로 일한다고 해봅시다.

- 공용 플랫폼 레포 하나
- 고객사 레포 두 개
- 사내 툴링 레포 하나

`gc-tree`가 없으면 새 AI 세션을 열 때마다 다시 설명해야 합니다.

- 지금 어느 고객사 얘기인지
- 어떤 레포들이 한 묶음인지
- 여기서 중요한 워크플로가 뭔지
- 지금은 어떤 컨텍스트가 오히려 방해가 되는지

`gc-tree`가 있으면 레인별로 컨텍스트를 따로 유지하고, 세션을 바꿔도 재사용하고, repo scope 규칙으로 불필요한 컨텍스트 유입도 막을 수 있습니다.

결국 핵심은 이겁니다.

> 프롬프트를 더 많이 저장하는 게 아니라,
> **일의 단위에 맞는 컨텍스트를 올바른 레벨에서 관리하는 것.**

---

## 핵심 개념

- **gc-branch**
  제품, 고객사, 워크스트림, 도메인 하나를 위한 장기 컨텍스트 레인입니다.

- **repo scope**
  어떤 레포에서 이 컨텍스트를 적용할지 결정하는 규칙입니다.

- **provider-guided flow**
  JSON을 손으로 쓰는 대신, 선호하는 AI 코딩 도구를 통해 온보딩과 업데이트를 진행하는 방식입니다.

- **context tree**
  내부적으로 `gc-tree`는 브랜치 단위의 파일 기반 지식 트리로 컨텍스트를 관리합니다.
  사용자가 체감하는 가치는 결국 프로젝트 밖까지 이어지는 재사용 가능한 컨텍스트입니다.

---

## 런타임에서 보이는 provider 명령

스캐폴딩 이후 런타임에서 보이는 명령은 다음과 같습니다.

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

이 명령들은 항상 현재 활성 gc-branch가 무엇인지 먼저 밝히고, 사용자가 명시적으로 바꾸라고 하지 않는 한 저장된 언어를 유지한 채 장기 컨텍스트를 수집하거나 업데이트해야 합니다.

---

## 핵심 명령 한눈에 보기

| 목적 | 명령 |
| --- | --- |
| gc-tree 초기화 및 provider 선택 | `gctree init` |
| 현재 gc-branch 확인 | `gctree status` |
| 활성 컨텍스트 검색 | `gctree resolve --query "..."` |
| 레포 범위 규칙 확인 | `gctree repo-map` |
| gc-branch에 레포 포함/제외 설정 | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| gc-branch 생성/전환 | `gctree checkout <branch>` / `gctree checkout -b <branch>` |
| 비어 있는 gc-branch 온보딩 | `gctree onboard` |
| 활성 gc-branch 장기 업데이트 | `gctree update-global-context` / `gctree update-gc` / `gctree ugc` |
| 다시 온보딩하기 전 gc-branch 초기화 | `gctree reset-gc-branch --branch <name> --yes` |
| 다른 환경에 수동 스캐폴딩 | `gctree scaffold --host codex --target /path/to/repo` |

---

## 문서

자세한 문서는 [`docs/`](https://github.com/handsupmin/gc-tree/tree/main/docs) 아래에 정리되어 있습니다.

- **컨셉** — [`docs/concept.ko.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.ko.md)
  `gctree`가 무엇인지, 어떤 문제를 해결하는지, 글로벌 컨텍스트 레이어의 범위를 설명합니다.
- **원리** — [`docs/principles.ko.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.ko.md)
  gc-branch, 레포 범위, slim index, summary-first 문서, 가이드형 업데이트 원칙을 정리합니다.
- **사용방법** — [`docs/usage.ko.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.ko.md)
  표준 CLI 흐름, provider 명령, 레포 범위 동작, 통합 패턴을 안내합니다.
- **로컬 실행방법** — [`docs/local-development.ko.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.ko.md)
  의존성 설치, 로컬 CLI 실행, 변경 검증 방법을 설명합니다.

---

## 기여하기

기여는 언제든 환영합니다. 개발 흐름과 PR 체크리스트는 영어 문서인 [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md)를 참고해주세요.

---

## 라이선스

MIT. 자세한 내용은 [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)를 참고하세요.
