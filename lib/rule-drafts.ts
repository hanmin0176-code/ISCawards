export type RuleType =
  | "percentage_payout"
  | "tiered_cash_next_month"
  | "tiered_cash_after_13th"
  | "consecutive_bonus"
  | "trip_or_choice_reward";

export type RuleDraftTier = {
  thresholdValue: number | null;
  rewardCashAmount: number | null;
  rewardPercent: number | null;
  note?: string;
};

export type RuleDraftCondition = {
  periodLabel?: string;
  metricType: string;
  thresholdValue: number | null;
  note?: string;
};

export type RuleDraftConditionSet = {
  code: string;
  name: string;
  logicType: "AND" | "OR";
  conditions: RuleDraftCondition[];
};

export type RuleDraftRewardOption = {
  code: string;
  label: string;
  rewardType: "cash" | "trip" | "mixed";
  rewardCashAmount: number | null;
  rewardTripName?: string;
  appliesToConditionSetCode?: string;
  note?: string;
};

export type RuleDraft = {
  ruleCode: string;
  ruleType: RuleType;
  ruleName: string;
  description: string;
  baseMetricType: string;
  payoutTimingType: string;
  payoutOffsetMonths: number | null;
  maintenanceRequired: boolean;
  maintenanceRound: number | null;
  targetInclude: string[];
  targetExclude: string[];
  percentageTotal: number | null;
  percentageBreakdown: Array<{ label: string; percent: number }>;
  periods: Array<{ label?: string; startDate?: string | null; endDate?: string | null }>;
  tiers: RuleDraftTier[];
  conditionSets: RuleDraftConditionSet[];
  rewardOptions: RuleDraftRewardOption[];
  notes: string[];
  sourceTitle?: string;
  isTemplate?: boolean;
};

export type QuickCalculationInput = {
  productGroup: string;
  metricType: string;
  amount: number;
};

export type QuickCalculationResult = {
  ruleCode: string;
  ruleName: string;
  ruleType: RuleType;
  payoutTimingType: string;
  rewardAmount: number | null;
  rewardText: string;
  matchedTierLabel?: string;
  note?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[,\s]/g, "").replace(/만원/g, "").replace(/만/g, "");
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function toAmount(value: unknown): number | null {
  const num = toNumber(value);
  if (num === null) return null;
  if (Math.abs(num) < 1000) return Math.round(num * 10000);
  return Math.round(num);
}

