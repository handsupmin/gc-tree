# gc-tree

AI 코딩 도구를 위한 브랜치 기반 글로벌 컨텍스트 레이어.

[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh.md) | [日本語](README.ja.md) | [Español](README.es.md)

## 소개

`gctree`는 AI 코딩 도구를 위한 가벼운 **Global Context Tree**입니다.
장기적으로 유지해야 하는 컨텍스트를 파일 기반으로 명시적으로 관리할 수 있게 해주며, 브랜치 단위로 분리해서 기존 워크플로에 자연스럽게 붙일 수 있습니다.

하나의 `AGENTS.md`, `CLAUDE.md`, 혹은 짧은 프롬프트 파일만으로는 부족해질 때 `gctree`는 다음을 도와줍니다.

- 제품, 고객사, 업무 트랙별로 컨텍스트를 분리하기
- 숨겨진 메모리 대신 markdown 기반의 source-of-truth 문서로 관리하기
- 작은 인덱스와 summary-first 문서 구조로 필요한 컨텍스트를 빠르게 찾기
- 선호하는 LLM CLI를 통해 온보딩과 장기 업데이트를 진행하기
- 특정 gc-branch가 실제로 관련 있는 레포에만 적용되게 하기

## 간단 특징

- **Provider 기반 온보딩**  
  `gctree init`은 `claude-code`, `codex`, `both` 중 어떤 provider 모드를 쓸지 묻고, 이어서 응답 언어를 고르게 한 뒤, 그 선택을 저장하고 필요한 명령 표면을 스캐폴딩한 다음 기본 `main` gc-branch 온보딩을 시작합니다.
- **레포 범위 인식 gc-branch**  
  `~/.gctree/branch-repo-map.json`을 통해 하나의 gc-branch를 특정 레포 집합에만 연결할 수 있습니다. 예를 들어 A는 B/C/D에만 적용하고 F에서는 무시하게 만들 수 있습니다.
- **인터랙티브 범위 가드**  
  `gctree resolve`가 현재 레포가 아직 이 gc-branch에 매핑되지 않았다고 판단하면, 이번만 진행할지 / 항상 사용할지 / 여기서는 무시할지를 물어볼 수 있습니다.
- **Summary-first 문서 구조**  
  도구가 먼저 짧은 요약을 읽고, 필요할 때만 본문을 확장해서 읽을 수 있습니다.
- **가이드형 장기 업데이트**  
  JSON 파일을 직접 만들지 않아도 같은 provider 흐름으로 글로벌 컨텍스트를 갱신할 수 있습니다.

## 설치 및 빠른 시작

`gc-tree`는 이미 npm CLI 형태로 패키징되어 있지만, 공개 unscoped 배포는 아직 사용할 수 없습니다.
`npm install gc-tree`가 `404`를 내는 이유는 정확히 그 이름으로 발행된 패키지가 없기 때문이고, 반대로 `npm publish`는 `gc-tree` 이름이 `rc-tree`와 너무 비슷하다는 이유로 npm에서 막고 있습니다.
이 레지스트리 이슈가 해결되기 전까지는 아래처럼 소스에서 설치해야 합니다.

### 당분간은 소스에서 설치

```bash
git clone https://github.com/handsupmin/gc-tree.git
cd gc-tree
npm install
npm run build
npm link
```

**요구 사항:** Node.js 20+

### 빠른 시작

#### 1) gc-tree 초기화

```bash
gctree init
```

이 명령은 다음을 수행합니다.

- `~/.gctree` 생성
- 기본 `main` gc-branch 생성
- 사용할 provider 모드(`claude-code`, `codex`, `both`) 선택
- `both`를 고르면 이번 온보딩을 어느 provider로 시작할지 한 번 더 선택
- 사용할 언어(`English`, `Korean`, 또는 직접 입력한 언어) 선택
- provider 모드, 실제 온보딩 provider, 언어를 `~/.gctree/settings.json`에 저장
- 현재 환경에 맞는 명령 표면 스캐폴딩
- `main`이 비어 있으면 활성 gc-branch에 대한 가이드형 온보딩 시작

#### 2) 현재 컨텍스트 조회

