-- Add composite indexes for performance on high-volume queries
CREATE INDEX IF NOT EXISTS idx_food_listings_donor_status ON food_listings(donor_id, status);
CREATE INDEX IF NOT EXISTS idx_food_requests_listing_status ON food_requests(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_target_id ON reports(target_id);
