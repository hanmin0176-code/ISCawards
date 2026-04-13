# DB 규칙 스키마 수정안 v2

## 목적
기존 `campaign_sections` 중심 구조는 이미지 시상표를 대략 나누는 데는 쓸 수 있지만,
아래 기능에는 부족하다.

- 설계사 실적 입력 후 익월/13회차 시상 계산
- 연속가동 시상 판정
- 여행 시상 조건1/조건2 판정
- 자연어 채팅으로 과거 시상 조회

그래서 시상 규칙을 `section`이 아니라 `rule` 기준으로 다시 잡는다.

---

## 핵심 원칙

1. 관리자 업로드용 원본/버전 테이블은 유지한다.
2. 실제 계산에는 `campaign_rules` 계열 정규화 테이블을 사용한다.
3. `rule_type`을 명시해서 계산 엔진이 분기 처리한다.
4. 복잡한 여행 시상도 `condition_set` + `reward_option`으로 표현한다.
5. 설계사 입력은 `planner_performance_inputs` / `planner_performance_lines`로 별도 관리한다.

---

## 신규 테이블

### 1. campaign_rules
버전별 최종 확정 규칙의 메인 테이블

주요 컬럼
- `version_id`: 어떤 시상안 버전에 속하는 규칙인지
- `rule_code`: 규칙 식별 코드
- `rule_type`: 규칙 타입
- `rule_name`: 사람이 읽는 규칙명
- `base_metric_type`: 기준값 종류
- `reward_kind`: 보상 종류
- `payout_timing_type`: 지급 시점
- `maintenance_required`: 13회차 등 유지 필요 여부
- `target_json`: 포함 대상
- `exclusion_json`: 제외 대상
- `qualification_json`: 추가 자격 조건
- `payout_json`: 지급 방식 메타정보
- `raw_rule_json`: 원본 규칙 JSON

예시 rule_type
- `percentage_payout`
- `tiered_cash_next_month`
- `tiered_cash_after_13th`
- `consecutive_bonus`
- `trip_or_choice_reward`

---

### 2. campaign_rule_periods
규칙별 기간 저장

예시
- 판매 실적 기간
- 전월 기준 기간
- 당월 기준 기간
- 차월 기준 기간
- 지급 기준 기간

핵심 컬럼
- `period_role`
- `period_code`
- `condition_set_code`
- `start_date`
- `end_date`

---

### 3. campaign_rule_tiers
구간형 보상 저장

예시
- 10만 -> 30만
- 20만 -> 60만
- 30만 -> 90만
- 50만 -> 150만

또는
- 월납보험료의 400%

핵심 컬럼
- `threshold_value`
- `reward_cash_amount`
- `reward_percent`
- `reward_trip_name`
- `reward_meta_json`

---

### 4. campaign_rule_condition_sets
조건1 / 조건2 / 조건A / 조건B 같은 묶음

예시
- 여행 시상 조건1
- 여행 시상 조건2
- 연속가동 조건1

핵심 컬럼
- `condition_set_code`
- `condition_set_name`
- `logic_type` (`AND`, `OR`)

---

### 5. campaign_rule_conditions
조건셋 내부의 개별 조건 행

예시
- 26.3.16~31에 10만 이상
- 26.4월에 20만 이상
- 26.5월에 20만 이상

핵심 컬럼
- `metric_type`
- `period_code`
- `operator`
- `threshold_value`
- `target_json`

---

### 6. campaign_rule_reward_options
택1 시상용 보상 옵션

예시
- 코타키나발루 1명
- 코타키나발루 1명 + 70만
- 푸켓+카오락 1명

핵심 컬럼
- `reward_group_code`
- `option_code`
- `option_label`
- `reward_type`
- `reward_cash_amount`
- `reward_trip_name`
- `applies_to_tier_code`
- `applies_to_condition_set_code`

---

### 7. planner_performance_inputs
설계사 주차별 실적 입력 헤더

목적
- 설계사 한 명이
- 어느 보험사에
- 몇 년 몇 월 몇 주차 실적을 넣었는지
관리

핵심 컬럼
- `planner_id`
- `insurer_id`
- `campaign_id`
- `campaign_version_id`
- `input_year`
- `input_month`
- `week_label`
- `sales_period_start`
- `sales_period_end`
- `input_mode` (`quick`, `contract`)

---

### 8. planner_performance_lines
입력 헤더 아래 실제 실적 행

예시
- 인보험 월납보험료 30만
- 펫보험 월납보험료 12만
- The라이프업 월납보험료 8만
- 특정 계약 1건 월납보험료 5만

핵심 컬럼
- `product_group_code`
- `product_category`
- `product_name`
- `metric_type`
- `performance_amount`
- `contract_id`

---

### 9. reward_forecast_details
예상 시상 결과의 근거 저장

목적
- 왜 90만원이 나왔는지 설명 가능하게 하기 위함

핵심 컬럼
- `forecast_id`
- `rule_id`
- `input_id`
- `condition_set_code`
- `reward_option_code`
- `matched_value`
- `source_line_ids`
- `calculation_json`

---

## 뷰(View)

### vw_published_campaign_rules
현재 활성 버전 기준의 규칙 조회용

### vw_planner_input_summary
설계사 입력을 상품군/기준별로 합산해서 계산 전처리에 사용

---

## 기존 테이블과의 관계

### 계속 유지
- `incentive_campaigns`
- `incentive_campaign_versions`
- `campaign_review_logs`
- `planner_contracts`
- `contract_events`
- `reward_forecasts`
- `reward_payouts`

### 역할 구분
- 기존 테이블: 업로드/버전/원본/지급 결과
- 신규 테이블: 계산용 규칙 엔진 / 설계사 실적 입력

---

## 권장 운영 방식

1. 관리자가 시상표 업로드
2. AI가 규칙 초안 생성
3. 관리자가 확정
4. 확정 JSON을 `campaign_rules` 계열로 분해 저장
5. 설계사가 실적 입력
6. 계산 엔진이 `campaign_rules` 기준으로 계산
7. 결과를 `reward_forecasts`와 `reward_forecast_details`에 저장

---

## 주의

### 확정 정보
- 현재 SQL은 기존 테이블을 지우지 않고 신규 테이블만 추가하는 방식이다.
- 따라서 단계적으로 이전 가능하다.

### 추가 확인 필요
- 여행 시상의 세부 인원/현금 조합은 실제 운영 전 시상표별 검수 룰이 더 필요하다.
- `13회차 납입`을 계약 기준으로 볼지, 기여 실적 전체 기준으로 볼지 세부 정책 확정이 필요하다.
