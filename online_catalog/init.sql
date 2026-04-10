-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  "customerId" INTEGER NOT NULL,
  "placedOn" TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer FOREIGN KEY("customerId") REFERENCES customers(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders("customerId");
CREATE INDEX IF NOT EXISTS idx_orders_placed_on ON orders("placedOn");

-- Insert seed data for products (from faker - replace with real products)
INSERT INTO products (name, price, description) VALUES
  ('Practical Wooden Soap', 460.00, 'High-quality wooden soap'),
  ('Incredible Granite Fish', 482.00, 'Durable granite fish decoration'),
  ('Incredible Metal Salad', 30.00, 'Stainless steel salad bowl'),
  ('Licensed Plastic Sausages', 726.00, 'Food-grade plastic sausages'),
  ('Intelligent Rubber Table', 677.00, 'Anti-slip rubber table'),
  ('Generic Metal Hat', 384.00, 'Lightweight metal hat'),
  ('Refined Fresh Salad', 4.00, 'Fresh organic salad mix'),
  ('Fantastic Fresh Bacon', 57.00, 'Premium bacon strips'),
  ('Intelligent Fresh Pants', 291.00, 'Comfortable fresh fabric pants'),
  ('Generic Fresh Chicken', 378.00, 'Organic free-range chicken')
ON CONFLICT DO NOTHING;

-- Insert seed data for customers
INSERT INTO customers (name, email, phone) VALUES
  ('Bettye Goldner', 'bettye@example.com', '555-0001'),
  ('Delfina Kutch', 'delfina@example.com', '555-0002'),
  ('Marion Braun', 'marion@example.com', '555-0003'),
  ('Erica Ullrich', 'erica@example.com', '555-0004'),
  ('Toby Wundt', 'toby@example.com', '555-0005'),
  ('Natalia Doyle', 'natalia@example.com', '555-0006'),
  ('Cristine Armstrong', 'cristine@example.com', '555-0007'),
  ('Eryn Grimes', 'eryn@example.com', '555-0008'),
  ('Jarrett Wershe', 'jarrett@example.com', '555-0009'),
  ('Devyn Senger', 'devyn@example.com', '555-0010')
ON CONFLICT DO NOTHING;

-- Insert seed data for orders
INSERT INTO orders ("customerId", "placedOn", status) VALUES
  (1, '2020-04-05 14:44:00', 'completed'),
  (3, '2020-06-11 10:34:00', 'completed'),
  (3, '2020-06-01 08:12:00', 'completed'),
  (2, '2020-05-20 16:22:00', 'pending'),
  (4, '2020-07-15 09:15:00', 'completed'),
  (5, '2020-08-01 11:30:00', 'shipped'),
  (6, '2020-08-10 13:45:00', 'processing'),
  (7, '2020-09-05 15:00:00', 'completed'),
  (8, '2020-09-12 10:20:00', 'pending'),
  (9, '2020-10-01 12:00:00', 'completed')
ON CONFLICT DO NOTHING;
