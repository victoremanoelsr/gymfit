-- GYMFIT - schema inicial multiacademia
-- Execute este arquivo inteiro no SQL Editor do Supabase.

create extension if not exists pgcrypto;
create extension if not exists citext;
create schema if not exists private;

-- Tipos
create type public.app_role as enum ('platform_admin','master','manager','trainer','student');
create type public.record_status as enum ('active','inactive','pending','blocked','cancelled');
create type public.transaction_type as enum ('income','expense');
create type public.payment_status as enum ('pending','paid','overdue','cancelled','refunded');
create type public.lead_stage as enum ('lead','contacted','visit_scheduled','trial','proposal','enrolled','lost');
create type public.booking_status as enum ('booked','confirmed','present','absent','cancelled','waitlist');
create type public.access_result as enum ('allowed','denied');

-- Núcleo SaaS
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  legal_name text,
  tax_id text,
  email text,
  phone text,
  logo_url text,
  plan_name text not null default 'Start',
  subscription_status public.record_status not null default 'pending',
  trial_ends_at timestamptz,
  max_members integer not null default 300,
  max_branches integer not null default 1,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  display_name text not null,
  role public.app_role not null default 'student',
  organization_id uuid references public.organizations(id) on delete set null,
  avatar_url text,
  phone text,
  must_change_password boolean not null default false,
  status public.record_status not null default 'active',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  city text,
  state text,
  address text,
  phone text,
  capacity integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Pessoas e contratos
create table public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  cpf text,
  email text,
  phone text,
  birth_date date,
  gender text,
  emergency_contact text,
  goals text[],
  medical_notes text,
  status public.record_status not null default 'active',
  joined_at date not null default current_date,
  last_checkin_at timestamptz,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index members_org_cpf_uq on public.members(organization_id, cpf) where cpf is not null;

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  billing_cycle text not null default 'monthly',
  duration_months integer not null default 1,
  access_rules jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  start_date date not null default current_date,
  end_date date,
  amount numeric(12,2) not null default 0,
  payment_method text,
  status public.record_status not null default 'active',
  signed_at timestamptz,
  document_url text,
  auto_renew boolean not null default false,
  created_at timestamptz not null default now()
);

-- Financeiro
create table public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type public.transaction_type not null,
  color text,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  category_id uuid references public.financial_categories(id) on delete set null,
  type public.transaction_type not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  paid_at timestamptz,
  payment_status public.payment_status not null default 'pending',
  payment_method text,
  external_reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- CRM e vendas
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  phone text,
  email text,
  source text,
  campaign text,
  stage public.lead_stage not null default 'lead',
  owner_id uuid references auth.users(id) on delete set null,
  next_action_at timestamptz,
  lost_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  activity_type text not null,
  description text not null,
  scheduled_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Agenda, aulas e reservas
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  title text not null,
  description text,
  trainer_id uuid references auth.users(id) on delete set null,
  room text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 20,
  waitlist_enabled boolean not null default true,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status public.booking_status not null default 'booked',
  position integer,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique(session_id, member_id)
);

-- Treinos
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  trainer_id uuid references auth.users(id) on delete set null,
  name text not null,
  objective text,
  notes text,
  starts_on date not null default current_date,
  expires_on date,
  status public.record_status not null default 'active',
  ai_generated boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_name text not null,
  muscle_group text,
  order_index integer not null default 0,
  sets integer,
  reps text,
  load_kg numeric(8,2),
  rest_seconds integer,
  cadence text,
  method text,
  rpe_target numeric(3,1),
  rir_target integer,
  video_url text,
  instructions text,
  created_at timestamptz not null default now()
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  exercise_id uuid references public.workout_exercises(id) on delete set null,
  performed_at timestamptz not null default now(),
  sets_completed integer,
  reps_completed text,
  load_kg numeric(8,2),
  rpe numeric(3,1),
  feedback text,
  source text not null default 'manual'
);

-- Avaliações e saúde
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  evaluator_id uuid references auth.users(id) on delete set null,
  assessed_at timestamptz not null default now(),
  weight_kg numeric(6,2),
  height_cm numeric(6,2),
  body_fat_pct numeric(5,2),
  muscle_mass_kg numeric(6,2),
  waist_cm numeric(6,2),
  chest_cm numeric(6,2),
  arm_cm numeric(6,2),
  thigh_cm numeric(6,2),
  parq jsonb not null default '{}'::jsonb,
  measurements jsonb not null default '{}'::jsonb,
  posture_notes text,
  photos jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

