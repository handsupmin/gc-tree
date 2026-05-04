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

<img src="./logo.png" alt="gc-tree 로고" width="260" />

### CLAUDE.md와 AGENTS.md만으로 부족해서 만든 글로벌 컨텍스트.

기존 AI 도구 위에 오래 가는, 재사용 가능한 컨텍스트 레이어를 얹어보세요.
Git 브랜치 다루듯 여러 컨텍스트를 나눠 관리할 수 있습니다.

[![npm version](https://img.shields.io/npm/v/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![npm downloads](https://img.shields.io/npm/dm/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![GitHub stars](https://img.shields.io/github/stars/handsupmin/gc-tree)](https://github.com/handsupmin/gc-tree/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](https://github.com/handsupmin/gc-tree/blob/main/README.md) | [한국어](https://github.com/handsupmin/gc-tree/blob/main/README.ko.md) | [简体中文](https://github.com/handsupmin/gc-tree/blob/main/README.zh.md) | [日本語](https://github.com/handsupmin/gc-tree/blob/main/README.ja.md) | [Español](https://github.com/handsupmin/gc-tree/blob/main/README.es.md)

</div>

---

## 문제

AI는 당신을 모릅니다.

당신이 무슨 일을 하는지, 어떤 방식으로 일하는지, 팀에서 쓰는 용어가 무엇을 뜻하는지, 무의식적으로 반복하던 루틴이 무엇인지 모릅니다. 원하는 바를 정확히 설명하지 않으면 원하는 수준의 결과물이 나오기 어렵습니다.

그래서 매번 이렇게 됩니다:

- 나는 어떤 사람이고 어떤 방식으로 일하는지 다시 설명
- 우리 팀이 어떤 용어를 쓰는지 다시 설명
- 어떤 레포들이 한 묶음인지 다시 설명
- 같은 아키텍처 문서를 또 프롬프트에 붙여넣기
- 지난주에 "이미 알던" 컨벤션을 다시 알려주기
- 현재 레포와 무관한 컨텍스트를 손으로 걷어내기

AI가 멍청해서가 아닙니다. 하나의 워크스페이스 안에서 이런 맥락을 계속 유지하기 어렵기 때문입니다. 특히 실제 업무는 한 레포 안에서 끝나지 않고 여러 레포와 프로젝트를 오가며 이어집니다.

`CLAUDE.md`와 `AGENTS.md`는 레포 하나를 설명하는 데는 잘 맞습니다. 하지만 여러 레포를 함께 다루는 순간, 레포 간 관계를 담기 어렵고 공통 배경지식은 여기저기 중복되며 세션이 바뀌면 다시 처음부터 설명해야 합니다.

이 반복을 없애기 위해 만든 도구가 `gc-tree`입니다.

---

## 이 도구가 맞는 사람

다음에 해당하면 gc-tree를 제일 잘 쓸 수 있습니다:

- **여러 레포**에 걸쳐 일하는 경우 (모노레포 팀, 플랫폼 레포, 백엔드 + 프론트엔드 스택)
- **여러 제품, 프로젝트, 워크스트림** 사이를 오가는 경우
- AI 세션 시작마다 **같은 컨텍스트를 반복 설명**하는 경우
- AI 도구가 현재 파일뿐 아니라 **내 작업 방식, 팀 용어, 아키텍처, 도메인 지식**도 알길 원하는 경우

레포 하나, 제품 하나에서만 일한다면 굳이 이 도구가 필요 없습니다. `CLAUDE.md`나 `AGENTS.md`로 충분합니다.

---

## 설치 & 빠른 시작

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

`gctree init`이 안내합니다:

1. 프로바이더 선택: `claude-code`, `codex`, 또는 `both`
2. 현재 레포에 통합 파일 스캐폴딩
3. `main` gc-branch 가이드형 온보딩 실행

이후 AI 도구에 실제 SessionStart/UserPromptSubmit 훅 통합이 설치되어, 작업 전에 gc-tree를 자동 확인하고 세션 동안 빈 결과·no-match를 캐시합니다. 훅 출력은 매칭된 문서 요약을 컨텍스트에 직접 주입합니다 — AI가 제목만이 아니라 실제 패턴과 명령을 볼 수 있도록. 전체 문서는 언제든 `gctree resolve --id <id>`로 필요할 때 확인할 수 있습니다.

- **CLI:** `gctree`
- **요구 사항:** Node.js 20+

---

## gc-tree가 하는 일

`gc-tree`는 **레포 위 레벨**에 위치합니다. 내 업무 스타일, 팀의 도메인 용어, 레포 간 관계, 공통 배경지식을 오래 가는 글로벌 컨텍스트로 저장하고, AI 도구가 매 세션마다 관련된 것만 자동으로 가져오게 합니다.

`gctree resolve`는 progressive-disclosure 워크플로우의 **compact index layer**입니다:

- `gctree resolve --query "..."` → stable ID가 포함된 compact match 목록
- `gctree related --id <match-id>` → 특정 match 주변의 supporting docs
- `gctree show-doc --id <match-id>` → 해당 문서의 전체 markdown

또한 문서가 비어 있거나, 저장소가 제외되어 있거나, 쿼리 결과가 없을 때는 모호하게 실패하지 않고 명시적인 status를 반환합니다.

```bash
gctree resolve --query "auth token rotation policy"
```

```
[gc-tree] 1 matching doc  gc-branch="main"  repo="my-repo"
[Auth & Session Conventions] JWT rotation on every request, refresh tokens in httpOnly cookies, 15-min access token TTL
[Auth & Session Conventions] show full doc: gctree show-doc --id "auth" --branch "main"
```

AI 도구가 올바른 컨텍스트를 가져옵니다. 지식 베이스 전체가 아니라 — 관련된 조각만.

**실제로: 쿼리당 전체 컨텍스트의 ~4%만 주입됩니다.** 나머지 96%는 실제로 필요할 때까지 디스크에 남아 토큰 윈도우 밖에 있습니다.

---

## CLAUDE.md, AGENTS.md와 뭐가 다른가요?

`CLAUDE.md`와 `AGENTS.md`는 훌륭합니다 — 레포 하나에서는요.

여러 레포, 프로젝트, 워크스트림이 생기는 순간:

|                  | `CLAUDE.md` / `AGENTS.md` | `gc-tree`                    |
| ---------------- | -------------------------- | ---------------------------- |
| 범위             | 레포 하나                  | 여러 레포, 컨텍스트 하나     |
| 지속성           | 레포 내 파일               | 레포 밖 저장, 세션 간 재사용 |
| 컨텍스트 전환    | 파일 직접 수정             | `gctree checkout project-b`  |
| 관련성 필터링    | 전부 아니면 없음           | 매칭 문서만 주입 (~4%)       |
| 온보딩           | 손으로 작성                | AI 도구가 가이드             |
| Codex 지원       | ✅                         | ✅                           |
| Claude Code 지원 | ✅                         | ✅                           |

---

## 검증된 성능

실제 내부 문서 기준 테스트 (Notion 내보내기 4종, 한국어 + 영어 혼합 쿼리):

| 지표                                            | 결과             |
| ----------------------------------------------- | ---------------- |
| Recall — 관련 쿼리가 올바른 문서를 찾는 비율    | **100%** (16/16) |
| Precision — 무관 쿼리가 빈 결과를 반환하는 비율 | **80%** (4/5)    |
| F1 점수                                         | **88.9%**        |
| 쿼리당 주입 토큰 비율 (전체 컨텍스트 대비)      | **~4%**          |
| 한국어 + 영어 혼합 쿼리 지원                    | ✅               |

---

## Claude Code와 Codex 양쪽 모두 검증 완료

```bash
gctree init                         # ~/.gctree와 선택한 프로바이더의 전역 활성화 설정
gctree scaffold --host claude-code   # CLAUDE.md 스니펫 + /gc-onboard, /gc-update-global-context 설치
gctree scaffold --host codex         # AGENTS.md 스니펫 + $gc-onboard, $gc-update-global-context 설치
gctree scaffold --host both          # 둘 다 한번에
```

두 프로바이더 모두 동일한 컨텍스트 저장소를 씁니다. 한 번 온보딩하면 어느 도구에서든 사용 가능.

**Claude Code** — `/gc-resolve-context`, `/gc-onboard`, `/gc-update-global-context` 슬래시 커맨드 사용.

**Codex** — `$gc-resolve-context`, `$gc-onboard`, `$gc-update-global-context` 스킬 사용. `codex exec`으로 직접 검증됨:

```
gctree status → gc_branch: main, doc_count: 2
gctree resolve --query 'NestJS DTO plainToInstance'
[gc-tree] 1 matching doc  gc-branch="main"  repo="my-repo"
[Backend Coding Conventions] DTO: class-transformer plainToInstance, class-validator required. Error handling: HttpException-based custom exceptions, no raw Error throws.
[Backend Coding Conventions] show full doc: gctree show-doc --id "backend-conventions" --branch "main"
```

---

## 자주 쓰는 흐름

### 워크스트림마다 별도 컨텍스트

```bash
gctree checkout -b project-b
gctree onboard
```

각 gc-branch는 완전히 독립된 컨텍스트 레인입니다. Git 브랜치처럼 오갈 수 있습니다.

### 필요할 때 관련 컨텍스트 가져오기

```bash
gctree resolve --query "billing retry policy"
```

매칭된 문서만 반환합니다 — 제목, 요약, 발췌문. 요약만으로 부족할 때만 전체 문서를 읽습니다.

### 컨텍스트 최신 상태 유지

```bash
gctree update-global-context   # 또는: gctree update-gc / gctree ugc
```

가이드형 업데이트 플로우 — AI 도구가 무엇이 바뀌었는지 물어보고 새 컨텍스트를 gc-branch에 씁니다.

### 특정 레포에 컨텍스트 범위 지정

```bash
gctree set-repo-scope --branch project-b --include   # 현재 레포 포함
gctree set-repo-scope --branch project-b --exclude   # 현재 레포 제외
```

관계없는 레포에는 컨텍스트가 주입되지 않습니다.

---

## 컨텍스트 저장 구조

```
~/.gctree/
  branches/
    main/
      index.md          ← 압축 인덱스, 먼저 로드됨
      docs/
        auth.md         ← 전체 문서, 필요할 때만 읽음
        architecture.md
    project-b/
      index.md
      docs/
        ...
  branch-repo-map.json  ← 어떤 레포가 어떤 gc-branch에 속하는지
  settings.json         ← 선호 프로바이더, 언어
```

컨텍스트는 레포 밖에 저장됩니다 — `.gitignore` 규칙 불필요, 실수로 커밋될 일 없음, 같은 gc-branch를 쓰는 모든 프로젝트에서 재사용 가능.

---

## 핵심 명령

| 목적                              | 명령                                                            |
| --------------------------------- | --------------------------------------------------------------- |
| gc-tree 초기화 및 프로바이더 선택 | `gctree init`                                                   |
| 활성 gc-branch 확인               | `gctree status`                                                 |
| 활성 컨텍스트 검색                | `gctree resolve --query "..."`                                  |
| gc-branch 생성 또는 전환          | `gctree checkout <branch>` / `gctree checkout -b <branch>`      |
| 모든 gc-branch 목록               | `gctree branches`                                               |
| 빈 gc-branch 가이드형 온보딩      | `gctree onboard`                                                |
| 활성 gc-branch 가이드형 업데이트  | `gctree update-global-context` / `gctree ugc`                   |
| 레포 범위 규칙 확인               | `gctree repo-map`                                               |
| 현재 레포 포함/제외 설정          | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| 재온보딩 전 gc-branch 초기화      | `gctree reset-gc-branch --branch <name> --yes`                  |
| 특정 레포에 로컬 override 설치   | `gctree scaffold --host codex --target /path/to/repo`           |
| gctree 업데이트 및 모든 프로바이더 재스캐폴드 | `gctree update`                                        |
| 전역 gc-tree 활성화와 컨텍스트 제거 | `gctree uninstall --yes`                                     |

---

## 문서

- **컨셉** — [`docs/concept.ko.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.ko.md)
- **원리** — [`docs/principles.ko.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.ko.md)
- **사용방법** — [`docs/usage.ko.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.ko.md)
- **로컬 개발** — [`docs/local-development.ko.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.ko.md)

---

## 기여하기

기여는 언제든 환영합니다. 개발 흐름과 PR 체크리스트는 [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md)를 참고하세요.

---

## 라이선스

MIT. [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE) 참고.
