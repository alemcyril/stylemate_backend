-- Add occasion and season columns to outfits table
ALTER TABLE outfits
ADD COLUMN IF NOT EXISTS occasion VARCHAR(50),
ADD COLUMN IF NOT EXISTS season VARCHAR(50); 