-- Acesso
create table public.access_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  device_type text not null,
  provider text,
  external_id text,
  online boolean not null default true,
  last_sync_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  device_id uuid references public.access_devices(id) on delete set null,
  occurred_at timestamptz not null default now(),
  method text not null default 'qr_code',
  result public.access_result not null,
  reason text
);

-- Equipe
create table public.staff_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  full_name text not null,
  job_title text not null,
  hire_date date,
  salary numeric(12,2),
  commission_rule jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff_records(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  check (ends_at > starts_at)
);

-- Estoque / PDV
create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text,
  name text not null,
  category text,
  sale_price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  stock_quantity numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 0,
  expiry_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null,
  quantity numeric(12,3) not null,
  unit_cost numeric(12,2),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Marketing, automações e comunicação
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  channel text not null,
  audience_filter jsonb not null default '{}'::jsonb,
  template text,
  status public.record_status not null default 'pending',
  scheduled_at timestamptz,
  sent_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  title text not null,
  body text not null,
  channel text not null default 'in_app',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Retenção e inteligência
create table public.churn_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  risk_level text not null,
  factors jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium',
  related_type text,
  related_id uuid,
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Gamificação
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  metric text not null,
  target numeric(12,2) not null,
  points integer not null default 0,
  starts_on date not null,
  ends_on date not null,
  active boolean not null default true,
  check (ends_on >= starts_on)
);

create table public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  progress numeric(12,2) not null default 0,
  completed_at timestamptz,
  points_awarded integer not null default 0,
  unique(challenge_id, member_id)
);

-- Smart Gym / manutenção
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  serial_number text,
  category text,
  purchased_at date,
  warranty_until date,
  usage_hours numeric(12,2) not null default 0,
  last_maintenance_at timestamptz,
  next_maintenance_at timestamptz,
  iot_enabled boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.maintenance_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium',
  status public.record_status not null default 'pending',
  opened_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  cost numeric(12,2)
);

-- Bem-estar, nutrição e hábitos
create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  professional_id uuid references auth.users(id) on delete set null,
  title text not null,
  goal text,
  guidance text,
  starts_on date not null default current_date,
  ends_on date,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.member_habits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  name text not null,
  target numeric(12,2) not null default 1,
  unit text not null default 'vezes',
  frequency text not null default 'daily',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  habit_id uuid not null references public.member_habits(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  logged_on date not null default current_date,
  value numeric(12,2) not null default 1,
  notes text,
  unique(habit_id, logged_on)
);

-- Indicações, pontos e recompensas
create table public.member_points (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  balance integer not null default 0,
  lifetime_points integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(organization_id, member_id)
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  referrer_member_id uuid references public.members(id) on delete set null,
  referred_name text not null,
  referred_phone text,
  status text not null default 'invited',
  reward_points integer not null default 0,
  converted_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  points_cost integer not null check (points_cost >= 0),
  stock integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  points_spent integer not null,
  status text not null default 'requested',
  redeemed_at timestamptz not null default now(),
  delivered_at timestamptz
);

-- Comunidade
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  post_type text not null default 'post',
  content text not null,
  media_url text,
  visibility text not null default 'organization',
  published_at timestamptz not null default now(),
  status public.record_status not null default 'active'
);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

-- NPS e pesquisas
create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  survey_type text not null default 'nps',
  question text not null,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  survey_id uuid not null references public.surveys(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  score integer,
  answer text,
  submitted_at timestamptz not null default now()
);

-- Conteúdo e aulas sob demanda
create table public.content_library (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  category text,
  content_type text not null default 'video',
  media_url text not null,
  thumbnail_url text,
  duration_seconds integer,
  trainer_id uuid references auth.users(id) on delete set null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

-- Vendas / PDV
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  total_amount numeric(12,2) not null default 0,
  payment_method text,
  payment_status public.payment_status not null default 'paid',
  sold_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) generated always as (quantity * unit_price) stored
);

