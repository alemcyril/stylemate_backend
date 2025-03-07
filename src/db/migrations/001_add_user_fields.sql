-- Add new columns to users table
ALTER TABLE users
ADD COLUMN verification_token VARCHAR(255),
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN reset_token VARCHAR(255),
ADD COLUMN bio TEXT,
ADD COLUMN avatar VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_token); 