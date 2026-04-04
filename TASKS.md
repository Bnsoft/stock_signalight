# Signalight — Complete Task List

## 📋 Overview
Phase 1~8: 신호 스캐너 엔진부터 고급 분석, 자동 거래까지. 각 Phase는 G1~G7 그룹으로 구성.

---

# Phase 2: Web Dashboard — Task List ✅

## 📋 Overview
Web Dashboard로 실시간 신호 + 차트 + 인디케이터 시각화. Group별로 진행 (G1~G7).

---

## **G1: Dashboard Layout + Chart Setup** ✅
기본 레이아웃 + TradingView Lightweight Charts 초기화

- [x] Next.js 페이지 구조 (`/dashboard` 경로)
- [x] 레이아웃 구성 (좌: 신호피드, 우: 차트, 하단: 지표)
- [x] TradingView Lightweight Charts 라이브러리 설치 + 기본 설정
- [x] 더미 캔들 데이터로 차트 렌더링 테스트
- [x] Tailwind 스타일링 (다크/라이트 테마 적용)
- [x] Build 확인 + Push

---

## **G2: Signal Feed UI + Python API 연결** ✅
신호 목록 UI + Python 엔진과 API 연동

- [x] Signal Feed UI 컴포넌트 (리스트, 시간, 심볼, 신호타입, 심각도)
- [x] Python FastAPI 추가 (`/api/signals` 엔드포인트)
- [x] DB에서 신호 조회 (최근 100개)
- [x] REST API 호출로 신호 fetch
- [x] 신호 필터링 (심볼별, 신호타입별)
- [x] Build + Push

---

## **G3: Core Indicators (RSI, VWAP, Stochastic, ATR, ADX)** ✅
주요 인디케이터 계산 + 차트 오버레이

- [x] VWAP 계산 함수 추가 (`src/pulse.py`)
- [x] Stochastic Oscillator (%K, %D) 구현
- [x] ATR (Average True Range) 구현
- [x] ADX (Average Directional Index) 구현
- [x] 각 인디케이터별 Alert 로직 (`src/trigger.py`)
- [x] IndicatorPanel UI (실시간 표시)
- [x] API `/api/indicators` 엔드포인트
- [x] Build + Push

---

## **G4: Additional Indicators (EMA Cross, OBV, Ichimoku)** ✅
추가 인디케이터 + 신호 생성

- [x] OBV (On-Balance Volume) 계산 + 별도 패널
- [x] Ichimoku Cloud 구현 (Tenkan, Kijun, Senkou, Chikou)
- [x] Support/Resistance Auto-detect (Local min/max)
- [x] 각 인디케이터별 Alert 로직 (`src/trigger.py`)
- [x] Cooldown 적용 (24h per signal type per symbol)
- [x] Build + Push

---

## **G5: Time Period Selection + Zoom/Pan** ✅
기간 선택 (1D/1W/1M) + 마우스 상호작용

- [x] 기간 선택 버튼 UI (1D, 1W, 1M)
- [x] Python에서 기간별 OHLCV 데이터 fetch
- [x] `/api/candles?symbol=QQQ&period=1D` 엔드포인트
- [x] 차트 기간 변경시 자동 데이터 리로드
- [x] 마우스 휠 줌 (TradingView 기본)
- [x] 드래그 팬 (TradingView 기본)
- [x] Build + Push

---

## **G6: Volume Visualization + Volume Alerts** ✅
거래량 바 + OBV + 거래량 기반 알람

- [x] 차트 하단에 Volume Bar 표시 (상승/하락 컬러)
- [x] OBV 계산 + IndicatorPanel 표시
- [x] 평균 거래량 계산 (MA20)
- [x] 거래량 알람 로직
  - [x] 거래량 > 2× MA20 → Alert
  - [x] 거래량 급증 신호 trigger
- [x] Volume Spike 신호 4h cooldown
- [x] Build + Push

---

## **G7: Real-time Updates + PWA + Polish** ✅
WebSocket 실시간 업데이트 + PWA + 최종 폴리시

- [x] Python에 WebSocket 서버 추가 (`/ws/signals`)
- [x] 대시보드에 WebSocket 클라이언트 (신호 실시간 수신, polling fallback)
- [x] PWA 설정 (`manifest.json`, service worker)
- [x] 오프라인 폴백 (service worker caching)
- [x] 모바일 반응형 (TradingView 반응형)
- [x] 빌드 확인 + Push

