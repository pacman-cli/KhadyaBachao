-- Phase 1 core schema: users + organizations
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid    VARCHAR(255) UNIQUE,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(50),
    role            VARCHAR(50) NOT NULL CHECK (role IN ('DONOR','RECIPIENT_NGO','RECIPIENT_INDIVIDUAL','VOLUNTEER','ADMIN')),
    profile_photo_url TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    rating_avg      NUMERIC(3,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_name             VARCHAR(255) NOT NULL,
    org_type             VARCHAR(100),
    registration_doc_url TEXT,
    verification_status  VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','APPROVED','REJECTED')),
    verified_by          UUID REFERENCES users(id),
    verified_at          TIMESTAMP
);

CREATE INDEX idx_organizations_user_id ON organizations(user_id);
CREATE INDEX idx_organizations_verification_status ON organizations(verification_status);
