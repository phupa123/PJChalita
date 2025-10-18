<?php
session_start();
require_once '../config.php'; // Go up one directory to the root

// If the user is not logged in, redirect to the main login page
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: ../login.php");
    exit;
}

// Fetch the user's current coins from the database
$userId = $_SESSION['id'];
$coins = 0;
if ($stmt = $mysqli->prepare("SELECT coins FROM users WHERE id = ?")) {
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($user_coins);
    if ($stmt->fetch()) {
        $coins = $user_coins;
    }
    $stmt->close();
}
$mysqli->close();
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChalitTraderX</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    
    <link href="../css/game/ChalitTraderX.css" rel="stylesheet">

</head>
<body>

    <div id="loading-screen">
        <div class="spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
    </div>

    <div class="trader-container">
        <header class="trader-header">
            <a href="index.php" class="back-btn"><i class="bi bi-arrow-left"></i> กลับ</a>
            <h1 class="game-title">ChalitTraderX</h1>
            <div class="balance">
                <i class="bi bi-coin"></i>
                <span id="user-coins"><?php echo number_format($coins, 2); ?></span>
            </div>
        </header>

        <main class="main-content">
            <div class="chart-area">
                <div class="asset-selector">
                    <select id="asset-select" class="form-select">
                        <option value="CRYPTO-X">CRYPTO-X</option>
                        <option value="FOREX-Y">FOREX-Y</option>
                        <option value="STOCK-Z">STOCK-Z</option>
                    </select>
                </div>
                <div class="chart-controls">
                    <select id="chart-type-select" class="form-select">
                        <option value="line">Line Chart</option>
                        <option value="candlestick">Candlestick</option>
                    </select>
                    <div class="market-status">
                        <span id="market-status" class="badge bg-success">ตลาดเปิด</span>
                    </div>
                </div>
                <canvas id="trade-chart"></canvas>
                <div id="countdown-overlay">
                    <div id="countdown-timer"></div>
                </div>
            </div>

            <div class="trade-panel">
                <div class="trade-inputs">
                    <div class="time-selection">
                        <label>เวลา:</label>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-secondary time-btn active" data-time="5">5s</button>
                            <button type="button" class="btn btn-outline-secondary time-btn" data-time="10">10s</button>
                            <button type="button" class="btn btn-outline-secondary time-btn" data-time="30">30s</button>
                            <button type="button" class="btn btn-outline-secondary time-btn" data-time="60">1m</button>
                        </div>
                    </div>
                    <div class="amount-input">
                        <label for="trade-amount">จำนวน:</label>
                        <div class="input-group">
                            <input type="number" id="trade-amount" class="form-control" value="5" min="5">
                            <span class="input-group-text">Coins</span>
                        </div>
                    </div>
                </div>

                <div class="trade-actions">
                    <div class="single-buy-toggle">
                        <label class="form-check-label">
                            <input type="checkbox" id="single-buy-toggle" class="form-check-input">
                            ซื้อทีเดียว
                        </label>
                    </div>
                    <button id="buy-btn" class="btn btn-success btn-lg">
                        <i class="bi bi-graph-up-arrow"></i> ซื้อ
                    </button>
                    <button id="sell-btn" class="btn btn-danger btn-lg">
                        <i class="bi bi-graph-down-arrow"></i> ขาย
                    </button>
                </div>
            </div>
        </main>

        <footer class="trade-history">
            <ul class="nav nav-tabs" id="historyTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="active-trades-tab" data-bs-toggle="tab" data-bs-target="#active-trades" type="button" role="tab">Active (<span id="active-trades-count">0</span>)</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="history-log-tab" data-bs-toggle="tab" data-bs-target="#history-log" type="button" role="tab">History</button>
                </li>
            </ul>
            <div class="tab-content" id="historyTabsContent">
                <div class="tab-pane fade show active" id="active-trades" role="tabpanel">
                    <p class="no-trades">No active trades.</p>
                </div>
                <div class="tab-pane fade" id="history-log" role="tabpanel">
                    <p class="no-trades">No trade history yet.</p>
                </div>
            </div>
        </footer>

    </div>

    <div class="modal fade" id="resultModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body text-center">
            <h2 id="result-title"></h2>
            <p id="result-message"></p>
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>


    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-chart-financial"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <script>
        // Pass initial data to JavaScript
        const initialUserCoins = <?php echo json_encode($coins); ?>;
    </script>
    
    <script src="../js/game/ChalitTraderX.js"></script>
    
</body>
</html>