---

## 📊 Progress Tracker

| Group | Status | Notes |
|-------|--------|-------|
| G1 | ✅ Done | Layout + Lightweight Charts (MA20/MA60, Volume bars) |
| G2 | ✅ Done | FastAPI (/api/signals, /api/candles), Signal Feed fetch |
| G3 | ✅ Done | VWAP, Stochastic, ATR, ADX + trigger logic |
| G4 | ✅ Done | OBV, Ichimoku, Support/Resistance + bounce/rejection |
| G5 | ✅ Done | Time periods (1D/1W/1M) + native TradingView zoom/pan |
| G6 | ✅ Done | Volume bars, OBV, volume spike alerts |
| G7 | ✅ Done | WebSocket realtime, PWA, offline support |

---

## 🔧 Tech Stack
- **Frontend:** Next.js 16 + Tailwind v4 + TypeScript
- **Charts:** TradingView Lightweight Charts
- **Backend:** Python FastAPI (기존 엔진 옆에 추가)
- **Real-time:** WebSocket
- **DB:** SQLite (기존) + Supabase (선택)
- **Deploy:** Vercel (프론트) + VPS/Local (백엔드)

---

## 📝 Notes
- 각 Group 완료 후 commit + push
- 필요시 task 추가/제거 가능

---

# Phase 3: Signal Statistics & Performance Analysis

## 📋 Overview
신호별 수익률, 인디케이터 정확도, 백테스트 기능 추가.

---

## **G1: DB Schema + Backtest Tables**
백테스트 데이터 저장 구조 설계

- [ ] `trades` 테이블 (진입/청산, P&L)
- [ ] `signal_performance` 테이블 (신호별 성공률, 수익률)
- [ ] `indicator_accuracy` 테이블 (인디케이터별 정확도)
- [ ] Python migration 스크립트
- [ ] Build + Push

---

## **G2: Signal Performance Dashboard**
신호별 통계 페이지

- [ ] `/dashboard/analytics` 라우트
- [ ] 신호 유형별 승률, 수익률 차트 (Bar/Pie)
- [ ] 기간별 성과 분석 (Monthly/Weekly)
- [ ] Top/Bottom 신호 랭킹
- [ ] Build + Push

---

## **G3: Indicator Accuracy Tracking**
각 인디케이터별 성과 메트릭

- [ ] 각 신호 생성 시 메타데이터 저장 (가격, 인디케이터 값)
- [ ] 24시간 후 결과 기록 (수익/손실 여부)
- [ ] 인디케이터별 정확도 계산 (정확도, 승률, avg ROI)
- [ ] API `/api/indicator-stats?indicator=RSI`
- [ ] Build + Push

---

## **G4: Backtest Engine (Simple)**
간단한 백테스트 시뮬레이션

- [ ] 과거 데이터로 신호 재생성
- [ ] 신호별 수익률 계산 (Entry~Exit 기반)
- [ ] `/api/backtest?symbol=QQQ&period=3M`
- [ ] 백테스트 결과 시각화 (누적 수익, Drawdown)
- [ ] Build + Push

---

## **G5: Statistics UI Components**
통계 페이지 컴포넌트

- [ ] PerformanceCard (신호별 통계 카드)
- [ ] WinRateChart (승률, 수익률 차트)
- [ ] EquityCurve (백테스트 결과 그래프)
- [ ] StatTable (상세 수치 표)
- [ ] Build + Push

---

## **G6: Export & Report Generation**
데이터 내보내기, 리포트 생성

- [ ] CSV/JSON 내보내기 (신호, 성과 데이터)
- [ ] PDF 리포트 생성 (월간 성과 보고서)
- [ ] API `/api/export-stats`
- [ ] Build + Push

---

## **G7: Caching & Optimization**
성과 데이터 캐싱, 쿼리 최적화

- [ ] Redis 캐싱 (선택사항)
- [ ] DB 인덱싱 (신호 조회 성능)
- [ ] 집계 쿼리 최적화
- [ ] Build + Push

---

# Phase 4: Multi-Channel Notifications

