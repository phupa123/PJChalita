-- Create mailbox table for notifications
CREATE TABLE IF NOT EXISTS mailbox (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sender_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ensure score_history table exists with evidence_file column
ALTER TABLE score_history ADD COLUMN IF NOT EXISTS evidence_file VARCHAR(255);
