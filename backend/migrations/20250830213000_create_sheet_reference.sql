CREATE TABLE IF NOT EXISTS sheet_reference
(
    id      UUID PRIMARY KEY,
    original_name TEXT        NOT NULL,
    name          TEXT        NOT NULL UNIQUE,
    extension     TEXT,
    path          TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);