## 📋 Overview
Email, Discord, Slack 다중 알림 채널 지원.

---

## **G1: Email Alerts (Resend)**
이메일 알림 기능

- [ ] Resend API 통합
- [ ] 이메일 템플릿 설계 (신호 내용, 차트 이미지)
- [ ] Python 이메일 발송 함수
- [ ] 설정: 사용자 이메일, 알림 빈도 설정
- [ ] Build + Push

---

## **G2: Discord Integration**
Discord 웹훅 알림

- [ ] Discord 웹훅 등록 UI
- [ ] Embed 메시지 포맷 (신호, 차트, 지표)
- [ ] Python Discord 알림 함수
- [ ] Build + Push

---

## **G3: Slack Integration**
Slack 앱 연동

- [ ] Slack 앱 설정, 토큰 관리
- [ ] Block Kit 메시지 포맷
- [ ] Python Slack 알림 함수
- [ ] Build + Push

---

## **G4: Browser Push Notifications**
브라우저 푸시 알림

- [ ] Web Push API 구현
- [ ] Service Worker 푸시 핸들러
- [ ] 푸시 구독/구독 해제
- [ ] Build + Push

---

## **G5: Notification Rules & Customization**
알림 규칙 커스터마이징

- [ ] 알림 규칙 설정 UI
  - [ ] 심각도별 필터 (ACTION만, 모두)
  - [ ] 심볼별 필터
  - [ ] 신호 타입별 필터
- [ ] 알림 빈도 설정 (즉시, 일일, 주간)
- [ ] DB 저장
- [ ] Build + Push

---

## **G6: Notification History**
알림 히스토리 페이지

- [ ] `/dashboard/notifications` 라우트
- [ ] 알림 목록, 필터링, 검색
- [ ] 읽음/읽지 않음 표시
- [ ] Build + Push

---

## **G7: Testing & Validation**
알림 채널 테스트

- [ ] 각 채널별 테스트 메시지 발송
- [ ] 장애 로깅 & 재시도 로직
- [ ] Build + Push

---

# Phase 5: Advanced Charts & Visualization

## 📋 Overview
다중 심볼 비교, 로그 스케일, 커스터마이징, 고급 기능.

---

## **G1: Multi-Symbol Comparison**
여러 심볼 동시 비교 차트

- [ ] `/dashboard/compare` 라우트
- [ ] 심볼 선택 및 추가/제거 UI
- [ ] 정규화된 가격 비교 (퍼센트 변화)
- [ ] 다중 라인 차트 (색상 자동 할당)
- [ ] Build + Push

---

## **G2: Log Scale & Custom Scales**
로그 스케일, 커스텀 스케일 옵션

- [ ] TradingView API로 로그/선형 스케일 전환
- [ ] 스케일 버튼 UI
- [ ] Build + Push

---

## **G3: Hotkeys & Shortcuts**
단축키 및 빠른 네비게이션

- [ ] 단축키 정의 (Z=줌, P=이전, N=다음 심볼)
- [ ] Keyboard 이벤트 핸들러
- [ ] 단축키 도움말 (Cmd+?)
- [ ] Build + Push

---

## **G4: Chart Screenshot & Sharing**
차트 스크린샷, 공유 기능

- [ ] html2canvas 라이브러리 사용
- [ ] 스크린샷 다운로드
- [ ] 차트 링크 공유 (상태 포함 URL)
- [ ] Build + Push

---

## **G5: Indicator Customization**
지표 색상, Opacity, 스타일 커스터마이징

- [ ] 각 인디케이터별 색상 선택기
- [ ] Opacity 슬라이더
- [ ] 표시/숨기기 토글
- [ ] 설정 저장 (localStorage/DB)
- [ ] Build + Push

---

## **G6: Volume Profile & Heat Map (Advanced)**
거래량 프로필, 열량도

- [ ] 거래량 프로필 계산 (가격대별 누적 거래량)
- [ ] 차트 옆에 프로필 시각화
- [ ] 히트맵 (시간별 강도)
- [ ] Build + Push

---

## **G7: Drawing Tools (Optional)**
차트 그리기 도구 (추세선, 사각형, 텍스트)

