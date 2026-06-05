-- Seed metadata provenance on anticheat_entries + hydration tracking
ALTER TABLE anticheat_entries ADD COLUMN denuvo_confidence text;
ALTER TABLE anticheat_entries ADD COLUMN denuvo_source text;
ALTER TABLE anticheat_entries ADD COLUMN denuvo_evidence text;
ALTER TABLE anticheat_entries ADD COLUMN denuvo_checked_at integer;

CREATE TABLE seed_hydration_meta (
  id text PRIMARY KEY DEFAULT 'default',
  manifest_version integer NOT NULL,
  manifest_generated_at text,
  hydrated_at integer NOT NULL,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0
);
