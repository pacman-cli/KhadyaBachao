-- V12: Seed realistic demo users and activities for Khadya Bachao
-- Includes 5 users per role (ADMIN, DONOR, RECIPIENT_NGO, RECIPIENT_INDIVIDUAL, VOLUNTEER)
-- Includes organizations, listings, claims, chat, schedules, ratings, reports, and device tokens.

-- Clean up any existing demo seed data if re-run
DELETE FROM ratings WHERE comment LIKE '[Demo Seed]%';
DELETE FROM chat_messages WHERE message LIKE '[Demo Seed]%';
DELETE FROM pickup_schedules WHERE agreed_location LIKE '%[Demo Seed]%';
DELETE FROM reports WHERE reason LIKE '[Demo Seed]%';
DELETE FROM food_requests WHERE listing_id IN (SELECT id FROM food_listings WHERE description LIKE '%[Demo Seed]%');
DELETE FROM food_listings WHERE description LIKE '%[Demo Seed]%';
DELETE FROM organizations WHERE org_name LIKE '%[Demo Seed]%';
DELETE FROM users WHERE email LIKE '%@khadyabachao.org' OR email LIKE 'donor%@gmail.com' OR email LIKE 'ngo%@%' OR email LIKE 'indiv%@gmail.com' OR email LIKE 'volunteer%@gmail.com';

-- 1. USERS (25 total: 5 ADMIN, 5 DONOR, 5 RECIPIENT_NGO, 5 RECIPIENT_INDIVIDUAL, 5 VOLUNTEER)

-- 5 ADMINS
INSERT INTO users (id, firebase_uid, name, email, phone, role, is_verified, rating_avg, active) VALUES
('a1000000-0000-0000-0000-000000000001', 'dev-admin1@khadyabachao.org', 'Imran Admin (Lead)', 'admin1@khadyabachao.org', '+8801700000001', 'ADMIN', true, 5.00, true),
('a1000000-0000-0000-0000-000000000002', 'dev-admin2@khadyabachao.org', 'Sarah Moderation Admin', 'admin2@khadyabachao.org', '+8801700000002', 'ADMIN', true, 5.00, true),
('a1000000-0000-0000-0000-000000000003', 'dev-admin3@khadyabachao.org', 'Rafiq Operations Admin', 'admin3@khadyabachao.org', '+8801700000003', 'ADMIN', true, 5.00, true),
('a1000000-0000-0000-0000-000000000004', 'dev-admin4@khadyabachao.org', 'Nadia Verification Admin', 'admin4@khadyabachao.org', '+8801700000004', 'ADMIN', true, 5.00, true),
('a1000000-0000-0000-0000-000000000005', 'dev-admin5@khadyabachao.org', 'Tanvir System Admin', 'admin5@khadyabachao.org', '+8801700000005', 'ADMIN', true, 5.00, true);

-- 5 DONORS
INSERT INTO users (id, firebase_uid, name, email, phone, role, is_verified, rating_avg, active) VALUES
('b1000000-0000-0000-0000-000000000001', 'dev-donor1@gmail.com', 'Dhaka Bakers & Bakery', 'donor1@gmail.com', '+8801811111101', 'DONOR', true, 4.80, true),
('b1000000-0000-0000-0000-000000000002', 'dev-donor2@gmail.com', 'Star Kabab & Restaurant', 'donor2@gmail.com', '+8801811111102', 'DONOR', true, 4.95, true),
('b1000000-0000-0000-0000-000000000003', 'dev-donor3@gmail.com', 'Grand Sultan Kitchen', 'donor3@gmail.com', '+8801811111103', 'DONOR', true, 4.70, true),
('b1000000-0000-0000-0000-000000000004', 'dev-donor4@gmail.com', 'Agora Supershop Dhanmondi', 'donor4@gmail.com', '+8801811111104', 'DONOR', false, 4.50, true),
('b1000000-0000-0000-0000-000000000005', 'dev-donor5@gmail.com', 'Kazi Food Catering', 'donor5@gmail.com', '+8801811111105', 'DONOR', true, 4.85, true);

