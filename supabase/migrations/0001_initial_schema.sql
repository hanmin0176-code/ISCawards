create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.insurers (
  id uuid primary key default gen_random_uuid(),
  insurer_code text not null unique,
  insurer_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_code text not null,
  planner_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, role_code)
);

create table if not exists public.incentive_campaigns (
  id uuid primary key default gen_random_uuid(),
  insurer_id uuid not null references public.insurers(id) on delete restrict,
  campaign_year integer not null check (campaign_year between 2000 and 2100),
  campaign_month integer not null check (campaign_month between 1 and 12),
  week_label text not null,
  campaign_name text not null,
  sales_period_start date,
  sales_period_end date,
  active_version_id uuid,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(insurer_id, campaign_year, campaign_month, week_label)
);

create table if not exists public.incentive_campaign_versions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.incentive_campaigns(id) on delete cascade,
  version_no integer not null,
  status text not null default 'draft',
  source_file_path text,
  source_file_name text,
  raw_ocr_text text,
  ai_model_name text,
  prompt_version text,
  ai_parsed_json jsonb not null default '{}'::jsonb,
  approved_json jsonb not null default '{}'::jsonb,
  validation_result_json jsonb not null default '{}'::jsonb,
  change_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(campaign_id, version_no)
);

alter table public.incentive_campaigns
  add constraint incentive_campaigns_active_version_fk
  foreign key (active_version_id)
  references public.incentive_campaign_versions(id)
  on delete set null;

