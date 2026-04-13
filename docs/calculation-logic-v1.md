# 계산 로직 설계 v1

## 목적
설계사가 입력한 실적을 기준으로
- 익월 지급 예상 시상
- 13회차 납입 후 지급 예상 시상
- 연속가동 시상
- 여행/택1 시상
을 계산한다.

---

## 전체 계산 흐름

1. 설계사 입력 조회
2. 해당 보험사 / 연월 / 주차의 활성 시상 버전 조회
3. 활성 버전의 `campaign_rules` 불러오기
4. 입력값을 상품군/기준별로 집계
5. 규칙 타입별 계산
6. 결과를 `reward_forecasts` / `reward_forecast_details`에 저장
7. 설계사 화면과 채팅에서 결과 조회

---

## 1. 입력 조회
사용 기준
- planner_id
- insurer_id
- year/month/week_label

대상 테이블
- `planner_performance_inputs`
- `planner_performance_lines`

전처리
- 상품군별 합계
- 계약 기준 입력이 있으면 계약별 목록 유지
- `vw_planner_input_summary`로 집계 가능

---

## 2. 활성 시상 버전 조회
기준
- 보험사
- 연/월/주차

조회 대상
- `incentive_campaigns.active_version_id`
- `vw_published_campaign_rules`

원칙
- `published` 상태만 계산에 사용
- 초안/검수중 버전은 사용 금지

---

## 3. 규칙 타입별 계산

### A. percentage_payout
예시
- 인보험 익월 400%
- 펫/캣/The라이프업 익월 300%

입력값
- `monthly_premium` 합계
- 포함/제외 상품군

계산식
- `예상시상 = 대상 월납보험료 합계 × percentage_total / 100`

출력
- 익월 지급 예정 금액
- 기준 상품군
- 적용 퍼센트

주의
- 여러 상품군이 섞인 경우 포함/제외 필터를 먼저 적용

---

### B. tiered_cash_next_month
예시
- 2주차 인보험 익월지급
- 10만 -> 30만
- 20만 -> 60만
- 30만 -> 90만
- 50만 -> 150만

입력값
- 실적 기간 내 해당 상품군 실적 합계

계산 방식
1. 기간 필터 적용
2. 대상 상품군 필터 적용
3. `threshold_value` 이하가 아닌 가장 큰 구간 선택
4. 해당 `reward_cash_amount` 반환

예시
- 입력 실적 32만원
- 달성 구간: 30만원
- 지급 예상: 90만원

---

### C. tiered_cash_after_13th
예시
- 2주차 현금추가 / 13회차 유지

계산 방식
1. 구간 판정은 `tiered_cash_next_month`와 동일
2. 결과 상태는 `pending_maintenance`
3. 13회차 납입 확인 전에는 지급 확정 아님

추천 저장 방식
- `reward_forecasts.forecast_status = 'pending_maintenance'`
- `reward_forecast_details.calculation_json`에 기여 계약/라인 저장

13회차 확정 시
- 관련 계약 또는 라인 기준 유지 확인
- 충족 시 `confirmed` 또는 `paid`
- 미충족 시 `cancelled` 또는 `clawed_back`

---

### D. consecutive_bonus
예시
- 26.3~4월 연속가동 시상
- Prestige CLUB

계산 방식
1. 규칙에 연결된 기간 집합을 불러온다.
2. 각 기간별 필요한 최소 실적을 확인한다.
3. 모든 기간이 충족되면 성공
4. 지급 시점이 13회차라면 `pending_maintenance`

예시
- 4/5/6월 연속 규칙
- 4월 20만, 5월 20만, 6월 20만 달성
- 13회차 납입 전이면 `대기`
- 13회차 납입 후 `지급 확정`

---

### E. trip_or_choice_reward
예시
- 코타키나발루
- 푸켓+카오락
- 조건1 또는 조건2
- 보상 1/2/3/4 중 택1

계산 방식
1. 각 여행 상품 또는 시상 행을 하나의 규칙으로 본다.
2. 규칙 안에 `condition_set`이 여러 개 존재한다.
3. 조건1 OR 조건2 중 하나라도 충족되면 성공
4. 성공 시 `reward_options`를 반환한다.
5. 설계사 화면에는 `선택 가능한 보상`으로 보여준다.

예시 출력
- 코타키나발루 조건 충족
- 선택 가능 보상
  - 코타키나발루 1명

또는
- 푸켓+카오락 조건 충족
- 선택 가능 보상
  - 푸켓+카오락 1명
  - 코타키나발루 1명 + 70만원

주의
- 이 규칙은 단순 합계 금액으로 끝나지 않으므로 `reward_forecasts.expected_reward_type`을 `trip` 또는 `mixed`로 저장할 수 있어야 한다.

---

## 4. 출력 저장 구조

### reward_forecasts
공통 결과 저장
- 어떤 설계사
- 어떤 규칙
- 얼마가 예상되는지
- 언제 지급되는지
- 현재 상태가 무엇인지

### reward_forecast_details
설명 근거 저장
- 어떤 규칙이 적용됐는지
- 어떤 조건셋이 충족됐는지
- 어떤 입력행이 근거인지
- 어떤 구간이 선택됐는지

이 구조가 있어야
- 화면 설명
- 채팅 답변
- 추후 디버깅
이 가능하다.

---

## 5. 채팅 응답 로직

질문 유형 A. 규칙 조회
예시
- `2026년 4월 2주차 삼성화재 시상 알려줘`

처리
1. 보험사/연월/주차 추출
2. 활성 버전 조회
3. `campaign_rules` 조회
4. 사람이 이해하기 쉽게 요약해서 응답

질문 유형 B. 계산 조회
예시
- `4월 2주차 삼성화재 인보험 실적 30만원이면 얼마야?`

처리
1. 보험사/기간/상품군/실적값 추출
2. 해당 규칙 찾기
3. 계산 엔진 실행
4. 익월 / 13회차 / 연속가동 결과를 분리해서 응답

---

## 6. MVP 범위 계산 우선순위

### 1차 우선 구현
1. `percentage_payout`
2. `tiered_cash_next_month`
3. `tiered_cash_after_13th`
4. 규칙 조회형 채팅

### 2차 구현
1. `consecutive_bonus`
2. `trip_or_choice_reward`
3. Prestige CLUB
4. 얼마 더 하면 달성되는지 계산

---

## 7. 추가 확인 필요

- 13회차 유지 판정을 계약별로 엄격하게 할지, 입력 실적 단위로 단순화할지
- 여행 시상에서 보상 선택을 시스템이 추천만 할지, 실제 선택값까지 저장할지
- 인보험/펫/캣/The라이프업 분류를 사용자가 수동 선택할지 상품명 기준 자동 분류할지