-- 5 RECIPIENT NGOs
INSERT INTO users (id, firebase_uid, name, email, phone, role, is_verified, rating_avg, active) VALUES
('c1000000-0000-0000-0000-000000000001', 'dev-ngo1@ekmatra.org', 'Ekmatra Society Relief', 'ngo1@ekmatra.org', '+8801922222201', 'RECIPIENT_NGO', true, 4.90, true),
('c1000000-0000-0000-0000-000000000002', 'dev-ngo2@bidyanondo.org', 'Bidyanondo Food Wing', 'ngo2@bidyanondo.org', '+8801922222202', 'RECIPIENT_NGO', true, 5.00, true),
('c1000000-0000-0000-0000-000000000003', 'dev-ngo3@jaago.com.bd', 'Jaago Foundation NGO', 'ngo3@jaago.com.bd', '+8801922222203', 'RECIPIENT_NGO', false, 0.00, true),
('c1000000-0000-0000-0000-000000000004', 'dev-ngo4@shastho.org', 'Shastho Relief Trust', 'ngo4@shastho.org', '+8801922222204', 'RECIPIENT_NGO', false, 0.00, true),
('c1000000-0000-0000-0000-000000000005', 'dev-ngo5@carebangladesh.org', 'Care Hope Community', 'ngo5@carebangladesh.org', '+8801922222205', 'RECIPIENT_NGO', true, 4.75, true);

-- 5 RECIPIENT INDIVIDUALS
INSERT INTO users (id, firebase_uid, name, email, phone, role, is_verified, rating_avg, active) VALUES
('d1000000-0000-0000-0000-000000000001', 'dev-indiv1@gmail.com', 'Rahim Uddin', 'indiv1@gmail.com', '+8801533333301', 'RECIPIENT_INDIVIDUAL', false, 4.60, true),
('d1000000-0000-0000-0000-000000000002', 'dev-indiv2@gmail.com', 'Fatema Begum', 'indiv2@gmail.com', '+8801533333302', 'RECIPIENT_INDIVIDUAL', false, 4.80, true),
('d1000000-0000-0000-0000-000000000003', 'dev-indiv3@gmail.com', 'Kamal Hossain', 'indiv3@gmail.com', '+8801533333303', 'RECIPIENT_INDIVIDUAL', false, 0.00, true),
('d1000000-0000-0000-0000-000000000004', 'dev-indiv4@gmail.com', 'Rina Akter', 'indiv4@gmail.com', '+8801533333304', 'RECIPIENT_INDIVIDUAL', false, 4.90, true),
('d1000000-0000-0000-0000-000000000005', 'dev-indiv5@gmail.com', 'Sumon Chowdhury', 'indiv5@gmail.com', '+8801533333305', 'RECIPIENT_INDIVIDUAL', false, 0.00, true);

-- 5 VOLUNTEERS
INSERT INTO users (id, firebase_uid, name, email, phone, role, is_verified, rating_avg, active) VALUES
('e1000000-0000-0000-0000-000000000001', 'dev-volunteer1@gmail.com', 'Arif Youth Volunteer', 'volunteer1@gmail.com', '+8801644444401', 'VOLUNTEER', true, 4.95, true),
('e1000000-0000-0000-0000-000000000002', 'dev-volunteer2@gmail.com', 'Mehedi Hasan Volunteer', 'volunteer2@gmail.com', '+8801644444402', 'VOLUNTEER', true, 4.85, true),
('e1000000-0000-0000-0000-000000000003', 'dev-volunteer3@gmail.com', 'Nusrat Jahan Volunteer', 'volunteer3@gmail.com', '+8801644444403', 'VOLUNTEER', false, 0.00, true),
('e1000000-0000-0000-0000-000000000004', 'dev-volunteer4@gmail.com', 'Sakib Ahmed Volunteer', 'volunteer4@gmail.com', '+8801644444404', 'VOLUNTEER', true, 5.00, true),
('e1000000-0000-0000-0000-000000000005', 'dev-volunteer5@gmail.com', 'Tasnim Farhana Volunteer', 'volunteer5@gmail.com', '+8801644444405', 'VOLUNTEER', false, 0.00, true);

