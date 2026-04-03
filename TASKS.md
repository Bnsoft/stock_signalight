# Phase 2: Web Dashboard — Task List

## 📋 Overview
Web Dashboard로 실시간 신호 + 차트 + 인디케이터 시각화. Group별로 진행 (G1~G7).

---

## **G1: Dashboard Layout + Chart Setup**
기본 레이아웃 + TradingView Lightweight Charts 초기화

- [ ] Next.js 페이지 구조 (`/dashboard` 경로)
- [ ] 레이아웃 구성 (좌: 신호피드, 우: 차트, 하단: 지표)
- [ ] TradingView Lightweight Charts 라이브러리 설치 + 기본 설정
- [ ] 더미 캔들 데이터로 차트 렌더링 테스트
- [ ] Tailwind 스타일링 (다크/라이트 테마 적용)
- [ ] Build 확인 + Push

---

## **G2: Signal Feed UI + Python API 연결**
신호 목록 UI + Python 엔진과 API 연동

- [ ] Signal Feed UI 컴포넌트 (리스트, 시간, 심볼, 신호타입, 심각도)
- [ ] Python FastAPI 추가 (`/api/signals` 엔드포인트)
- [ ] DB에서 신호 조회 (최근 100개)
- [ ] REST API 호출로 신호 fetch
- [ ] 신호 필터링 (심볼별, 신호타입별, 시간범위)
- [ ] Build + Push

---

## **G3: Core Indicators (RSI, VWAP, Stochastic, ATR, ADX)**
주요 인디케이터 계산 + 차트 오버레이

- [ ] VWAP 계산 함수 추가 (`src/pulse.py`)
- [ ] Stochastic Oscillator (%K, %D) 구현
- [ ] ATR (Average True Range) 구현
- [ ] ADX (Average Directional Index) 구현
- [ ] EMA12/EMA26 추가 (기존 EMA 확장)
- [ ] 차트에 각 인디케이터 선 오버레이 (색상 구분)
- [ ] 레전드 추가 (선 on/off 토글)
- [ ] Build + Push

---

## **G4: Additional Indicators (EMA Cross, OBV, Ichimoku)**
추가 인디케이터 + 신호 생성

- [ ] OBV (On-Balance Volume) 계산 + 별도 패널
- [ ] Ichimoku Cloud 구현 (Tenkan, Kijun, Senkou, Chikou)
- [ ] Support/Resistance Auto-detect (Local min/max)
- [ ] 각 인디케이터별 Alert 로직 (`src/trigger.py`)
- [ ] Cooldown 적용 (24h per signal type per symbol)
- [ ] Build + Push

---

## **G5: Time Period Selection + Zoom/Pan**
기간 선택 (1D/1W/1M) + 마우스 상호작용

- [ ] 기간 선택 버튼 UI (1D, 1W, 1M, All)
- [ ] Python에서 기간별 OHLCV 데이터 fetch
- [ ] `/api/candles?symbol=QQQ&period=1D` 엔드포인트
- [ ] 차트 기간 변경시 데이터 리로드
- [ ] 마우스 휠 줌 (TradingView 기본)
- [ ] 드래그 팬 (TradingView 기본)
- [ ] 터치 줌/팬 (모바일)
- [ ] Build + Push

---

## **G6: Volume Visualization + Volume Alerts**
거래량 바 + OBV + 거래량 기반 알람

- [ ] 차트 하단에 Volume Bar 표시 (상승/하락 컬러)
- [ ] OBV 선 추가 (거래량 패널)
- [ ] 평균 거래량 계산 (MA20)
- [ ] 거래량 알람 로직
  - [ ] 거래량 > 2× MA20 → Alert
  - [ ] 거래량 급증 신호 trigger
- [ ] Volume Spike 신호 24h cooldown
- [ ] Build + Push

---

## **G7: Real-time Updates + PWA + Polish**
WebSocket 실시간 업데이트 + PWA + 최종 폴리시

- [ ] Python에 WebSocket 서버 추가 (`/ws/signals`)
- [ ] 대시보드에 WebSocket 클라이언트 (신호 실시간 수신)
- [ ] 자동 차트 갱신 (최신 캔들)
- [ ] PWA 설정 (`manifest.json`, service worker)
- [ ] 오프라인 폴백
- [ ] 모바일 반응형 (차트 너비 조정)
- [ ] 성능 최적화 (memoization, lazy load)
- [ ] 빌드 확인 + Push
- [ ] Vercel 배포 확인

---

## 📊 Progress Tracker

| Group | Status | Notes |
|-------|--------|-------|
| G1 | ⬜ Pending | Layout + Lightweight Charts |
| G2 | ⬜ Pending | API + Signal Feed |
| G3 | ⬜ Pending | VWAP, Stochastic, ATR, ADX |
| G4 | ⬜ Pending | OBV, Ichimoku, Support/Resistance |
| G5 | ⬜ Pending | Time periods + Zoom/Pan |
| G6 | ⬜ Pending | Volume + OBV + Alerts |
| G7 | ⬜ Pending | WebSocket + PWA + Polish |

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
- Phase 1 진행중 이 문서 수정 가능
