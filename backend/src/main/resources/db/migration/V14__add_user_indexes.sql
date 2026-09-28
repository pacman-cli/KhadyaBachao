-- V14: Add missing performance indexes on users table
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