-- Comissões e repasses
create table public.staff_commissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff_records(id) on delete cascade,
  reference_month date not null,
  source_type text not null,
  source_id uuid,
  amount numeric(12,2) not null default 0,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Integrações, webhooks e migração
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  integration_type text not null,
  status public.record_status not null default 'pending',
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  endpoint_url text not null,
  event_types text[] not null default '{}',
  secret_hash text,
  active boolean not null default true,
  last_delivery_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.migration_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_system text,
  file_name text,
  entity_type text not null,
  status text not null default 'queued',
  total_rows integer not null default 0,
  processed_rows integer not null default 0,
  error_rows integer not null default 0,
  report_url text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Ocupação e previsão de pico
create table public.occupancy_snapshots (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  zone_name text not null default 'Academia',
  people_count integer not null default 0,
  capacity integer,
  captured_at timestamptz not null default now()
);

-- Auditoria
create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Índices principais
create index idx_profiles_org on public.profiles(organization_id);
create index idx_members_org_status on public.members(organization_id, status);
create index idx_transactions_org_due on public.transactions(organization_id, due_date);
create index idx_transactions_org_status on public.transactions(organization_id, payment_status);
create index idx_leads_org_stage on public.leads(organization_id, stage);
create index idx_sessions_org_start on public.class_sessions(organization_id, starts_at);
create index idx_workouts_member on public.workouts(member_id, status);
create index idx_assessments_member_date on public.assessments(member_id, assessed_at desc);
create index idx_access_logs_org_date on public.access_logs(organization_id, occurred_at desc);
create index idx_churn_org_score on public.churn_scores(organization_id, score desc);

