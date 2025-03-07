-- First, drop the existing categories table if it exists
DROP TABLE IF EXISTS categories CASCADE;

-- Recreate the categories table with the correct structure
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
    ('Tops', 'Shirts, blouses, t-shirts, and other upper body garments'),
    ('Bottoms', 'Pants, skirts, shorts, and other lower body garments'),
    ('Dresses', 'One-piece garments'),
    ('Outerwear', 'Jackets, coats, and other outer garments'),
    ('Shoes', 'Footwear'),
    ('Accessories', 'Jewelry, belts, scarves, and other accessories'); 