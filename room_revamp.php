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

if ($is_zrok_access) {
    $remote_peer_host = '7wnovn1ehfeq.share.zrok.io';
    $trust_link_url = 'https://' . $remote_peer_host . $peer_server_path;
} else {
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
    
    <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
    <script>
        window.appConfig = {
            ROOM_ID: "<?php echo htmlspecialchars($room_id); ?>",
            MY_USER_INFO: <?php echo json_encode($current_user_info); ?>,
            LOCAL_PEER_SERVER_IP: '<?php echo $local_peer_ip; ?>',
            REMOTE_PEER_SERVER_HOST: '<?php echo $remote_peer_host; ?>'
        };
    </script>
    <script src="js/videocall/room_main.js"></script>
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
    <div id="video-grid"></div>

    <div id="controls-bar">
        <button id="mic-btn" class="control-btn active" title="ปิด/เปิดไมค์"><i class="bi bi-mic-fill"></i></button>
        <button id="cam-btn" class="control-btn active" title="ปิด/เปิดกล้อง"><i class="bi bi-camera-video-fill"></i></button>
        <button id="screen-share-btn" class="control-btn" title="แชร์หน้าจอ"><i class="bi bi-display"></i></button>
        <button id="switch-cam-btn" class="control-btn" title="สลับกล้อง"><i class="bi bi-arrow-repeat"></i></button>
        <button id="mini-mode-btn" class="control-btn" title="โหมดหน้าต่างลอย"><i class="bi bi-pip"></i></button>

        <?php if ($current_user_info['rank'] === 'Owner'): ?>
        <div class="dropdown">
            <button class="control-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="คำสั่ง Owner">
                <i class="bi bi-gear-fill"></i>
            </button>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" id="owner-capture-btn"><i class="bi bi-record-circle me-2"></i>บันทึก/แคปเจอร์</a></li>
                <li><a class="dropdown-item" href="#" id="owner-history-btn"><i class="bi bi-clock-history me-2"></i>ประวัติ</a></li>
            </ul>
        </div>
        <?php endif; ?>

        <button id="hang-up-btn" class="control-btn hang-up" title="วางสาย"><i class="bi bi-telephone-x-fill"></i></button>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" defer></script>
    <script src="//cdn.jsdelivr.net/npm/sweetalert2@11.12.4/dist/sweetalert2.all.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" defer></script>
    
    <script src="js/rewards.js" defer></script> 
    <script src="js/videocall/room_stats.js" defer></script>
    <script src="js/videocall/UploadModule.js" defer></script>
    <script src="js/videocall/ScreenshotModule.js" defer></script>
    <script src="js/videocall/HistoryModule.js" defer></script>
    <script src="js/videocall/RecordingModule.js" defer></script>
</body>
</html>