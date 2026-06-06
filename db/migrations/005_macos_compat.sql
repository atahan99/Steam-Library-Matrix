-- AppleGamingWiki macOS compatibility: Apple Silicon (native), Rosetta 2, CrossOver.

create table if not exists macos_compat_catalog (
  normalized_name text primary key,
  page_name text not null,
  native text,
  rosetta_2 text,
  crossover text,
  parallels text,
  last_synced_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);

create table if not exists macos_compat_entries (
  appid integer primary key references steam_games(appid) on delete cascade,
  matched_name text,
  match_confidence text,
  native text,
  rosetta_2 text,
  crossover text,
  parallels text,
  last_checked_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);