create table if not exists public.campaign_review_logs (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.incentive_campaign_versions(id) on delete cascade,
  action_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  before_json jsonb,
  after_json jsonb,
  action_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_sections (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.incentive_campaign_versions(id) on delete cascade,
  section_code text not null,
  section_name text not null,
  section_type text not null,
  metric_type text not null default 'premium_amount',
  stack_mode text not null default 'additive',
  payout_timing_type text not null default 'next_month',
  payout_month_offset integer,
  maintenance_required boolean not null default false,
  maintenance_round integer,
  maintenance_rule_text text,
  clawback_enabled boolean not null default false,
  clawback_rule_text text,
  evidence_text text,
  sort_order integer not null default 1,
  raw_section_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(version_id, section_code)
);

create table if not exists public.campaign_section_periods (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.campaign_sections(id) on delete cascade,
  period_type text not null,
  period_label text,
  start_date date,
  end_date date,
  order_no integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_section_tiers (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.campaign_sections(id) on delete cascade,
  tier_order integer not null,
  min_value bigint not null,
  max_value bigint,
  reward_type text not null default 'cash',
  reward_cash_amount bigint,
  reward_meta_json jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(section_id, tier_order)
);

create table if not exists public.campaign_section_exclusions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.campaign_sections(id) on delete cascade,
  exclusion_type text not null,
  operator text not null default 'equals',
  exclusion_value text not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_section_logic (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.campaign_sections(id) on delete cascade,
  logic_json jsonb not null default '{}'::jsonb,
  choice_reward_json jsonb not null default '{}'::jsonb,
  extra_rule_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique(section_id)
);

create table if not exists public.planners (
  id uuid primary key default gen_random_uuid(),
  planner_code text not null unique,
  planner_name text not null,
  agency_name text,
  branch_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_user_roles
  add constraint app_user_roles_planner_fk
  foreign key (planner_id)
  references public.planners(id)
  on delete set null;

create table if not exists public.planner_contracts (
  id uuid primary key default gen_random_uuid(),
  planner_id uuid not null references public.planners(id) on delete cascade,
  insurer_id uuid not null references public.insurers(id) on delete restrict,
  contract_no_masked text,
  customer_name_masked text,
  product_name text,
  product_category text,
  issue_date date not null,
  premium_amount bigint not null default 0,
  ap_amount bigint,
  case_count integer not null default 1,
  payment_cycle text,
  status text not null default 'issued',
  is_excluded boolean not null default false,
  exclusion_reason text,
  source_type text not null default 'manual',
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.planner_contracts(id) on delete cascade,
  event_type text not null,
  event_date date not null,
  round_no integer,
  amount_delta bigint,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reward_forecasts (
  id uuid primary key default gen_random_uuid(),
  planner_id uuid not null references public.planners(id) on delete cascade,
  insurer_id uuid not null references public.insurers(id) on delete restrict,
  campaign_version_id uuid not null references public.incentive_campaign_versions(id) on delete restrict,
  section_id uuid not null references public.campaign_sections(id) on delete restrict,
  calculation_base_date date,
  sales_period_start date,
  sales_period_end date,
  qualification_value bigint,
  tier_label text,
  expected_payout_date date,
  expected_reward_type text not null default 'cash',
  expected_reward_amount bigint not null default 0,
  forecast_status text not null default 'forecasted',
  basis_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reward_payouts (
  id uuid primary key default gen_random_uuid(),
  forecast_id uuid not null references public.reward_forecasts(id) on delete cascade,
  actual_payout_date date,
  actual_amount bigint not null default 0,
  payout_status text not null default 'paid',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reward_alert_snapshots (
  id uuid primary key default gen_random_uuid(),
  planner_id uuid not null references public.planners(id) on delete cascade,
  insurer_id uuid not null references public.insurers(id) on delete restrict,
  campaign_version_id uuid not null references public.incentive_campaign_versions(id) on delete restrict,
  section_id uuid not null references public.campaign_sections(id) on delete restrict,
  as_of_date date not null,
  current_value bigint not null default 0,
  next_target_value bigint,
  gap_value bigint,
  incremental_reward_amount bigint,
  deadline_date date,
  alert_status text not null default 'open',
  basis_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_incentive_campaigns_lookup
  on public.incentive_campaigns(insurer_id, campaign_year, campaign_month, week_label);

create index if not exists idx_incentive_campaign_versions_campaign_status
  on public.incentive_campaign_versions(campaign_id, status, published_at desc);

create index if not exists idx_campaign_review_logs_version
  on public.campaign_review_logs(version_id, created_at desc);

create index if not exists idx_campaign_sections_version_sort
  on public.campaign_sections(version_id, sort_order);

create index if not exists idx_campaign_section_periods_section
  on public.campaign_section_periods(section_id, order_no);

create index if not exists idx_campaign_section_tiers_section
  on public.campaign_section_tiers(section_id, tier_order);

create index if not exists idx_campaign_section_exclusions_section
  on public.campaign_section_exclusions(section_id);

create index if not exists idx_planner_contracts_lookup
  on public.planner_contracts(planner_id, insurer_id, issue_date);

create index if not exists idx_contract_events_lookup
  on public.contract_events(contract_id, event_date);

create index if not exists idx_reward_forecasts_lookup
  on public.reward_forecasts(planner_id, expected_payout_date, forecast_status);

create index if not exists idx_reward_alert_snapshots_lookup
  on public.reward_alert_snapshots(planner_id, deadline_date, alert_status);

create or replace view public.vw_active_campaign_versions as
select
  c.id as campaign_id,
  c.insurer_id,
  c.campaign_year,
  c.campaign_month,
  c.week_label,
  c.campaign_name,
  c.sales_period_start,
  c.sales_period_end,
  v.id as version_id,
  v.version_no,
  v.status as version_status,
  v.published_at,
  v.approved_json,
  v.validation_result_json
from public.incentive_campaigns c
join public.incentive_campaign_versions v
  on v.id = c.active_version_id;

create or replace view public.vw_pending_maintenance_rewards as
select
  rf.id,
  rf.planner_id,
  rf.insurer_id,
  rf.campaign_version_id,
  rf.section_id,
  rf.expected_payout_date,
  rf.expected_reward_amount,
  rf.forecast_status,
  rf.basis_json,
  rf.created_at
from public.reward_forecasts rf
where rf.forecast_status = 'pending_maintenance';

create or replace function public.publish_campaign_version(
  p_version_id uuid,
  p_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_after jsonb;
begin
  select campaign_id into v_campaign_id
  from public.incentive_campaign_versions
  where id = p_version_id;

  if v_campaign_id is null then
    raise exception 'campaign version not found: %', p_version_id;
  end if;

  update public.incentive_campaign_versions
     set status = 'archived',
         updated_at = timezone('utc', now())
   where campaign_id = v_campaign_id
     and id <> p_version_id
     and status = 'published';

  update public.incentive_campaign_versions
     set status = 'published',
         published_at = timezone('utc', now()),
         updated_at = timezone('utc', now()),
         approved_by = coalesce(approved_by, p_actor_user_id)
   where id = p_version_id;

  update public.incentive_campaigns
     set active_version_id = p_version_id,
         status = 'published',
         updated_at = timezone('utc', now())
   where id = v_campaign_id;

  select jsonb_build_object(
    'campaign_id', v_campaign_id,
    'published_version_id', p_version_id,
    'published_at', timezone('utc', now())
  ) into v_after;

  insert into public.campaign_review_logs (
    version_id,
    action_type,
    actor_user_id,
    after_json,
    action_note
  ) values (
    p_version_id,
    'publish',
    p_actor_user_id,
    v_after,
    '버전 배포 확정'
  );
end;
$$;

insert into storage.buckets (id, name, public)
values ('campaign-source-images', 'campaign-source-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('campaign-export-json', 'campaign-export-json', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('planner-import-files', 'planner-import-files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('report-exports', 'report-exports', false)
on conflict (id) do nothing;

drop trigger if exists trg_insurers_updated_at on public.insurers;
create trigger trg_insurers_updated_at
before update on public.insurers
for each row execute function public.set_updated_at();

drop trigger if exists trg_incentive_campaigns_updated_at on public.incentive_campaigns;
create trigger trg_incentive_campaigns_updated_at
before update on public.incentive_campaigns
for each row execute function public.set_updated_at();

drop trigger if exists trg_incentive_campaign_versions_updated_at on public.incentive_campaign_versions;
create trigger trg_incentive_campaign_versions_updated_at
before update on public.incentive_campaign_versions
for each row execute function public.set_updated_at();

drop trigger if exists trg_campaign_sections_updated_at on public.campaign_sections;
create trigger trg_campaign_sections_updated_at
before update on public.campaign_sections
for each row execute function public.set_updated_at();

drop trigger if exists trg_planners_updated_at on public.planners;
create trigger trg_planners_updated_at
before update on public.planners
for each row execute function public.set_updated_at();

drop trigger if exists trg_planner_contracts_updated_at on public.planner_contracts;
create trigger trg_planner_contracts_updated_at
before update on public.planner_contracts
for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_forecasts_updated_at on public.reward_forecasts;
create trigger trg_reward_forecasts_updated_at
before update on public.reward_forecasts
for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_payouts_updated_at on public.reward_payouts;
create trigger trg_reward_payouts_updated_at
before update on public.reward_payouts
for each row execute function public.set_updated_at();
