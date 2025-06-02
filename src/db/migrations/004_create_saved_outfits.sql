-- Create saved_outfits table
CREATE TABLE IF NOT EXISTS saved_outfits (
    id SERIAL PRIMARY KEY,
    outfit_id INTEGER NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    occasion VARCHAR(100),
    season VARCHAR(50),
    weather VARCHAR(50),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(outfit_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_outfits_user_id ON saved_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_outfits_outfit_id ON saved_outfits(outfit_id); 