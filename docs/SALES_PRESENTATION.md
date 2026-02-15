# SW 품질 검증 통합 솔루션

> 코드 품질 / AI 분석 / 보안 취약점 / 웹 접근성 — 4개 도구로 감리 전 영역을 커버합니다.

---

## 감리 현장의 과제

| 과제 | 현재 상황 | 문제점 |
|------|----------|--------|
| 코드 품질 | SonarQube 서버 구축 or 수작업 | 서버 비용, 라이선스, 관리 부담 |
| 코드 리뷰 | 수작업 / 경험 의존 | 일관성 없음, 시간 소모 |
| 보안 취약점 | Burp Suite ($449/년) or 수작업 | 고비용, GUI 의존, 자동화 어려움 |
| 웹 접근성 | 외부 전문 업체 위탁 or OpenWAX | 비용, 인력, KWCAG 2.2 미대응 |

**공통 문제:**
- 도구마다 별도 설치/설정/교육 필요
- 오프라인(폐쇄망) 환경 지원 미흡
- 한국 표준(전자정부프레임워크, KWCAG 2.2, 시큐어코딩 가이드) 미대응
- 리포트 형식 불일치 — 감리 납품물 재가공 필요

---

## 솔루션: 4개 도구 통합 라인업

```
  소스코드         API/웹서비스         웹 사이트
     |                  |                  |
     v                  v                  v
 ┌────────┐      ┌────────────┐      ┌──────────┐
 │  APEX   │      │   Argus    │      │   ARIA   │
 │코드 품질│      │  보안 취약점│      │ 웹 접근성│
 └────┬───┘      └─────┬──────┘      └────┬─────┘
      |                |                   |
      v                v                   v
 ┌──────────────────────────────────────────────┐
 │              ACTIVO (AI 분석)                  │
 │       전체 결과를 AI가 종합 분석/리포트          │
 └──────────────────────────────────────────────┘
      |
      v
  감리 납품물 (Excel / HTML / JSON)
```

---

## 도구 라인업 요약

| 항목 | APEX | ACTIVO | Argus CLI | ARIA |
|------|-----|--------|-----------|------|
| **영역** | 코드 품질 | AI 코드 분석 | API 보안 | 웹 접근성 |
| **언어** | Go | TypeScript | Go | TypeScript |
| **배포** | 단일 바이너리 (15MB) | npm 패키지 | 단일 바이너리 (25MB) | 단일 바이너리 (59MB) |
| **설치** | 실행 파일 복사 | `npm install -g` | 실행 파일 복사 | 실행 파일 복사 |
| **오프라인** | 완전 지원 | 완전 지원 (Ollama) | 완전 지원 | 완전 지원 |
| **한국 표준** | 전자정부프레임워크 | 개발표준 RAG | OWASP Top 10 | KWCAG 2.2 |
| **규칙 수** | 300+ YAML | 50+ 분석 도구 | 206 YAML | 33항목 (axe-core+9 커스텀) |
| **AI 연동** | - | Ollama / Azure OpenAI | Ollama / Azure OpenAI | - |
| **리포트** | Console/JSON/HTML | 대화형/JSON | Excel/HTML/JSON | Excel/HTML/JSON |
| **CI/CD** | exit code 연동 | headless 모드 | exit code 연동 | `--ci` 모드 |

---

## 1. APEX (Code Quality Analyzer)

> 정적 코드 품질 분석 도구 — YAML 선언형 규칙, 단일 바이너리, 제로 설치

### 핵심 가치

- **15MB 단일 바이너리** — JDK/Node.js 불필요, 실행 파일 하나로 즉시 사용
- **300+ YAML 규칙** — 코드 작성 없이 조직 표준에 맞게 커스터마이징
- **6개 검사 프로필** — quality / secure / sql / modernize / spring / egov
- **전자정부프레임워크 전용 33개 규칙** — 공공기관 SI 프로젝트 필수

