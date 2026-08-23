-- Phase 8: moderation
CREATE TABLE reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('LISTING','USER')),
    target_id   UUID NOT NULL,
    reason      TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                CHECK (status IN ('OPEN','RESOLVED','DISMISSED')),
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status ON reports(status);

ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
