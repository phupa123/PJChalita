CREATE TABLE IF NOT EXISTS game_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_type VARCHAR(50) NOT NULL, -- e.g., 'xoxo' or 'headsortails'
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    total_plays INT DEFAULT 0,
    total_coins_earned INT DEFAULT 0,
    total_exp_earned INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) -- Assuming a users table exists
);

-- Sample insert/update for win
-- UPDATE game_stats SET wins = wins + 1, total_plays = total_plays + 1, total_coins_earned = total_coins_earned + (1 + FLOOR(RAND()*5)) + bet_amount * 2, total_exp_earned = total_exp_earned + (2 + FLOOR(RAND()*6)) WHERE user_id = ? AND game_type = ?;
-- For loss: similar but with lower ranges and -bet or partial.

-- Overall ranking by wins
SELECT user_id, SUM(wins) as total_wins FROM game_stats GROUP BY user_id ORDER BY total_wins DESC LIMIT 10;

-- Per game ranking (e.g., for xoxo)
SELECT user_id, wins FROM game_stats WHERE game_type = 'xoxo' ORDER BY wins DESC LIMIT 10;