### 경쟁 도구 비교

| 항목 | SonarQube | Checkstyle+PMD | APEX |
|------|-----------|----------------|-----|
| 설치 | 서버 구축 필요 (Java+DB) | JDK + XML 설정 | 실행 파일 복사 (15MB) |
| 라이선스 | Community 무료 / Enterprise 유료 | 무료 | 자체 라이선스 |
| 한국 표준 | 미지원 | 직접 XML 작성 | 전자정부 프로필 내장 |
| 규칙 추가 | Java 플러그인 개발 | XML 설정 | YAML 파일 편집 |
| SQL 검사 | 미지원 | 미지원 | MyBatis XML 포함 55+ 규칙 |
| 오프라인 | 가능 (서버 구축 시) | 가능 | 완전 오프라인 |
| 리포트 | 웹 대시보드 | 콘솔 텍스트 | Console/JSON/HTML/Excel |

### 실행 예시

```bash
# 전체 프로필 검사
./apex /path/to/project --profile=all

# 전자정부 검사만
./apex /path/to/project --profile=egov-full

# Excel 리포트 출력
./apex /path/to/project --profile=all --format=xlsx --output=report.xlsx
```

### 검출 항목 주요 카테고리

| 카테고리 | 규칙 수 | 주요 검출 |
|----------|---------|----------|
| 명명규칙 | 18 | Controller/Service/Mapper/VO 접미사, 카멜/파스칼 표기법 |
| 코딩 스타일 | 8 | 탭 문자, 한 줄 여러 문장, 공백 규칙 |
| 로깅 | 7 | System.out 사용, Logger 포맷, 로그 레벨 |
| 예외 처리 | 5 | 빈 catch, root cause 미전달, 일반 Exception throw |
| 보안 (시큐어코딩) | 65+ | SQL Injection, XSS, 하드코딩 비밀번호, 취약 암호화 |
| SQL 작성 | 55+ | SELECT *, N+1, MyBatis ${} 인젝션, WHERE 누락 |
| Spring | 26 | 트랜잭션, 의존성 주입, 어노테이션 패턴 |
| 전자정부 | 33 | eGov 3.x/4.x 표준, 마이그레이션 규칙 |

---

## 2. ACTIVO (AI Code Analysis)

> 로컬 LLM 기반 대화형 코드 분석 에이전트 — 한 마디로 멀티스택 프로젝트 자동 분석

### 핵심 가치

- **100% 로컬 실행** — 코드가 외부로 나가지 않음 (Ollama 로컬 LLM)
- **50+ 분석 도구 자동 실행** — 언어 자동 감지, 도구 자동 선택
- **한국어 AI 리포트** — "왜 문제인지, 어떻게 고치는지" 설명
- **개발표준 RAG 검사** — HWP/PDF 표준 문서를 AI가 읽고 코드 검사

### 경쟁 도구 비교

| 항목 | SonarQube | GitHub Copilot | ACTIVO |
|------|-----------|----------------|--------|
| 실행 위치 | 서버 | 클라우드 | 로컬 (오프라인 가능) |
| 코드 유출 | 서버 전송 | GitHub 전송 | 외부 전송 없음 |
| AI 분석 | 정적 규칙만 | PR 코멘트 | 맥락 이해 + 우선순위 판단 |
| 한국어 | 미지원 | 부분 | 완전 한국어 |
| 개발표준 | 미지원 | 미지원 | HWP/PDF RAG 검사 |
| 가격 | Enterprise 유료 | $19/월/인 | 자체 라이선스 |

### 지원 언어 및 분석 항목