function toPercent(value: unknown): number | null {
  if (typeof value === "string" && value.includes("%")) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const num = toNumber(value);
  if (num === null) return null;
  return num > 1000 ? num / 100 : num;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function parseDateRange(label: string): { startDate: string | null; endDate: string | null } {
  const match = label.match(/(\d{1,2})\.(\d{1,2})\s*[~-]\s*(\d{1,2})/);
  if (!match) {
    return { startDate: null, endDate: null };
  }

  const [, month, startDay, endDay] = match;
  const year = 2026;
  return {
    startDate: `${year}-${month.padStart(2, "0")}-${startDay.padStart(2, "0")}`,
    endDate: `${year}-${month.padStart(2, "0")}-${endDay.padStart(2, "0")}`,
  };
}

function buildRuleCode(prefix: string, index: number) {
  return `${slugify(prefix || "rule")}-${index + 1}`;
}

function normalizeRuleType(value: unknown): RuleType {
  const raw = typeof value === "string" ? value : "";
  if (
    raw === "percentage_payout" ||
    raw === "tiered_cash_next_month" ||
    raw === "tiered_cash_after_13th" ||
    raw === "consecutive_bonus" ||
    raw === "trip_or_choice_reward"
  ) {
    return raw;
  }

  return "tiered_cash_next_month";
}

function splitCsvText(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function defaultRuleTemplates(): RuleDraft[] {
  return [
    {
      ruleCode: "template-percentage-life",
      ruleType: "percentage_payout",
      ruleName: "인보험 익월 지급",
      description: "월납보험료 퍼센트형 규칙",
      baseMetricType: "monthly_premium",
      payoutTimingType: "next_month",
      payoutOffsetMonths: 1,
      maintenanceRequired: false,
      maintenanceRound: null,
      targetInclude: ["인보험"],
      targetExclude: [],
      percentageTotal: null,
      percentageBreakdown: [],
      periods: [],
      tiers: [],
      conditionSets: [],
      rewardOptions: [],
      notes: [],
      isTemplate: true,
    },
    {
      ruleCode: "template-tier-next-month",
      ruleType: "tiered_cash_next_month",
      ruleName: "익월 구간형 현금 시상",
      description: "실적 구간별 익월 현금 지급",
      baseMetricType: "performance_amount",
      payoutTimingType: "next_month",
      payoutOffsetMonths: 1,
      maintenanceRequired: false,
      maintenanceRound: null,
      targetInclude: [],
      targetExclude: [],
      percentageTotal: null,
      percentageBreakdown: [],
      periods: [],
      tiers: [],
      conditionSets: [],
      rewardOptions: [],
      notes: [],
      isTemplate: true,
    },
    {
      ruleCode: "template-tier-13th",
      ruleType: "tiered_cash_after_13th",
      ruleName: "13회차 구간형 현금 시상",
      description: "실적 구간별 13회차 납입 후 현금 지급",
      baseMetricType: "performance_amount",
      payoutTimingType: "after_13th",
      payoutOffsetMonths: null,
      maintenanceRequired: true,
      maintenanceRound: 13,
      targetInclude: [],
      targetExclude: [],
      percentageTotal: null,
      percentageBreakdown: [],
      periods: [],
      tiers: [],
      conditionSets: [],
      rewardOptions: [],
      notes: [],
      isTemplate: true,
    },
    {
      ruleCode: "template-consecutive",
      ruleType: "consecutive_bonus",
      ruleName: "연속가동 시상",
      description: "여러 기간을 연속 충족하면 지급",
      baseMetricType: "performance_amount",
      payoutTimingType: "after_maintenance",
      payoutOffsetMonths: null,
      maintenanceRequired: true,
      maintenanceRound: 13,
      targetInclude: [],
      targetExclude: [],
      percentageTotal: null,
      percentageBreakdown: [],
      periods: [],
      tiers: [],
      conditionSets: [],
      rewardOptions: [],
      notes: [],
      isTemplate: true,
    },
    {
      ruleCode: "template-trip-choice",
      ruleType: "trip_or_choice_reward",
      ruleName: "여행 / 택1 시상",
      description: "조건1 또는 조건2 + 여행/현금 보상 택1",
      baseMetricType: "performance_amount",
      payoutTimingType: "custom",
      payoutOffsetMonths: null,
      maintenanceRequired: false,
      maintenanceRound: null,
      targetInclude: [],
      targetExclude: [],
      percentageTotal: null,
      percentageBreakdown: [],
      periods: [],
      tiers: [],
      conditionSets: [],
      rewardOptions: [],
      notes: [],
      isTemplate: true,
    },
  ];
}

function mapRulesArray(rules: Record<string, unknown>[]): RuleDraft[] {
  return rules.map((rule, index) => {
    const targetProducts = isRecord(rule.target_products) ? rule.target_products : {};
    const percentageBreakdown = asArray(rule.percentage_breakdown)
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => ({
        label: typeof item.label === "string" ? item.label : `구성 ${index + 1}`,
        percent: toPercent(item.percent) ?? 0,
      }));

    const tiers = asArray(rule.tiers)
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => ({
        thresholdValue: toAmount(item.threshold ?? item.threshold_value),
        rewardCashAmount: toAmount(item.reward_cash ?? item.reward_cash_amount),
        rewardPercent: toPercent(item.reward_percent),
        note: typeof item.note === "string" ? item.note : undefined,
      }));

    const periods = asArray(rule.sales_periods ?? rule.periods)
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => ({
        label: typeof item.label === "string" ? item.label : undefined,
        startDate: typeof item.start_date === "string" ? item.start_date : null,
        endDate: typeof item.end_date === "string" ? item.end_date : null,
      }));

    const rewardOptions = asArray(rule.reward_options)
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item, optionIndex) => ({
        code: typeof item.option_code === "string" ? item.option_code : `option-${optionIndex + 1}`,
        label: typeof item.option_label === "string" ? item.option_label : `옵션 ${optionIndex + 1}`,
        rewardType:
          item.reward_type === "trip" || item.reward_type === "mixed" ? item.reward_type : "cash",
        rewardCashAmount: toAmount(item.reward_cash_amount),
        rewardTripName: typeof item.reward_trip_name === "string" ? item.reward_trip_name : undefined,
        appliesToConditionSetCode:
          typeof item.applies_to_condition_set_code === "string"
            ? item.applies_to_condition_set_code
            : undefined,
        note: typeof item.note === "string" ? item.note : undefined,
      }));

    const conditionSets = asArray(rule.condition_sets)
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item, setIndex) => ({
        code:
          typeof item.condition_set_code === "string"
            ? item.condition_set_code
            : `condition-${setIndex + 1}`,
        name:
          typeof item.condition_set_name === "string"
            ? item.condition_set_name
            : `조건 ${setIndex + 1}`,
        logicType: item.logic_type === "OR" ? "OR" : "AND",
        conditions: asArray(item.conditions)
          .filter((cond): cond is Record<string, unknown> => isRecord(cond))
          .map((cond) => ({
            periodLabel: typeof cond.period_label === "string" ? cond.period_label : undefined,
            metricType:
              typeof cond.metric_type === "string" ? cond.metric_type : "performance_amount",
            thresholdValue: toAmount(cond.threshold_value),
            note: typeof cond.note === "string" ? cond.note : undefined,
          })),
      }));

    return {
      ruleCode:
        typeof rule.rule_code === "string" ? rule.rule_code : buildRuleCode("rule", index),
      ruleType: normalizeRuleType(rule.rule_type),
      ruleName:
        typeof rule.rule_name === "string" ? rule.rule_name : `규칙 ${index + 1}`,
      description: typeof rule.description === "string" ? rule.description : "",
      baseMetricType:
        typeof rule.base_metric === "string"
          ? rule.base_metric
          : typeof rule.base_metric_type === "string"
            ? rule.base_metric_type
            : "performance_amount",
      payoutTimingType:
        typeof rule.payout_timing === "string"
          ? rule.payout_timing
          : typeof rule.payout_timing_type === "string"
            ? rule.payout_timing_type
            : "next_month",
      payoutOffsetMonths:
        typeof rule.payout_offset_months === "number" ? rule.payout_offset_months : null,
      maintenanceRequired:
        Boolean(isRecord(rule.maintenance_policy) ? rule.maintenance_policy.required : rule.maintenance_required),
      maintenanceRound:
        toNumber(isRecord(rule.maintenance_policy) ? rule.maintenance_policy.round_no : rule.maintenance_round) ??
        null,
      targetInclude: asArray(targetProducts.include).map((item) => String(item)),
      targetExclude: asArray(targetProducts.exclude).map((item) => String(item)),
      percentageTotal: toPercent(rule.percentage_total),
      percentageBreakdown,
      periods,
      tiers,
      conditionSets,
      rewardOptions,
      notes: asArray(rule.notes).map((item) => String(item)),
      sourceTitle: typeof rule.source_title === "string" ? rule.source_title : undefined,
    };
  });
}

