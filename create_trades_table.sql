-- Create trades table for ChalitTraderX
CREATE TABLE IF NOT EXISTS trades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    asset VARCHAR(50) NOT NULL,
    direction ENUM('buy', 'sell') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    entry_price DECIMAL(10,4) NOT NULL,
    exit_price DECIMAL(10,4) NULL,
    result ENUM('win', 'loss') NULL,
    payout DECIMAL(10,2) DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_user_id ON trades(user_id);
CREATE INDEX idx_timestamp ON trades(timestamp);
CREATE INDEX idx_direction ON trades(direction);