| 언어/기술 | 주요 검출 항목 |
|-----------|---------------|
| **Java** | NPE 위험, 빈 catch, printStackTrace, Spring 패턴 |
| **TypeScript/JS** | 순환 복잡도, 함수 호출 그래프, React/Vue 패턴 |
| **Python** | eval/exec 보안, Django/Flask/FastAPI 패턴 |
| **SQL/MyBatis** | SQL Injection, SELECT *, N+1, 동적 SQL 복잡도 |
| **CSS/SCSS** | !important 남용, 셀렉터 복잡도, z-index |
| **HTML/JSP** | 접근성 점수, SEO 점수, 시맨틱 태그 |
| **의존성** | Log4Shell 등 보안 취약점, deprecated 패키지 |

### 실행 예시

```bash
# 대화형 분석
activo "src 폴더 전체 분석해줘"

# 개발표준 검사
activo "개발표준.pdf 임포트해줘"
activo "UserService.java를 개발표준 기준으로 검사해줘"

# CI/CD headless 모드
activo --headless "analyze_all src/"
```

---

## 3. Argus CLI (API Security)

> API 보안 취약점 분석 도구 — Burp Suite 핵심 기능을 CLI/TUI로 구현

### 핵심 가치

- **25MB 단일 바이너리** — Burp Suite 대비 설치/환경 부담 제로
- **206개 YAML 보안 룰** — OWASP API Security Top 10 전체 커버
- **8개 보안 도구 통합** — Proxy, Scanner, Intruder, Repeater, Sequencer, Crawler, Report, Store
- **완전 오프라인** — 폐쇄망 환경 보안 테스트 가능

### 경쟁 도구 비교 (Burp Suite Professional)

| 항목 | Burp Suite Pro | Argus CLI |
|------|---------------|-----------|
| 가격 | 연간 $449 (약 60만원) | 자체 라이선스 |
| 실행 환경 | Java (JVM 필수) | Go 단일 바이너리 |
| 인터페이스 | GUI (Swing) | CLI + TUI |
| 보안 룰 | 내장 (비공개) | 206개 YAML (공개, 편집 가능) |
| 속도 제한 | Community: 1req/s | 제한 없음 |
| AI 분석 | 없음 | Ollama/Azure OpenAI |
| 오프라인 | 부분 지원 | 완전 오프라인 |
| CI/CD 연동 | 제한적 | exit code + JSON 리포트 |
| 민감정보 탐지 | 제한적 | 주민번호, 카드번호, JWT, API키 |

### 8개 통합 도구

| 도구 | 기능 | Burp 대응 |
|------|------|----------|
| **Proxy** | HTTP/HTTPS 트래픽 가로채기 + 패시브 스캔 | Proxy |
| **Scanner** | 206 YAML 룰 기반 자동 취약점 탐지 | Scanner |
| **Intruder** | 4가지 공격 모드 (Sniper/Battering Ram/Pitchfork/Cluster Bomb) | Intruder |
| **Repeater** | 요청 수정/재전송 | Repeater |
| **Sequencer** | 토큰 엔트로피 분석 | Sequencer |
| **Crawler** | HTML 파서 기반 크롤링 + 자동 스캔 | Spider |
| **Report** | Excel/HTML/JSON 감리 납품물 생성 | Report |
| **Store** | SQLite 기반 트래픽/결과 저장 | Project |

### 실행 예시

```bash
# 프록시 시작 + 패시브 스캔
argus-cli proxy start --port 8082 --passive-scan

# 풀 스캔 (크롤링 + 패시브 + 액티브)
argus-cli scan full http://target.com --depth 5

# SQL Injection 퍼징
argus-cli intruder run --request req.txt --payloads sqli-basic --type sniper

# Excel 리포트
argus-cli report generate --format excel --output security-report.xlsx
```

---

## 4. ARIA (Web Accessibility)

> KWCAG 2.2 웹 접근성 자동 점검 도구 — axe-core + 9개 한국 특화 커스텀 룰

### 핵심 가치

