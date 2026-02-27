CREATE TABLE IF NOT EXISTS attached_action (
    id UUID PRIMARY KEY,
    sheet_id UUID NOT NULL REFERENCES sheet_reference(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_field TEXT NOT NULL,
    mapping JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(sheet_id, target_field)
);
