# Signalight — Landing Page Tasks

## Overview
마케팅 랜딩페이지. Signalight의 핵심 가치를 보여주고 사용자를 유입시키는 페이지.
Next.js + Tailwind + shadcn/ui. 다크 테마. 모바일 퍼스트.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Package Manager**: Bun
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Icons**: Lucide React
- **Animations**: Tailwind CSS animations (no extra library)
- **Fonts**: Geist (Next.js 기본)
- **Deploy**: Vercel

## Design System

### Theme Mode
- **Dark / Light / System** 세 가지 모드 지원
- `next-themes` 로 관리 (`ThemeProvider`)
- 헤더에 토글 버튼 (Sun / Moon / Monitor 아이콘)
- 기본값: `system` (OS 설정 자동 적용)
- `localStorage`에 유저 선택 저장

### Dark Mode Colors
- **Background**: `#09090b` (zinc-950)
- **Surface**: `#18181b` (zinc-900)
- **Border**: `#27272a` (zinc-800)
- **Text primary**: `#fafafa` (zinc-50)
- **Text muted**: `#71717a` (zinc-500)

### Light Mode Colors
- **Background**: `#ffffff` (white)
- **Surface**: `#f4f4f5` (zinc-100)
- **Border**: `#e4e4e7` (zinc-200)
- **Text primary**: `#09090b` (zinc-950)
- **Text muted**: `#71717a` (zinc-500)

### Shared Accent Colors (다크/라이트 공통)
- **Accent**: `#22c55e` (green-500) — signal / buy
- **Danger**: `#ef4444` (red-500) — sell / alert
- **Warning**: `#f59e0b` (amber-500) — caution

---

## G1: Project Setup

### 목표
Next.js 프로젝트 초기화, 의존성 설치, 기본 구조 셋업

### Tasks
- [ ] Bun으로 Next.js 프로젝트 초기화
  ```bash
  bun create next-app@latest signalight-landing --typescript --tailwind --app --src-dir --no-git
  ```
- [ ] 의존성 설치
  ```bash
  bun add lucide-react class-variance-authority clsx tailwind-merge
  bun add next-themes
  ```
- [ ] shadcn/ui 초기화 및 컴포넌트 설치
  ```bash
  bunx shadcn@latest init
  bunx shadcn@latest add button badge card separator
  ```
- [ ] 폴더 구조 생성
  ```
  signalight-landing/
  ├── src/
  │   ├── app/
  │   │   ├── layout.tsx          # 루트 레이아웃 + 메타데이터
  │   │   ├── page.tsx            # 랜딩페이지 조합
  │   │   └── globals.css         # 글로벌 스타일 + CSS 변수
  │   ├── components/
  │   │   ├── layout/
  │   │   │   ├── Header.tsx
  │   │   │   └── Footer.tsx
  │   │   └── sections/
  │   │       ├── Hero.tsx
  │   │       ├── Features.tsx
  │   │       ├── HowItWorks.tsx
  │   │       ├── Strategy.tsx
  │   │       ├── TelegramPreview.tsx
  │   │       ├── Pricing.tsx
  │   │       └── CtaBanner.tsx
  │   └── lib/
  │       └── utils.ts            # cn() helper
  ├── public/
  └── .env.local
  ```
- [ ] 다크 테마 색상 CSS 변수 설정 (`globals.css`)
- [ ] `ThemeProvider` 설정 (`next-themes`, defaultTheme: "system", enableSystem)
- [ ] `layout.tsx` 메타데이터 설정 (title, description, OG tags)
- [ ] `page.tsx` 섹션 조합 뼈대 작성
- [ ] 로컬 개발서버 실행 확인 (`bun dev`)

---

## G2: Navigation + Hero

### 목표
방문자가 처음 보는 두 영역. 브랜드 인상 + 핵심 가치 전달 + CTA

### Tasks