```bash
gctree resolve --query "auth token rotation"
```

만약 현재 레포가 이 gc-branch의 매핑 범위 밖이라면, `gctree`는 다음 중 하나를 고르게 할 수 있습니다.

1. 이번만 진행
2. 이 레포에서 항상 이 gc-branch 사용
3. 이 레포에서는 이 gc-branch 무시

2번 또는 3번을 고르면 `~/.gctree/branch-repo-map.json`이 갱신됩니다.

#### 3) 별도 컨텍스트가 필요하면 새 gc-branch 생성

```bash
gctree checkout -b client-b
```

`checkout -b`는 **새로운 빈 gc-branch**를 만듭니다. 기존 브랜치 문서를 복사하지 않습니다.

#### 4) 비어 있는 gc-branch를 온보딩

```bash
gctree onboard
```

#### 5) 나중에 장기 컨텍스트 업데이트

```bash
gctree update-global-context
```

짧은 별칭:

```bash
gctree update-gc
gctree ugc
```

만약 실제 작업을 하다 보니 어떤 레포가 현재 gc-branch에 포함되어야 할 것 같다면, 자연스러운 흐름은 이렇습니다.

1. 먼저 그 레포를 branch repo map에 포함시키고
2. 그 다음 `gctree update-global-context`로 이 레포가 어떤 역할을 하는지, 왜 중요한지 같은 장기 컨텍스트를 추가

#### 6) 다시 온보딩하려면 먼저 gc-branch 리셋

```bash
gctree reset-gc-branch --branch client-b --yes
```

### 런타임에서 보이는 provider 명령

스캐폴딩 이후 런타임에서 보이는 명령은 다음과 같습니다.

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

이 명령들은 항상 현재 활성 gc-branch가 무엇인지 먼저 밝히고, 사용자가 명시적으로 바꾸라고 하지 않는 한 저장된 언어를 끝까지 유지하면서 컨텍스트를 수집하거나 업데이트해야 합니다.

### 핵심 명령 한눈에 보기

| 목적 | 명령 |
| --- | --- |
| gc-tree 초기화 및 provider 선택 | `gctree init` |
| 현재 gc-branch 확인 | `gctree status` |
| 현재 컨텍스트 검색 | `gctree resolve --query "..."` |
| 레포 범위 규칙 확인 | `gctree repo-map` |
| gc-branch에 레포 포함/제외 설정 | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| gc-branch 생성/전환 | `gctree checkout <branch>` / `gctree checkout -b <branch>` |
| 비어 있는 gc-branch 온보딩 | `gctree onboard` |
| 활성 gc-branch 장기 업데이트 | `gctree update-global-context` / `gctree update-gc` / `gctree ugc` |
| 다시 온보딩하기 전 gc-branch 초기화 | `gctree reset-gc-branch --branch <name> --yes` |
| 다른 환경에 수동 스캐폴딩 | `gctree scaffold --host codex --target /path/to/repo` |

## 문서

자세한 문서는 [`docs/`](docs) 아래에 정리되어 있습니다.

- **컨셉** — [`docs/concept.ko.md`](docs/concept.ko.md)  
  `gctree`가 무엇인지, 어떤 문제를 해결하는지, 글로벌 컨텍스트 레이어의 범위를 설명합니다.
- **원리** — [`docs/principles.ko.md`](docs/principles.ko.md)  
  gc-branch, 레포 범위, slim index, summary-first 문서, 가이드형 업데이트 원칙을 정리합니다.
- **사용방법** — [`docs/usage.ko.md`](docs/usage.ko.md)  
  표준 CLI 흐름, provider 명령, 레포 범위 동작, 통합 패턴을 안내합니다.
- **로컬 실행방법** — [`docs/local-development.ko.md`](docs/local-development.ko.md)  
  의존성 설치, 로컬 CLI 실행, 변경 검증 방법을 설명합니다.

## 기여하기

기여는 언제든 환영합니다. 개발 흐름과 PR 체크리스트는 영어 문서인 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고해주세요.

## 라이선스

MIT. 자세한 내용은 [`LICENSE`](LICENSE)를 참고하세요.
