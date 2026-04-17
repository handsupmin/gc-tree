# 로컬 실행방법

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## Summary

로컬 개발은 일반적인 Node.js 20+ 워크플로를 따릅니다. 의존성을 설치하고, CLI를 빌드한 뒤, 로컬에서 실행하고, 제출 전에 기존 테스트로 검증하면 됩니다.

## 패키지 상태

`gc-tree`는 npm 패키지 형태로 준비되어 있지만, 공개 unscoped 배포는 이름이 `rc-tree`와 너무 비슷하다는 npm 유사성 정책 때문에 아직 막혀 있습니다.
일상적인 개발은 아래 소스 워크플로로 진행하고, 릴리스 시도 전에는 `npm publish --dry-run`을 꼭 실행하세요.

## 준비사항

- Node.js 20+
- npm
- provider 런치를 수동으로 점검하려면 로컬 `codex` 또는 `claude` 바이너리

## 설정

```bash
npm install
npm run build
```

## 로컬에서 CLI 실행

### 방법 1: 빌드된 엔트리를 직접 실행

```bash
node dist/src/cli.js status
```

### 방법 2: 셸에 CLI를 링크

```bash
npm link
gctree status
```

TypeScript 소스를 수정했다면 다시 테스트하기 전에 재빌드하세요.

## 검증

변경을 제출하기 전에 다음을 실행하세요.

```bash
npm run build
npm test
npm publish --dry-run
```

## 레포 범위 관련 테스트

현재 테스트 스위트는 다음을 검증합니다.

- provider 모드(`claude-code`, `codex`, `both`) 저장
- 선호 언어 저장과 launch prompt에서의 강한 언어 고정
- 레포에 따른 gc-branch 선택
- `resolve` 중 include/exclude 인터랙션
- branch repo map 갱신
- 가이드형 온보딩/업데이트 경계 조건

## 수동 provider E2E 점검

자동 테스트는 Codex/Claude Code 세션을 실제로 열지 않도록 provider launch를 비활성화한 상태에서 launch plan만 검증합니다.
실제 런치 경로를 직접 확인하고 싶다면 임시 디렉터리에서 다음처럼 실행하면 됩니다.

```bash
gctree init --provider codex
gctree init --provider claude-code
```

정상이라면 provider가 실제로 열리고, 바로 `$gc-onboard` 또는 `/gc-onboard` 명령이 주입되어야 합니다.

## 프로젝트 구조

- `src/` — CLI, 컨텍스트 저장소, provider 선택, 레포 범위 매핑, 가이드형 온보딩/업데이트 흐름, 스캐폴딩 로직
- `tests/` — CLI 및 동작 테스트
- `skills/` — 도구 독립형 워크플로 스킬
- `scaffolds/` — 호스트별 bootstrap 템플릿
- `docs/` — concept, principles, usage, development 문서
