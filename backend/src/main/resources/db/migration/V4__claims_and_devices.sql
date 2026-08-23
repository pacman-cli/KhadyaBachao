-- Phase 4: claims (first-claim-wins) and push-notification device tokens
CREATE TABLE food_requests (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id     UUID NOT NULL REFERENCES food_listings(id),
    recipient_id   UUID NOT NULL REFERENCES users(id),
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
    requested_at   TIMESTAMP NOT NULL DEFAULT now(),
    responded_at   TIMESTAMP
);

CREATE INDEX idx_food_requests_listing ON food_requests(listing_id);
CREATE INDEX idx_food_requests_recipient ON food_requests(recipient_id);

CREATE TABLE device_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    platform    VARCHAR(10) NOT NULL CHECK (platform IN ('ANDROID','IOS','WEB')),
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
