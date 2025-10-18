<?php
// เริ่ม session และตรวจสอบการล็อกอิน
session_start();
require_once 'config.php'; 

if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}

// รับ ID ของห้องจาก URL และตรวจสอบ
$room_id = $_GET['id'] ?? null;
if (!$room_id) {
    header("location: VideoCall.php");
    exit;
}

// --- ดึงข้อมูล Avatar, Level, Coins และ EXP ---
$user_id = $_SESSION['id'];
$avatar_url = get_avatar_url($_SESSION['avatar'] ?? null);
$level = 0; $coins = 0.00; $exp = 0; $exp_to_next_level = 100;

if ($stmt = $mysqli->prepare("SELECT level, coins, exp, exp_to_next_level FROM users WHERE id = ?")) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->bind_result($level, $coins, $exp, $exp_to_next_level);
    $stmt->fetch();
    $stmt->close();
}

// เตรียมข้อมูลผู้ใช้ปัจจุบันเพื่อส่งให้ JavaScript
$current_user_info = [
    'uuid' => $_SESSION['uuid'],
    'nickname' => $_SESSION['nickname'],
    'rank' => $_SESSION['rank'],
    'avatar' => $avatar_url
];

// --- สร้าง URL สำหรับ Trust Link และ Config แบบไดนามิก ---
$current_host = $_SERVER['HTTP_HOST'];
$is_zrok_access = strpos($current_host, 'zrok.io') !== false;
$peer_server_path = '/'; 

$local_peer_ip = '';
$remote_peer_host = '';

// ตรวจสอบว่าเป็น zrok หรือ localhost/IP ทั่วไป
if ($is_zrok_access) {
    // ใช้ Host ของ zrok ที่กำหนดไว้
    $remote_peer_host = '7wnovn1ehfeq.share.zrok.io';
    $trust_link_url = 'https://' . $remote_peer_host . $peer_server_path;
} else {
    // ใช้ IP ของ Server ปัจจุบัน
    $server_ip = explode(':', $current_host)[0];
    $local_peer_ip = (strtolower($server_ip) === 'localhost') ? 'localhost' : $server_ip;
    $trust_link_url = 'http://' . $local_peer_ip . ':9000' . $peer_server_path;
}

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Room: <?php echo htmlspecialchars($room_id); ?> - PJChalita</title>

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="css/videocall/room_revamped.css">
    <link rel="stylesheet" href="css/videocall/room_fullscreen.css">
    <link rel="stylesheet" href="css/videocall/room_minivideo.css">
    <link rel="stylesheet" href="css/videocall/room_youtube.css">
    <link rel="stylesheet" href="css/videocall/room_game/game_center.css">
    <link rel="stylesheet" href="css/videocall/room_game/game_xoxo.css">
    <link rel="stylesheet" href="css/videocall/room_game/game_headsortails.css">

    <!-- TailwindCSS Local -->
    <link href="./output.css" rel="stylesheet">
    <!-- GSAP CDN -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
    <!-- Ensure SweetAlert is always on top of all popups -->
    <style>
        .swal2-container { z-index: 99999 !important; }
    </style>

    <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
    <script src="js/volume.js"></script>
    <script>
        // Global App Configuration
        window.appConfig = {
            ROOM_ID: "<?php echo htmlspecialchars($room_id); ?>",
            MY_USER_INFO: <?php echo json_encode($current_user_info); ?>,
            LOCAL_PEER_SERVER_IP: '<?php echo $local_peer_ip; ?>',
            REMOTE_PEER_SERVER_HOST: '<?php echo $remote_peer_host; ?>',
            CAMERA_AUTO_SETTING: localStorage.getItem('pjchalita-camera-auto') || 'auto',
            MIC_AUTO_SETTING: localStorage.getItem('pjchalita-mic-auto') || 'auto'
        };
    </script>