- [ ] TradingView Lightweight Charts drawing 플러그인
- [ ] 기본 도구 (선, 사각형, 원형)
- [ ] Build + Push

---

# Phase 6: User Accounts & Settings

## 📋 Overview
Supabase 인증, 개인 설정, API 키 관리, 구독 관리.

---

## **G1: Supabase Authentication**
이메일 기반 회원가입/로그인

- [ ] Supabase Auth 설정
- [ ] 회원가입 페이지 (`/auth/signup`)
- [ ] 로그인 페이지 (`/auth/login`)
- [ ] 비밀번호 재설정 페이지
- [ ] 인증 가드 (라우트 보호)
- [ ] Build + Push

---

## **G2: User Profile & Settings**
사용자 프로필, 설정 페이지

- [ ] `/dashboard/settings` 라우트
- [ ] 프로필 정보 수정 (이름, 이메일)
- [ ] 알림 설정 저장
- [ ] 차트 설정 저장 (Indicator 선택, 색상)
- [ ] Build + Push

---

## **G3: API Key Management**
사용자 API 키 생성/관리

- [ ] API 키 생성 UI
- [ ] 키 표시/숨기기
- [ ] 키 삭제, 재생성
- [ ] `/api/user/api-keys` 엔드포인트
- [ ] Build + Push

---

## **G4: Favorites & Watchlist Customization**
즐겨찾기 심볼, 워치리스트 커스터마이징

- [ ] 즐겨찾기 추가/제거
- [ ] 워치리스트 정렬 (드래그앤드롭)
- [ ] 다중 워치리스트 생성
- [ ] Build + Push

---

## **G5: Subscription & Billing (Stripe)**
구독 관리, 결제

- [ ] Stripe 연동
- [ ] Free/Pro 플랜 정의
- [ ] 구독 페이지 (`/dashboard/billing`)
- [ ] 결제 처리
- [ ] Build + Push

---

## **G6: Export Settings & Backup**
설정 내보내기, 백업

- [ ] 설정 JSON 내보내기
- [ ] 설정 파일 임포트
- [ ] 클라우드 백업 (Supabase)
- [ ] Build + Push

---

## **G7: OAuth Integration (Google/GitHub)**
소셜 로그인

- [ ] Supabase OAuth providers 설정 (Google, GitHub)
- [ ] OAuth 로그인 버튼
- [ ] 계정 연동
- [ ] Build + Push

---

# Phase 7: Paper Trading & Portfolio Simulation

## 📋 Overview
실시간 시뮬레이션 거래, 포트폴리오 추적, 가상 자산 관리.

---

## **G1: Paper Trading DB Schema**
거래 기록 저장 구조

- [ ] `paper_trades` 테이블 (진입/청산, 수량, 가격)
- [ ] `paper_portfolio` 테이블 (보유 자산, 평가액)
- [ ] `paper_performance` 테이블 (일일 P&L, 누적 수익)
- [ ] Build + Push

---

## **G2: Paper Trading UI**
거래 시뮬레이터 인터페이스

- [ ] `/dashboard/paper-trading` 라우트
- [ ] 진입/청산 주문 폼
  - [ ] 심볼, 수량, 가격 입력
  - [ ] Market/Limit 주문
- [ ] Build + Push

---

## **G3: Real-time Portfolio Value**
포트폴리오 실시간 평가

- [ ] 보유 자산 표시 (심볼, 수량, 평균 비용, 현재가)
- [ ] 손익 (P&L) 계산
- [ ] 수익률 (ROI) 계산
- [ ] Build + Push

---

## **G4: Trade History & Journal**
거래 기록, 거래 일지

- [ ] `/dashboard/trade-journal` 라우트
- [ ] 거래 목록 (진입/청산 시간, 가격, P&L)
- [ ] 거래별 메모 기능
- [ ] 필터링/검색
- [ ] Build + Push

---

## **G5: Performance Analytics**
거래 성과 분석

- [ ] 누적 수익 그래프
- [ ] 월별 성과
- [ ] 승률, 평균 수익, 최대 손실
- [ ] 심볼별 성과
- [ ] Build + Push

---

## **G6: Auto Entry from Signals (Simulation)**
신호 기반 자동 진입 (시뮬레이션)

