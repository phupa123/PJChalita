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

// สร้าง URL สำหรับ Trust Link
$remote_peer_host = '7wnovn1ehfeq.share.zrok.io'; // <-- ใส่ Host ของ Zrok (port 9000) ที่นี่
$trust_link_url = 'https://' . $remote_peer_host . '/peerjs';
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

    <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
    <script>
        window.appConfig = {
            ROOM_ID: "<?php echo htmlspecialchars($room_id); ?>",
            MY_USER_INFO: <?php echo json_encode($current_user_info); ?>,
            LOCAL_PEER_SERVER_IP: '192.168.1.4',
            REMOTE_PEER_SERVER_HOST: '<?php echo $remote_peer_host; ?>'
        };
        function toggleOwnerMenu() {
            const menu = document.getElementById('owner-menu');
            if (menu) {
                menu.style.display = menu.style.display === 'none' || menu.style.display === '' ? 'block' : 'none';
            }
        }
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
    <div id="video-grid"></div>

    <div id="controls-bar">
        <button id="toggle-controls-btn" class="control-btn" title="ซ่อน/แสดงแถบควบคุม"><i class="bi bi-chevron-down"></i></button>

        <button id="mic-btn" class="control-btn active" title="ปิด/เปิดไมค์"><i class="bi bi-mic-fill"></i></button>
        <button id="cam-btn" class="control-btn active" title="ปิด/เปิดกล้อง"><i class="bi bi-camera-video-fill"></i></button>
        <button id="screen-share-btn" class="control-btn" title="แชร์หน้าจอ"><i class="bi bi-display"></i></button>
        <button id="switch-cam-btn" class="control-btn" title="สลับกล้อง"><i class="bi bi-arrow-repeat"></i></button>
        <button id="mini-mode-btn" class="control-btn" title="โหมดหน้าต่างลอย"><i class="bi bi-pip"></i></button>
        <button id="fullscreen-btn" class="control-btn" title="เต็มจอ"><i class="bi bi-fullscreen"></i></button>

        <?php if ($current_user_info['rank'] === 'Owner'): ?>
        <div class="dropdown">
            <button class="control-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="คำสั่ง Owner" onclick="toggleOwnerMenu()">
                <i class="bi bi-gear-fill"></i>
            </button>
            <ul class="dropdown-menu" id="owner-menu" style="display:none;">
                <li><a class="dropdown-item" href="#" id="owner-capture-btn"><i class="bi bi-record-circle me-2"></i>บันทึก/แคปเจอร์</a></li>
                <li><a class="dropdown-item" href="#" id="owner-history-btn"><i class="bi bi-clock-history me-2"></i>ประวัติ</a></li>
            </ul>
        </div>
        <?php endif; ?>

        <button id="hang-up-btn" class="control-btn hang-up" title="วางสาย"><i class="bi bi-telephone-x-fill"></i></button>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/sweetalert2@11.12.4/dist/sweetalert2.all.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    
    <script src="js/videocall/room_reconnect_fix.js"></script>
    <script src="js/videocall/room_camera.js"></script>
    <script src="js/videocall/room_sharescreen.js"></script>
    <script src="js/videocall/room_kick.js"></script>
    <script src="js/videocall/UploadModule.js"></script>
    <script src="js/videocall/ScreenshotModule.js"></script>
    <script src="js/videocall/HistoryModule.js"></script>
    <script src="js/videocall/RecordingModule.js"></script>
    <script src="js/videocall/room_minivideo_feature.js" defer></script> 
    
    <script src="js/videocall/room_main_fix.js"></script>
    
    <div id="version-indicator" title="Last updated: <?php echo date('Y-m-d H:i:s T', strtotime('now')); ?> (Thailand time)">v1.0.3</div>

    <script>
        const versionIndicator = document.getElementById('version-indicator');
        const userRank = '<?php echo htmlspecialchars($current_user_info['rank']); ?>';
        let updateInfo = `
            <h3>ประวัติการอัปเดต</h3>
            <ul>
                <li>v1.0.3 - เพิ่ม<span style="color: #4a72ff; font-weight: bold;">ระบบปรับเสียง</span>กดค้างที่วิดีโอเพื่อปรับระดับเสียง (0-200), ช่วยขยายเสียงผู้ใช้ที่พูดเบา, เพิ่ม<span style="color: #4a72ff; font-weight: bold;">ไอคอนปิดกล้อง</span>สำหรับ Owner มองเห็นผู้ใช้คนอื่นที่ปิดกล้อง</li>
                <li>v1.0.2 - เพิ่ม<span style="color: #4a72ff; font-weight: bold;">จอเล็กในโหมดเต็มจอ</span>มุมขวาล่างแสดงกล้องของผู้ใช้, กดค้างเพื่อเลือกผู้ใช้ที่ต้องการแสดงในจอเล็ก</li>
                <li>v1.0.1 - ปรับปรุง<span style="color: #4a72ff; font-weight: bold;">เมนู Owner</span> ให้สลับการแสดงผลได้, ปรับปรุงการแสดงผลการ<span style="color: #4a72ff; font-weight: bold;">แชร์หน้าจอ</span>ให้ผู้ใช้ทุกคนเห็นเหมือนกันโดยไม่ตัดภาพ, เพิ่ม<span style="color: #4a72ff; font-weight: bold;">ตัวบ่งชี้เวอร์ชัน</span>ที่คลิกได้พร้อมแสดงข้อมูลอัปเดต`;

        if (userRank === 'Owner') {
            updateInfo += `, เพิ่ม<span style="color: #ff5858; font-weight: bold;">ฟีเจอร์บันทึก/แคปเจอร์</span>สำหรับ Owner`;
        }

        updateInfo += `</li>
                <li>v1.0.0 - เปิดตัวครั้งแรกพร้อมฟีเจอร์<span style="color: #4a72ff; font-weight: bold;">วิดีโอคอล</span>และ<span style="color: #4a72ff; font-weight: bold;">แชร์หน้าจอ</span></li>
            </ul>
        `;

        function showUpdatePopup() {
            Swal.fire({
                title: 'ข้อมูลอัปเดตเวอร์ชัน',
                html: updateInfo,
                icon: 'info',
                confirmButtonText: 'ปิด',
                customClass: {
                    popup: 'stats-modal'
                }
            });
        }

        versionIndicator.addEventListener('click', showUpdatePopup);
        versionIndicator.addEventListener('touchstart', function(e) {
            e.preventDefault();
            showUpdatePopup();
        });

        // ***** จุดแก้ไข: ลบส่วนติดตั้งที่ซ้ำซ้อนออก *****
        // ไม่จำเป็นต้องมี Event Listener `DOMContentLoaded` ที่นี่แล้ว
        // เพราะ `room_main_fix.js` จะจัดการให้ทั้งหมด
    </script>
</body>
</html>