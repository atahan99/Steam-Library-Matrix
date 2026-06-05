-- Cross-process Steam storefront rate gate + circuit breaker (single row)
CREATE TABLE steam_store_throttle (
  id text PRIMARY KEY DEFAULT 'default',
  last_request_at integer NOT NULL DEFAULT 0,
  cooldown_until integer,
  consecutive_blocks integer NOT NULL DEFAULT 0,
  updated_at integer NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer))
);

INSERT INTO steam_store_throttle (id) VALUES ('default');