- **59MB 단일 바이너리** — Node.js 설치 불필요, 바로 실행
- **KWCAG 2.2 전체 33항목 대응** — 14항목 완전자동 + 16항목 부분자동 + 3항목 수동
- **axe-core + 9개 커스텀 룰** — 국제 표준 엔진 위에 한국 특화 규칙 추가
- **감리 납품물 자동 생성** — Excel 3시트(요약/상세/체크리스트), HTML, JSON

### 경쟁 도구 비교

| 항목 | OpenWAX (크롬 확장) | WAVE | 전문 업체 위탁 | ARIA |
|------|---------------------|------|---------------|------|
| 가격 | 무료 | 무료/유료 | 건당 수백만원 | 자체 라이선스 |
| 자동화 | 수동 (페이지별 클릭) | 수동 | 수동 | CLI 자동화 |
| 사이트 전체 | 불가 | 불가 | 가능 | 크롤링+자동 스캔 |
| KWCAG 2.2 | 부분 | WCAG (한국 미특화) | 전체 | 33항목 전체 |
| 리포트 | 브라우저 표시 | 브라우저 표시 | 수작업 문서 | Excel/HTML/JSON |
| CI/CD | 불가 | API (유료) | 불가 | `--ci` 모드 |
| 커스텀 룰 | 불가 | 불가 | 해당없음 | 9개 한국 특화 룰 |

### KWCAG 2.2 — 4원칙 33항목 점검 현황

| 원칙 | 항목수 | 완전자동 | 부분자동 | 수동 |
|------|--------|---------|---------|------|
| 1. 인식의 용이성 | 9 | 4 | 5 | 0 |
| 2. 운용의 용이성 | 15 | 7 | 6 | 2 |
| 3. 이해의 용이성 | 7 | 2 | 4 | 1 |
| 4. 견고성 | 2 | 2 | 0 | 0 |
| **합계** | **33** | **15** | **15** | **3** |

### 9개 한국 특화 커스텀 룰

| 규칙 | KWCAG | 검사 내용 |
|------|-------|----------|
| skip-nav | 6.4.1 | 반복 영역 건너뛰기 링크 존재 여부 |
| auto-play | 5.4.2 | video/audio autoplay, iframe 자동재생 |
| blink-flash | 6.3.1 | blink/marquee 태그, CSS 애니메이션 주기 |
| page-title | 6.4.2 | 페이지 제목, iframe title, 제목 수준 건너뛰기 |
| table-structure | 5.3.1 | 데이터 테이블 caption, th scope 속성 |
| lang-attr | 7.1.1 | html lang 속성 존재 및 유효성 |
| link-text | 6.4.3 | "여기", "클릭" 등 모호한 링크 텍스트 탐지 |
| on-input | 7.2.1 | select onchange 자동 submit/navigation |
| focus-visible | 6.1.2 | outline:none, 양수 tabindex 경고 |

### 실행 예시

```bash
# 단일 페이지 점검
./aria scan https://www.example.go.kr

# 상세 위반 내용 확인
./aria scan https://www.example.go.kr --verbose

# 사이트 전체 크롤링 점검
./aria crawl https://www.example.go.kr --depth 3 --max-pages 50

# CI/CD 모드 (위반 시 exit code 1)
./aria scan https://www.example.go.kr --ci --threshold 0

# Excel 리포트 생성
./aria report -f excel -o accessibility-report.xlsx
```

### 실제 공공기관 점검 결과 (2025년 2월)

| 사이트 | 준수율 | 주요 위반 항목 |
|--------|--------|---------------|
| 행정안전부 (mois.go.kr) | 42.4% | 조작 가능, 제목 제공 |
| 대한민국 정부 (korea.kr) | 36.4% | 명도 대비, 반복 영역 건너뛰기 |
| 국세청 (nts.go.kr) | 33.3% | 명도 대비, 조작 가능 |
| 교육부 (moe.go.kr) | 33.3% | 대체 텍스트, ARIA 오류 |
| 국회 (assembly.go.kr) | 24.2% | 명도 대비, 키보드, 초점 |
| 경찰청 (police.go.kr) | 33.3% | 키보드, 초점, 링크 텍스트 |
| 서울시 (seoul.go.kr) | 36.4% | 명도 대비, 조작 가능, 초점 |

