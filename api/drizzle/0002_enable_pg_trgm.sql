-- Custom SQL migration file, put your code below! --
-- pg_trgm provides gin_trgm_ops; it must exist before the trigram index migration (R7.1).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
