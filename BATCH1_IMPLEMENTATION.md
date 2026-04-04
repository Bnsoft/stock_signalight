# Batch 1: Phase 11-13 구현

## Phase 11: AI & 머신러닝
**G1: AI 신뢰도 점수** - signals 테이블에 confidence_score 추가
**G2: ML 예측** - ML 모델 기반 진입/진출 예측
**Core:** signal_confidence API + 대시보드

## Phase 12: 뉴스 & 경제지표  
**G1: 뉴스 신호** - 뉴스 연동
**G2: 경제 캘린더** - 경제지표 추적
**Core:** news_signals API + 뉴스 피드

## Phase 13: 실시간 & 자동화
**G1: 원클릭 거래** - auto_trades 테이블
**G2: 조건부 주문** - trade_conditions 테이블  
**Core:** auto_trade API + 대시보드

---

## 구현 내용

### 데이터베이스
- signals.confidence_score (0-100)
- news_signals (symbol, sentiment, source)
- auto_trades (user_id, symbol, status)
- trade_conditions (if-then rules)

### API (15개)
- GET /api/signals/{id}/confidence
- POST /api/auto-trades
- GET /api/news/feed
- GET /api/economic-calendar

### Pages (3개)
- /dashboard/ai-signals
- /dashboard/news-feed  
- /dashboard/auto-trades

---

## 예상 코드량: ~2,000줄

