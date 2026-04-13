create table if not exists public.campaign_rules (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.incentive_campaign_versions(id) on delete cascade,
  rule_code text not null,
  rule_type text not null,
  rule_name text not null,
  description text,
  base_metric_type text not null default 'performance_amount',
  reward_kind text not null default 'cash',
  payout_timing_type text not null default 'next_month',
  payout_offset_months integer,
  maintenance_required boolean not null default false,
  maintenance_round integer,
  stack_mode text not null default 'independent',
  target_json jsonb not null default '{}'::jsonb,
  exclusion_json jsonb not null default '{}'::jsonb,
  qualification_json jsonb not null default '{}'::jsonb,
  payout_json jsonb not null default '{}'::jsonb,
  raw_rule_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(version_id, rule_code)
);

create table if not exists public.campaign_rule_periods (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.campaign_rules(id) on delete cascade,
  period_role text not null,
  period_code text,
  period_label text,
  condition_set_code text,
  start_date date,
  end_date date,
  order_no integer not null default 1,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_rule_tiers (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.campaign_rules(id) on delete cascade,
  tier_code text,
  tier_label text,
  threshold_operator text not null default 'gte',
  threshold_value bigint,
  threshold_value_max bigint,
  reward_cash_amount bigint,
  reward_percent integer,
  reward_trip_name text,
  reward_trip_quantity integer,
  reward_meta_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_rule_condition_sets (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.campaign_rules(id) on delete cascade,
  condition_set_code text not null,
  condition_set_name text not null,
  logic_type text not null default 'AND',
  description text,
  sort_order integer not null default 1,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique(rule_id, condition_set_code)
);

create table if not exists public.campaign_rule_conditions (
  id uuid primary key default gen_random_uuid(),
  condition_set_id uuid not null references public.campaign_rule_condition_sets(id) on delete cascade,
  condition_code text,
  metric_type text not null,
  period_code text,
  operator text not null default 'gte',
  threshold_value bigint,
  target_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_rule_reward_options (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.campaign_rules(id) on delete cascade,
  reward_group_code text,
  option_code text not null,
  option_label text not null,
  reward_type text not null default 'cash',
  reward_cash_amount bigint,
  reward_percent integer,
  reward_trip_name text,
  reward_trip_quantity integer,
  applies_to_tier_code text,
  applies_to_condition_set_code text,
  sort_order integer not null default 1,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.planner_performance_inputs (
  id uuid primary key default gen_random_uuid(),
  planner_id uuid not null references public.planners(id) on delete cascade,
  insurer_id uuid not null references public.insurers(id) on delete restrict,
  campaign_id uuid references public.incentive_campaigns(id) on delete set null,
  campaign_version_id uuid references public.incentive_campaign_versions(id) on delete set null,
  input_year integer not null check (input_year between 2000 and 2100),
  input_month integer not null check (input_month between 1 and 12),
  week_label text not null,
  sales_period_start date,
  sales_period_end date,
  input_mode text not null default 'quick',
  input_status text not null default 'draft',
  notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.planner_performance_lines (
  id uuid primary key default gen_random_uuid(),
  input_id uuid not null references public.planner_performance_inputs(id) on delete cascade,
  line_type text not null default 'summary',
  product_group_code text,
  product_category text,
  product_name text,
  metric_type text not null default 'monthly_premium',
  performance_amount bigint not null default 0,
  contract_id uuid references public.planner_contracts(id) on delete set null,
  contract_issue_date date,
  line_status text not null default 'active',
  note text,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reward_forecast_details (
  id uuid primary key default gen_random_uuid(),
  forecast_id uuid not null references public.reward_forecasts(id) on delete cascade,
  rule_id uuid not null references public.campaign_rules(id) on delete restrict,
  input_id uuid references public.planner_performance_inputs(id) on delete set null,
  condition_set_code text,
  reward_option_code text,
  matched_value bigint,
  explanation_text text,
  source_line_ids jsonb not null default '[]'::jsonb,
  calculation_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_campaign_rules_version_type
  on public.campaign_rules(version_id, rule_type, sort_order);

create index if not exists idx_campaign_rule_periods_rule
  on public.campaign_rule_periods(rule_id, period_role, order_no);

create index if not exists idx_campaign_rule_tiers_rule
  on public.campaign_rule_tiers(rule_id, sort_order);

create index if not exists idx_campaign_rule_condition_sets_rule
  on public.campaign_rule_condition_sets(rule_id, sort_order);

create index if not exists idx_campaign_rule_conditions_set
  on public.campaign_rule_conditions(condition_set_id, sort_order);

create index if not exists idx_campaign_rule_reward_options_rule
  on public.campaign_rule_reward_options(rule_id, sort_order);

create index if not exists idx_planner_performance_inputs_lookup
  on public.planner_performance_inputs(planner_id, insurer_id, input_year, input_month, week_label);

create index if not exists idx_planner_performance_lines_input
  on public.planner_performance_lines(input_id, product_group_code, metric_type);

create index if not exists idx_reward_forecast_details_forecast
  on public.reward_forecast_details(forecast_id, rule_id);

create or replace view public.vw_published_campaign_rules as
select
  i.insurer_name,
  c.id as campaign_id,
  c.campaign_year,
  c.campaign_month,
  c.week_label,
  v.id as version_id,
  v.version_no,
  r.id as rule_id,
  r.rule_code,
  r.rule_type,
  r.rule_name,
  r.base_metric_type,
  r.reward_kind,
  r.payout_timing_type,
  r.payout_offset_months,
  r.maintenance_required,
  r.maintenance_round,
  r.target_json,
  r.exclusion_json,
  r.qualification_json,
  r.payout_json,
  r.raw_rule_json,
  r.sort_order
from public.incentive_campaigns c
join public.incentive_campaign_versions v
  on v.id = c.active_version_id
join public.insurers i
  on i.id = c.insurer_id
join public.campaign_rules r
  on r.version_id = v.id
where r.is_active = true;

create or replace view public.vw_planner_input_summary as
select
  h.id as input_id,
  h.planner_id,
  h.insurer_id,
  h.input_year,
  h.input_month,
  h.week_label,
  h.sales_period_start,
  h.sales_period_end,
  l.product_group_code,
  l.metric_type,
  sum(l.performance_amount) as total_amount,
  count(*) as line_count
from public.planner_performance_inputs h
join public.planner_performance_lines l
  on l.input_id = h.id
where l.line_status = 'active'
group by
  h.id,
  h.planner_id,
  h.insurer_id,
  h.input_year,
  h.input_month,
  h.week_label,
  h.sales_period_start,
  h.sales_period_end,
  l.product_group_code,
  l.metric_type;

drop trigger if exists trg_campaign_rules_updated_at on public.campaign_rules;
create trigger trg_campaign_rules_updated_at
before update on public.campaign_rules
for each row execute function public.set_updated_at();

drop trigger if exists trg_planner_performance_inputs_updated_at on public.planner_performance_inputs;
create trigger trg_planner_performance_inputs_updated_at
before update on public.planner_performance_inputs
for each row execute function public.set_updated_at();

drop trigger if exists trg_planner_performance_lines_updated_at on public.planner_performance_lines;
create trigger trg_planner_performance_lines_updated_at
before update on public.planner_performance_lines
for each row execute function public.set_updated_at();
