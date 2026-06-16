-- Insert Categories
INSERT INTO categories (id, name, created_at) VALUES
('cat_01', 'Electronics', current_date),
('cat_02', 'Clothing', current_date),
('cat_03', 'Home & Garden', current_date),
('cat_04', 'Sports', current_date),
('cat_05', 'Toys', current_date),
('cat_06', 'Health & Beauty', current_date),
('cat_07', 'Automotive', current_date),
('cat_08', 'Books', current_date),
('cat_09', 'Grocery', current_date),
('cat_10', 'Pet Supplies', current_date) ON CONFLICT (id) DO NOTHING;

-- Insert Products
INSERT INTO products (id, category_id, seller_id, name, description, price, stock, sold_count, status, verified, created_at, updated_at) VALUES
('prod_01', 'cat_01', 'user_002_seller', 'Smartphone X', 'Latest smartphone model', 999.00, 100, 0, 'ACTIVE', true, current_date, current_date),
('prod_02', 'cat_02', 'user_002_seller', 'Cotton T-Shirt', 'Comfortable cotton t-shirt', 15.00, 200, 0, 'ACTIVE', true, current_date, current_date),
('prod_03', 'cat_03', 'user_002_seller', 'Garden Shovel', 'Durable garden shovel', 25.00, 50, 0, 'ACTIVE', true, current_date, current_date),
('prod_04', 'cat_04', 'user_002_seller', 'Yoga Mat', 'Non-slip yoga mat', 30.00, 150, 0, 'ACTIVE', true, current_date, current_date),
('prod_05', 'cat_05', 'user_002_seller', 'Action Figure', 'Superhero action figure', 20.00, 300, 0, 'ACTIVE', true, current_date, current_date),
('prod_06', 'cat_06', 'user_002_seller', 'Face Serum', 'Hydrating face serum', 45.00, 80, 0, 'ACTIVE', true, current_date, current_date),
('prod_07', 'cat_07', 'user_002_seller', 'Car Vacuum', 'Portable car vacuum', 35.00, 60, 0, 'ACTIVE', true, current_date, current_date),
('prod_08', 'cat_08', 'user_002_seller', 'Sci-Fi Novel', 'Bestselling sci-fi novel', 18.00, 120, 0, 'ACTIVE', true, current_date, current_date),
('prod_09', 'cat_09', 'user_002_seller', 'Organic Coffee', 'Arabica organic coffee', 12.00, 400, 0, 'ACTIVE', true, current_date, current_date),
('prod_10', 'cat_10', 'user_002_seller', 'Dog Bed', 'Plush dog bed', 40.00, 75, 0, 'ACTIVE', true, current_date, current_date) ON CONFLICT (id) DO NOTHING;
