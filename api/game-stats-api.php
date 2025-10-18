<?php
// api/game-stats-api.php
session_start();
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_id = (int)$_SESSION['id'];

function ensure_tables($mysqli) {
    $mysqli->query("CREATE TABLE IF NOT EXISTS game_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_type VARCHAR(50) NOT NULL,
        wins INT DEFAULT 0,
        losses INT DEFAULT 0,
        total_plays INT DEFAULT 0,
        total_coins_earned INT DEFAULT 0,
        total_exp_earned INT DEFAULT 0,
        UNIQUE KEY uniq_user_game (user_id, game_type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $mysqli->query("CREATE TABLE IF NOT EXISTS game_plays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_type VARCHAR(50) NOT NULL,
        result ENUM('win','loss','draw') NOT NULL,
        bet_amount INT NOT NULL DEFAULT 0,
        coins_delta INT NOT NULL DEFAULT 0,
        exp_gain INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_time (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
}

function get_user_brief($mysqli, $user_id) {
    $sql = "SELECT nickname, title, coins, exp, exp_to_next_level FROM users WHERE id = ?";
    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        return $res->fetch_assoc();
    }
    return null;
}

ensure_tables($mysqli);
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    if ($action === 'update_result' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $game_type = trim($_POST['game_type'] ?? '');
        $result = $_POST['result'] ?? '';
        $bet_amount = max(0, (int)($_POST['bet_amount'] ?? 0));
        $booster_exp = max(1, min(5, (int)($_POST['booster_exp'] ?? 1)));
        $booster_coins = max(1, min(5, (int)($_POST['booster_coins'] ?? 1)));

        if (!$game_type || !in_array($result, ['win','loss','draw'], true)) {
            throw new Exception('Invalid params');
        }

        $coins_gain = 0; $exp_gain = 0;
        if ($result === 'win') {
            $coins_gain = rand(1,5) + ($bet_amount * 2);
            $exp_gain = rand(2,7);
        } elseif ($result === 'loss') {
            $coins_gain = rand(1,3) - $bet_amount;
            $exp_gain = rand(1,5);
        } else { // draw
            $coins_gain = rand(1,3);
            $exp_gain = rand(1,5);
        }
        $coins_gain *= $booster_coins;
        $exp_gain *= $booster_exp;

        $mysqli->begin_transaction();

        // Update user coins/exp (clamp coins at >= 0)
        $stmt = $mysqli->prepare("UPDATE users SET coins = GREATEST(0, coins + ?), exp = exp + ? WHERE id = ?");
        $stmt->bind_param('dii', $coins_gain, $exp_gain, $user_id);
        $stmt->execute();
        $stmt->close();

        // Upsert stats row
        $stmt = $mysqli->prepare("INSERT INTO game_stats (user_id, game_type) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_plays = total_plays");
        $stmt->bind_param('is', $user_id, $game_type);
        $stmt->execute();
        $stmt->close();

        // Update stats
        if ($result === 'win') {
            $stmt = $mysqli->prepare("UPDATE game_stats SET wins = wins + 1, total_plays = total_plays + 1, total_coins_earned = total_coins_earned + ?, total_exp_earned = total_exp_earned + ? WHERE user_id = ? AND game_type = ?");
        } elseif ($result === 'loss') {
            $stmt = $mysqli->prepare("UPDATE game_stats SET losses = losses + 1, total_plays = total_plays + 1, total_coins_earned = total_coins_earned + ?, total_exp_earned = total_exp_earned + ? WHERE user_id = ? AND game_type = ?");
        } else { // draw
            $stmt = $mysqli->prepare("UPDATE game_stats SET total_plays = total_plays + 1, total_coins_earned = total_coins_earned + ?, total_exp_earned = total_exp_earned + ? WHERE user_id = ? AND game_type = ?");
        }
        $stmt->bind_param('diis', $coins_gain, $exp_gain, $user_id, $game_type);
        $stmt->execute();
        $stmt->close();

        // Log play
        $stmt = $mysqli->prepare("INSERT INTO game_plays (user_id, game_type, result, bet_amount, coins_delta, exp_gain) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('issiii', $user_id, $game_type, $result, $bet_amount, $coins_gain, $exp_gain);
        $stmt->execute();
        $stmt->close();

        $mysqli->commit();

        $user = get_user_brief($mysqli, $user_id);
        $stats = null;
        if ($stmt = $mysqli->prepare("SELECT wins, losses, total_plays, total_coins_earned, total_exp_earned FROM game_stats WHERE user_id = ? AND game_type = ?")) {
            $stmt->bind_param('is', $user_id, $game_type);
            $stmt->execute();
            $res = $stmt->get_result();
            $stats = $res->fetch_assoc();
            $stmt->close();
        }

        echo json_encode([
            'success' => true,
            'user' => $user,
            'game_stats' => $stats,
            'coins_gain' => $coins_gain,
            'exp_gain' => $exp_gain
        ]);
        exit;
    }

    if ($action === 'rankings') {
        $game_type = $_GET['game_type'] ?? 'all';
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));

        if ($game_type === 'all') {
            $sql = "SELECT u.id as user_id, u.nickname, u.title, SUM(s.wins) AS wins, SUM(s.losses) AS losses, SUM(s.total_plays) AS total_plays
                    FROM game_stats s
                    JOIN users u ON u.id = s.user_id
                    GROUP BY u.id
                    ORDER BY wins DESC, total_plays DESC
                    LIMIT ?";
            $stmt = $mysqli->prepare($sql);
            $stmt->bind_param('i', $limit);
        } else {
            $sql = "SELECT u.id as user_id, u.nickname, u.title, s.wins, s.losses, s.total_plays
                    FROM game_stats s
                    JOIN users u ON u.id = s.user_id
                    WHERE s.game_type = ?
                    ORDER BY s.wins DESC, s.total_plays DESC
                    LIMIT ?";
            $stmt = $mysqli->prepare($sql);
            $stmt->bind_param('si', $game_type, $limit);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = [];
        while ($r = $res->fetch_assoc()) {
            $plays = max(1, (int)$r['wins'] + (int)$r['losses']);
            $r['win_rate'] = round(((int)$r['wins'] / $plays) * 100, 1);
            $rows[] = $r;
        }
        $stmt->close();
        echo json_encode(['success' => true, 'rankings' => $rows]);
        exit;
    }

    if ($action === 'my_stats') {
        $sql = "SELECT game_type, wins, losses, total_plays, total_coins_earned, total_exp_earned FROM game_stats WHERE user_id = ?";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = [];
        while ($r = $res->fetch_assoc()) { $rows[] = $r; }
        $stmt->close();
        echo json_encode(['success' => true, 'stats' => $rows]);
        exit;
    }

    if ($action === 'history') {
        $game_type = $_GET['game_type'] ?? '';
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
        if ($game_type) {
            $sql = "SELECT game_type, result, bet_amount, coins_delta, exp_gain, created_at FROM game_plays WHERE user_id = ? AND game_type = ? ORDER BY created_at DESC LIMIT ?";
            $stmt = $mysqli->prepare($sql);
            $stmt->bind_param('isi', $user_id, $game_type, $limit);
        } else {
            $sql = "SELECT game_type, result, bet_amount, coins_delta, exp_gain, created_at FROM game_plays WHERE user_id = ? ORDER BY created_at DESC LIMIT ?";
            $stmt = $mysqli->prepare($sql);
            $stmt->bind_param('ii', $user_id, $limit);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = [];
        while ($r = $res->fetch_assoc()) { $rows[] = $r; }
        $stmt->close();
        echo json_encode(['success' => true, 'history' => $rows]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Unknown action']);
} catch (Throwable $e) {
    if ($mysqli && $mysqli->errno) {
        $mysqli->rollback();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