</head>
<body data-rank="<?php echo htmlspecialchars($current_user_info['rank']); ?>">

    <div id="status-overlay" style="display: none;">
        <div class="status-box">
            <i id="status-icon" class="bi"></i>
            <span id="status-text"></span>
        </div>
    </div>
    <a id="trust-link" href="<?php echo htmlspecialchars($trust_link_url); ?>" target="_blank" class="trust-link" style="display: none;">
        <i class="bi bi-shield-check"></i>
        <span>คลิ๊กเพื่อเชื่อมต่อระบบ แล้วรีเซตเว็บใหม่อีกครั้ง</span>
    </a>

    <div id="stats-hud">
        <div class="stats-hud-info">
            <div class="level-coins-row">
                <div class="level-display">
                    LV <span class="level-badge" id="level-display"><?php echo $level; ?></span>
                </div>
                <div class="coins-display">
                    <i class="bi bi-coin"></i>
                    <span id="coins-display"><?php echo number_format($coins, 2); ?></span>
                </div>
            </div>
            <div class="exp-bar-container">
                <div class="exp-bar" id="exp-bar" style="width: <?php echo ($exp_to_next_level > 0 ? ($exp / $exp_to_next_level) * 100 : 0); ?>%;"></div>
                <div class="exp-text" id="exp-display"><?php echo "$exp / $exp_to_next_level"; ?></div>
            </div>
        </div>
        <button class="stats-btn" id="stats-btn" title="ดูสถานะของคุณ">
            <i class="bi bi-bar-chart-line-fill"></i>
        </button>
    </div>
    
    <div id="notification-container"></div>
    <div id="toast-container"></div>
    <div id="youtube-cinema-container"></div>
    <div id="video-grid"></div>

    <div id="controls-bar" class="collapsed">
        <button id="mic-btn" class="control-btn active" title="ปิด/เปิดไมค์"><i class="bi bi-mic-fill"></i></button>
        <button id="cam-btn" class="control-btn active" title="ปิด/เปิดกล้อง"><i class="bi bi-camera-video-fill"></i></button>
        <button id="screen-share-btn" class="control-btn" title="แชร์หน้าจอ"><i class="bi bi-display"></i></button>
        <button id="youtube-btn" class="control-btn" title="ดู YouTube"><i class="bi bi-youtube"></i></button>
        <button id="game-btn" class="control-btn" title="เกม"><i class="bi bi-controller"></i></button>
        <button id="switch-cam-btn" class="control-btn" title="สลับกล้อง"><i class="bi bi-arrow-repeat"></i></button>
        <button id="mini-mode-btn" class="control-btn" title="โหมดหน้าต่างลอย"><i class="bi bi-pip"></i></button>
        <button id="fullscreen-btn" class="control-btn" title="เต็มจอ"><i class="bi bi-fullscreen"></i></button>
        <a href="settings.php" class="control-btn" title="ตั้งค่า" style="text-decoration: none; color: inherit;"><i class="bi bi-gear-fill"></i></a>

        <?php if ($current_user_info['rank'] === 'Owner'): ?>
        <div class="dropdown">
            <button class="control-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="คำสั่ง Owner">
                <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" id="owner-capture-btn"><i class="bi bi-camera me-2"></i>บันทึก/แคปเจอร์</a></li>
                <li><a class="dropdown-item" href="#" id="owner-history-btn"><i class="bi bi-clock-history me-2"></i>ประวัติ</a></li>
            </ul>
        </div>
        <?php endif; ?>

        <button id="hang-up-btn" class="control-btn hang-up" title="วางสาย"><i class="bi bi-telephone-x-fill"></i></button>
    </div>

    <div id="youtube-popup-container">
        <div class="youtube-header">
            <h5><i class="bi bi-youtube me-2"></i>YouTube Sync</h5>
            <div class="youtube-header-controls">
                <button class="yt-ctrl-btn" id="yt-minimize-btn" title="ย่อจอ (โหมดโรงหนัง)"><i class="bi bi-pip"></i></button>
                <button class="yt-ctrl-btn" id="youtube-close-btn" title="ปิด">&times;</button>
            </div>
        </div>
        <div class="youtube-body">
            <div class="youtube-main-content">
                <div class="youtube-player-area">
                    <div id="youtube-player"></div>
                </div>
                <div class="invitation-section mt-3" id="yt-invitation-section" style="display: none;"></div>
                <div id="yt-status-controls">
                    <div id="yt-now-playing">
                        <strong>Now Playing:</strong> <span id="yt-current-title">ยังไม่มีวิดีโอ</span>
                    </div>
                    <div id="yt-sync-button-container"></div>
                </div>
                 <div id="yt-personal-controls">
                    <button id="yt-play-pause-btn" class="btn btn-sm" title="เล่น/หยุดชั่วคราว"><i class="bi bi-pause-fill"></i></button>
                    <div class="yt-personal-volume">
                        <i class="bi bi-volume-down-fill"></i>
                        <input type="range" class="form-range" id="yt-personal-volume-slider" min="0" max="100" value="80">
                        <i class="bi bi-volume-up-fill"></i>
                    </div>
                    <div class="ms-auto d-flex align-items-center gap-2">
                        <button id="yt-force-sync-btn" class="btn btn-sm btn-outline-info" title="ซิงค์กับผู้นำ"><i class="bi bi-arrow-clockwise"></i> Sync</button>
                        <div class="dropup">
                            <button id="yt-quality-btn" class="btn btn-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="ปรับคุณภาพวิดีโอ">
                                <i class="bi bi-gear-fill"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-dark" id="yt-quality-menu"></ul>
                        </div>
                        <button id="yt-fullscreen-btn" class="btn btn-sm" title="เต็มจอ"><i class="bi bi-fullscreen"></i></button>
                    </div>
                </div>
            </div>
            <div class="youtube-sidebar">
                <div class="youtube-sidebar-tabs">
                    <button class="yt-tab-btn active" data-tab="search"><i class="bi bi-search me-1"></i>ค้นหา</button>
                    <button class="yt-tab-btn" data-tab="settings" id="yt-settings-tab-btn"><i class="bi bi-sliders me-1"></i>จัดการสิทธิ์</button>
                </div>
                <div class="youtube-tab-content active" id="yt-tab-search">
                    <div class="input-group">
                        <input type="text" id="youtube-search-input" class="form-control" placeholder="ค้นหาเพลง/วิดีโอ...">
                        <button class="btn btn-primary" type="button" id="youtube-search-btn"><i class="bi bi-search"></i></button>
                    </div>
                    <div id="youtube-search-results" class="mt-3">
                        <p class="text-muted text-center p-3">ค้นหาวิดีโอเพื่อเริ่ม...</p>
                    </div>
                </div>
                <div class="youtube-tab-content" id="yt-tab-settings">
                    <h6><i class="bi bi-people-fill me-2"></i>สมาชิกในห้อง</h6>
                    <div id="yt-settings-user-list"></div>
                </div>
            </div>
        </div>
    </div>

    <div id="game-center-popup">
        <div id="emoji-background-container"></div>
        <div class="game-center-header">
            <h5><i class="bi bi-controller me-2"></i>ศูนย์รวมเกม</h5>
            <button id="game-center-close-btn" class="btn-close btn-close-white"></button>
        </div>
        <div class="game-center-content-wrapper">
            <div class="game-center-sidebar">
                <div class="game-center-user-info">
                    <img id="gc-user-avatar" src="<?php echo htmlspecialchars($avatar_url); ?>" alt="Avatar">
                    <h6 id="gc-user-nickname"><?php echo htmlspecialchars($current_user_info['nickname']); ?></h6>
                    <div class="stats-bar">
                        <div class="stat-item">
                            <i class="bi bi-coin"></i>
                            <span id="gc-user-coins"><?php echo number_format($coins, 2); ?></span>
                        </div>
                        <div class="stat-item">
                            <i class="bi bi-star-fill"></i>
                            <span>LV. <span id="gc-user-level"><?php echo $level; ?></span></span>
                        </div>
                    </div>
                </div>
                <nav class="category-nav">
                    <button class="category-btn active" data-category="all"><i class="bi bi-grid-fill"></i> เกมทั้งหมด</button>
                    <button class="category-btn" data-category="card"><i class="bi bi-suit-club-fill"></i> ไพ่</button>
                    <button class="category-btn" data-category="board"><i class="bi bi-dice-5-fill"></i> กระดาน</button>
                    <button class="category-btn" data-category="action"><i class="bi bi-joystick"></i> แอ็กชัน</button>
                </nav>
                <div class="sidebar-footer">
                    <button id="gc-stats-btn" class="sidebar-btn"><i class="bi bi-graph-up-arrow"></i> สถิติของฉัน</button>
                    <button id="gc-history-btn" class="sidebar-btn"><i class="bi bi-clock-history"></i> ประวัติ</button>
                </div>
            </div>
            <div class="game-center-main">
                <div class="game-list">
                    <div class="game-card" id="play-xoxo-game" data-category="board">
                        <div class="game-card-image-wrapper" style="background-image: url('https://i.imgur.com/k4d3xAn.png');"></div>
                        <div class="game-card-content">
                            <h3>เกม XO</h3>
                            <p>เกม XO สุดคลาสสิก เล่นพร้อมกันในห้อง</p>
                            <span class="play-btn"><i class="bi bi-play-circle-fill me-1"></i>เล่นเลย</span>
                        </div>
                    </div>
                    <div class="game-card" id="play-headsortails-game" data-category="board">
                        <div class="game-card-image-wrapper hot-bg">
                             <div class="hot-animation-canvas">
                                <div class="hot-coin">
                                    <div class="hot-coin-face front">H</div>
                                    <div class="hot-coin-face back">T</div>
                                </div>
                            </div>
                        </div>
                        <div class="game-card-content">
                            <h3>หัวก้อย</h3>
                            <p>โยนหัวก้อย วัดดวงไปกับเพื่อนๆ</p>
                            <span class="play-btn"><i class="bi bi-play-circle-fill me-1"></i>เล่นเลย</span>
                        </div>
                    </div>
                </div>
                <div class="emoji-sender">
                    <select id="gc-emoji-select" class="form-select form-select-sm">
                        <option>👍</option><option>😂</option><option>❤️</option><option>🎉</option><option>🔥</option><option>🤯</option>
                    </select>
                    <button id="gc-send-emoji-btn" class="btn btn-primary btn-sm"><i class="bi bi-send-fill"></i> ส่ง</button>
                </div>
            </div>
        </div>
    </div>

    <div id="xoxo-popup-container">
        <div class="xoxo-header">
            <h5><i class="bi bi-grid-3x3-gap-fill me-2"></i>เกม XO</h5>
            <button id="xoxo-close-btn" class="btn-close btn-close-white"></button>
        </div>
        <div class="xoxo-body">
            <div class="xoxo-status"></div>
            <div class="xoxo-board"></div>

            <div class="xoxo-controls">
                <div class="flex items-center gap-3 flex-wrap justify-center w-full">
                    <label for="xoxo-bet-amount" class="text-white/80 text-sm">เดิมพัน (Coins)</label>
                    <input id="xoxo-bet-amount" type="number" min="0" value="0" class="form-control" style="max-width: 160px;">
                    <span id="xoxo-player-count" class="text-white/70 text-sm"></span>
                </div>
                <div class="emoji-controls">
                    <select id="xoxo-emoji-select">
                        <option>👍</option><option>😂</option><option>❤️</option><option>🎉</option><option>🔥</option><option>🤯</option>
                    </select>
                    <button id="xoxo-emoji-btn" class="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white shadow">ส่งอีโมจิ</button>
                    <label class="flex items-center gap-2 text-white/80 text-sm">
                        <input type="checkbox" id="xoxo-emoji-hide-name"> ซ่อนชื่อฉัน
                    </label>
                </div>
                <div id="xoxo-emoji-stream"></div>

                <div class="flex items-center gap-3 justify-center w-full mt-2">
                    <button id="xoxo-mute-btn" class="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white shadow">
                        <i class="bi bi-volume-mute-fill"></i> ปิดเสียงเกม
                    </button>
                    <div class="flex items-center gap-2">
                        <i class="bi bi-volume-down-fill text-white/80"></i>
                        <input type="range" id="xoxo-volume" min="0" max="1" step="0.01" value="0.8">
                        <i class="bi bi-volume-up-fill text-white/80"></i>
                    </div>
                </div>

                <button class="xoxo-reset-btn">เริ่มเกมใหม่</button>
            </div>
        </div>
    </div>
    
    <div id="headsortails-popup-container">
        <div class="headsortails-header">
            <h5><i class="bi bi-dice-5-fill me-2"></i>หัวก้อย</h5>
            <button id="headsortails-close-btn" class="btn-close btn-close-white"></button>
        </div>
        <div class="headsortails-body">
            <div class="headsortails-status">เริ่มเกมได้เลย เลือกเดิมพันแล้วโยนเหรียญ!</div>
            <div class="coin-container">
                <div class="coin heads">
                    <div class="coin-front">หัว</div>
                    <div class="coin-back">ก้อย</div>
                </div>
                <div class="coin-particles" id="hot-coin-particles"></div>
            </div>
            <div class="headsortails-options">
                <button id="hot-bet-heads">หัว</button>
                <button id="hot-bet-tails">ก้อย</button>
                <input id="hot-bet-amount" type="number" min="0" value="0" placeholder="จำนวน Coins" />
                <span id="hot-player-count" class="text-white/80 text-sm"></span>
            </div>
            <div class="player-bets" id="hot-player-bets">
                <h6>ผู้เล่นที่เลือก:</h6>
                <p class="text-muted text-center m-0">ยังไม่มีใครเลือก</p>
            </div>
            <div class="emoji-controls">
                <select id="hot-emoji-select">
                    <option>👍</option><option>😂</option><option>❤️</option><option>🎉</option><option>🔥</option><option>🤯</option>
                </select>
                <button id="hot-emoji-btn" class="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white shadow">ส่งอีโมจิ</button>
                <label class="flex items-center gap-2 text-white/80 text-sm">
                    <input type="checkbox" id="hot-emoji-hide-name"> ซ่อนชื่อฉัน
                </label>
            </div>
            <div id="hot-emoji-stream" class="emoji-stream"></div>
            <div class="host-controls">
                <button id="hot-flip-coin-btn">โยนเหรียญ</button>
                <button id="hot-reset-btn">เริ่มรอบใหม่</button>
                <div class="flex items-center gap-3 justify-center w-full">
                    <button id="hot-mute-btn" class="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white shadow">
                        <i class="bi bi-volume-mute-fill"></i> ปิดเสียงเกม
                    </button>
                    <div class="flex items-center gap-2">
                        <i class="bi bi-volume-down-fill text-white/80"></i>
                        <input type="range" id="hot-volume" min="0" max="1" step="0.01" value="0.8">
                        <i class="bi bi-volume-up-fill text-white/80"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div id="version-indicator" title="คลิกเพื่อดูประวัติการอัปเดต">v1.0.3</div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" defer></script>
    <script src="//cdn.jsdelivr.net/npm/sweetalert2@11.12.4/dist/sweetalert2.all.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" defer></script>
    
    <script src="js/rewards.js" defer></script> 
    <script src="js/videocall/room_stats.js" defer></script>
    <script src="js/videocall/room_reconnect_fix.js"></script>
    <script src="js/videocall/room_camera.js"></script>
    <script src="js/videocall/room_sharescreen.js"></script>
    <script src="js/videocall/room_kick.js"></script>
    <script src="js/videocall/UploadModule.js"></script>
    <script src="js/videocall/ScreenshotModule.js"></script>
    <script src="js/videocall/HistoryModule.js"></script>
    <script src="js/videocall/RecordingModule.js"></script>
    <script src="js/videocall/room_minivideo_feature.js" defer></script>
    <script src="js/videocall/room_youtube.js"></script>
    <script src="js/videocall/room_game/game_center.js" defer></script>
    <script src="js/videocall/room_game/game_xoxo.js" defer></script>
    <script src="js/videocall/room_game/game_headsortails.js" defer></script>
    <script src="js/videocall/room_main_fix.js"></script>

    <script>
        document.getElementById('version-indicator')?.addEventListener('click', () => {
            const updateInfo = `
                <div style="text-align: left; padding: 0 1rem;">
                    <h3>ประวัติการอัปเดต</h3>
                    <ul style="list-style-type: disc; padding-left: 20px;">
                        <li><strong>v1.0.3</strong> - เพิ่ม<span style="color: #4a72ff; font-weight: bold;">ระบบปรับเสียง</span> (กดค้าง/คลิกขวาที่วิดีโอ), เพิ่ม<span style="color: #4a72ff; font-weight: bold;">ไอคอนปิดกล้อง</span>สำหรับ Owner</li>
                        <li><strong>v1.0.2</strong> - เพิ่ม<span style="color: #4a72ff; font-weight: bold;">จอเล็ก (PiP)</span> เมื่ออยู่ในโหมดเต็มจอ</li>
                        <li><strong>v1.0.1</strong> - ปรับปรุง<span style="color: #4a72ff; font-weight: bold;">การแชร์หน้าจอ</span>ให้เต็มสัดส่วน และเพิ่ม<span style="color: #4a72ff; font-weight: bold;">ตัวบ่งชี้เวอร์ชัน</span></li>
                        <li><strong>v1.0.0</strong> - เปิดตัวครั้งแรกพร้อมฟีเจอร์หลัก</li>
                    </ul>
                </div>`;

            Swal.fire({
                title: 'ข้อมูลอัปเดตเวอร์ชัน',
                html: updateInfo,
                icon: 'info',
                confirmButtonText: 'ปิด',
                customClass: { popup: 'stats-modal' }
            });
        });
    </script>
</body>
</html>