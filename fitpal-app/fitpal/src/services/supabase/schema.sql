-- FitPal database schema (Postgres, designed for Supabase).
-- Run in the Supabase SQL editor, or via `supabase db push` with this as a migration.
-- Row Level Security (RLS) policies are included so users can only ever read/write
-- their own rows — this matters a lot once auth is wired up.

create extension if not exists "uuid-ossp";

-- Supabase already provides auth.users; we extend it with a profile table.
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  age int not null check (age between 13 and 100),
  sex text not null check (sex in ('male', 'female')),
  height_cm numeric not null,
  current_weight_kg numeric not null,
  goal_weight_kg numeric not null,
  activity_level text not null check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal_type text not null check (goal_type in ('lose','maintain','gain')),
  weekly_rate_lb numeric not null default 0,
  macro_strategy text not null default 'balanced' check (macro_strategy in ('balanced','high_protein','custom')),
  custom_macro_percents jsonb,
  dietary_preferences text[] default '{}',
  allergies text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cached goal targets, recalculated whenever the profile changes (see calorieEngine.ts).
-- Storing this avoids recomputing on every dashboard load and gives you an audit trail
-- of how targets changed over time if you snapshot it (optional: add a history table later).
create table goal_targets (
  user_id uuid primary key references user_profiles(id) on delete cascade,
  bmr int not null,
  tdee int not null,
  calorie_target int not null,
  protein_g int not null,
  carbs_g int not null,
  fat_g int not null,
  fiber_g int not null,
  was_adjusted_for_safety boolean not null default false,
  safety_note text,
  updated_at timestamptz not null default now()
);

-- User-created custom foods (manual entry, section 10) and saved recipes (section 11)
-- share a table: a recipe is just a food whose facts were computed from ingredients.
create table foods (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade, -- null = shared/global food
  name text not null,
  brand text,
  serving_description text not null,
  serving_grams numeric,
  calories numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  source_type text not null check (source_type in
    ('usda_fdc','restaurant_official','manufacturer_label','open_food_facts_barcode','user_entered','ai_estimate')),
  source_label text not null,
  source_id text,
  is_recipe boolean not null default false,
  created_at timestamptz not null default now()
);

create table recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid not null references foods(id) on delete cascade,
  food_id uuid not null references foods(id),
  grams numeric not null,
  sort_order int not null default 0
);

create table diary_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  food_id uuid references foods(id),
  food_name text not null,       -- denormalized snapshot, survives food edits/deletes
  serving_description text not null,
  quantity numeric not null default 1,
  calories numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric,
  source_type text not null,
  source_label text not null,
  logged_at timestamptz not null default now()
);
create index idx_diary_entries_user_date on diary_entries(user_id, entry_date);

create table weight_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric not null,
  unique (user_id, entry_date)
);

create table exercise_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  activity text not null,
  duration_min int not null,
  distance_km numeric,
  calories_burned_estimate numeric,
  created_at timestamptz not null default now()
);

create table barcode_products (
  barcode text primary key,
  product_name text,
  brand text,
  serving_size text,
  facts_per_100g jsonb not null,
  source_label text not null,
  cached_at timestamptz not null default now()
);

-- === Row Level Security ===
alter table user_profiles enable row level security;
alter table goal_targets enable row level security;
alter table foods enable row level security;
alter table diary_entries enable row level security;
alter table weight_entries enable row level security;
alter table exercise_entries enable row level security;

create policy "own profile" on user_profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own goals" on goal_targets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own or global foods" on foods for select using (owner_id is null or owner_id = auth.uid());
create policy "manage own foods" on foods for insert with check (owner_id = auth.uid());
create policy "edit own foods" on foods for update using (owner_id = auth.uid());
create policy "delete own foods" on foods for delete using (owner_id = auth.uid());
create policy "own diary" on diary_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weight" on weight_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own exercise" on exercise_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- barcode_products is a shared cache, readable by any authenticated user, written only by the backend service role
alter table barcode_products enable row level security;
create policy "read barcode cache" on barcode_products for select using (auth.role() = 'authenticated');