function mapLegacySections(payload: Record<string, unknown>): RuleDraft[] {
  const sections = asArray(payload.sections).filter((item): item is Record<string, unknown> => isRecord(item));
  const drafts: RuleDraft[] = [];

  sections.forEach((section, index) => {
    const title =
      typeof section.section_name === "string"
        ? section.section_name
        : typeof section.tier === "string"
          ? section.tier
          : `섹션 ${index + 1}`;

    const awards = isRecord(section.awards)
      ? section.awards
      : isRecord(section.details)
        ? section.details
        : {};

    if (title.includes("400")) {
      const breakdown = Object.entries(awards)
        .map(([label, value]) => ({ label, percent: toPercent(value) ?? 0 }))
        .filter((item) => item.percent > 0);

      drafts.push({
        ruleCode: buildRuleCode(title, index),
        ruleType: "percentage_payout",
        ruleName: "월납보험료 퍼센트형 시상",
        description: "상단 퍼센트형 시상 구조를 AI가 추정한 초안입니다.",
        baseMetricType: "monthly_premium",
        payoutTimingType: "next_month",
        payoutOffsetMonths: 1,
        maintenanceRequired: false,
        maintenanceRound: null,
        targetInclude: [],
        targetExclude: [],
        percentageTotal: breakdown.reduce((sum, item) => sum + item.percent, 0) || null,
        percentageBreakdown: breakdown,
        periods: [],
        tiers: [],
        conditionSets: [],
        rewardOptions: [],
        notes: ["상품군 포함/제외는 관리자 확인 필요"],
        sourceTitle: title,
      });
      return;
    }

    const awardSection = isRecord(awards.시상금) ? awards.시상금 : awards;
    const periodText =
      typeof awardSection.기간 === "string"
        ? awardSection.기간
        : typeof awardSection.유효기간 === "string"
          ? awardSection.유효기간
          : undefined;
    const dateRange = periodText ? parseDateRange(periodText.replace(/일/g, "")) : { startDate: null, endDate: null };

    const conditionsArray = asArray(awardSection.조건)
      .filter((item): item is Record<string, unknown> => isRecord(item));

    const amountArrays = isRecord(awardSection.시상금)
      ? awardSection.시상금
      : isRecord(awards.시상금)
        ? awards.시상금
        : {};

    const tiers: RuleDraftTier[] = [];

    conditionsArray.forEach((item) => {
      tiers.push({
        thresholdValue: toAmount(item.인원 ?? item.기준 ?? item.threshold),
        rewardCashAmount: toAmount(item.금액 ?? item.reward),
        rewardPercent: null,
      });
    });

    if (tiers.length === 0 && isRecord(amountArrays)) {
      const cashList = asArray(amountArrays.현금 ?? amountArrays.cash);
      const qtyList = asArray(amountArrays.수량 ?? amountArrays.thresholds);
      const thresholdCandidates = [100000, 200000, 300000, 500000];
      cashList.forEach((value, tierIndex) => {
        tiers.push({
          thresholdValue: toAmount(qtyList[tierIndex]) ?? thresholdCandidates[tierIndex] ?? null,
          rewardCashAmount: toAmount(value),
          rewardPercent: null,
        });
      });
    }

    const ruleType: RuleType = title.includes("200")
      ? "tiered_cash_after_13th"
      : title.includes("최대")
        ? "consecutive_bonus"
        : "tiered_cash_next_month";

    drafts.push({
      ruleCode: buildRuleCode(title, index),
      ruleType,
      ruleName: title,
      description: "legacy sections 구조에서 추출한 규칙 초안",
      baseMetricType: "performance_amount",
      payoutTimingType:
        ruleType === "tiered_cash_after_13th"
          ? "after_13th"
          : ruleType === "consecutive_bonus"
            ? "after_maintenance"
            : "next_month",
      payoutOffsetMonths: ruleType === "tiered_cash_next_month" ? 1 : null,
      maintenanceRequired: ruleType !== "tiered_cash_next_month",
      maintenanceRound: ruleType !== "tiered_cash_next_month" ? 13 : null,
      targetInclude: [],
      targetExclude: [],
      percentageTotal: null,
      percentageBreakdown: [],
      periods: periodText
        ? [{ label: periodText, startDate: dateRange.startDate, endDate: dateRange.endDate }]
        : [],
      tiers,
      conditionSets: [],
      rewardOptions: [],
      notes: ["AI legacy sections 초안에서 자동 변환됨", "구간/대상 상품군 재확인 필요"],
      sourceTitle: title,
    });
  });

  return drafts;
}

