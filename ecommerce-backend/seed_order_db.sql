-- Insert Orders
INSERT INTO orders (id, user_id, status, total_price, payment_status, full_name, phone_number, street, ward, district, province, created_at, updated_at) VALUES
('order_01', 'user_003_buyer', 'PENDING', 999.00, 'UNPAID', 'Buyer User', '1234567890', '123 Main St', 'Ward 1', 'District 1', 'City A', now(), now()),
('order_02', 'user_003_buyer', 'CONFIRMED', 15.00, 'PAID', 'Buyer User', '1234567890', '123 Main St', 'Ward 1', 'District 1', 'City A', now(), now()),
('order_03', 'user_003_buyer', 'SHIPPING', 25.00, 'PAID', 'Buyer User', '1234567890', '123 Main St', 'Ward 1', 'District 1', 'City A', now(), now()),
('order_04', 'user_003_buyer', 'DELIVERED', 30.00, 'PAID', 'Buyer User', '1234567890', '123 Main St', 'Ward 1', 'District 1', 'City A', now(), now()),
('order_05', 'user_003_buyer', 'CANCELLED', 20.00, 'UNPAID', 'Buyer User', '1234567890', '123 Main St', 'Ward 1', 'District 1', 'City A', now(), now()) ON CONFLICT (id) DO NOTHING;

-- Insert Order Items
INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price, subtotal, seller_id) VALUES
('item_01', 'order_01', 'prod_01', 'Smartphone X', 1, 999.00, 999.00, 'user_002_seller'),
('item_02', 'order_02', 'prod_02', 'Cotton T-Shirt', 1, 15.00, 15.00, 'user_002_seller'),
('item_03', 'order_03', 'prod_03', 'Garden Shovel', 1, 25.00, 25.00, 'user_002_seller'),
('item_04', 'order_04', 'prod_04', 'Yoga Mat', 1, 30.00, 30.00, 'user_002_seller'),
('item_05', 'order_05', 'prod_05', 'Action Figure', 1, 20.00, 20.00, 'user_002_seller') ON CONFLICT (id) DO NOTHING;