#### Header.tsx
- [ ] 로고 (📡 Signalight 텍스트 로고)
- [ ] 네비게이션 링크 (Features, How it Works, Pricing)
- [ ] CTA 버튼 ("Get Started" — 프리 플랜)
- [ ] 모바일 햄버거 메뉴 (shadcn Sheet 또는 간단한 toggle)
- [ ] 스크롤 시 배경 blur 효과 (`backdrop-blur`)

#### Hero.tsx
- [ ] 상단 배지 ("🚀 Now in Beta · Free to use")
- [ ] 메인 헤드라인
  ```
  Signal + Light
  When the signal fires,
  you see the light.
  ```
- [ ] 서브 헤드라인
  ```
  Personal stock signal scanner for ETF traders.
  RSI, MA crossover, drawdown alerts — straight to your Telegram.
  ```
- [ ] 우측 상단 테마 토글 버튼 (Sun / Moon / Monitor 아이콘 드롭다운)
  - Dark / Light / System 선택
  - `next-themes` useTheme() 훅 사용
- [ ] CTA 버튼 두 개
  - Primary: "Start Free" (초록)
  - Secondary: "View on GitHub" (ghost)
- [ ] 대시보드 목업 — 터미널/카드 스타일 UI 모킹
  ```
  ┌─────────────────────────────────┐
  │  🚨 ACTION · TQQQ               │
  │  RSI Oversold (28.3)            │
  │  Price: $42.15 · DD: -18.2%     │
  │  ─────────────────────────      │
  │  ⚠️  WARNING · QQQ              │
  │  MA Death Cross                 │
  │  MA20: $443.2 < MA60: $447.8    │
  └─────────────────────────────────┘
  ```
  (실제 HTML/JSX로 구현 — 이미지 아님)
- [ ] 히어로 배경 — 미묘한 그리드 패턴 또는 그라디언트

---

## G3: Features + How it Works

### 목표
Signalight가 뭘 하는지, 어떻게 작동하는지 명확히 설명

### Tasks

#### Features.tsx
- [ ] 섹션 헤드라인 ("Everything you need to trade smarter")
- [ ] 기능 카드 6개 (2x3 그리드, 모바일 1열)

  | 아이콘 | 제목 | 설명 |
  |--------|------|------|
  | 📡 | Signal Detection | RSI, MA Crossover, Bollinger Bands, Drawdown — 자동 감지 |
  | 📱 | Telegram Alerts | 신호 발생 즉시 폰으로 알림. /scan /price /watchlist 명령 지원 |
  | 📊 | Live Dashboard | 실시간 신호 피드, TradingView 차트, RSI/MA/BB 오버레이 |
  | 🧠 | AI News Analysis | Claude API로 뉴스 감성 분석. 기술적 신호 + 뉴스 결합 (Phase 3) |
  | 🔁 | No Duplicate Alerts | 24시간 쿨다운. 같은 신호 반복 알림 없음 |
  | 🛡️ | Private & Secure | 내 봇, 내 DB, 내 데이터. 외부 서비스 없음 |

#### HowItWorks.tsx
- [ ] 섹션 헤드라인 ("Up and running in 3 steps")
- [ ] 3단계 스텝 (번호 + 아이콘 + 설명)
  ```
  1. Connect Telegram
     BotFather로 봇 생성, 토큰을 .env에 입력

  2. Set Your Watchlist
     QQQ, TQQQ, SPY 등 추적할 종목 설정

  3. Receive Signals
     RSI 과매도, MA 크로스오버 등 신호 즉시 수신
  ```
- [ ] 연결선 또는 화살표 (데스크탑)

---

## G4: Strategy + Telegram Preview

### 목표
핵심 차별점 두 가지를 깊이 보여줌:
QQQ 드로우다운 전략(투자 전략 신뢰감) + 텔레그램 인터페이스(실제 사용 경험)

### Tasks

