# Phase 9: User Authentication + Profit Calculator (Commercial Version)

## 📋 Strategic Overview

**목표**: 투자자용 SaaS 플랫폼으로 전환
- 무료 Guest Mode (모든 기능)
- 프리미엄 구독 (API 제한 제거, 고급 분석)
- 상업적 수익화 가능

---

## **Architecture Design**

```
┌─────────────────┐
│   Web Client    │ (Next.js + React)
│  - Dashboard    │
│  - Auth Pages   │
│  - Calculator   │
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
    ┌────▼────────┐                  ┌────────▼────┐
    │  FastAPI    │◄──────────────►│  Supabase   │
    │  - Auth     │   (JWT Token)   │  - Auth     │
    │  - Signals  │                  │  - Users DB │
    │  - Calc     │                  │  - Data     │
    └────┬────────┘                  └─────────────┘
         │
    ┌────▼────────┐
    │  SQLite     │
    │  - Signals  │
    │  - Trades   │
    │  - Calcs    │
    └─────────────┘
```

---

## **G1: Supabase Auth + Guest Mode**

### DB Schema
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  auth_method TEXT, -- 'password', 'google', 'guest'
  created_at TIMESTAMP,
  subscription_plan TEXT -- 'free', 'pro', 'guest'
);

CREATE TABLE user_preferences (
  user_id UUID,
  theme TEXT DEFAULT 'system',
  notification_email BOOLEAN,
  api_calls_limit INT DEFAULT 1000,
  created_at TIMESTAMP
);
```

### Features
- Supabase 회원가입/로그인 (이메일)
- Google OAuth (1-click)
- **Guest Mode** (UUID 생성, DB 저장 안함)
- JWT Token 기반 인증
- 로그아웃

### Tech
- `supabase` Python SDK
- `next-auth` 또는 Supabase JS 클라이언트
- 로컬 스토리지 (token)

---

## **G2: User Profile + Settings**

### Features
- 프로필 수정 (이름, 이메일)
- 구독 플랜 확인
- API 사용량 추적
- 계정 삭제

### Pricing Tiers
| 계획 | 월 비용 | 신호/월 | 백테스트 | 계산기 | API 호출 |
|------|--------|---------|---------|--------|----------|
| **Guest** | 무료 | 100 | 1회 | O | 1,000 |
| **Pro** | $9.99 | 무제한 | 무제한 | O | 100,000 |
| **Pro+** | $29.99 | 무제한 | 무제한 | O | 무제한 |

---

## **G3: Profit Calculator (Core Feature)**

### Inputs
1. **원금 (Initial Capital)** — $1,000 ~ $1M
2. **투자기간 (Period)** — 1개월 ~ 10년
3. **목표수익률 (Target ROI)** — 1% ~ 100%
4. **복리 옵션 (Compound)** — Yes/No
5. **세금 옵션 (Tax)**
   - 단기자본이득세: 15% ~ 37% (US 기준)
   - 장기자본이득세: 0% ~ 20%
   - 세금 없음 (국가 선택)

### Calculations
```
Final Value = Principal × (1 + ROI/100)^(Period in Years)
Tax = Final Value × Tax Rate (if applicable)
Net Profit = Final Value - Principal - Tax
After-Tax ROI = (Net Profit / Principal) × 100
```

### Output
- 예상 최종금액
- 순 수익금
- 세금액
- 세후 수익률
- 월별 성장 그래프

---

## **G4: Backtest Integration**

### Feature
- 백테스트 결과로 계산기 입력 자동 채우기
- "지난 3개월 QQQ 신호 기반 예상 수익" 표시
- 실제 성과 vs 예상 성과 비교

---

## **G5: Calculator UI + Visualization**

### Components
1. **Input Form** (Slider + Number Input)
   - 원금: $1K ~ $1M (로그 스케일)
   - 기간: 1개월 ~ 10년
   - 목표ROI: 1% ~ 100% (슬라이더)
   - 세금: Dropdown

2. **Results Card**
   - 큰 숫자로 최종금액 표시
   - 세금액 (강조색)
   - 세후 수익률

3. **Growth Chart** (Recharts)
   - X축: 월수
   - Y축: 누적금액
   - 세전/세후 2개 선

4. **Comparison Table**
   - 다양한 ROI 시나리오 비교

---

## **G6: Save & Share Calculations**

### Features
- 계산 결과 저장 (로그인 필수)
- CSV/PDF 다운로드
- 공유 링크 (읽기전용)
- 계산 히스토리

---

## **G7: UI Polish + Responsive + Deployment**

### Features
- 모바일 반응형 (스마트폰에서도 사용)
- 다크/라이트 테마
- 애니메이션 (slider 움직임)
- 로딩 상태
- 에러 처리

### Deployment
- Vercel (프론트)
- Railway/Render (FastAPI 백엔드)
- Supabase (호스팅)

---

## **Commercial Considerations**

### Revenue Model
1. **Freemium** — Guest/Free 플랜 무료, Pro 유료
2. **White Label** — API 제공 (투자 고문용)
3. **Enterprise** — 커스텀 계획

### Marketing Angles
- "투자 계획 수립 도구"
- "신호 기반 수익 예측"
- "세금 효율적 투자 계산"
- "백테스트 기반 신뢰성"

### Legal
- 면책 조항 (투자 조언 X, 교육용)
- GDPR/개인정보보호법 준수
- 세금 정보 면책

---

## **Implementation Priority**

1. **G1 (Auth)** — 기반
2. **G3 (Calculator)** — 핵심 기능
3. **G2 (Profile)** — 사용자 관리
4. **G5 (UI)** — 사용성
5. **G4 (Integration)** — 연동
6. **G6 (Save/Share)** — 고급 기능
7. **G7 (Polish)** — 완성

---

## **Success Metrics**

- 월 활성 사용자 (MAU)
- 계산기 사용률
- Pro 구독 전환율
- API 호출량
- 사용자 만족도 (4.5★ 목표)

---

## **Timeline**

- **G1-2**: 2일 (인증)
- **G3**: 1.5일 (계산기 로직)
- **G5**: 1일 (UI)
- **G4, 6, 7**: 1일 (통합 & 폴리시)

**총 6.5일 (5일 개발)**

