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
        </div>
    
    <div id="game-center-popup">
        <div class="game-center-header">
            <h5><i class="bi bi-controller me-2"></i>Game Center</h5>
            <button id="game-center-close-btn" class="btn-close btn-close-white"></button>
        </div>
        <div class="game-center-body">
            <div class="game-grid">
                
                <div class="game-card" id="play-xoxo-game">
                    <div class="game-card-image-wrapper">
                        <div class="xoxo-animation-canvas">
                            <div class="xoxo-grid-line vert v1"></div>
                            <div class="xoxo-grid-line vert v2"></div>
                            <div class="xoxo-grid-line horz h1"></div>
                            <div class="xoxo-grid-line horz h2"></div>
                            <div class="xoxo-symbol x" style="top: -5px; left: -5px;">X</div>
                            <div class="xoxo-symbol o" style="top: 38px; left: 38px;">O</div>
                            <div class="xoxo-symbol x" style="top: 78px; left: 78px;">X</div>
                        </div>
                    </div>
                    <h3>XOXO Game</h3>
                    <p>เกม XO สุดคลาสสิก เล่นพร้อมกันในห้อง</p>
                    <span class="play-btn"><i class="bi bi-play-circle-fill me-1"></i>เล่นเลย</span>
                </div>
                
                <div class="game-card" id="play-headsortails-game">
                    <div class="game-card-image-wrapper">
                        <div class="hot-animation-canvas">
                            <div class="hot-coin">
                                <div class="hot-coin-face front">H</div>
                                <div class="hot-coin-face back">T</div>
                            </div>
                        </div>
                    </div>
                    <h3>Heads or Tails</h3>
                    <p>โยนหัวก้อย วัดดวงไปกับเพื่อนๆ</p>
                    <span class="play-btn"><i class="bi bi-play-circle-fill me-1"></i>เล่นเลย</span>
                </div>

            </div>
        </div>
    </div>

    <div id="xoxo-popup-container">
        <div class="xoxo-header">
            <h5><i class="bi bi-grid-3x3-gap-fill me-2"></i>XOXO Game</h5>
            <button id="xoxo-close-btn" class="btn-close btn-close-white"></button>
        </div>
        <div class="xoxo-body">
            <div class="xoxo-status"></div>
            <div class="xoxo-board"></div>
            <button class="xoxo-reset-btn">เริ่มเกมใหม่</button>
        </div>
    </div>
    
    <div id="headsortails-popup-container">
        <div class="headsortails-header">
            <h5><i class="bi bi-dice-5-fill me-2"></i>Heads or Tails</h5>
            <button id="headsortails-close-btn" class="btn-close btn-close-white"></button>
        </div>
        <div class="headsortails-body">
            <div class="headsortails-status">รอเจ้ามือเริ่มเกม</div>
            <div class="coin-container">
                <div class="coin heads">
                    <div class="coin-front">H</div>
                    <div class="coin-back">T</div>
                </div>
            </div>
            <div class="headsortails-options">
                <button id="hot-bet-heads">หัว</button>
                <button id="hot-bet-tails">ก้อย</button>
            </div>
            
            <div class="player-bets" id="hot-player-bets">
                <h6>ผู้เล่นที่เลือก:</h6>
                <p class="text-muted text-center m-0">ยังไม่มีใครเลือก</p>
            </div>

            <div class="host-controls">
                <button id="hot-flip-coin-btn">โยนเหรียญ</button>
                <button id="hot-reset-btn">เริ่มรอบใหม่</button>
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