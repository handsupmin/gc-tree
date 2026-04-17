# 로컬 개발

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## 요약

로컬 개발은 일반적인 Node.js 20+ 흐름을 따릅니다. 의존성을 설치하고, CLI를 빌드하고, 로컬에서 실행해 보고, 변경을 보내기 전에 기존 테스트 스위트로 검증하면 됩니다.

## 준비물

- Node.js 20+
- npm
- provider 실행을 직접 확인해보고 싶다면 로컬 `codex` 및 / 또는 `claude` 바이너리

## 설정

```bash
npm install
npm run build
```

## 로컬에서 CLI 실행하기

### 방법 1: 빌드된 엔트리를 직접 실행

```bash
node dist/src/cli.js status
```

### 방법 2: CLI를 셸에 링크해서 사용

```bash
npm link
gctree status
```

TypeScript 소스를 수정했다면 CLI를 다시 테스트하기 전에 한 번 더 빌드하세요.

## 검증

PR을 열기 전에 아래 명령을 실행하세요.

```bash
npm run build
npm test
```

## repo-scope 테스트

현재 테스트 스위트는 다음을 커버합니다.

- provider 모드 저장 (`claude-code`, `codex`, `both`)
- 선호 언어 저장과 launch prompt에서의 강한 언어 유지
- 레포 인식 gc-branch 선택
- `resolve` 중 include / exclude 인터랙션
- branch repo map 업데이트
- 가이드형 온보딩 / 업데이트 경계

## provider 수동 E2E 확인

자동화 테스트는 Codex나 Claude Code 세션을 실제로 열지 않고도 launch plan을 검증할 수 있도록 provider 실행을 비활성화해 둡니다.
실제 launch 경로를 직접 확인해보고 싶다면, 임시 디렉터리에서 아래 중 하나를 실행해 보세요.

```bash
gctree init --provider codex
gctree init --provider claude-code
```

정상이라면 provider가 열리고 바로 `$gc-onboard` 또는 `/gc-onboard`를 받게 됩니다.

## 프로젝트 구조

- `src/` — CLI, 컨텍스트 저장소, provider 선택, repo-scope 매핑, 가이드형 온보딩 / 업데이트 흐름, 스캐폴딩 로직
- `tests/` — CLI 및 동작 테스트
- `skills/` — 도구 비종속 워크플로 스킬
- `scaffolds/` — 호스트별 부트스트랩 템플릿
- `docs/` — 개념, 원칙, 사용법, 개발 문서
