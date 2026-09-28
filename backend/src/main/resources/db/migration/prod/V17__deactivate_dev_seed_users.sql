-- Audit B57: V12 seeds 25 demo users (firebase_uid LIKE 'dev-%') so local dev
-- has realistic data. Those rows must never be usable in a production database.
-- Deactivate rather than delete: seeded rows are referenced by listings, requests
-- and chat messages, and JwtAuthFilter rejects inactive users on every request.
-- This migration lives in db/migration/prod and only runs when the `prod`
-- profile is active (see spring.flyway.locations in application.yml).
UPDATE users SET active = FALSE WHERE firebase_uid LIKE 'dev-%';