-- Funções de autorização para RLS
create or replace function private.current_role()
returns public.app_role
language sql stable security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function private.current_org_id()
returns uuid
language sql stable security definer
set search_path = public, pg_temp
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce((select role = 'platform_admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function private.can_access_org(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select private.is_platform_admin() or target_org = private.current_org_id();
$$;

create or replace function private.can_manage_org(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select private.is_platform_admin() or (
    target_org = private.current_org_id()
    and private.current_role() in ('master','manager')
  );
$$;

create or replace function private.can_train_org(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select private.is_platform_admin() or (
    target_org = private.current_org_id()
    and private.current_role() in ('master','manager','trainer')
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- Trigger de perfil ao criar usuário via Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  role_value public.app_role;
  org_value uuid;
begin
  begin
    role_value := coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'student');
  exception when others then
    role_value := 'student';
  end;

  begin
    org_value := nullif(new.raw_user_meta_data ->> 'organization_id', '')::uuid;
  exception when others then
    org_value := null;
  end;

  insert into public.profiles (id, username, display_name, role, organization_id, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, new.id::text), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username', 'Usuário'),
    role_value,
    org_value,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Atualização automática de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger members_updated_at before update on public.members for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger workouts_updated_at before update on public.workouts for each row execute function public.set_updated_at();

-- RLS
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.members enable row level security;
alter table public.plans enable row level security;
alter table public.contracts enable row level security;
alter table public.financial_categories enable row level security;
alter table public.transactions enable row level security;
alter table public.leads enable row level security;
alter table public.crm_activities enable row level security;
alter table public.class_sessions enable row level security;
alter table public.class_bookings enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.assessments enable row level security;
alter table public.access_devices enable row level security;
alter table public.access_logs enable row level security;
alter table public.staff_records enable row level security;
alter table public.staff_shifts enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.campaigns enable row level security;
alter table public.notifications enable row level security;
alter table public.churn_scores enable row level security;
alter table public.tasks enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.equipment enable row level security;
alter table public.maintenance_orders enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.member_habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.member_points enable row level security;
alter table public.referrals enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;
alter table public.content_library enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.staff_commissions enable row level security;
alter table public.integrations enable row level security;
alter table public.webhooks enable row level security;
alter table public.migration_jobs enable row level security;
alter table public.occupancy_snapshots enable row level security;
alter table public.audit_logs enable row level security;

-- Organizações e perfis
create policy org_select on public.organizations for select to authenticated
using (private.is_platform_admin() or id = private.current_org_id());
create policy org_admin_write on public.organizations for all to authenticated
using (private.is_platform_admin()) with check (private.is_platform_admin());

create policy profile_select on public.profiles for select to authenticated
using (private.is_platform_admin() or id = auth.uid() or organization_id = private.current_org_id());
create policy profile_admin_insert on public.profiles for insert to authenticated
with check (
  private.is_platform_admin()
  or (organization_id = private.current_org_id() and private.current_role() = 'master' and role in ('manager','trainer','student'))
  or (organization_id = private.current_org_id() and private.current_role() = 'manager' and role in ('trainer','student'))
);
create policy profile_admin_update on public.profiles for update to authenticated
using (
  private.is_platform_admin()
  or (organization_id = private.current_org_id() and private.current_role() = 'master' and role in ('manager','trainer','student'))
  or (organization_id = private.current_org_id() and private.current_role() = 'manager' and role in ('trainer','student'))
)
with check (
  private.is_platform_admin()
  or (organization_id = private.current_org_id() and private.current_role() = 'master' and role in ('manager','trainer','student'))
  or (organization_id = private.current_org_id() and private.current_role() = 'manager' and role in ('trainer','student'))
);
create policy profile_admin_delete on public.profiles for delete to authenticated
using (
  private.is_platform_admin()
  or (organization_id = private.current_org_id() and private.current_role() = 'master' and role in ('manager','trainer','student'))
  or (organization_id = private.current_org_id() and private.current_role() = 'manager' and role in ('trainer','student'))
);

-- Macro para políticas de tabelas com organization_id
-- leitura: membros da organização; escrita: master/manager/admin
create policy branches_select on public.branches for select to authenticated using (private.can_access_org(organization_id));
create policy branches_write on public.branches for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy members_select on public.members for select to authenticated
using (private.can_access_org(organization_id) or user_id = auth.uid());
create policy members_write on public.members for all to authenticated
using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy plans_select on public.plans for select to authenticated using (private.can_access_org(organization_id));
create policy plans_write on public.plans for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy contracts_select on public.contracts for select to authenticated
using (private.can_access_org(organization_id) or exists(select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
create policy contracts_write on public.contracts for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy fincat_select on public.financial_categories for select to authenticated using (private.can_access_org(organization_id));
create policy fincat_write on public.financial_categories for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy transactions_select on public.transactions for select to authenticated
using (private.can_manage_org(organization_id) or exists(select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
create policy transactions_write on public.transactions for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy leads_select on public.leads for select to authenticated using (private.can_access_org(organization_id) and private.current_role() <> 'student');
create policy leads_write on public.leads for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy activities_select on public.crm_activities for select to authenticated using (private.can_access_org(organization_id) and private.current_role() <> 'student');
create policy activities_write on public.crm_activities for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy sessions_select on public.class_sessions for select to authenticated using (private.can_access_org(organization_id));
create policy sessions_write on public.class_sessions for all to authenticated using (private.can_train_org(organization_id)) with check (private.can_train_org(organization_id));

create policy bookings_select on public.class_bookings for select to authenticated
using (private.can_access_org(organization_id) or exists(select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
create policy bookings_write_staff on public.class_bookings for all to authenticated using (private.can_train_org(organization_id)) with check (private.can_train_org(organization_id));
create policy bookings_student_insert on public.class_bookings for insert to authenticated
with check (exists(select 1 from public.members m where m.id = member_id and m.user_id = auth.uid() and m.organization_id = organization_id));
create policy bookings_student_update on public.class_bookings for update to authenticated
using (exists(select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()))
with check (exists(select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));

create policy workouts_select on public.workouts for select to authenticated
using (private.can_train_org(organization_id) or exists(select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
create policy workouts_write on public.workouts for all to authenticated using (private.can_train_org(organization_id)) with check (private.can_train_org(organization_id));

create policy workout_exercises_select on public.workout_exercises for select to authenticated
using (exists(select 1 from public.workouts w where w.id = workout_id and (private.can_train_org(w.organization_id) or exists(select 1 from public.members m where m.id=w.member_id and m.user_id=auth.uid()))));
create policy workout_exercises_write on public.workout_exercises for all to authenticated
using (exists(select 1 from public.workouts w where w.id = workout_id and private.can_train_org(w.organization_id)))
with check (exists(select 1 from public.workouts w where w.id = workout_id and private.can_train_org(w.organization_id)));

create policy workout_logs_select on public.workout_logs for select to authenticated
using (private.can_train_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy workout_logs_insert on public.workout_logs for insert to authenticated
with check (private.can_train_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));

create policy assessments_select on public.assessments for select to authenticated
using (private.can_train_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy assessments_write on public.assessments for all to authenticated using (private.can_train_org(organization_id)) with check (private.can_train_org(organization_id));

create policy access_devices_select on public.access_devices for select to authenticated using (private.can_access_org(organization_id));
create policy access_devices_write on public.access_devices for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy access_logs_select on public.access_logs for select to authenticated using (private.can_access_org(organization_id));
create policy access_logs_insert on public.access_logs for insert to authenticated with check (private.can_access_org(organization_id));

create policy staff_select on public.staff_records for select to authenticated using (private.can_access_org(organization_id));
create policy staff_write on public.staff_records for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy shifts_select on public.staff_shifts for select to authenticated using (private.can_access_org(organization_id));
create policy shifts_write on public.staff_shifts for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy products_select on public.products for select to authenticated using (private.can_access_org(organization_id));
create policy products_write on public.products for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy stock_select on public.stock_movements for select to authenticated using (private.can_access_org(organization_id));
create policy stock_write on public.stock_movements for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy campaigns_select on public.campaigns for select to authenticated using (private.can_access_org(organization_id) and private.current_role() <> 'student');
create policy campaigns_write on public.campaigns for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy notifications_select on public.notifications for select to authenticated
using (user_id = auth.uid() or (user_id is null and private.can_access_org(organization_id)));
create policy notifications_write on public.notifications for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy churn_select on public.churn_scores for select to authenticated using (private.can_train_org(organization_id));
create policy churn_write on public.churn_scores for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy tasks_select on public.tasks for select to authenticated using (private.can_access_org(organization_id) and private.current_role() <> 'student');
create policy tasks_write on public.tasks for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy challenges_select on public.challenges for select to authenticated using (private.can_access_org(organization_id));
create policy challenges_write on public.challenges for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy challenge_parts_select on public.challenge_participants for select to authenticated using (private.can_access_org(organization_id));
create policy challenge_parts_write on public.challenge_participants for all to authenticated using (private.can_train_org(organization_id)) with check (private.can_train_org(organization_id));

create policy equipment_select on public.equipment for select to authenticated using (private.can_access_org(organization_id));
create policy equipment_write on public.equipment for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy maintenance_select on public.maintenance_orders for select to authenticated using (private.can_access_org(organization_id));
create policy maintenance_write on public.maintenance_orders for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy nutrition_select on public.nutrition_plans for select to authenticated using (private.can_train_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy nutrition_write on public.nutrition_plans for all to authenticated using (private.can_train_org(organization_id)) with check (private.can_train_org(organization_id));
create policy habits_select on public.member_habits for select to authenticated using (private.can_train_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy habits_write on public.member_habits for all to authenticated using (private.can_train_org(organization_id)) with check (private.can_train_org(organization_id));
create policy habit_logs_select on public.habit_logs for select to authenticated using (private.can_train_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy habit_logs_insert on public.habit_logs for insert to authenticated with check (private.can_train_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));

create policy member_points_select on public.member_points for select to authenticated using (private.can_access_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy member_points_write on public.member_points for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy referrals_select on public.referrals for select to authenticated using (private.can_access_org(organization_id) or exists(select 1 from public.members m where m.id=referrer_member_id and m.user_id=auth.uid()));
create policy referrals_write on public.referrals for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy referrals_student_insert on public.referrals for insert to authenticated with check (exists(select 1 from public.members m where m.id=referrer_member_id and m.user_id=auth.uid()));
create policy rewards_select on public.rewards for select to authenticated using (private.can_access_org(organization_id));
create policy rewards_write on public.rewards for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy redemptions_select on public.reward_redemptions for select to authenticated using (private.can_access_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy redemptions_write on public.reward_redemptions for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy community_posts_select on public.community_posts for select to authenticated using (private.can_access_org(organization_id));
create policy community_posts_insert on public.community_posts for insert to authenticated with check (private.can_access_org(organization_id) and author_id=auth.uid());
create policy community_posts_manage on public.community_posts for update to authenticated using (author_id=auth.uid() or private.can_manage_org(organization_id)) with check (author_id=auth.uid() or private.can_manage_org(organization_id));
create policy community_posts_delete on public.community_posts for delete to authenticated using (author_id=auth.uid() or private.can_manage_org(organization_id));
create policy community_comments_select on public.community_comments for select to authenticated using (private.can_access_org(organization_id));
create policy community_comments_insert on public.community_comments for insert to authenticated with check (private.can_access_org(organization_id) and author_id=auth.uid());
create policy community_comments_delete on public.community_comments for delete to authenticated using (author_id=auth.uid() or private.can_manage_org(organization_id));

create policy surveys_select on public.surveys for select to authenticated using (private.can_access_org(organization_id));
create policy surveys_write on public.surveys for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy responses_select on public.survey_responses for select to authenticated using (private.can_manage_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy responses_insert on public.survey_responses for insert to authenticated with check (exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()) or private.can_manage_org(organization_id));

create policy content_select on public.content_library for select to authenticated using (private.can_access_org(organization_id));
create policy content_write on public.content_library for all to authenticated using (private.can_train_org(organization_id)) with check (private.can_train_org(organization_id));
create policy sales_select on public.sales for select to authenticated using (private.can_manage_org(organization_id) or exists(select 1 from public.members m where m.id=member_id and m.user_id=auth.uid()));
create policy sales_write on public.sales for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy sale_items_select on public.sale_items for select to authenticated using (exists(select 1 from public.sales s where s.id=sale_id and (private.can_manage_org(s.organization_id) or exists(select 1 from public.members m where m.id=s.member_id and m.user_id=auth.uid()))));
create policy sale_items_write on public.sale_items for all to authenticated using (exists(select 1 from public.sales s where s.id=sale_id and private.can_manage_org(s.organization_id))) with check (exists(select 1 from public.sales s where s.id=sale_id and private.can_manage_org(s.organization_id)));
create policy commissions_select on public.staff_commissions for select to authenticated using (private.can_manage_org(organization_id));
create policy commissions_write on public.staff_commissions for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy integrations_select on public.integrations for select to authenticated using (private.can_manage_org(organization_id));
create policy integrations_write on public.integrations for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy webhooks_select on public.webhooks for select to authenticated using (private.can_manage_org(organization_id));
create policy webhooks_write on public.webhooks for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy migrations_select on public.migration_jobs for select to authenticated using (private.can_manage_org(organization_id));
create policy migrations_write on public.migration_jobs for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy occupancy_select on public.occupancy_snapshots for select to authenticated using (private.can_access_org(organization_id));
create policy occupancy_write on public.occupancy_snapshots for all to authenticated using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));

create policy audit_select on public.audit_logs for select to authenticated
using (private.is_platform_admin() or (organization_id = private.current_org_id() and private.current_role() = 'master'));
create policy audit_insert on public.audit_logs for insert to authenticated
with check (actor_id = auth.uid() and (organization_id is null or private.can_access_org(organization_id)));

-- Views de BI
create or replace view public.organization_kpis
with (security_invoker = true)
as
select
  o.id as organization_id,
  (select count(*) from public.members m where m.organization_id=o.id and m.status='active') as active_members,
  (select count(*) from public.members m where m.organization_id=o.id and m.joined_at >= date_trunc('month', current_date)::date) as new_members_month,
  (select coalesce(sum(t.amount),0) from public.transactions t where t.organization_id=o.id and t.type='income' and t.payment_status='paid' and t.paid_at >= date_trunc('month', now())) as income_month,
  (select coalesce(sum(t.amount),0) from public.transactions t where t.organization_id=o.id and t.type='expense' and t.payment_status='paid' and t.paid_at >= date_trunc('month', now())) as expense_month,
  (select count(*) from public.transactions t where t.organization_id=o.id and t.payment_status='overdue') as overdue_count,
  (select count(*) from public.leads l where l.organization_id=o.id and l.created_at >= date_trunc('month', now())) as leads_month
from public.organizations o;

grant select on public.organization_kpis to authenticated;

-- Comentários úteis
comment on table public.organizations is 'Academias clientes do SaaS GYMFIT';
comment on table public.profiles is 'Perfis e papéis: ADM, Master, Gerente, Treinador e Aluno';
comment on table public.churn_scores is 'Pontuação explicável de risco de evasão';
comment on table public.equipment is 'Base para manutenção e futura integração IoT';