> 장애인차별금지법에 의해 모든 공공기관은 웹 접근성을 의무적으로 준수해야 합니다.
> 실제 점검 결과, 주요 공공기관의 자동 점검 준수율은 24~42%로 개선이 필요합니다.

---

## 통합 활용 시나리오

### 시나리오 1: 공공 SI 프로젝트 감리

```
1단계: 코드 품질 검사 (APEX)
   ./apex /project/src --profile=egov-full --format=xlsx

2단계: AI 심층 분석 (ACTIVO)
   activo "개발표준.pdf 기준으로 src 전체 검사해줘"

3단계: API 보안 점검 (Argus)
   argus-cli scan full http://dev-server:8080 --depth 5

4단계: 웹 접근성 점검 (ARIA)
   ./aria crawl http://dev-server:8080 --depth 3 --max-pages 50

납품물: 4개 Excel 리포트 + AI 종합 분석 보고서
```

### 시나리오 2: CI/CD 파이프라인 통합

```yaml
# GitLab CI / Jenkins / GitHub Actions
stages:
  - quality
  - security
  - accessibility

code-quality:
  script:
    - ./apex src/ --profile=essential --format=json --output=apex-result.json
    - activo --headless "analyze_all src/"

security-scan:
  script:
    - argus-cli scan full $STAGING_URL --ci --threshold 0

accessibility-check:
  script:
    - ./aria scan $STAGING_URL --ci --threshold 0
```

### 시나리오 3: 정기 보안/접근성 모니터링

```bash
# crontab - 매주 월요일 자동 점검
0 9 * * 1 ./aria crawl https://www.agency.go.kr --depth 3 -o weekly-a11y.json
0 9 * * 1 argus-cli scan full https://api.agency.go.kr -o weekly-sec.json
```

---

## 기술 사양 비교

| 항목 | APEX | ACTIVO | Argus CLI | ARIA |
|------|-----|--------|-----------|------|
| **언어** | Go 1.22+ | TypeScript 5.x | Go 1.22+ | TypeScript 5.x |
| **런타임** | 없음 (네이티브) | Node.js 20+ / Bun | 없음 (네이티브) | 없음 (Bun 컴파일) |
| **바이너리** | 15MB | npm 패키지 | 25MB | 59MB |
| **데이터 저장** | - | 파일 기반 | SQLite | SQLite (WASM) |
| **브라우저** | 불필요 | 불필요 | 불필요 | 시스템 Chrome 사용 |
| **AI 엔진** | - | Ollama (로컬) | Ollama / Azure OpenAI | - |
| **규칙 형식** | YAML 선언형 | 내장 도구 | YAML 선언형 | axe-core + TypeScript |
| **OS 지원** | Windows/Linux/macOS | Windows/Linux/macOS | Windows/Linux/macOS | Windows/Linux/macOS |
| **아키텍처** | amd64, arm64 | 크로스 플랫폼 | amd64, arm64 | arm64 (Bun), 크로스 플랫폼 (Node) |

---

## 공통 강점

### 1. 오프라인 완전 지원
모든 도구가 인터넷 없이 동작합니다. 공공기관, 금융기관 등 폐쇄망 환경에서도 그대로 사용 가능합니다.

### 2. 제로 인프라
서버 구축, 데이터베이스, 컨테이너 없이 단일 실행 파일로 즉시 사용합니다. 감리 현장에 USB 하나로 배포 가능합니다.

### 3. 한국 표준 특화
- APEX: 전자정부프레임워크 33개 규칙
- ACTIVO: HWP/PDF 개발표준 RAG 검사
- Argus: OWASP API Top 10 + 한국형 민감정보 (주민번호, 카드번호)
- ARIA: KWCAG 2.2 전체 33항목 + 9개 한국 특화 룰

