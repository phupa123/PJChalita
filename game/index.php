<?php
session_start();
require_once '../config.php'; // ../ to go up one directory to the root

// If the user is not logged in, redirect to the main login page
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: ../login.php");
    exit;
}

// Fetch user info for display
$nickname = $_SESSION['nickname'] ?? 'Player';
$avatar = get_avatar_url($_SESSION['avatar'] ?? null);

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Center - PJChalita</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0d1117;
            --card-bg: #161b22;
            --border-color: #30363d;
            --accent-color: #58a6ff;
            --accent-glow: rgba(88, 166, 255, 0.5);
            --text-primary: #c9d1d9;
            --text-secondary: #8b949e;
        }

        body {
            font-family: 'Kanit', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        }

        body.loaded {
            opacity: 1;
        }

        /* Loading Screen */
        #loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: var(--bg-dark);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            transition: opacity 0.5s ease-out;
            opacity: 1;
        }

        #loading-screen.hidden {
            opacity: 0;
            pointer-events: none;
        }

        .spinner-border {
            width: 3rem;
            height: 3rem;
            color: var(--accent-color);
        }

        /* Main Container */
        .game-hub {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 1rem;
            padding: 2.5rem;
            text-align: center;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
            position: relative;
        }

        .back-link {
            position: absolute;
            top: 1.5rem;
            left: 1.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .back-link:hover {
            color: var(--text-primary);
        }

        h1 {
            color: var(--accent-color);
            font-weight: 700;
            margin-bottom: 2rem;
        }

        .game-card {
            background-color: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--border-color);
            border-radius: 0.75rem;
            padding: 1.5rem;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .game-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 0 20px var(--accent-glow);
        }

        .game-card h3 {
            margin-top: 0;
            font-weight: 600;
        }

        .game-card p {
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
        }

        .play-btn {
            font-weight: 600;
            background-color: var(--accent-color);
            border-color: var(--accent-color);
            padding: 0.75rem 2rem;
            border-radius: 50px;
            transition: all 0.3s ease;
        }

        .play-btn:hover {
            background-color: #79b8ff;
            border-color: #79b8ff;
            transform: scale(1.05);
        }
    </style>
</head>
<body>

    <div id="loading-screen">
        <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>

    <div class="container">
        <div class="game-hub">
            <a href="../index.php" class="back-link"><i class="bi bi-arrow-left"></i> กลับหน้าหลัก</a>
            <h1>Game Center</h1>

            <div class="game-card">
                <h3>ChalitTraderX</h3>
                <p>ทดสอบความสามารถในการเทรดของคุณด้วย Coins ที่มี</p>
                <a href="ChalitTraderX.php" class="btn btn-primary play-btn">
                    <i class="bi bi-play-circle-fill me-2"></i>เริ่มเล่น
                </a>
            </div>
        </div>
    </div>

    <script>
        window.addEventListener('load', () => {
            const loadingScreen = document.getElementById('loading-screen');
            const body = document.body;

            // Hide loading screen
            loadingScreen.classList.add('hidden');

            // Fade in body content
            body.classList.add('loaded');
        });
    </script>
</body>
</html>