export function extractRuleDrafts(payload: unknown): RuleDraft[] {
  if (!isRecord(payload)) {
    return defaultRuleTemplates();
  }

  const rules = asArray(payload.rules).filter((item): item is Record<string, unknown> => isRecord(item));
  const mappedRules = rules.length > 0 ? mapRulesArray(rules) : mapLegacySections(payload);

  const existingTypes = new Set(mappedRules.map((item) => item.ruleType));
  const suggestions = defaultRuleTemplates().filter((item) => !existingTypes.has(item.ruleType));

  return [...mappedRules, ...suggestions];
}

export function serializeRuleDrafts(ruleDrafts: RuleDraft[]) {
  return ruleDrafts.map((rule) => ({
    rule_code: rule.ruleCode,
    rule_type: rule.ruleType,
    rule_name: rule.ruleName,
    description: rule.description,
    base_metric: rule.baseMetricType,
    payout_timing: rule.payoutTimingType,
    payout_offset_months: rule.payoutOffsetMonths,
    maintenance_required: rule.maintenanceRequired,
    maintenance_round: rule.maintenanceRound,
    target_products: {
      include: rule.targetInclude,
      exclude: rule.targetExclude,
    },
    percentage_total: rule.percentageTotal,
    percentage_breakdown: rule.percentageBreakdown,
    periods: rule.periods.map((period) => ({
      label: period.label,
      start_date: period.startDate,
      end_date: period.endDate,
    })),
    tiers: rule.tiers.map((tier) => ({
      threshold: tier.thresholdValue,
      reward_cash: tier.rewardCashAmount,
      reward_percent: tier.rewardPercent,
      note: tier.note,
    })),
    condition_sets: rule.conditionSets.map((set) => ({
      condition_set_code: set.code,
      condition_set_name: set.name,
      logic_type: set.logicType,
      conditions: set.conditions.map((condition) => ({
        period_label: condition.periodLabel,
        metric_type: condition.metricType,
        threshold_value: condition.thresholdValue,
        note: condition.note,
      })),
    })),
    reward_options: rule.rewardOptions.map((option) => ({
      option_code: option.code,
      option_label: option.label,
      reward_type: option.rewardType,
      reward_cash_amount: option.rewardCashAmount,
      reward_trip_name: option.rewardTripName,
      applies_to_condition_set_code: option.appliesToConditionSetCode,
      note: option.note,
    })),
    notes: rule.notes,
    source_title: rule.sourceTitle,
  }));
}

