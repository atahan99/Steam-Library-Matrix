-- SteamSpy community stats per app: Steam review counts, owners estimate, current
-- players, top user tags. A row with positive = null means "SteamSpy has no data".

create table if not exists steamspy_entries (
  appid integer primary key references steam_games(appid) on delete cascade,
  positive integer,
  negative integer,
  owners text,
  ccu integer,
  tags text,
  last_checked_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  created_at integer default (cast(unixepoch('subsec') * 1000 as integer)),
  updated_at integer default (cast(unixepoch('subsec') * 1000 as integer))
);
