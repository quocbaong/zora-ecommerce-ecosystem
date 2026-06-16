-- Clear existing referencing records
DELETE FROM refresh_tokens WHERE user_id IN ('user_001_admin', 'user_002_seller', 'user_003_buyer');
DELETE FROM seller_profiles WHERE seller_id = 'user_002_seller';
DELETE FROM user_profiles WHERE user_id IN ('user_001_admin', 'user_002_seller', 'user_003_buyer');
DELETE FROM users WHERE id IN ('user_001_admin', 'user_002_seller', 'user_003_buyer');

-- Insert clean users (password is password123)
INSERT INTO users (id, email, is_email_verified, password_hash, role, status, created_at, updated_at) VALUES 
('user_001_admin', 'admin@example.com', true, '$2b$10$WpIyBFDZB5l1eiZUKae7N.a7DPg0Jr8ZbRHJvfNdI8iLWwzx7jnYa', 'ADMIN', 'ACTIVE', now(), now()),
('user_002_seller', 'seller@example.com', true, '$2b$10$WpIyBFDZB5l1eiZUKae7N.a7DPg0Jr8ZbRHJvfNdI8iLWwzx7jnYa', 'SELLER', 'ACTIVE', now(), now()),
('user_003_buyer', 'buyer@example.com', true, '$2b$10$WpIyBFDZB5l1eiZUKae7N.a7DPg0Jr8ZbRHJvfNdI8iLWwzx7jnYa', 'USER', 'ACTIVE', now(), now());

-- Insert user profiles
INSERT INTO user_profiles (id, user_id, email, full_name, role, status, created_at, updated_at) VALUES
('prof_001_admin', 'user_001_admin', 'admin@example.com', 'Admin User', 'ADMIN', 'ACTIVE', now(), now()),
('prof_002_seller', 'user_002_seller', 'seller@example.com', 'Seller User', 'SELLER', 'ACTIVE', now(), now()),
('prof_003_buyer', 'user_003_buyer', 'buyer@example.com', 'Buyer User', 'USER', 'ACTIVE', now(), now());

-- Insert seller profiles
INSERT INTO seller_profiles (seller_id, shop_name, account_type, status, is_verified, created_at) VALUES
('user_002_seller', 'Super Shop', 'BUSINESS', 'ACTIVE', true, now());
