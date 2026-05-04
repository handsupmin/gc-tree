# 로컬 개발

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## 요약

로컬 개발은 표준 Node.js 20+ 워크플로우를 따릅니다: 의존성 설치, CLI 빌드, 로컬 실행, 변경 사항을 내보내기 전에 기존 테스트 스위트로 검증.

## 사전 요구 사항

- Node.js 20+
- npm
- 프로바이더 실행을 직접 도그푸딩하려면 로컬에 `codex` 및/또는 `claude` 바이너리 필요

## 설정

```bash
npm install
npm run build
```

## CLI 로컬 실행

### 옵션 1: 빌드된 엔트리를 직접 실행

```bash
node dist/src/cli.js status
```

### 옵션 2: CLI를 셸에 링크

```bash
npm link
gctree status
```

TypeScript 소스를 변경한 경우, CLI를 다시 테스트하기 전에 재빌드하세요.

## 검증

풀 리퀘스트를 열기 전에 다음을 실행하세요:

```bash
npm run build
npm test
```

### 평가 스위트

유닛 테스트 외에도, 현실적인 픽스처를 기반으로 resolve 품질을 측정하는 평가 스위트가 있습니다:

```bash
npm run eval                  # 5시나리오 합성 스위트 (온보딩, resolve, 토큰 효율성, 업데이트, 격리)
npm run eval:verbose          # 동일, 케이스별 상세 출력
npm run eval:multi-repo       # cosmo 스타일 픽스처를 사용한 크로스 저장소 격리 테스트
npm run eval:real-docs        # 실제 Notion 익스포트에 대한 재현율 및 정밀도 측정 (로컬 문서 필요)
npm run eval:autoresearch     # 반복적 resolve 개선 루프 (src/resolve.ts를 직접 수정함)
```

예상 기준선 (`npm run eval` 실행으로 확인):

| 스위트 | 목표 |
| --- | --- |
| 합성 (5 시나리오) | 5/5 PASS, 평균 ≥ 90% |
| 다중 저장소 | 전체 ≥ 80% |
| 실제 문서 | 재현율 ≥ 90%, F1 ≥ 80% |

`src/resolve.ts`를 수정한 경우, PR을 열기 전에 `npm test && npm run eval && npm run eval:real-docs`를 실행하세요.

## 테스트 커버리지

유닛 테스트 스위트가 현재 다루는 항목:

- 프로바이더 모드 영속성 (`claude-code`, `codex`, `both`)
- 선호 언어 영속성 및 실행 프롬프트에서의 강력한 언어 적용
- 저장소 인식 gc-branch 선택
- `resolve` 중 인터랙티브 포함/제외 결정
- 브랜치 저장소 맵 업데이트
- 안내된 온보딩/업데이트 흐름 경계

## 수동 프로바이더 E2E 확인

자동화된 테스트는 실제 Codex나 Claude Code 세션을 열지 않고 실행 계획을 검증할 수 있도록 프로바이더 실행을 비활성화합니다.
실제 실행 경로를 도그푸딩하려면 임시 디렉토리에서 다음 중 하나를 실행하세요:

```bash
gctree init --provider codex
gctree init --provider claude-code
```

프로바이더가 열리고 즉시 `$gc-onboard` 또는 `/gc-onboard`를 받는 것을 확인해야 합니다.

## 프로젝트 레이아웃

- `src/` — CLI, 컨텍스트 저장소, 프로바이더 선택, 저장소 범위 매핑, 안내된 온보딩/업데이트 흐름, scaffold 로직
- `tests/` — 유닛 테스트 및 평가 스크립트
- `skills/` — 도구에 구애받지 않는 워크플로우 스킬 (Claude Code에서 사용)
- `scaffolds/` — 플레이스홀더 디렉토리; scaffold 파일 내용은 `src/scaffold.ts`에서 프로그래밍 방식으로 생성됨
- `docs/` — 개념, 원칙, 사용법, 개발 문서
