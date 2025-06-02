-- Add any missing columns to users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'full_name') THEN
        ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NOT NULL DEFAULT 'User';
    END IF;
END $$;

-- Add any missing columns to wardrobe_items table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'wardrobe_items' AND column_name = 'is_favorite') THEN
        ALTER TABLE wardrobe_items ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add any missing columns to outfits table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'outfits' AND column_name = 'is_favorite') THEN
        ALTER TABLE outfits ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'outfits' AND column_name = 'saved_for_later') THEN
        ALTER TABLE outfits ADD COLUMN saved_for_later BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create weather_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS weather_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    min_temperature INTEGER,
    max_temperature INTEGER,
    preferred_conditions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create style_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS style_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    preferred_styles TEXT[],
    preferred_colors TEXT[],
    preferred_brands TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create outfit_ratings table if it doesn't exist
CREATE TABLE IF NOT EXISTS outfit_ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    outfit_id INTEGER REFERENCES outfits(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create refresh_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wardrobe_items_user_id') THEN
        CREATE INDEX idx_wardrobe_items_user_id ON wardrobe_items(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wardrobe_items_category_id') THEN
        CREATE INDEX idx_wardrobe_items_category_id ON wardrobe_items(category_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_outfits_user_id') THEN
        CREATE INDEX idx_outfits_user_id ON outfits(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_outfit_items_outfit_id') THEN
        CREATE INDEX idx_outfit_items_outfit_id ON outfit_items(outfit_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_outfit_items_wardrobe_item_id') THEN
        CREATE INDEX idx_outfit_items_wardrobe_item_id ON outfit_items(wardrobe_item_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_weather_preferences_user_id') THEN
        CREATE INDEX idx_weather_preferences_user_id ON weather_preferences(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_style_preferences_user_id') THEN
        CREATE INDEX idx_style_preferences_user_id ON style_preferences(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_outfit_ratings_user_id') THEN
        CREATE INDEX idx_outfit_ratings_user_id ON outfit_ratings(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_outfit_ratings_outfit_id') THEN
        CREATE INDEX idx_outfit_ratings_outfit_id ON outfit_ratings(outfit_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_sessions_user_id') THEN
        CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_refresh_tokens_user_id') THEN
        CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    END IF;
END $$;

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wardrobe_items_updated_at') THEN
        CREATE TRIGGER update_wardrobe_items_updated_at
            BEFORE UPDATE ON wardrobe_items
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_outfits_updated_at') THEN
        CREATE TRIGGER update_outfits_updated_at
            BEFORE UPDATE ON outfits
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_weather_preferences_updated_at') THEN
        CREATE TRIGGER update_weather_preferences_updated_at
            BEFORE UPDATE ON weather_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_style_preferences_updated_at') THEN
        CREATE TRIGGER update_style_preferences_updated_at
            BEFORE UPDATE ON style_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 