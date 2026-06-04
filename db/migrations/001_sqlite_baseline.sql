-- Steam Library Matrix — SQLite baseline schema

create table if not exists steam_profiles (
  steamid text primary key,
  persona_name text,
  avatar_url text,
  profile_url text,
  visibility_state integer,
  steam_level integer,
  account_created_at integer,
  country_code text,
  wishlist_last_synced_at integer,
  wishlist_sync_error text,
  last_synced_at integer,
  profile_token_hash text,
  profile_token_version integer not null default 0,
  profile_claimed_at integer,
  profile_token_rotated_at integer,
  openid_verified_at integer,
  created_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);

create table if not exists steam_games (
  appid integer primary key,
  name text not null,
  icon_url text,
  logo_url text,
  store_url text,
  created_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);

create table if not exists profile_games (
  steamid text not null references steam_profiles(steamid) on delete cascade,
  appid integer not null references steam_games(appid) on delete cascade,
  playtime_forever_minutes integer default 0,
  playtime_2weeks_minutes integer default 0,
  last_synced_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  primary key (steamid, appid)
);

create index if not exists idx_profile_games_steamid on profile_games(steamid);

create table if not exists steam_app_details (
  appid integer primary key references steam_games(appid) on delete cascade,
  type text,
  short_description text,
  header_image text,
  website text,
  developers text,
  publishers text,
  platforms text,
  categories text,
  genres text,
  release_date text,
  metacritic text,
  recommendations text,
  steam_deck_compatibility text,
  last_checked_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  created_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);

create table if not exists howlongtobeat_entries (
  appid integer primary key references steam_games(appid) on delete cascade,
  hltb_id text,
  matched_name text,
  match_confidence real,
  main_story_minutes integer,
  main_extra_minutes integer,
  completionist_minutes integer,
  all_styles_minutes integer,
  image_url text,
  platforms text,
  review_score integer,
  source_url text,
  last_checked_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  created_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);

create table if not exists anticheat_entries (
  appid integer primary key references steam_games(appid) on delete cascade,
  matched_name text,
  anticheat_names text,
  status text,
  kernel_level integer,
  notes text,
  awacy_slug text,
  native_linux integer,
  levvvel_matched_name text,
  levvvel_anticheat_names text,
  levvvel_developer text,
  levvvel_publisher text,
  awacy_date_changed integer,
  match_confidence text,
  levvvel_source_url text,
  denuvo_anti_tamper integer,
  denuvo_anti_cheat integer,
  source_url text,
  last_checked_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  created_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);

create table if not exists protondb_entries (
  appid integer primary key references steam_games(appid) on delete cascade,
  tier text,
  confidence text,
  total_reports integer,
  latest_reported_at integer,
  source_url text,
  last_checked_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  created_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);

create table if not exists enrichment_jobs (
  id text primary key,
  steamid text not null references steam_profiles(steamid) on delete cascade,
  kind text not null,
  status text not null default 'pending',
  payload text not null default '{}',
  progress text not null default '{}',
  error text,
  attempts integer not null default 0,
  run_after integer not null default (cast(unixepoch('subsec') * 1000 as integer)),
  locked_at integer,
  locked_by text,
  created_at integer not null default (cast(unixepoch('subsec') * 1000 as integer)),
  started_at integer,
  finished_at integer
);

create index if not exists enrichment_jobs_status_run_after_idx
  on enrichment_jobs (status, run_after);

create unique index if not exists enrichment_jobs_one_active_per_kind
  on enrichment_jobs (steamid, kind)
  where status in ('pending', 'running');

create table if not exists data_refresh_log (
  id integer primary key autoincrement,
  steamid text,
  source text not null,
  status text not null,
  message text,
  started_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  finished_at integer
);

create index if not exists idx_data_refresh_log_steamid on data_refresh_log(steamid);

create table if not exists profile_wishlist (
  steamid text not null references steam_profiles(steamid) on delete cascade,
  appid integer not null references steam_games(appid) on delete cascade,
  added_at integer,
  last_synced_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  primary key (steamid, appid)
);

create index if not exists profile_wishlist_steamid_idx on profile_wishlist (steamid);

create table if not exists awacy_catalog (
  slug text primary key,
  name text not null,
  normalized_name text not null,
  steam_appid integer,
  status text not null default 'Unknown',
  anticheat_names text,
  notes text,
  native_linux integer,
  date_changed integer,
  source_url text,
  last_synced_at integer not null default (cast(unixepoch('subsec') * 1000 as integer))
);

create index if not exists awacy_catalog_steam_appid_idx
  on awacy_catalog (steam_appid)
  where steam_appid is not null;

create index if not exists awacy_catalog_normalized_name_idx
  on awacy_catalog (normalized_name);

create table if not exists levvvel_kernel_catalog (
  normalized_name text primary key,
  name text not null,
  anticheat_names text,
  developer text,
  publisher text,
  last_synced_at integer not null default (cast(unixepoch('subsec') * 1000 as integer))
);

create table if not exists anticheat_catalog_meta (
  source text primary key check (source in ('awacy', 'levvvel', 'denuvo_anti_tamper')),
  row_count integer not null default 0,
  complete integer not null default 0,
  error_message text,
  last_synced_at integer
);

create table if not exists denuvo_anti_tamper_catalog (
  appid integer primary key,
  last_synced_at integer not null default (cast(unixepoch('subsec') * 1000 as integer))
);

create index if not exists denuvo_anti_tamper_catalog_last_synced_at_idx
  on denuvo_anti_tamper_catalog (last_synced_at desc);

create table if not exists profile_game_achievements (
  steamid text not null,
  appid integer not null references steam_games(appid) on delete cascade,
  unlocked_count integer not null default 0,
  total_count integer not null default 0,
  completion_percent integer not null default 0,
  has_achievements integer not null default 0,
  last_checked_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  created_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  primary key (steamid, appid),
  foreign key (steamid, appid) references profile_games(steamid, appid) on delete cascade
);

create index if not exists profile_game_achievements_steamid_idx
  on profile_game_achievements (steamid);