### 4. 규칙 커스터마이징
APEX와 Argus는 YAML 파일 편집만으로 규칙을 추가/수정/비활성화할 수 있습니다.
코드 작성 없이 현장 요구사항에 즉시 대응합니다.

### 5. 감리 납품물 자동 생성
4개 도구 모두 Excel/HTML/JSON 리포트를 자동 생성합니다.
수작업 문서 작성 시간을 대폭 절감합니다.

### 6. CI/CD 통합
모든 도구가 exit code와 JSON 출력을 지원합니다.
Jenkins, GitLab CI, GitHub Actions 등 기존 파이프라인에 바로 연동 가능합니다.

---

## 경쟁 솔루션 종합 비교

| 검증 영역 | 기존 방식 | 비용 | 우리 도구 | 비용 |
|----------|----------|------|----------|------|
| 코드 품질 | SonarQube Enterprise | 연 수천만원 + 서버 | **APEX** | 자체 라이선스 |
| AI 코드 분석 | GitHub Copilot (팀) | $19/월/인 | **ACTIVO** | 자체 라이선스 |
| API 보안 | Burp Suite Pro (팀) | $449/년/인 | **Argus CLI** | 자체 라이선스 |
| 웹 접근성 | 전문 업체 위탁 | 건당 수백만원 | **ARIA** | 자체 라이선스 |
| **합계** | 4개 도구 개별 도입 | **연 수천만원** | **4개 통합** | **단일 라이선스** |

---

## 도입 효과

| 항목 | 기존 | 도입 후 |
|------|------|---------|
| 감리 준비 기간 | 2~4주 | 1~2일 |
| 도구 설치/설정 | 도구별 반나절 | USB 복사 후 즉시 |
| 리포트 작성 | 수작업 2~3일 | 자동 생성 (분 단위) |
| 전문 인력 | 영역별 전문가 필요 | 범용 인력으로 가능 |
| 정기 점검 | 분기/반기 | 매주 자동화 가능 |
| 폐쇄망 대응 | 별도 설정 필요 | 기본 지원 |

---

## 제품 구성

### 기본 패키지

| 구성 | 포함 내용 |
|------|----------|
| 실행 파일 | APEX + Argus CLI + ARIA (단일 바이너리 3종) |
| ACTIVO | npm 패키지 + Ollama 런타임 |
| 규칙 파일 | APEX YAML 300+ / Argus YAML 206개 |
| 문서 | 설치 가이드, 사용 매뉴얼, 감리 활용 가이드 |
| 교육 | 반일 현장 교육 (4시간) |

### 옵션

| 옵션 | 내용 |
|------|------|
| 커스텀 규칙 개발 | 조직 표준에 맞는 APEX/Argus YAML 규칙 작성 |
| 개발표준 RAG 구축 | 조직 HWP/PDF 개발표준 → ACTIVO RAG 인덱싱 |
| CI/CD 연동 구축 | Jenkins/GitLab CI 파이프라인 구성 |
| 정기 점검 리포트 | 월간/분기 자동 점검 + 리포트 생성 자동화 |

---

## 요약

```
 ┌─────────────────────────────────────────────────┐
 │         SW 품질 검증 통합 솔루션                    │
 │                                                   │
 │  APEX ─────── 코드 품질 (300+ 규칙, 전자정부)       │
 │  ACTIVO ──── AI 분석 (로컬 LLM, 개발표준 RAG)     │
 │  Argus ───── API 보안 (206 룰, OWASP Top 10)     │
 │  ARIA ────── 웹 접근성 (KWCAG 2.2, 33항목)        │
 │                                                   │
 │  공통: 오프라인 / 단일 바이너리 / 한국 표준 / CI/CD  │
 └─────────────────────────────────────────────────┘
```

**4개 도구, 하나의 라이선스로 감리 전 영역을 커버합니다.**
