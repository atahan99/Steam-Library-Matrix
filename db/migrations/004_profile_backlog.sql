-- Manual backlog queue and monthly completion goal.

create table if not exists profile_backlog (
  steamid text not null references steam_profiles(steamid) on delete cascade,
  appid integer not null references steam_games(appid) on delete cascade,
  status text not null default 'queued',
  position integer not null default 0,
  note text,
  added_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  started_at integer,
  finished_at integer,
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  primary key (steamid, appid)
);

create index if not exists profile_backlog_steamid_idx on profile_backlog (steamid);

create table if not exists profile_backlog_goal (
  steamid text not null references steam_profiles(steamid) on delete cascade,
  period text not null,
  target integer not null default 0,
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  primary key (steamid, period)
);
