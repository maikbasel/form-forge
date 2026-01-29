-- Dead letter table for tracking failed sheet reference deletions
-- Used when S3 lifecycle deletes an object but the DB cleanup fails
CREATE TABLE IF NOT EXISTS failed_sheet_deletions
(
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id      UUID        NOT NULL,
    s3_key        TEXT        NOT NULL,
    error_message TEXT,
    retry_count   INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_retry_at TIMESTAMPTZ
);

-- Index for efficient retry processing: find oldest failures with low retry counts
CREATE INDEX idx_failed_deletions_retry ON failed_sheet_deletions (retry_count, created_at);