#### Strategy.tsx — QQQ Drawdown Strategy
- [ ] 섹션 헤드라인 ("Built around a real strategy")
- [ ] 전략 설명 텍스트
- [ ] 드로우다운 레벨 시각화 — 진행 바 스타일

  ```
  QQQ Drawdown from ATH
  ├── -5%   ░░░░░░░░░░ (현재 위치 표시)
  ├── -10%  ▓░░░░░░░░░ Start buying QLD
  ├── -15%  ▓▓░░░░░░░░ Add TQQQ small
  ├── -20%  ▓▓▓░░░░░░░ Increase TQQQ
  ├── -25%  ▓▓▓▓░░░░░░ Aggressive TQQQ
  └── -30%  ▓▓▓▓▓░░░░░ Max TQQQ allocation
  ```
  (현재 QQQ 드로우다운 -7.9% 정도를 예시 데이터로)

- [ ] 우측에 관련 ETF 카드 (QQQ, QLD, TQQQ) — 현재 가격/드로우다운 목업

#### TelegramPreview.tsx — 텔레그램 UI 목업
- [ ] 섹션 헤드라인 ("Control from your phone")
- [ ] 텔레그램 채팅창 UI 목업 (CSS로 구현)
  - 봇 응답 메시지 카드 스타일
  - `/scan`, `/price QQQ`, `/signals` 예시 대화
  - 신호 알림 메시지 포맷 그대로 표현
- [ ] 명령어 목록 칩 (배지 스타일)

---

## G5: Pricing + CTA Banner

### 목표
명확한 플랜 구분 + 전환 유도

### Tasks

#### Pricing.tsx
- [ ] 섹션 헤드라인 ("Simple, transparent pricing")
- [ ] 토글: Monthly / Yearly (Yearly 할인 표시)
- [ ] 플랜 카드 2개

  **Free**
  - 5 symbols
  - All technical signals (RSI, MA, Bollinger, Drawdown)
  - Telegram alerts
  - Signal history (7 days)
  - $0 / forever

  **Pro** ⭐ (하이라이트)
  - Unlimited symbols
  - All Free features
  - AI news sentiment (Claude API)
  - Signal history (unlimited)
  - Email alerts
  - Web Push notifications
  - $9 / month

- [ ] 각 플랜에 CTA 버튼
- [ ] FAQ 간단히 2-3개 (Accordion)

#### CtaBanner.tsx
- [ ] 페이지 하단 CTA 섹션
  ```
  Start monitoring your portfolio today.
  Free forever. No credit card required.
  [Start Free]  [View GitHub]
  ```
- [ ] 배경 — 초록 그라디언트 또는 글로우 효과

---

## G6: Footer + Polish + Deploy

### 목표
마무리 + 모바일 반응형 점검 + Vercel 배포

### Tasks

#### Footer.tsx
- [ ] 로고 + 한줄 설명
- [ ] 링크 컬럼 (Product / Resources / Legal)
- [ ] 소셜 링크 (GitHub)
- [ ] 면책조항
  ```
  ⚠️ Disclaimer: Signalight is for educational purposes only.
  Not financial advice. Always do your own research.
  ```
- [ ] Copyright

#### Polish
- [ ] 섹션 진입 애니메이션 (`animate-fade-in` — Tailwind CSS)
- [ ] 모바일 반응형 전체 점검 (375px, 768px, 1280px)
- [ ] 다크 테마 색상 일관성 확인
- [ ] `<Image>` alt 텍스트, semantic HTML 태그 점검
- [ ] `metadata` OG 이미지, Twitter card 설정

#### Deploy
- [ ] `bun run build` 빌드 에러 없음 확인
- [ ] Vercel CLI 또는 GitHub 연동으로 배포
- [ ] 배포 URL 확인

---

## 완료 기준
- [ ] 모바일(375px)에서 모든 섹션 정상 표시
- [ ] `bun run build` 에러 없음
- [ ] Vercel 배포 완료
- [ ] 다크 테마 일관성
- [ ] CTA 버튼 최소 3곳에 배치 (Header, Hero, CtaBanner)
