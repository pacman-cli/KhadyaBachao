-- Phase 6: post-pickup ratings
CREATE TABLE ratings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id    UUID NOT NULL UNIQUE REFERENCES food_requests(id),
    rated_user_id UUID NOT NULL REFERENCES users(id),
    rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_ratings_rated_user ON ratings(rated_user_id);