-- 2. ORGANIZATIONS & VERIFICATION QUEUE
INSERT INTO organizations (id, user_id, org_name, org_type, registration_doc_url, verification_status, verified_by, verified_at) VALUES
('01000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Ekmatra Society NGO [Demo Seed]', 'NON_PROFIT', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c', 'APPROVED', 'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days'),
('01000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Bidyanondo Foundation [Demo Seed]', 'FOUNDATION', 'https://images.unsplash.com/photo-1450133064473-71024230f91b', 'APPROVED', 'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days'),
('01000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'Jaago Foundation Food Wing [Demo Seed]', 'CHARITY', 'https://images.unsplash.com/photo-1568992687947-868a62a9f521', 'PENDING', NULL, NULL),
('01000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'Shastho Relief Trust [Demo Seed]', 'RELIEF_TRUST', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173', 'PENDING', NULL, NULL),
('01000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'Dhaka Bakers Corporate [Demo Seed]', 'CORPORATE_DONOR', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf', 'APPROVED', 'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days');

-- 3. FOOD LISTINGS (Dhaka Coordinates ~ lat 23.75 - 23.82, lng 90.36 - 90.42)
INSERT INTO food_listings (id, donor_id, title, description, food_type, quantity_value, quantity_unit, photo_urls, prepared_at, pickup_deadline, pickup_lat, pickup_lng, pickup_address, status, created_at) VALUES
-- 1. Available Cooked Biryani
('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'Fresh Mutton Kacchi Biryani (30 Portions)', 'Surplus cooked biryani from lunch banquet. Fresh, packed in foil boxes. [Demo Seed]', 'COOKED', 30.00, 'servings', ARRAY['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8'], NOW() - INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 23.7461, 90.3742, 'Star Kabab, Dhanmondi 2, Dhaka', 'AVAILABLE', NOW() - INTERVAL '2 hours'),

-- 2. Available Baked Goods
('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Assorted Evening Pastries & Loaves', 'Freshly baked bread loaves, muffins, and savory patties. [Demo Seed]', 'PACKAGED', 15.00, 'kg', ARRAY['https://images.unsplash.com/photo-1509440159596-0249088772ff'], NOW() - INTERVAL '5 hours', NOW() + INTERVAL '6 hours', 23.7925, 90.4078, 'Dhaka Bakers, Gulshan 1, Dhaka', 'AVAILABLE', NOW() - INTERVAL '3 hours'),

-- 3. Available Raw Ingredients
('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004', 'Surplus Rice & Cooking Oil Bags', '5 bags Miniket rice (10kg each) and 10 liters soybean oil. Ideal for NGO shelters. [Demo Seed]', 'RAW', 50.00, 'kg', ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c'], NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', 23.7542, 90.3775, 'Agora Supershop, Satmasjid Road, Dhanmondi', 'AVAILABLE', NOW() - INTERVAL '5 hours'),

-- 4. Claimed Food Listing (Active Request)
('f1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 'Dinner Buffet Chicken Curry & Naan', 'Cooked chicken roast, naan bread, and dal for 25 people. [Demo Seed]', 'COOKED', 25.00, 'servings', ARRAY['https://images.unsplash.com/photo-1588166524941-3bf61a9c41db'], NOW() - INTERVAL '3 hours', NOW() + INTERVAL '3 hours', 23.8103, 90.4125, 'Grand Sultan Kitchen, Banani, Dhaka', 'CLAIMED', NOW() - INTERVAL '3 hours'),

-- 5. Completed Food Listing
('f1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 'Catering Surplus Polao & Roast', 'Rescued 40 packages of chicken polao from corporate lunch event. [Demo Seed]', 'COOKED', 40.00, 'servings', ARRAY['https://images.unsplash.com/photo-1546069901-ba9599a7e63c'], NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours', 23.8759, 90.3795, 'Kazi Catering, Uttara Sector 4, Dhaka', 'COMPLETED', NOW() - INTERVAL '1 day'),

-- 6. Expired Food Listing
('f1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000002', 'Unclaimed Breakfast Sandwiches', 'Surplus egg and vegetable sandwiches. [Demo Seed]', 'PACKAGED', 10.00, 'items', ARRAY['https://images.unsplash.com/photo-1528735602780-2552fd46c7af'], NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 23.7461, 90.3742, 'Star Kabab, Dhanmondi, Dhaka', 'EXPIRED', NOW() - INTERVAL '2 days');

-- 4. FOOD REQUESTS (CLAIMS)
INSERT INTO food_requests (id, listing_id, recipient_id, status, requested_at, responded_at) VALUES
-- Claimed Listing request (Accepted)
('02000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'ACCEPTED', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes'),

-- Completed Listing request
('02000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000002', 'ACCEPTED', NOW() - INTERVAL '20 hours', NOW() - INTERVAL '19 hours'),

-- Pending request on Available listing #1
('02000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'PENDING', NOW() - INTERVAL '30 minutes', NULL);

-- 5. PICKUP SCHEDULES
INSERT INTO pickup_schedules (id, request_id, agreed_time, agreed_location, confirmed_by_donor, confirmed_by_recipient, status, created_at) VALUES
('03000000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000001', NOW() + INTERVAL '1 hour', 'Banani Gate 2 Parking Area [Demo Seed]', true, true, 'CONFIRMED', NOW() - INTERVAL '1 hour'),
('03000000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 hours', 'Uttara Sector 4 Office Counter [Demo Seed]', true, true, 'COMPLETED', NOW() - INTERVAL '18 hours');

-- 6. CHAT MESSAGES
INSERT INTO chat_messages (id, request_id, sender_id, message, sent_at) VALUES
('04000000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Hello! We can send a pickup van to Banani in 1 hour. Is that okay? [Demo Seed]', NOW() - INTERVAL '80 minutes'),
('04000000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'Yes perfect! The food packages are insulated and ready at Gate 2. [Demo Seed]', NOW() - INTERVAL '75 minutes'),
('04000000-0000-0000-0000-000000000003', '02000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Great, driver Rafiq (+8801922222201) is on the way now. Thank you! [Demo Seed]', NOW() - INTERVAL '60 minutes');

-- 7. RATINGS
INSERT INTO ratings (id, request_id, rated_user_id, rating, comment, created_at) VALUES
('05000000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', 5, 'Extremely fresh catering food! Fed 40 children at Bidyanondo shelter. Highly recommended donor! [Demo Seed]', NOW() - INTERVAL '4 hours');

-- 8. REPORTS FOR ADMIN MODERATION QUEUE
INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at) VALUES
('06000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'LISTING', 'f1000000-0000-0000-0000-000000000006', 'Expired items posted with short deadline. [Demo Seed]', 'OPEN', NOW() - INTERVAL '1 day'),
('06000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'USER', 'd1000000-0000-0000-0000-000000000003', 'User did not show up for agreed pickup twice. [Demo Seed]', 'OPEN', NOW() - INTERVAL '12 hours');

-- 9. DEVICE TOKENS FOR PUSH NOTIFICATIONS
INSERT INTO device_tokens (id, user_id, token, platform, created_at) VALUES
('07000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'fcm_token_admin1_demo_12345', 'ANDROID', NOW()),
('07000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'fcm_token_donor2_demo_12345', 'ANDROID', NOW()),
('07000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'fcm_token_ngo1_demo_12345', 'ANDROID', NOW());
