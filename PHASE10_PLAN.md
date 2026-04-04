# Phase 10: 포트폴리오 & 성과 추적

## 📋 개요
투자자의 모든 거래를 추적하고, 실시간 포트폴리오 성과를 분석하는 핵심 기능 모음

## 🎯 구현 그룹

### G1: 포트폴리오 대시보드
**기능:**
- 실시간 포지션 목록 (심볼, 수량, 진입가, 현재가)
- 포트폴리오 총 가치 & P&L
- 포지션별 수익률 % 계산
- 자산 배분 원형 차트 (섹터별/심볼별)
- 일일/주간/월간 수익률 비교
- 포트폴리오 변화 이력 그래프

**백엔드:**
- `POST /api/portfolio/positions` - 포지션 추가
- `GET /api/portfolio` - 포트폴리오 조회
- `GET /api/portfolio/history` - 이력 조회
- `DELETE /api/portfolio/positions/{id}` - 포지션 삭제

**프론트엔드:**
- `/dashboard/portfolio` 페이지
- PortfolioCard 컴포넌트
- AssetAllocationChart (Recharts)
- PortfolioHistoryChart

**Database:**
```sql
CREATE TABLE positions (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  symbol TEXT,
  quantity FLOAT,
  entry_price FLOAT,
  current_price FLOAT,
  entry_date DATETIME,
  notes TEXT,
  created_at DATETIME
);

CREATE TABLE portfolio_history (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  total_value FLOAT,
  cash_balance FLOAT,
  daily_pnl FLOAT,
  daily_return FLOAT,
  recorded_at DATETIME
);
```

---

### G2: 성과 비교 분석
**기능:**
- 사용자 수익 vs 벤치마크 (QQQ, SPY)
- Sharpe Ratio, Sortino Ratio 계산
- 알파/베타 계산
- 최대 손실 추적
- 월별/분기별 수익률 표
- 상위 거래 vs 하위 거래 분석

**백엔드:**
- `GET /api/performance/metrics` - 성과 지표
- `GET /api/performance/vs-benchmark` - 벤치마크 비교
- `GET /api/performance/monthly` - 월별 분석

**프론트엔드:**
- `/dashboard/performance` 페이지
- PerformanceMetrics 카드
- BenchmarkComparison 차트
- MonthlyReturnsTable

---

### G3: 자동 리밸런싱
**기능:**
- 목표 포트폴리오 비율 설정 (QQQ 50%, TQQQ 30% 등)
- 자동 리밸런싱 일정 설정 (월/분기)
- 리밸런싱 제안 알림
- 리밸런싱 시뮬레이션 (수수료/세금 포함)
- 리밸런싱 실행 이력

**백엔드:**
- `POST /api/portfolio/targets` - 목표 설정
- `GET /api/portfolio/rebalance-suggestion` - 리밸런싱 제안
- `POST /api/portfolio/rebalance` - 리밸런싱 실행
- `GET /api/portfolio/rebalance-history` - 이력

**프론트엔드:**
- `/dashboard/rebalance` 페이지
- TargetAllocationEditor
- RebalancingSuggestion 컴포넌트
- RebalanceSimulation 모달

---

### G4: 목표 추적 및 마일스톤
**기능:**
- 투자 목표 설정 ($50k, $100k 등)
- 현재 진행도 시각화 (진행률 바)
- 목표 달성까지 필요 ROI 계산
- 마일스톤 도달 시 축하 알림
- 목표별 성과 리포트

**백엔드:**
- `POST /api/goals` - 목표 생성
- `GET /api/goals` - 목표 조회
- `PUT /api/goals/{id}` - 목표 수정
- `GET /api/goals/progress` - 진행도

**프론트엔드:**
- `/dashboard/goals` 페이지
- GoalCard 컴포넌트
- GoalProgressBar
- MilestoneAchievementModal

---

### G5: 포지션 분석
**기능:**
- 평균 매수가 추적
- 손익분기점 표시
- 리스크/리워드 비율 계산
- 포지션 크기 최적화 제안
- 진입/진출 점수 (0-100)
- 포지션별 성과 분석

**백엔드:**
- `GET /api/positions/{id}/analysis` - 포지션 분석
- `GET /api/positions/sizing-suggestion` - 포지션 크기 제안
- `GET /api/positions/entry-exit-score` - 점수 계산

**프론트엔드:**
- `/dashboard/positions` 페이지
- PositionAnalysis 카드
- EntryExitScore 게이지
- PositionSizingSuggestion

---

## 📊 데이터 흐름

```
사용자 거래 입력
    ↓
positions 테이블 저장
    ↓
portfolio_history 자동 업데이트
    ↓
성과 지표 계산 (매일 자정)
    ↓
대시보드에 시각화
    ↓
목표 진행도 확인
    ↓
리밸런싱 제안 생성
```

---

## 🗄️ 데이터베이스 스키마 확장

추가할 테이블:
- `positions` - 개별 포지션
- `portfolio_history` - 일일 포트폴리오 스냅샷
- `portfolio_targets` - 목표 배분
- `investment_goals` - 투자 목표
- `rebalance_history` - 리밸런싱 이력

---

## 🎨 UI/UX

- 포트폴리오 개요: 카드 레이아웃
- 성과 분석: 다중 차트
- 목표 추적: 진행률 바 + 카드
- 리밸런싱: 제안 → 시뮬레이션 → 실행

---

## ⚡ 핵심 계산식

```
포트폴리오 가치 = Σ(수량 × 현재가)
P&L = 포트폴리오 가치 - 총 투입금
수익률 = (P&L / 총 투입금) × 100

Sharpe Ratio = (평균 수익 - 무위험율) / 표준편차
알파 = (포트폴리오 수익 - 예상 수익)
베타 = 포트폴리오 변동 / 시장 변동

목표까지 필요 ROI = (목표 금액 / 현재 금액)^(1/연수) - 1
```

---

## 🔄 통합 포인트

- Phase 9 인증: 포지션이 user_id로 연결
- Phase 9 계산기: 목표/현재가 입력
- Phase 13 자동거래: 거래 자동 기록

---

## 📈 구현 순서

1. G1: 포트폴리오 대시보드 (기초)
2. G2: 성과 분석 (대시보드 위에)
3. G5: 포지션 분석 (상세 분석)
4. G4: 목표 추적 (시각화)
5. G3: 리밸런싱 (자동화)

---

## ✅ 완료 기준

- ✅ 모든 CRUD 엔드포인트 구현
- ✅ 포트폴리오 실시간 계산
- ✅ 차트 및 시각화 완성
- ✅ 자동 리밸런싱 로직
- ✅ 목표 진행도 추적