- [ ] 신호 자동 감지 시 종이 거래 자동 진입
- [ ] 진입 규칙 설정 (수량, 청산 조건)
- [ ] 청산 조건 (손절, 익절)
- [ ] Build + Push

---

## **G7: Export Trade Data**
거래 데이터 내보내기, 분석

- [ ] CSV 내보내기
- [ ] 통계 리포트 (승률, 수익 분포)
- [ ] Build + Push

---

# Phase 8: Heatmaps & Sector Analysis

## 📋 Overview
섹터별 성과, 심볼 상관관계, 시장 신호 열량도.

---

## **G1: Sector Classification & DB**
섹터 분류, 심볼-섹터 매핑

- [ ] 심볼 섹터 분류 데이터 (QQQ=Tech, SPY=Broad, etc.)
- [ ] `symbol_sectors` 테이블
- [ ] Python 섹터 업데이트 스크립트
- [ ] Build + Push

---

## **G2: Sector Performance Heatmap**
섹터별 성과 열량도

- [ ] `/dashboard/sectors` 라우트
- [ ] 섹터별 수익률 열량도 (색상 = 수익률)
- [ ] 섹터 상세 정보 (심볼 목록)
- [ ] Build + Push

---

## **G3: Symbol Correlation Matrix**
심볼 상관관계 분석

- [ ] 심볼 간 수익률 상관계수 계산
- [ ] Correlation matrix 시각화 (Heatmap)
- [ ] `/api/correlation?symbols=QQQ,SPY,TQQQ`
- [ ] Build + Push

---

## **G4: Market Strength Heatmap**
시장 신호 강도 열량도

- [ ] 심볼별 신호 강도 (신호 수, 가중치)
- [ ] 시간대별 신호 분포
- [ ] 실시간 업데이트
- [ ] Build + Push

---

## **G5: Trend Direction Heatmap**
추세 방향 열량도 (상승/하락)

- [ ] 각 심볼의 추세 방향 (상승 = 녹색, 하락 = 빨강)
- [ ] ADX 기반 추세 강도
- [ ] Build + Push

---

## **G6: Volatility Heatmap**
변동성 열량도

- [ ] 심볼별 ATR 또는 표준편차
- [ ] 실시간 변동성 표시
- [ ] Build + Push

---

## **G7: Advanced Analytics Dashboard**
고급 분석 대시보드 통합

- [ ] 모든 열량도 한 페이지에 통합
- [ ] 필터 (기간, 섹터, 신호 타입)
- [ ] Build + Push

---

## 📊 Master Progress Tracker

| Phase | Status | Topics |
|-------|--------|--------|
| 1 | ✅ Done | Python Engine, Telegram Bot |
| 2 | ✅ Done | Web Dashboard, Realtime Signals |
| 3 | ✅ Done | Signal Stats, Backtest Engine, Analytics |
| 4 | ✅ Done | Email/Discord/Slack Alerts, Settings |
| 5 | ✅ Done | Multi-Symbol Comparison, Log Scale |
| 6 | ✅ Done | User Settings API |
| 7 | ✅ Done | Paper Trading Simulator |
| 8 | ✅ Done | Sector Heatmap, Correlation Matrix |

---

## 🎯 Recommended Execution Order
1. **Phase 3** (Signal Stats) — 가장 가치 있는 기능
2. **Phase 4** (Multi Notifications) — 사용자 경험 향상
3. **Phase 6** (User Accounts) — Multi-user 지원
4. **Phase 7** (Paper Trading) — 거래 검증
5. **Phase 5** (Advanced Charts) — 분석 도구
6. **Phase 8** (Heatmaps) — 고급 분석

---

## 🔧 Tech Stack (All Phases)
- **Frontend:** Next.js + Tailwind + TypeScript
- **Backend:** Python FastAPI
- **Auth:** Supabase Auth
- **Payment:** Stripe
- **Email:** Resend
- **Notifications:** Discord, Slack, Web Push
- **Charts:** TradingView Lightweight Charts
- **DB:** SQLite + Supabase (optional)
- **Deploy:** Vercel + VPS

---

## 📝 Important Notes
- 각 Group 완료 후 자동 commit + push
- Phase 진행 중 필요시 기존 task 수정 가능
- 사용자 피드백 바탕으로 우선순위 조정 가능
