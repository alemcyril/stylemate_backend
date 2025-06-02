-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create wardrobe_items table
CREATE TABLE IF NOT EXISTS wardrobe_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    color VARCHAR(50),
    brand VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create outfits table
CREATE TABLE IF NOT EXISTS outfits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    occasion VARCHAR(50),
    season VARCHAR(50),
    is_favorite BOOLEAN DEFAULT FALSE,
    saved_for_later BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create outfit_items table (junction table for outfits and wardrobe items)
CREATE TABLE IF NOT EXISTS outfit_items (
    outfit_id INTEGER NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    wardrobe_item_id INTEGER NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
    PRIMARY KEY (outfit_id, wardrobe_item_id)
);

-- Create indexes
CREATE INDEX idx_wardrobe_items_user_id ON wardrobe_items(user_id);
CREATE INDEX idx_wardrobe_items_category_id ON wardrobe_items(category_id);
CREATE INDEX idx_outfits_user_id ON outfits(user_id);
CREATE INDEX idx_outfit_items_outfit_id ON outfit_items(outfit_id);
CREATE INDEX idx_outfit_items_wardrobe_item_id ON outfit_items(wardrobe_item_id);

-- Insert default categories
INSERT INTO categories (name) VALUES
    ('Tops'),
    ('Bottoms'),
    ('Dresses'),
    ('Shoes'),
    ('Accessories'),
    ('Outerwear')
ON CONFLICT (name) DO NOTHING; 