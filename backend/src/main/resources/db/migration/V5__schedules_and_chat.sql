-- Phase 5: pickup scheduling + in-app chat
CREATE TABLE pickup_schedules (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id               UUID NOT NULL REFERENCES food_requests(id),
    agreed_time              TIMESTAMP NOT NULL,
    agreed_location          TEXT NOT NULL,
    confirmed_by_donor       BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_recipient   BOOLEAN NOT NULL DEFAULT FALSE,
    status                   VARCHAR(20) NOT NULL DEFAULT 'PROPOSED'
                             CHECK (status IN ('PROPOSED','CONFIRMED','COMPLETED','CANCELLED')),
    created_at               TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_pickup_schedules_request ON pickup_schedules(request_id);

CREATE TABLE chat_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id   UUID NOT NULL REFERENCES food_requests(id),
    sender_id    UUID NOT NULL REFERENCES users(id),
    message      TEXT NOT NULL,
    sent_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_request ON chat_messages(request_id, sent_at);