export function validateRuleDrafts(ruleDrafts: RuleDraft[]) {
  const flags: Array<{ level: "info" | "warning" | "error"; field: string; message: string }> = [];

  if (ruleDrafts.length === 0) {
    flags.push({
      level: "warning",
      field: "rules",
      message: "규칙 카드가 없습니다. 최소 1개 이상의 규칙이 필요합니다.",
    });
  }

  ruleDrafts.forEach((rule, index) => {
    if (!rule.ruleName.trim()) {
      flags.push({
        level: "warning",
        field: `rules[${index}].ruleName`,
        message: "규칙명이 비어 있습니다.",
      });
    }

    if (rule.ruleType === "percentage_payout" && !rule.percentageTotal) {
      flags.push({
        level: "warning",
        field: `rules[${index}].percentageTotal`,
        message: "퍼센트형 규칙은 지급 퍼센트를 입력해야 합니다.",
      });
    }

    if (
      (rule.ruleType === "tiered_cash_next_month" ||
        rule.ruleType === "tiered_cash_after_13th" ||
        rule.ruleType === "consecutive_bonus") &&
      rule.tiers.length === 0
    ) {
      flags.push({
        level: "warning",
        field: `rules[${index}].tiers`,
        message: "구간형/연속가동 규칙은 최소 1개 이상의 구간이 필요합니다.",
      });
    }

    if (rule.ruleType === "trip_or_choice_reward" && rule.conditionSets.length === 0) {
      flags.push({
        level: "info",
        field: `rules[${index}].conditionSets`,
        message: "여행 규칙은 조건1/조건2 같은 조건셋 입력이 필요합니다.",
      });
    }
  });

  return flags;
}

export function calculateQuickEstimates(
  ruleDrafts: RuleDraft[],
  input: QuickCalculationInput,
): QuickCalculationResult[] {
  return ruleDrafts.flatMap((rule) => {
    const includeEmpty = rule.targetInclude.length === 0;
    const productIncluded = includeEmpty || rule.targetInclude.includes(input.productGroup);
    const productExcluded = rule.targetExclude.includes(input.productGroup);

    if (!productIncluded || productExcluded) {
      return [];
    }

    if (rule.ruleType === "percentage_payout") {
      if (rule.baseMetricType !== input.metricType || !rule.percentageTotal) {
        return [];
      }

      const rewardAmount = Math.round((input.amount * rule.percentageTotal) / 100);
      return [
        {
          ruleCode: rule.ruleCode,
          ruleName: rule.ruleName,
          ruleType: rule.ruleType,
          payoutTimingType: rule.payoutTimingType,
          rewardAmount,
          rewardText: `${rewardAmount.toLocaleString("ko-KR")}원`,
          note: `${rule.percentageTotal}% 적용`,
        },
      ];
    }

    if (
      rule.ruleType === "tiered_cash_next_month" ||
      rule.ruleType === "tiered_cash_after_13th" ||
      rule.ruleType === "consecutive_bonus"
    ) {
      if (rule.baseMetricType !== input.metricType && rule.baseMetricType !== "performance_amount") {
        return [];
      }

      const matchedTier = [...rule.tiers]
        .filter((tier) => typeof tier.thresholdValue === "number" && input.amount >= (tier.thresholdValue ?? 0))
        .sort((a, b) => (b.thresholdValue ?? 0) - (a.thresholdValue ?? 0))[0];

      if (!matchedTier || !matchedTier.rewardCashAmount) {
        return [];
      }

      return [
        {
          ruleCode: rule.ruleCode,
          ruleName: rule.ruleName,
          ruleType: rule.ruleType,
          payoutTimingType: rule.payoutTimingType,
          rewardAmount: matchedTier.rewardCashAmount,
          rewardText: `${matchedTier.rewardCashAmount.toLocaleString("ko-KR")}원`,
          matchedTierLabel: `${(matchedTier.thresholdValue ?? 0).toLocaleString("ko-KR")}원 구간`,
        },
      ];
    }

    if (rule.ruleType === "trip_or_choice_reward") {
      return [
        {
          ruleCode: rule.ruleCode,
          ruleName: rule.ruleName,
          ruleType: rule.ruleType,
          payoutTimingType: rule.payoutTimingType,
          rewardAmount: null,
          rewardText: "조건형 시상으로 관리자/설계사 확인 필요",
          note: "조건1/조건2 충족 여부에 따라 추천 보상이 달라집니다.",
        },
      ];
    }

    return [];
  });
}
