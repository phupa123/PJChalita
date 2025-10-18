<?php
// PJChalita/api/trader-api.php

header('Content-Type: application/json');
require_once '../config.php'; // ../ to go up one directory
session_start();

// --- Security Check & Initialization ---
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['id'];
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;
$trade = $input['trade'] ?? null;

if (!$action || !$trade) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Invalid request data.']);
    exit;
}

// --- Game Logic Configuration ---
const PAYOUT_RATE = 1.9; // e.g., 1.9 means 90% profit

// --- Database Transaction ---
$mysqli->begin_transaction();

try {
    // --- Action: Place a new trade ---
    if ($action === 'place_trade') {
        $amount = (float)($trade['amount'] ?? 0);
        $asset = $trade['asset'] ?? 'CRYPTO-X';
        $direction = $trade['direction'] ?? 'buy';
        $entryPrice = (float)($trade['entryPrice'] ?? 0);

        if ($amount < 5) {
            throw new Exception("จำนวน Coins ขั้นต่ำคือ 5");
        }

        // Get current user coins with a lock to prevent race conditions
        $stmt = $mysqli->prepare("SELECT coins FROM users WHERE id = ? FOR UPDATE");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        if (!$user) {
            throw new Exception("ไม่พบผู้ใช้");
        }

        $currentCoins = (float)$user['coins'];

        if ($currentCoins < $amount) {
            throw new Exception("Coins ของคุณไม่เพียงพอ");
        }

        // Deduct the amount
        $newCoins = $currentCoins - $amount;
        $stmt = $mysqli->prepare("UPDATE users SET coins = ? WHERE id = ?");
        $stmt->bind_param("di", $newCoins, $userId);
        $stmt->execute();
        $stmt->close();

        // Save trade to database
        $stmt = $mysqli->prepare("INSERT INTO trades (user_id, asset, direction, amount, entry_price) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("issdd", $userId, $asset, $direction, $amount, $entryPrice);
        $stmt->execute();
        $tradeId = $mysqli->insert_id;
        $stmt->close();

        // Commit and respond
        $mysqli->commit();
        echo json_encode([
            'success' => true,
            'message' => 'วางเดิมพันสำเร็จแล้ว',
            'newCoins' => $newCoins,
            'tradeId' => $tradeId
        ]);
        exit;
    }

    // --- Action: Resolve a finished trade ---
    if ($action === 'resolve_trade') {
        $result = $trade['result'] ?? 'loss';
        $amount = (float)($trade['amount'] ?? 0);
        $exitPrice = (float)($trade['exitPrice'] ?? 0);
        $tradeId = (int)($trade['id'] ?? 0);
        $payout = 0;

        if ($result === 'win') {
            $payout = $amount * PAYOUT_RATE;

            // Add payout to user's coins
            $stmt = $mysqli->prepare("UPDATE users SET coins = coins + ? WHERE id = ?");
            $stmt->bind_param("di", $payout, $userId);
            $stmt->execute();
            $stmt->close();
        }

        // Update trade record with result
        $stmt = $mysqli->prepare("UPDATE trades SET exit_price = ?, result = ?, payout = ? WHERE id = ? AND user_id = ?");
        $stmt->bind_param("dsddi", $exitPrice, $result, $payout, $tradeId, $userId);
        $stmt->execute();
        $stmt->close();

        // Get the final updated coin balance
        $stmt = $mysqli->prepare("SELECT coins FROM users WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        $finalCoins = $user ? (float)$user['coins'] : 0;

        // Commit and respond
        $mysqli->commit();
        echo json_encode([
            'success' => true,
            'newCoins' => $finalCoins,
            'payout' => $payout,
            'result' => $result
        ]);
        exit;
    }

    // --- Action: Get trade history ---
    if ($action === 'get_history') {
        $stmt = $mysqli->prepare("SELECT asset, direction, amount, result, payout FROM trades WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $trades = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        // Calculate win rates
        $totalTrades = count($trades);
        $buyWins = 0;
        $sellWins = 0;
        $buyTotal = 0;
        $sellTotal = 0;

        foreach ($trades as $trade) {
            if ($trade['direction'] === 'buy') {
                $buyTotal++;
                if ($trade['result'] === 'win') $buyWins++;
            } else {
                $sellTotal++;
                if ($trade['result'] === 'win') $sellWins++;
            }
        }

        $buyWinRate = $buyTotal > 0 ? round(($buyWins / $buyTotal) * 100, 1) : 0;
        $sellWinRate = $sellTotal > 0 ? round(($sellWins / $sellTotal) * 100, 1) : 0;

        $mysqli->commit();
        echo json_encode([
            'success' => true,
            'trades' => $trades,
            'stats' => [
                'buyWinRate' => $buyWinRate,
                'sellWinRate' => $sellWinRate,
                'totalTrades' => $totalTrades
            ]
        ]);
        exit;
    }

    // If no action matched
    throw new Exception("Invalid action specified.");

} catch (Exception $e) {
    // If anything fails, roll back the transaction
    $mysqli->rollback();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
    exit;
}

$mysqli->close();
?>