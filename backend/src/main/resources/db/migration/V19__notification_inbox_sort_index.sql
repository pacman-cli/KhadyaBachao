-- V19: the notifications inbox sorts by created_at DESC per user, but V16
-- only indexed (user_id, is_read) — every inbox open re-sorted the user's
-- rows. Cover the sort with a composite index.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC);
